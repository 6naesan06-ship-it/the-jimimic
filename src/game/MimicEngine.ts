import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CHAPTERS, CutsceneLine, DIARIES, DiaryEntry, DifficultyMode, JOBS, JobId, MonsterId } from '../data/lore';
import {
  ChapterMapData,
  TILE_SIZE,
  WALL_HEIGHT,
  findNextStepBFS,
  gridToWorld,
  hasLineOfSight,
  isWall,
  parseChapterMap,
  worldToGrid,
} from './maps';
import {
  AnimatedMonsterRig,
  animateMonsterRig,
  createChabudaiTable,
  createChalkboard,
  createCollectibleMesh,
  createCursedDollProp,
  createEmergencyExitSign,
  createFluorescentLight,
  createHospitalGurney,
  createMonsterRig,
  createPaperLantern,
  createSacredTree,
  createSchoolBulletinBoard,
  createSchoolDesk,
  createSchoolLocker,
  createSpiderCocoon,
  createSpiderWebCanopy,
  createStoneJizoStatue,
  createStoneToro,
  createTeacherPodium,
  createToriiGate,
  createWallTalismanCluster,
} from './models';
import { soundEngine } from './soundEngine';
import { ProceduralTextureSet, createProceduralTextures } from './textures';

export interface HudSnapshot {
  stamina: number;
  maxStamina: number;
  battery: number;
  flashlightOn: boolean;
  crouching: boolean;
  collectedItems: number;
  requiredItems: number;
  exitUnlocked: boolean;
  nearestPrompt: string | null;
  nearestMonsterDist: number;
  closestMonsterId: MonsterId | null;
  anyMonsterChasing: boolean;
  pointerLocked: boolean;
  elapsedSeconds: number;
  jobId: JobId;
  skillCooldown: number;
  maxSkillCooldown: number;
  skillActive: boolean;
  doctorReviveReady: boolean;
  nearestObjectiveDist: number | null;
  nearestObjectiveAngleDeg: number | null;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onDiaryFound: (diary: DiaryEntry) => void;
  onJumpscare: (monsterId: MonsterId) => void;
  onPlayerDied: (monsterId: MonsterId) => void;
  onChapterClear: (chapterId: number, elapsedSeconds: number) => void;
  onItemCollected: (count: number, total: number, kind: string) => void;
  onSystemNotice: (message: string) => void;
  onSubtitle: (line: CutsceneLine) => void;
}

interface CollectibleEntity {
  id: string;
  kind: 'key' | 'ofuda' | 'butterfly' | 'seal' | 'battery' | 'diary';
  diaryId?: string;
  mesh: THREE.Group;
  light?: THREE.PointLight;
  x: number;
  z: number;
  collected: boolean;
  baseY: number;
}

interface MonsterEntity {
  id: MonsterId;
  rig: AnimatedMonsterRig;
  x: number;
  z: number;
  yaw: number;
  state: 'patrol' | 'chase' | 'investigate';
  targetGx: number;
  targetGz: number;
  baseSpeed: number;
  chaseSpeed: number;
  memoryTimer: number;
  pathRefreshTimer: number;
  stunTimer: number;
}

// Pre-allocated scratch helpers (zero GC in render loop)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _move = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export class MimicEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSet;
  private envMap: THREE.Texture;

  private worldGroup = new THREE.Group();
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  // Game state
  private mode: 'title' | 'playing' | 'paused' | 'jumpscare' = 'title';
  private chapterId = 1;
  private difficulty: DifficultyMode = 'normal';
  private jobId: JobId = 'student';
  private mapData: ChapterMapData | null = null;
  private elapsedSeconds = 0;
  private hudTimer = 0;

  // Player & Job state
  private playerX = 0;
  private playerZ = 0;
  private yaw = 0;
  private pitch = 0;
  private eyeHeight = 1.65;
  private stamina = 100;
  private maxStamina = 100;
  private battery = 100;
  private flashlightOn = true;
  private crouching = false;
  private exhausted = false;
  private headBobPhase = 0;
  private stepDistAccum = 0;
  private skillCooldown = 0;
  private maxSkillCooldown = 22;
  private skillActiveTimer = 0;
  private doctorReviveReady = false;
  private invulnTimer = 0;
  private hasTriggeredFirstChase = false;
  private wasAnyChasing = false;
  private halfSubtitleShown = false;

  // Flashlight & atmospheric lights
  private flashlight: THREE.SpotLight;
  private flashlightTarget = new THREE.Object3D();
  private playerFillLight: THREE.PointLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private lanterns: Array<{
    light: THREE.PointLight;
    baseIntensity: number;
    phase: number;
    tubeMat?: THREE.MeshStandardMaterial;
    flickerBroken?: boolean;
    deadBroken?: boolean;
  }> = [];
  private cursedDolls: Array<{ head: THREE.Group; x: number; z: number; baseYaw: number }> = [];
  private hangingCocoons: Array<{ group: THREE.Group; phase: number }> = [];
  private ambientParticles: THREE.Points | null = null;
  private particleGeo: THREE.BufferGeometry | null = null;
  private particleMat: THREE.PointsMaterial | null = null;

  // Entities
  private collectibles: CollectibleEntity[] = [];
  private monsters: MonsterEntity[] = [];
  private collectedItems = 0;
  private requiredItems = 4;
  private exitUnlocked = false;
  private exitPos = { x: 0, z: 0 };
  private exitPortalLight: THREE.PointLight | null = null;
  private exitGateGroup: THREE.Group | null = null;

  // Jumpscare state
  private jumpscareTimer = 0;
  private jumpscareMonster: MonsterEntity | null = null;

  // Title diorama references
  private titleBoss: AnimatedMonsterRig | null = null;

  // Input state
  private keys = new Set<string>();
  private pointerLocked = false;
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private touchMoveX = 0;
  private touchMoveY = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050508);
    this.scene.fog = new THREE.FogExp2(0x050508, 0.085);

    this.camera = new THREE.PerspectiveCamera(
      72,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      85
    );
    this.scene.add(this.camera);

    // Studio PMREM Environment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;
    pmrem.dispose();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    // Lighting rig (very dark base so flashlight is essential)
    this.ambientLight = new THREE.AmbientLight(0x0b0e14, 0.06);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x201828, 0x050406, 0.08);
    this.scene.add(this.hemiLight);

    // Player Flashlight
    this.flashlight = new THREE.SpotLight(0xfff1d6, 7.8, 27, Math.PI / 5.2, 0.46, 1.35);
    this.flashlight.castShadow = !this.isSoftwareGl;
    this.flashlight.shadow.mapSize.width = 512;
    this.flashlight.shadow.mapSize.height = 512;
    this.flashlight.shadow.bias = -0.0005;
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

    // Minimal close-range personal aura so unlit halls stay dark
    this.playerFillLight = new THREE.PointLight(0x334155, 0.14, 2.1, 2.0);
    this.scene.add(this.playerFillLight);

    this.scene.add(this.worldGroup);

    this.buildTitleDiorama();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.clock.start();
    this.scheduleNextTick();
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleResize = () => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    this.keys.add(code);

    if (this.mode !== 'playing') return;

    if (code === 'KeyF') {
      this.toggleFlashlight();
    } else if (code === 'KeyC') {
      this.crouching = !this.crouching;
    } else if (code === 'KeyE') {
      this.triggerInteract();
    } else if (code === 'KeyG') {
      this.triggerJobSkill();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private handlePointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.mode !== 'playing') return;
    soundEngine.init();
    this.isDraggingLook = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (!this.pointerLocked && this.renderer.domElement.requestPointerLock) {
      try {
        const res = this.renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
        if (res && typeof res.catch === 'function') {
          res.catch(() => {
            // Pointer lock may be blocked in sandboxed iframes; mouse-drag fallback stays active
          });
        }
      } catch {
        // Fallback to drag look
      }
    }
  };

  private handleMouseUp = () => {
    this.isDraggingLook = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.mode !== 'playing') return;
    const sensitivity = 0.0023;
    if (this.pointerLocked) {
      this.yaw -= e.movementX * sensitivity;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - e.movementY * sensitivity,
        -1.22,
        1.22
      );
    } else if (this.isDraggingLook) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.yaw -= dx * sensitivity * 1.35;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - dy * sensitivity * 1.35,
        -1.22,
        1.22
      );
    }
  };

  public requestPointerLock() {
    if (this.mode !== 'playing') return;
    try {
      const res = this.renderer.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch {
      // Ignore if sandboxed
    }
  }

  public releasePointerLock() {
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }
  }

  public setTouchMove(mx: number, my: number) {
    this.touchMoveX = mx;
    this.touchMoveY = my;
  }

  public adjustLook(dx: number, dy: number) {
    this.yaw -= dx * 0.004;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.004, -1.22, 1.22);
  }

  public toggleFlashlight() {
    if (this.battery <= 0 && !this.flashlightOn) return;
    this.flashlightOn = !this.flashlightOn;
    soundEngine.playFlashlightToggle();
  }

  public toggleCrouch() {
    this.crouching = !this.crouching;
  }

  public triggerJobSkill() {
    if (this.mode !== 'playing' || this.skillCooldown > 0) return;
    const jobMeta = JOBS.find((j) => j.id === this.jobId) || JOBS[0];
    this.skillCooldown = jobMeta.cooldownSec;
    this.maxSkillCooldown = jobMeta.cooldownSec;
    soundEngine.playPortalUnlock();

    if (this.jobId === 'student') {
      this.skillActiveTimer = 5.0;
      this.stamina = this.maxStamina;
      this.callbacks.onSystemNotice('질주 본능 발동! 5초간 이동 속도가 증가합니다.');
    } else if (this.jobId === 'police') {
      let stunned = 0;
      for (const m of this.monsters) {
        if (Math.hypot(m.x - this.playerX, m.z - this.playerZ) <= 12.5) {
          m.stunTimer = 3.5;
          m.state = 'patrol';
          stunned++;
        }
      }
      this.flashlight.intensity = 15;
      this.callbacks.onSystemNotice(
        stunned > 0
          ? `전술 섬광탄 명중! 괴물 ${stunned}체를 3.5초간 경직시켰습니다.`
          : '전술 섬광탄 투척! (근처에 괴물이 없었습니다)'
      );
    } else if (this.jobId === 'doctor') {
      this.stamina = this.maxStamina;
      this.exhausted = false;
      this.battery = Math.min(100, this.battery + 25);
      this.callbacks.onSystemNotice('아드레날린 주사! 스태미나 100% 및 배터리 +25% 회복');
    } else if (this.jobId === 'exorcist') {
      let sealed = 0;
      for (const m of this.monsters) {
        if (Math.hypot(m.x - this.playerX, m.z - this.playerZ) <= 15.0) {
          m.stunTimer = 5.0;
          m.state = 'patrol';
          sealed++;
        }
      }
      this.callbacks.onSystemNotice(
        sealed > 0
          ? `정화의 오후다! 주변 괴물 ${sealed}체를 5초간 봉인했습니다.`
          : '정화의 오후다 발동! (사거리 내 괴물 없음)'
      );
    } else if (this.jobId === 'developer') {
      for (const m of this.monsters) {
        m.stunTimer = 12.0;
        m.state = 'patrol';
        m.memoryTimer = 0;
      }
      this.skillActiveTimer = 8.0;
      this.stamina = this.maxStamina;
      this.battery = 100;

      if (!this.exitUnlocked) {
        let nearestMain: CollectibleEntity | null = null;
        let bestD = Infinity;
        for (const item of this.collectibles) {
          if (item.collected) continue;
          if (item.kind === 'battery' || item.kind === 'diary') continue;
          const d = Math.hypot(item.x - this.playerX, item.z - this.playerZ);
          if (d < bestD) {
            bestD = d;
            nearestMain = item;
          }
        }
        if (nearestMain) {
          this.collectItemEntity(nearestMain);
          this.callbacks.onSystemNotice(
            '시스템 지배! 전 괴물 12초 정지 및 가장 가까운 봉인 목표 1개를 원격 회수했습니다!'
          );
          return;
        }
      } else if (this.mapData) {
        // Warp safely right in front of the unlocked Exit Torii
        const dirs = [
          [0, -1],
          [-1, 0],
          [1, 0],
          [0, 1],
        ];
        for (const [ox, oz] of dirs) {
          const tx = this.mapData.exitTile.gx + ox;
          const tz = this.mapData.exitTile.gz + oz;
          if (!isWall(tx, tz, this.mapData)) {
            const safePos = gridToWorld(tx, tz, this.mapData);
            this.playerX = safePos.x;
            this.playerZ = safePos.z;
            this.yaw = Math.atan2(-(this.exitPos.x - this.playerX), -(this.exitPos.z - this.playerZ));
            break;
          }
        }
        this.callbacks.onSystemNotice(
          '시스템 지배! 전 괴물 12초 정지 및 탈출 도리이 앞 안전 지대로 순간이동했습니다!'
        );
        return;
      }
      this.callbacks.onSystemNotice('시스템 지배! 모든 괴물을 12초간 강제 정지시켰습니다.');
    }
  }

  public setPaused(paused: boolean) {
    if (this.mode === 'title' || this.mode === 'jumpscare') return;
    this.mode = paused ? 'paused' : 'playing';
    if (paused) {
      this.keys.clear();
      this.releasePointerLock();
    }
  }

  private clearWorld() {
    if (this.particleGeo) {
      this.particleGeo.dispose();
      this.particleGeo = null;
    }
    if (this.particleMat) {
      this.particleMat.dispose();
      this.particleMat = null;
    }
    this.ambientParticles = null;
    while (this.worldGroup.children.length > 0) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
    }
    this.lanterns = [];
    this.cursedDolls = [];
    this.hangingCocoons = [];
    this.collectibles = [];
    this.monsters = [];
    this.exitPortalLight = null;
    this.exitGateGroup = null;
    this.titleBoss = null;
  }

  public buildTitleDiorama() {
    this.clearWorld();
    this.mode = 'title';
    this.releasePointerLock();

    this.scene.background = new THREE.Color(0x050306);
    this.scene.fog = new THREE.FogExp2(0x050306, 0.075);
    this.scene.environmentIntensity = 0.65;
    this.ambientLight.color.setHex(0x1f1116);
    this.ambientLight.intensity = 0.42;
    this.hemiLight.intensity = 0.45;
    this.flashlight.intensity = 0;
    this.playerFillLight.intensity = 0;

    // Stone Shrine Path
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.textures.shrineStone,
      roughness: 0.78,
      metalness: 0.08,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 48), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.worldGroup.add(floor);

    // Row of 4 Crimson Torii Gates leading into mist
    for (let i = 0; i < 4; i++) {
      const gate = createToriiGate(1.18, true);
      gate.position.set(0, 0, -i * 5.2);
      this.worldGroup.add(gate);

      const { group: lL, light: ltL } = createPaperLantern(0xff6b35);
      lL.position.set(-1.35, 2.3, -i * 5.2 + 0.4);
      this.worldGroup.add(lL);
      this.lanterns.push({ light: ltL, baseIntensity: 2.1, phase: i * 1.3 });

      const { group: lR, light: ltR } = createPaperLantern(0xff6b35);
      lR.position.set(1.35, 2.3, -i * 5.2 + 0.4);
      this.worldGroup.add(lR);
      this.lanterns.push({ light: ltR, baseIntensity: 2.1, phase: i * 1.9 + 0.7 });
    }

    // Saigomo (Kintoru's Spider Form) standing ominously under the distant Torii
    const saigomo = createMonsterRig('saigomo', this.textures);
    saigomo.group.position.set(0, 0, -13.5);
    this.worldGroup.add(saigomo.group);
    this.titleBoss = saigomo;

    this.camera.position.set(0, 1.55, 5.2);
    this.camera.lookAt(0, 1.75, -12);
  }

  public startChapter(
    chapterId: number,
    difficulty: DifficultyMode,
    jobId: JobId = 'student'
  ) {
    this.clearWorld();
    this.chapterId = chapterId;
    this.difficulty = difficulty;
    this.jobId = jobId;
    const meta = CHAPTERS.find((c) => c.id === chapterId) || CHAPTERS[0];
    const jobMeta = JOBS.find((j) => j.id === jobId) || JOBS[0];
    const map = parseChapterMap(chapterId);
    this.mapData = map;

    this.mode = 'playing';
    this.elapsedSeconds = 0;
    this.collectedItems = 0;
    this.requiredItems = meta.requiredItems;
    this.exitUnlocked = false;

    this.maxStamina = jobId === 'student' ? 130 : 100;
    this.stamina = this.maxStamina;
    this.battery = 100;
    this.flashlightOn = true;
    this.crouching = false;
    this.exhausted = false;
    this.eyeHeight = 1.65;
    this.skillCooldown = 0;
    this.maxSkillCooldown = jobMeta.cooldownSec;
    this.skillActiveTimer = 0;
    this.doctorReviveReady = jobId === 'doctor';
    this.invulnTimer = 0;
    this.hasTriggeredFirstChase = false;
    this.wasAnyChasing = false;
    this.halfSubtitleShown = false;
    this.jumpscareMonster = null;
    this.keys.clear();

    const isDev = jobId === 'developer';

    // Configure Job Flashlight Optics
    if (isDev) {
      this.flashlight.distance = 54;
      this.flashlight.angle = Math.PI / 3.4;
    } else if (jobId === 'police') {
      this.flashlight.distance = 35;
      this.flashlight.angle = Math.PI / 4.2;
    } else {
      this.flashlight.distance = 27;
      this.flashlight.angle = Math.PI / 5.2;
    }

    // Dark base illumination so flashlight is truly needed (Developer has night-vision aura)
    this.scene.background = new THREE.Color(meta.fogColor);
    this.scene.fog = new THREE.FogExp2(meta.fogColor, isDev ? meta.fogDensity * 0.58 : meta.fogDensity);
    this.scene.environmentIntensity = isDev ? 0.45 : 0.09;
    this.ambientLight.color.setHex(meta.ambientColor);
    this.ambientLight.intensity = isDev ? 0.34 : 0.05;
    this.hemiLight.intensity = isDev ? 0.38 : 0.07;

    if (isDev) {
      this.playerFillLight.color.setHex(0xe0f2fe);
      this.playerFillLight.intensity = 2.4;
      this.playerFillLight.distance = 14.0;
    } else {
      this.playerFillLight.color.setHex(0x334155);
      this.playerFillLight.intensity = 0.14;
      this.playerFillLight.distance = 2.1;
    }

    // Floor & Ceiling
    const floorTex =
      chapterId === 1
        ? this.textures.woodFloor
        : chapterId === 2
          ? this.textures.tatamiFloor
          : this.textures.shrineStone;

    const mapW = map.width * TILE_SIZE;
    const mapH = map.height * TILE_SIZE;

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: chapterId >= 3 ? 0.68 : 0.82,
      metalness: chapterId >= 3 ? 0.14 : 0.04,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(mapW, mapH), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.worldGroup.add(floor);

    const ceilMat = new THREE.MeshStandardMaterial({
      map: chapterId === 1 ? this.textures.schoolCeiling : this.textures.ceilingWood,
      roughness: chapterId === 1 ? 0.85 : 0.92,
      metalness: 0.04,
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(mapW, mapH), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    this.worldGroup.add(ceiling);

    // Flooded Swamp Water Overlay (~ tiles in Chapter 3 Cherry Swamp & Chapter 4 Blood Swamp)
    if (map.waterTiles.length > 0) {
      const waterMat = new THREE.MeshStandardMaterial({
        map: chapterId === 4 ? this.textures.bloodWater : this.textures.shrineWater,
        roughness: 0.12,
        metalness: 0.72,
        transparent: true,
        opacity: 0.84,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const waterGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
      const waterMesh = new THREE.InstancedMesh(waterGeo, waterMat, map.waterTiles.length);
      const wDummy = new THREE.Object3D();
      map.waterTiles.forEach((wt, i) => {
        const pos = gridToWorld(wt.gx, wt.gz, map);
        wDummy.position.set(pos.x, 0.02, pos.z);
        wDummy.rotation.x = -Math.PI / 2;
        wDummy.updateMatrix();
        waterMesh.setMatrixAt(i, wDummy.matrix);
      });
      waterMesh.computeBoundingSphere();
      this.worldGroup.add(waterMesh);
    }

    // Instanced Walls
    const wallTex =
      chapterId === 1
        ? this.textures.schoolWall
        : chapterId === 4
          ? this.textures.shrineWall
          : this.textures.shojiWall;

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.85,
      metalness: 0.05,
    });

    let wallCount = 0;
    for (let gz = 0; gz < map.height; gz++) {
      for (let gx = 0; gx < map.width; gx++) {
        if (map.grid[gz][gx] === '#') wallCount++;
      }
    }

    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
    const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
    wallMesh.castShadow = !this.isSoftwareGl;
    wallMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let gz = 0; gz < map.height; gz++) {
      for (let gx = 0; gx < map.width; gx++) {
        if (map.grid[gz][gx] === '#') {
          const pos = gridToWorld(gx, gz, map);
          dummy.position.set(pos.x, WALL_HEIGHT / 2, pos.z);
          dummy.updateMatrix();
          wallMesh.setMatrixAt(idx++, dummy.matrix);
        }
      }
    }
    wallMesh.computeBoundingSphere();
    this.worldGroup.add(wallMesh);

    // Architectural Ceiling Beams / Pipes & Wall Corner Trim Columns (InstancedMesh)
    const beamSpots: Array<{ x: number; z: number; rotY: number }> = [];
    for (let gz = 1; gz < map.height - 1; gz += 2) {
      for (let gx = 1; gx < map.width - 1; gx += 2) {
        if (!isWall(gx, gz, map)) {
          const pos = gridToWorld(gx, gz, map);
          const ewOpen = !isWall(gx - 1, gz, map) || !isWall(gx + 1, gz, map);
          beamSpots.push({ x: pos.x, z: pos.z, rotY: ewOpen ? 0 : Math.PI / 2 });
        }
      }
    }
    if (beamSpots.length > 0) {
      const beamMat = new THREE.MeshStandardMaterial({
        color: chapterId === 1 ? 0x2b3036 : chapterId === 4 ? 0x26090d : 0x1b120d,
        roughness: chapterId === 1 ? 0.55 : 0.85,
        metalness: chapterId === 1 ? 0.55 : 0.08,
      });
      const beamGeo = new THREE.BoxGeometry(0.24, 0.22, TILE_SIZE);
      const beamMesh = new THREE.InstancedMesh(beamGeo, beamMat, beamSpots.length);
      const bDummy = new THREE.Object3D();
      beamSpots.forEach((bs, bi) => {
        bDummy.position.set(bs.x, WALL_HEIGHT - 0.11, bs.z);
        bDummy.rotation.y = bs.rotY;
        bDummy.updateMatrix();
        beamMesh.setMatrixAt(bi, bDummy.matrix);
      });
      beamMesh.computeBoundingSphere();
      this.worldGroup.add(beamMesh);
    }

    // Scattered Floor Blood Decals & Drag Streaks
    const bloodSpots: Array<{ x: number; z: number; rot: number; scale: number }> = [];
    for (let i = 0; i < map.walkableTiles.length; i += 9) {
      const wt = map.walkableTiles[(i * 7 + chapterId * 3) % map.walkableTiles.length];
      if (wt.gx === map.playerStart.gx && wt.gz === map.playerStart.gz) continue;
      const pos = gridToWorld(wt.gx, wt.gz, map);
      bloodSpots.push({
        x: pos.x + ((i % 3) - 1) * 0.35,
        z: pos.z + (((i + 1) % 3) - 1) * 0.35,
        rot: (i * 1.37) % (Math.PI * 2),
        scale: 0.72 + (i % 4) * 0.18,
      });
      if (bloodSpots.length >= 24) break;
    }
    if (bloodSpots.length > 0) {
      const bloodMat = new THREE.MeshBasicMaterial({
        map: this.textures.bloodDecal,
        transparent: true,
        opacity: chapterId === 4 ? 0.92 : 0.76,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const bloodGeo = new THREE.PlaneGeometry(2.1, 2.1);
      const bloodMesh = new THREE.InstancedMesh(bloodGeo, bloodMat, bloodSpots.length);
      const bdDummy = new THREE.Object3D();
      bloodSpots.forEach((bs, bi) => {
        bdDummy.position.set(bs.x, 0.028, bs.z);
        bdDummy.rotation.set(-Math.PI / 2, 0, bs.rot);
        bdDummy.scale.setScalar(bs.scale);
        bdDummy.updateMatrix();
        bloodMesh.setMatrixAt(bi, bdDummy.matrix);
      });
      bloodMesh.computeBoundingSphere();
      this.worldGroup.add(bloodMesh);
    }

    // Haunted Wall Claw Scratches & Crooked Ofuda Wards
    let wallDecalCount = 0;
    for (let i = 3; i < map.walkableTiles.length && wallDecalCount < 10; i += 14) {
      const wt = map.walkableTiles[i];
      if (isWall(wt.gx, wt.gz - 1, map)) {
        const pos = gridToWorld(wt.gx, wt.gz, map);
        const cluster = createWallTalismanCluster(this.textures);
        cluster.position.set(pos.x, 0, pos.z - TILE_SIZE * 0.49);
        this.worldGroup.add(cluster);
        wallDecalCount++;
      } else if (isWall(wt.gx - 1, wt.gz, map)) {
        const pos = gridToWorld(wt.gx, wt.gz, map);
        const cluster = createWallTalismanCluster(this.textures);
        cluster.position.set(pos.x - TILE_SIZE * 0.49, 0, pos.z);
        cluster.rotation.y = Math.PI / 2;
        this.worldGroup.add(cluster);
        wallDecalCount++;
      }
    }

    // School Ceiling Fluorescents (Ch1: dead, violently flickering, & dim) vs Paper Lanterns (Ch2-4)
    const lanternColor =
      chapterId === 4 ? 0xdc2626 : chapterId === 3 ? 0xdb2777 : 0xea580c;
    map.lanterns.forEach((l, i) => {
      const pos = gridToWorld(l.gx, l.gz, map);
      if (chapterId === 1) {
        const dead = i % 3 === 2;
        const broken = !dead && i % 2 === 1;
        const { group, light, tubeMat } = createFluorescentLight(broken || dead);
        group.position.set(pos.x, WALL_HEIGHT - 0.06, pos.z);
        if (i % 2 === 0) group.rotation.y = Math.PI / 2;
        if (dead) {
          light.intensity = 0;
          tubeMat.emissiveIntensity = 0.04;
        } else {
          light.intensity = broken ? 0.58 : 0.85;
        }
        this.worldGroup.add(group);
        this.lanterns.push({
          light,
          baseIntensity: dead ? 0 : broken ? 0.58 : 0.85,
          phase: i * 1.7,
          tubeMat,
          flickerBroken: broken,
          deadBroken: dead,
        });
      } else {
        const { group, light } = createPaperLantern(lanternColor);
        group.position.set(pos.x, WALL_HEIGHT - 0.55, pos.z);
        this.worldGroup.add(group);
        this.lanterns.push({ light, baseIntensity: 0.68, phase: i * 1.15 });
      }
    });

    // Desks (Ch1, some knocked tilted!) or Chabudai Tables (Ch2)
    map.desks.forEach((d, i) => {
      const pos = gridToWorld(d.gx, d.gz, map);
      const prop = chapterId === 2 ? createChabudaiTable() : createSchoolDesk();
      prop.position.set(pos.x, 0, pos.z);
      prop.rotation.y = i % 2 === 0 ? 0.14 : -0.24;
      if (chapterId === 1 && i % 4 === 2) {
        prop.rotation.z = 0.22;
      }
      this.worldGroup.add(prop);
    });

    // School Lockers (Ch1)
    map.lockers.forEach((lk, i) => {
      const pos = gridToWorld(lk.gx, lk.gz, map);
      const locker = createSchoolLocker(this.textures);
      locker.position.set(pos.x, 0, pos.z);
      locker.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
      this.worldGroup.add(locker);
    });

    // Chalkboards, Frozen Clocks & Teacher Podiums (Ch1 classrooms)
    map.chalkboards.forEach((cb) => {
      const pos = gridToWorld(cb.gx, cb.gz, map);
      const board = createChalkboard(this.textures);
      board.position.set(pos.x, 0, pos.z - TILE_SIZE * 0.45);
      this.worldGroup.add(board);

      if (!isWall(cb.gx, cb.gz + 1, map)) {
        const podium = createTeacherPodium();
        podium.position.set(pos.x, 0, pos.z + 0.85);
        this.worldGroup.add(podium);
      }
    });

    // Hallway Bulletin Notice Boards (Ch1)
    if (chapterId === 1) {
      [
        { gx: 5, gz: 7 },
        { gx: 13, gz: 7 },
      ].forEach((spot) => {
        const pos = gridToWorld(spot.gx, spot.gz, map);
        const notice = createSchoolBulletinBoard(this.textures);
        notice.position.set(pos.x, 0, pos.z + TILE_SIZE * 0.47);
        notice.rotation.y = Math.PI;
        this.worldGroup.add(notice);
      });
    }

    // Japanese Emergency Exit Signs (非常口)
    map.exitSigns.forEach((es, i) => {
      const pos = gridToWorld(es.gx, es.gz, map);
      const { group, light } = createEmergencyExitSign(this.textures);
      group.position.set(pos.x, WALL_HEIGHT - 0.5, pos.z);
      group.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
      this.worldGroup.add(group);
      this.lanterns.push({ light, baseIntensity: 1.15, phase: i * 2.1 });
    });

    // Senbon Torii Avenue Arches (Ch3)
    map.toriiArches.forEach((ta) => {
      const pos = gridToWorld(ta.gx, ta.gz, map);
      const arch = createToriiGate(0.88, true);
      // Orient along North-South vs East-West avenue
      const isEastWest =
        !isWall(ta.gx - 1, ta.gz, map) && !isWall(ta.gx + 1, ta.gz, map);
      arch.rotation.y = isEastWest ? Math.PI / 2 : 0;
      arch.position.set(pos.x, 0, pos.z);
      this.worldGroup.add(arch);
    });

    // Kino's Spiderwebs (Ch2)
    map.spiderWebs.forEach((wb, i) => {
      const pos = gridToWorld(wb.gx, wb.gz, map);
      const web = createSpiderWebCanopy(this.textures);
      web.position.set(pos.x, 0, pos.z);
      web.rotation.y = i * 0.85;
      this.worldGroup.add(web);
    });

    // Sacred Cursed Trees (Ch3 Cherry Blossoms, Ch4 Twisted Shrine)
    map.sacredTrees.forEach((st) => {
      const pos = gridToWorld(st.gx, st.gz, map);
      const tree = createSacredTree(this.textures, chapterId === 3);
      tree.position.set(pos.x, 0, pos.z);
      this.worldGroup.add(tree);
    });

    // Carved Stone Lanterns (Toro)
    map.stoneToros.forEach((tr, i) => {
      const pos = gridToWorld(tr.gx, tr.gz, map);
      const { group, light } = createStoneToro();
      group.position.set(pos.x, 0, pos.z);
      this.worldGroup.add(group);
      this.lanterns.push({ light, baseIntensity: 0.65, phase: i * 1.4 });
    });

    // Chapter-Specific Scare Props:
    // Ch.2: Head-turning Cursed Dolls & Blood-stained Hospital Gurneys
    if (chapterId === 2) {
      [
        { gx: 9, gz: 8 },
        { gx: 13, gz: 8 },
        { gx: 9, gz: 13 },
        { gx: 13, gz: 13 },
      ].forEach((spot, idx) => {
        if (!isWall(spot.gx, spot.gz, map)) {
          const pos = gridToWorld(spot.gx, spot.gz, map);
          const { group, head } = createCursedDollProp(this.textures);
          group.position.set(pos.x, 0, pos.z);
          this.worldGroup.add(group);
          this.cursedDolls.push({ head, x: pos.x, z: pos.z, baseYaw: idx * 0.8 });
        }
      });

      [
        { gx: 19, gz: 8 },
        { gx: 19, gz: 19 },
      ].forEach((spot) => {
        if (!isWall(spot.gx, spot.gz, map)) {
          const pos = gridToWorld(spot.gx, spot.gz, map);
          const gurney = createHospitalGurney();
          gurney.position.set(pos.x, 0, pos.z);
          gurney.rotation.y = 0.18;
          this.worldGroup.add(gurney);
        }
      });
    }

    // Ch.3 & Ch.4: Eerie Stone Jizo Statues watching from the Swamp Mist
    if (chapterId === 3 || chapterId === 4) {
      [
        { gx: 7, gz: 5 },
        { gx: 15, gz: 5 },
        { gx: 7, gz: 16 },
        { gx: 15, gz: 16 },
      ].forEach((spot, idx) => {
        if (!isWall(spot.gx, spot.gz, map)) {
          const pos = gridToWorld(spot.gx, spot.gz, map);
          const jizo = createStoneJizoStatue();
          jizo.position.set(pos.x + (idx % 2 === 0 ? -0.9 : 0.9), 0, pos.z);
          jizo.lookAt(0, 0, 0);
          this.worldGroup.add(jizo);
        }
      });
    }

    // Ch.4: Swaying Hanging Spider Cocoons over the Blood Swamp
    if (chapterId === 4) {
      for (let i = 0; i < map.waterTiles.length; i += 7) {
        const wt = map.waterTiles[i];
        const pos = gridToWorld(wt.gx, wt.gz, map);
        const cocoon = createSpiderCocoon(this.textures);
        cocoon.position.set(pos.x, WALL_HEIGHT, pos.z);
        this.worldGroup.add(cocoon);
        this.hangingCocoons.push({ group: cocoon, phase: i * 0.9 });
      }
    }

    // Atmospheric 3D Floating Dust / Sakura Ash / Blood Mist Particles
    const particleCount = 280;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * mapW * 0.9;
      pPositions[i * 3 + 1] = 0.25 + Math.random() * (WALL_HEIGHT - 0.55);
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * mapH * 0.9;
    }
    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const particleColor =
      chapterId === 3 ? 0xf9a8d4 : chapterId === 4 ? 0xef4444 : chapterId === 2 ? 0xd8b4fe : 0xcbd5e1;
    this.particleMat = new THREE.PointsMaterial({
      color: particleColor,
      map: this.textures.particleMote,
      size: chapterId === 3 ? 0.16 : 0.11,
      transparent: true,
      opacity: chapterId >= 3 ? 0.65 : 0.42,
      depthWrite: false,
    });
    this.ambientParticles = new THREE.Points(this.particleGeo, this.particleMat);
    this.worldGroup.add(this.ambientParticles);

    // Exit Torii Portal
    const exitWorld = gridToWorld(map.exitTile.gx, map.exitTile.gz, map);
    this.exitPos = exitWorld;
    const exitGate = createToriiGate(0.92, false);
    exitGate.position.set(exitWorld.x, 0, exitWorld.z);
    this.worldGroup.add(exitGate);
    this.exitGateGroup = exitGate;

    const exitLight = new THREE.PointLight(0x991b1b, 1.4, 8, 1.6);
    exitLight.position.set(exitWorld.x, 1.8, exitWorld.z);
    this.worldGroup.add(exitLight);
    this.exitPortalLight = exitLight;

    // Collectibles
    const chapterDiaries = DIARIES.filter((d) => d.chapterId === chapterId);
    let diaryIdx = 0;

    map.items.forEach((item, i) => {
      const pos = gridToWorld(item.gx, item.gz, map);
      const mesh = createCollectibleMesh(item.kind, this.textures);
      const baseY = item.kind === 'diary' ? 0.55 : 1.05;
      mesh.position.set(pos.x, baseY, pos.z);
      this.worldGroup.add(mesh);

      let light: THREE.PointLight | undefined;
      if (item.kind !== 'battery') {
        const glowColor =
          item.kind === 'key'
            ? 0xf59e0b
            : item.kind === 'butterfly'
              ? 0xf472b6
              : item.kind === 'ofuda' || item.kind === 'seal'
                ? 0xef4444
                : 0xd6d3d1;
        light = new THREE.PointLight(glowColor, 1.1, 4.5, 2);
        light.position.set(pos.x, baseY + 0.25, pos.z);
        this.worldGroup.add(light);
      }

      let diaryId: string | undefined;
      if (item.kind === 'diary') {
        diaryId = chapterDiaries[diaryIdx % chapterDiaries.length]?.id;
        diaryIdx++;
      }

      this.collectibles.push({
        id: `item_${i}`,
        kind: item.kind,
        diaryId,
        mesh,
        light,
        x: pos.x,
        z: pos.z,
        collected: false,
        baseY,
      });
    });

    // Monsters
    const speedScale = difficulty === 'nightmare' ? 1.2 : 1.0;
    meta.monsters.forEach((mId, i) => {
      const spawn = map.monsterSpawns[i % map.monsterSpawns.length] || { gx: 11, gz: 11 };
      const pos = gridToWorld(spawn.gx, spawn.gz, map);
      const rig = createMonsterRig(mId, this.textures);
      rig.group.position.set(pos.x, 0, pos.z);
      this.worldGroup.add(rig.group);

      const patrolPick =
        map.walkableTiles[Math.floor(Math.random() * map.walkableTiles.length)];

      const baseSpeed =
        mId === 'saigomo'
          ? 2.5
          : mId === 'oomukade'
            ? 2.45
            : mId === 'keiko'
              ? 2.3
              : mId === 'megumi'
                ? 2.15
                : 1.95;
      const chaseSpeed =
        mId === 'saigomo'
          ? 4.35
          : mId === 'oomukade'
            ? 4.25
            : mId === 'keiko'
              ? 4.05
              : mId === 'megumi'
                ? 3.9
                : 3.65;

      this.monsters.push({
        id: mId,
        rig,
        x: pos.x,
        z: pos.z,
        yaw: 0,
        state: 'patrol',
        targetGx: patrolPick.gx,
        targetGz: patrolPick.gz,
        baseSpeed: baseSpeed * speedScale,
        chaseSpeed: chaseSpeed * speedScale,
        memoryTimer: 0,
        pathRefreshTimer: 0,
        stunTimer: 0,
      });
    });

    // Place Player at Start
    const startWorld = gridToWorld(map.playerStart.gx, map.playerStart.gz, map);
    this.playerX = startWorld.x;
    this.playerZ = startWorld.z;
    this.yaw = -Math.PI / 2;
    this.pitch = 0;

    this.pushHudSnapshot(null, 99, null, false);
    this.callbacks.onSubtitle(meta.subtitles.onStart);
  }

  public triggerInteract() {
    if (this.mode !== 'playing' || !this.mapData) return;

    // 1. Check nearby collectibles
    let closestItem: CollectibleEntity | null = null;
    let bestDist = 2.35;
    for (const item of this.collectibles) {
      if (item.collected) continue;
      const d = Math.hypot(item.x - this.playerX, item.z - this.playerZ);
      if (d < bestDist) {
        bestDist = d;
        closestItem = item;
      }
    }

    if (closestItem) {
      this.collectItemEntity(closestItem);
      return;
    }

    // 2. Check Exit Portal
    const exitDist = Math.hypot(this.exitPos.x - this.playerX, this.exitPos.z - this.playerZ);
    if (exitDist < 2.6 && this.exitUnlocked) {
      soundEngine.playPortalUnlock();
      this.mode = 'paused';
      this.releasePointerLock();
      this.callbacks.onChapterClear(this.chapterId, this.elapsedSeconds);
    }
  }

  private collectItemEntity(item: CollectibleEntity) {
    item.collected = true;
    item.mesh.visible = false;
    if (item.light) item.light.intensity = 0;

    if (item.kind === 'battery') {
      this.battery = Math.min(100, this.battery + 45);
      soundEngine.playPickup('battery');
    } else if (item.kind === 'diary') {
      soundEngine.playPickup('diary');
      const diary = DIARIES.find((d) => d.id === item.diaryId);
      if (diary) {
        this.setPaused(true);
        this.callbacks.onDiaryFound(diary);
      }
    } else {
      this.collectedItems++;
      soundEngine.playPickup('key');
      this.callbacks.onItemCollected(
        this.collectedItems,
        this.requiredItems,
        item.kind
      );
      const chapterMeta = CHAPTERS.find((c) => c.id === this.chapterId) || CHAPTERS[0];
      if (this.collectedItems === 1) {
        this.callbacks.onSubtitle(chapterMeta.subtitles.onFirstItem);
      } else if (
        !this.halfSubtitleShown &&
        this.collectedItems >= Math.ceil(this.requiredItems / 2) &&
        this.collectedItems < this.requiredItems
      ) {
        this.halfSubtitleShown = true;
        this.callbacks.onSubtitle(chapterMeta.subtitles.onHalfItem);
      }
      if (this.collectedItems >= this.requiredItems && !this.exitUnlocked) {
        this.exitUnlocked = true;
        soundEngine.playPortalUnlock();
        if (this.exitPortalLight) {
          this.exitPortalLight.color.setHex(0x22c55e);
          this.exitPortalLight.intensity = 2.8;
        }
        if (this.exitGateGroup) {
          this.exitGateGroup.scale.setScalar(1.02);
        }
        this.callbacks.onSubtitle(chapterMeta.subtitles.onAllItems);
      }
    }
  }

  private canOccupy(x: number, z: number, radius = 0.45): boolean {
    if (!this.mapData) return false;
    const offsets = [
      [radius, radius],
      [-radius, radius],
      [radius, -radius],
      [-radius, -radius],
    ];
    for (let i = 0; i < 4; i++) {
      const { gx, gz } = worldToGrid(x + offsets[i][0], z + offsets[i][1], this.mapData);
      if (isWall(gx, gz, this.mapData)) return false;
    }
    return true;
  }

  private tick = () => {
    if (this.disposed) return;
    const rawDelta = this.clock.getDelta();
    const dt = Math.min(rawDelta, 0.08);
    const elapsed = this.clock.elapsedTime;

    if (this.mode === 'title') {
      this.updateTitleDiorama(elapsed);
    } else if (this.mode === 'playing') {
      this.updatePlaying(dt, elapsed);
    } else if (this.mode === 'jumpscare') {
      this.updateJumpscare(dt, elapsed);
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextTick();
  };

  private scheduleNextTick() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateTitleDiorama(elapsed: number) {
    this.camera.position.x = Math.sin(elapsed * 0.28) * 0.48;
    this.camera.position.y = 1.52 + Math.sin(elapsed * 0.55) * 0.08;
    this.camera.position.z = 5.0 + Math.cos(elapsed * 0.22) * 0.4;
    this.camera.lookAt(0, 1.78, -13);

    this.lanterns.forEach((l) => {
      l.light.intensity = l.baseIntensity + Math.sin(elapsed * 7 + l.phase) * 0.28;
    });

    if (this.titleBoss) {
      animateMonsterRig(this.titleBoss, 'saigomo', elapsed, false);
    }
  }

  private updatePlaying(dt: number, elapsed: number) {
    if (!this.mapData) return;
    this.elapsedSeconds += dt;
    if (this.skillCooldown > 0) this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    if (this.skillActiveTimer > 0) this.skillActiveTimer = Math.max(0, this.skillActiveTimer - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);

    // Optional keyboard look (Q / R)
    if (this.keys.has('KeyQ')) this.yaw += 1.9 * dt;
    if (this.keys.has('KeyR')) this.yaw -= 1.9 * dt;

    // Movement Input
    let moveForward = 0;
    let moveRight = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveForward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveForward -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveRight += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveRight -= 1;

    moveForward += this.touchMoveY;
    moveRight += this.touchMoveX;

    const isMoving = Math.abs(moveForward) > 0.05 || Math.abs(moveRight) > 0.05;
    const isDeveloper = this.jobId === 'developer';
    const studentBoost = this.jobId === 'student' && this.skillActiveTimer > 0;
    const wantsSprint =
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
      isMoving &&
      !this.crouching &&
      !this.exhausted;

    if (isDeveloper || studentBoost) {
      this.stamina = this.maxStamina;
      this.exhausted = false;
    } else if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - 24 * dt);
      if (this.stamina <= 1) this.exhausted = true;
    } else {
      const regenMult = this.jobId === 'student' ? 1.35 : 1.0;
      this.stamina = Math.min(
        this.maxStamina,
        this.stamina + (isMoving ? 10 : 18) * regenMult * dt
      );
      if (this.exhausted && this.stamina >= 28) this.exhausted = false;
    }

    const sprinting = wantsSprint && this.stamina > 0;
    const jobSpeedMult =
      isDeveloper
        ? this.skillActiveTimer > 0
          ? 2.05
          : 1.65
        : studentBoost
          ? 1.28
          : this.invulnTimer > 0
            ? 1.25
            : 1.0;
    const baseSpeed = this.crouching ? 2.15 : sprinting ? 5.35 : 3.55;
    const speed = baseSpeed * jobSpeedMult;

    if (isMoving) {
      _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
      _right.crossVectors(_forward, _up).normalize();
      _move
        .set(0, 0, 0)
        .addScaledVector(_forward, moveForward)
        .addScaledVector(_right, moveRight);
      if (_move.lengthSq() > 1) _move.normalize();

      const dx = _move.x * speed * dt;
      const dz = _move.z * speed * dt;

      if (this.canOccupy(this.playerX + dx, this.playerZ)) {
        this.playerX += dx;
      }
      if (this.canOccupy(this.playerX, this.playerZ + dz)) {
        this.playerZ += dz;
      }

      this.headBobPhase += dt * (sprinting ? 13 : this.crouching ? 5.5 : 8.5);
      this.stepDistAccum += speed * dt;
      const stepStride = sprinting ? 1.55 : this.crouching ? 1.25 : 1.45;
      if (this.stepDistAccum >= stepStride) {
        this.stepDistAccum = 0;
        soundEngine.playFootstep(sprinting, this.crouching);
      }
    }

    // Smooth crouch & FOV damping
    const targetEye = this.crouching ? 1.05 : 1.65;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, targetEye, 11, dt);
    const bobOffset = isMoving ? Math.sin(this.headBobPhase) * (sprinting ? 0.06 : 0.035) : 0;

    this.camera.position.set(this.playerX, this.eyeHeight + bobOffset, this.playerZ);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    const targetFov = sprinting || studentBoost ? 78 : this.crouching ? 68 : 72;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 9, dt);
      this.camera.updateProjectionMatrix();
    }

    // Flashlight & Battery (Job-aware)
    const baseDrain = this.difficulty === 'nightmare' ? 2.4 : 1.55;
    const drainMult =
      isDeveloper
        ? 0
        : this.jobId === 'exorcist'
          ? 0.55
          : this.jobId === 'police'
            ? 0.7
            : 1.0;
    if (this.flashlightOn) {
      this.battery = Math.max(0, this.battery - baseDrain * drainMult * dt);
      if (this.battery <= 0) {
        this.flashlightOn = false;
        soundEngine.playFlashlightToggle();
      }
    } else if (this.battery < 20) {
      this.battery = Math.min(20, this.battery + 1.4 * dt);
    }

    this.playerFillLight.position.set(this.playerX, this.eyeHeight, this.playerZ);
    this.flashlight.position.set(this.playerX, this.eyeHeight - 0.08, this.playerZ);
    _forward.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    _lookTarget.copy(this.camera.position).addScaledVector(_forward, 10);
    this.flashlightTarget.position.copy(_lookTarget);

    // Animate collectibles, lanterns, head-turning dolls, swaying cocoons & drifting particles
    for (const item of this.collectibles) {
      if (item.collected) continue;
      item.mesh.rotation.y = elapsed * 1.6;
      item.mesh.position.y = item.baseY + Math.sin(elapsed * 2.5 + item.x) * 0.08;
    }
    this.lanterns.forEach((l) => {
      if (l.deadBroken) {
        l.light.intensity = 0;
        return;
      }
      if (l.flickerBroken && l.tubeMat) {
        const pulse = Math.sin(elapsed * 33 + l.phase) * Math.sin(elapsed * 8.7 + l.phase);
        const on = pulse > -0.15;
        l.light.intensity = on ? l.baseIntensity : 0.04;
        l.tubeMat.emissiveIntensity = on ? 1.05 : 0.08;
      } else {
        l.light.intensity = l.baseIntensity + Math.sin(elapsed * 7.5 + l.phase) * 0.14;
      }
    });
    for (const doll of this.cursedDolls) {
      const dist = Math.hypot(this.playerX - doll.x, this.playerZ - doll.z);
      if (dist < 11.5) {
        const targetYaw = Math.atan2(this.playerX - doll.x, this.playerZ - doll.z);
        let diff = targetYaw - doll.head.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        doll.head.rotation.y += diff * Math.min(1, dt * 3.5);
      }
    }
    for (const coc of this.hangingCocoons) {
      coc.group.rotation.z = Math.sin(elapsed * 1.4 + coc.phase) * 0.09;
      coc.group.rotation.x = Math.cos(elapsed * 1.1 + coc.phase) * 0.06;
    }
    if (this.ambientParticles) {
      this.ambientParticles.rotation.y = elapsed * 0.012;
      this.ambientParticles.position.y = Math.sin(elapsed * 0.6) * 0.12;
    }

    // Update Monsters AI (Strict 12m aggro & chase range)
    const MAX_AGGRO_RANGE = 12.0;
    const playerGrid = worldToGrid(this.playerX, this.playerZ, this.mapData);
    let minMonsterDist = 999;
    let closestMonsterId: MonsterId | null = null;
    let anyChasing = false;

    const baseDetection = this.flashlightOn
      ? sprinting
        ? 12.0
        : 11.2
      : this.crouching
        ? 5.8
        : sprinting
          ? 11.0
          : 8.6;
    const stealthMult =
      isDeveloper && this.skillActiveTimer > 0
        ? 0.0
        : isDeveloper
          ? 0.55
          : this.jobId === 'doctor'
            ? 0.78
            : 1.0;
    const detectionRange = Math.min(MAX_AGGRO_RANGE, baseDetection * stealthMult);

    for (const m of this.monsters) {
      const distToPlayer = Math.hypot(this.playerX - m.x, this.playerZ - m.z);
      if (distToPlayer < minMonsterDist) {
        minMonsterDist = distToPlayer;
        closestMonsterId = m.id;
      }

      if (m.stunTimer > 0) {
        m.stunTimer = Math.max(0, m.stunTimer - dt);
        animateMonsterRig(m.rig, m.id, elapsed * 0.35, false);
        continue;
      }

      // Check Catch -> Developer God Shield, Doctor Second Chance, or Jumpscare!
      if (distToPlayer < 1.18 && this.invulnTimer <= 0) {
        if (isDeveloper) {
          this.invulnTimer = 1.5;
          m.stunTimer = 5.0;
          m.state = 'patrol';
          m.memoryTimer = 0;
          soundEngine.playPortalUnlock();
          this.callbacks.onSystemNotice(
            '관리자 무적 실드! 괴물의 공격을 반사하고 5초간 경직시켰습니다.'
          );
          continue;
        }
        if (this.doctorReviveReady) {
          this.doctorReviveReady = false;
          this.invulnTimer = 3.2;
          m.stunTimer = 4.0;
          m.state = 'patrol';
          m.memoryTimer = 0;
          soundEngine.playPortalUnlock();
          this.callbacks.onSystemNotice(
            '의사의 응급 처치! 치명적인 공격을 밀쳐내고 3초간 무적 상태가 되었습니다.'
          );
          continue;
        }
        this.triggerJumpscare(m);
        return;
      }

      const seesPlayer =
        this.invulnTimer <= 0 &&
        distToPlayer <= detectionRange &&
        hasLineOfSight(m.x, m.z, this.playerX, this.playerZ, this.mapData);

      // Immediately stop chasing if player leaves 12m attack/aggro range
      if (m.state === 'chase' && distToPlayer > MAX_AGGRO_RANGE) {
        m.state = 'patrol';
        m.memoryTimer = 0;
        const pick =
          this.mapData.walkableTiles[
            Math.floor(Math.random() * this.mapData.walkableTiles.length)
          ];
        m.targetGx = pick.gx;
        m.targetGz = pick.gz;
      } else if (seesPlayer) {
        m.state = 'chase';
        m.memoryTimer = 4.2;
        m.targetGx = playerGrid.gx;
        m.targetGz = playerGrid.gz;
      } else if (m.state === 'chase') {
        m.memoryTimer -= dt;
        if (m.memoryTimer <= 0) {
          m.state = 'patrol';
          const pick =
            this.mapData.walkableTiles[
              Math.floor(Math.random() * this.mapData.walkableTiles.length)
            ];
          m.targetGx = pick.gx;
          m.targetGz = pick.gz;
        }
      }

      if (m.state === 'chase') anyChasing = true;

      m.pathRefreshTimer -= dt;
      const mGrid = worldToGrid(m.x, m.z, this.mapData);

      if (m.state === 'patrol' && mGrid.gx === m.targetGx && mGrid.gz === m.targetGz) {
        const pick =
          this.mapData.walkableTiles[
            Math.floor(Math.random() * this.mapData.walkableTiles.length)
          ];
        m.targetGx = pick.gx;
        m.targetGz = pick.gz;
      }

      let steerX = this.playerX;
      let steerZ = this.playerZ;
      if (!(m.state === 'chase' && seesPlayer)) {
        const nextCell = findNextStepBFS(mGrid.gx, mGrid.gz, m.targetGx, m.targetGz, this.mapData);
        const wPos = gridToWorld(nextCell.gx, nextCell.gz, this.mapData);
        steerX = wPos.x;
        steerZ = wPos.z;
      }

      const dx = steerX - m.x;
      const dz = steerZ - m.z;
      const len = Math.hypot(dx, dz);
      const spd = m.state === 'chase' ? m.chaseSpeed : m.baseSpeed;
      if (len > 0.04) {
        m.x += (dx / len) * spd * dt;
        m.z += (dz / len) * spd * dt;
        const desiredYaw = Math.atan2(dx, dz);
        let diff = desiredYaw - m.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        m.yaw += diff * Math.min(1, dt * 8);
      }

      m.rig.group.position.set(m.x, 0, m.z);
      m.rig.group.rotation.y = m.yaw;
      animateMonsterRig(m.rig, m.id, elapsed, m.state === 'chase');
    }

    // Flashlight flicker when low battery or monster nearby (Developer never flickers)
    if (this.flashlightOn) {
      let flicker = 1;
      if (!isDeveloper && (this.battery < 18 || minMonsterDist < 8.5)) {
        flicker = Math.sin(elapsed * 37) > -0.6 ? 1 : 0.18;
      }
      const baseBeam = isDeveloper ? 12.2 : this.jobId === 'police' ? 9.4 : 7.8;
      this.flashlight.intensity = baseBeam * flicker;
    } else {
      this.flashlight.intensity = 0;
    }

    // Story Subtitle triggers for chase start & 12m escape
    const chapterMeta = CHAPTERS.find((c) => c.id === this.chapterId) || CHAPTERS[0];
    if (anyChasing && !this.hasTriggeredFirstChase) {
      this.hasTriggeredFirstChase = true;
      this.callbacks.onSubtitle(chapterMeta.subtitles.onFirstChase);
    } else if (this.wasAnyChasing && !anyChasing && minMonsterDist > MAX_AGGRO_RANGE) {
      this.callbacks.onSubtitle(chapterMeta.subtitles.onEscapeChase);
    }
    this.wasAnyChasing = anyChasing;

    // Proximity Heartbeat & Monster Audio Cues
    soundEngine.updateProximityAudio(minMonsterDist, closestMonsterId, anyChasing, dt);

    // Check interactable prompt
    let prompt: string | null = null;
    for (const item of this.collectibles) {
      if (item.collected) continue;
      if (Math.hypot(item.x - this.playerX, item.z - this.playerZ) < 2.35) {
        prompt =
          item.kind === 'battery'
            ? '[E] 손전등 건전지 획득'
            : item.kind === 'diary'
              ? '[E] 남겨진 기록 읽기'
              : item.kind === 'key'
                ? '[E] 교실 열쇠 획득'
                : item.kind === 'ofuda'
                  ? '[E] 조상의 기억 부적 획득'
                  : item.kind === 'butterfly'
                    ? '[E] 나비 영혼 등불 바치기'
                    : '[E] 축복받은 검의 인장 획득';
        break;
      }
    }
    if (!prompt && Math.hypot(this.exitPos.x - this.playerX, this.exitPos.z - this.playerZ) < 2.6) {
      prompt = this.exitUnlocked
        ? '[E] 붉은 도리이 너머로 탈출'
        : `봉인됨 (${this.collectedItems}/${this.requiredItems} 수집 필요)`;
    }

    this.hudTimer += dt;
    if (this.hudTimer >= 0.08) {
      this.hudTimer = 0;
      this.pushHudSnapshot(prompt, minMonsterDist, closestMonsterId, anyChasing);
    }
  }

  private triggerJumpscare(monster: MonsterEntity) {
    this.mode = 'jumpscare';
    this.jumpscareTimer = 1.35;
    this.jumpscareMonster = monster;
    this.keys.clear();
    this.releasePointerLock();
    soundEngine.playJumpscare();
    this.callbacks.onJumpscare(monster.id);
  }

  private updateJumpscare(dt: number, elapsed: number) {
    this.jumpscareTimer -= dt;
    if (this.jumpscareMonster) {
      const m = this.jumpscareMonster;
      // Place camera directly in front of the monster's terrifying face with shake
      const faceY =
        m.id === 'saigomo' || m.id === 'biwaki'
          ? 2.1
          : m.id === 'oomukade'
            ? 1.68
            : 1.92;
      const forwardX = Math.sin(m.yaw);
      const forwardZ = Math.cos(m.yaw);
      const shakeX = (Math.random() - 0.5) * 0.14;
      const shakeY = (Math.random() - 0.5) * 0.14;

      this.camera.position.set(
        m.x + forwardX * 0.95 + shakeX,
        faceY + shakeY,
        m.z + forwardZ * 0.95
      );
      this.camera.lookAt(m.x, faceY, m.z);
      this.flashlight.position.copy(this.camera.position);
      this.flashlightTarget.position.set(m.x, faceY, m.z);
      this.flashlight.intensity = Math.sin(elapsed * 45) > 0 ? 9 : 2.5;
      animateMonsterRig(m.rig, m.id, elapsed, true);
    }

    if (this.jumpscareTimer <= 0 && this.jumpscareMonster) {
      const killerId = this.jumpscareMonster.id;
      this.jumpscareMonster = null;
      this.mode = 'paused';
      this.callbacks.onPlayerDied(killerId);
    }
  }

  private pushHudSnapshot(
    nearestPrompt: string | null,
    nearestMonsterDist: number,
    closestMonsterId: MonsterId | null,
    anyMonsterChasing: boolean
  ) {
    let nearestObjectiveDist: number | null = null;
    let nearestObjectiveAngleDeg: number | null = null;

    if (this.jobId === 'exorcist' || this.jobId === 'developer') {
      let targetX: number | null = null;
      let targetZ: number | null = null;
      if (this.exitUnlocked) {
        targetX = this.exitPos.x;
        targetZ = this.exitPos.z;
      } else {
        let bestD = Infinity;
        for (const item of this.collectibles) {
          if (item.collected) continue;
          if (item.kind === 'battery' || item.kind === 'diary') continue;
          const d = Math.hypot(item.x - this.playerX, item.z - this.playerZ);
          if (d < bestD) {
            bestD = d;
            targetX = item.x;
            targetZ = item.z;
          }
        }
      }
      if (targetX !== null && targetZ !== null) {
        const dx = targetX - this.playerX;
        const dz = targetZ - this.playerZ;
        nearestObjectiveDist = Math.round(Math.hypot(dx, dz));
        // Relative bearing from player's facing vector (-sin(yaw), -cos(yaw))
        const worldAngle = Math.atan2(-dx, -dz);
        let rel = worldAngle - this.yaw;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        nearestObjectiveAngleDeg = Math.round((-rel * 180) / Math.PI);
      }
    }

    this.callbacks.onHudUpdate({
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      battery: this.battery,
      flashlightOn: this.flashlightOn,
      crouching: this.crouching,
      collectedItems: this.collectedItems,
      requiredItems: this.requiredItems,
      exitUnlocked: this.exitUnlocked,
      nearestPrompt,
      nearestMonsterDist,
      closestMonsterId,
      anyMonsterChasing,
      pointerLocked: this.pointerLocked,
      elapsedSeconds: this.elapsedSeconds,
      jobId: this.jobId,
      skillCooldown: this.skillCooldown,
      maxSkillCooldown: this.maxSkillCooldown,
      skillActive: this.skillActiveTimer > 0,
      doctorReviveReady: this.doctorReviveReady,
      nearestObjectiveDist,
      nearestObjectiveAngleDeg,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.releasePointerLock();
    this.textures.dispose();
    this.envMap.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
