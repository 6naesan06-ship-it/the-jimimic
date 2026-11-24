import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CHAPTERS, CutsceneLine, DIARIES, DiaryEntry, DifficultyMode, JOBS, JobId, MonsterId } from '../data/lore';
import {
  ChapterMapData,
  TILE_SIZE,
  WALL_HEIGHT,
  canReachAllTargets,
  findNextStepBFS,
  gridToWorld,
  hasLineOfSight,
  isWall,
  parseChapterMap,
  worldToGrid,
} from './maps';
import {
  AnimatedMonsterRig,
  BasementDoorRig,
  animateMonsterRig,
  createBasementDoor,
  createBlessedSwordViewModel,
  createBossShieldAura,
  createBossWebOrb,
  createCavernCrystalCluster,
  createCavernStalagmite,
  createChabudaiTable,
  createChalkboard,
  createCollectibleMesh,
  createCrimsonSpikePillar,
  createCursedDollProp,
  createEmergencyExitSign,
  createExpandingShockwave,
  createFluorescentLight,
  createGroundWarningDisc,
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
  createTelegraphRing,
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
  isBossFight: boolean;
  playerHp: number;
  playerMaxHp: number;
  hurtFlash: number;
  bossHp: number;
  bossMaxHp: number;
  bossStunTimer: number;
  bossAttackWarning: string | null;
  bossHitsLanded: number;
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
  onKintoruControlChange?: (active: boolean) => void;
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
  private particleVelocities: Float32Array | null = null;
  private mistParticles: THREE.Points | null = null;
  private mistGeo: THREE.BufferGeometry | null = null;
  private mistMat: THREE.PointsMaterial | null = null;
  private mistVelocities: Float32Array | null = null;
  private particleBounds = { w: 72, h: 72 };
  private shiftWallMesh: THREE.InstancedMesh | null = null;
  private shiftSlots: Array<{ gx: number; gz: number; x: number; z: number }> = [];
  private mapShiftTimer = 0;
  private readonly shiftDummy = new THREE.Object3D();

  // Entities
  private collectibles: CollectibleEntity[] = [];
  private monsters: MonsterEntity[] = [];
  private collectedItems = 0;
  private requiredItems = 4;
  private exitUnlocked = false;
  private exitPos = { x: 0, z: 0 };
  private exitPortalLight: THREE.PointLight | null = null;
  private exitGateGroup: THREE.Group | null = null;
  private basementDoorRig: BasementDoorRig | null = null;

  // Chapter 4 Blessed Sword & Boss Combat state
  private swordGroup: THREE.Group | null = null;
  private swordSwingTimer = 0;
  private swordSwingDuration = 0.28;
  private swordCooldown = 0;
  private swordHitApplied = false;
  private playerHp = 100;
  private playerMaxHp = 100;
  private hurtFlash = 0;
  private cameraShakeTimer = 0;
  private cameraShakeStrength = 0;
  private bossHp = 1000;
  private bossMaxHp = 1000;
  private bossHitsLanded = 0;
  private bossStunTimer = 0;
  private bossState: 'stalk' | 'windup' | 'attack' | 'recover' | 'stunned' = 'stalk';
  private bossStateTimer = 0;
  private bossAttackCooldown = 1.6;
  private bossAttackCount = 0;
  private bossPattern: 'lunge' | 'slam' | 'webShot' | 'crimsonSpikes' | 'bloodNova' = 'lunge';
  private bossAttackHitDone = false;
  private bossSecondWaveDone = false;
  private bossLungeDirX = 0;
  private bossLungeDirZ = 0;
  private bossTrailTimer = 0;
  private bossAttackWarning: string | null = null;
  private telegraphRing: THREE.Mesh | null = null;
  private bossShieldAura: THREE.Group | null = null;
  private bossProjectiles: Array<{
    mesh: THREE.Group;
    x: number;
    z: number;
    vx: number;
    vz: number;
    life: number;
  }> = [];
  private bossShockwaves: Array<{
    mesh: THREE.Group;
    maxScale: number;
    age: number;
    duration: number;
  }> = [];
  private bossSpikeZones: Array<{
    warningMesh: THREE.Group;
    spikeMesh: THREE.Group | null;
    x: number;
    z: number;
    erupted: boolean;
    age: number;
  }> = [];
  private activeWallHeight = WALL_HEIGHT;

  // Jumpscare & Kintoru Mind-Control QTE state (Ch.2+)
  private jumpscareTimer = 0;
  private jumpscareMonster: MonsterEntity | null = null;
  private kintoruControlActive = false;
  private kintoruNextTimer = 0;

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

    // Player Flashlight (bright, crisp wide beam with gentle distance decay)
    this.flashlight = new THREE.SpotLight(0xfff4df, 22.0, 42, Math.PI / 3.8, 0.55, 0.85);
    this.flashlight.castShadow = !this.isSoftwareGl;
    this.flashlight.shadow.mapSize.width = 512;
    this.flashlight.shadow.mapSize.height = 512;
    this.flashlight.shadow.bias = -0.0005;
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

    // Close-range bounce aura so immediate floor/walls around player remain readable
    this.playerFillLight = new THREE.PointLight(0x475569, 0.35, 4.2, 1.5);
    this.scene.add(this.playerFillLight);

    this.scene.add(this.worldGroup);

    // Attach First-Person Blessed Sword viewmodel to camera (shown during Chapter 4 Boss Duel)
    this.swordGroup = createBlessedSwordViewModel();
    this.swordGroup.position.set(0.36, -0.34, -0.58);
    this.swordGroup.rotation.set(-0.35, 0.18, 0.22);
    this.swordGroup.visible = false;
    this.camera.add(this.swordGroup);

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

    if (this.mode !== 'playing' || this.kintoruControlActive) return;

    if (code === 'KeyF') {
      this.toggleFlashlight();
    } else if (code === 'KeyC') {
      this.crouching = !this.crouching;
    } else if (code === 'KeyE') {
      if (this.chapterId === 4 && !this.hasNearbyInteractable()) {
        this.triggerSwordAttack();
      } else {
        this.triggerInteract();
      }
    } else if (code === 'Space') {
      if (this.chapterId === 4) {
        e.preventDefault();
        this.triggerSwordAttack();
      }
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
    if (this.mode !== 'playing' || this.kintoruControlActive) return;
    soundEngine.init();
    this.isDraggingLook = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (e.button === 0 && this.chapterId === 4) {
      this.triggerSwordAttack();
    }

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
    if (this.mode !== 'playing' || this.kintoruControlActive) return;
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

  public triggerSwordAttack() {
    if (this.mode !== 'playing' || this.chapterId !== 4) return;
    if (this.swordCooldown > 0) return;

    const isDev = this.jobId === 'developer';
    this.swordSwingDuration = isDev ? 0.2 : 0.28;
    this.swordSwingTimer = this.swordSwingDuration;
    this.swordCooldown = isDev ? 0.25 : 0.42;
    this.swordHitApplied = false;
    soundEngine.playSwordSwing();
  }

  private hasNearbyInteractable(): boolean {
    for (const item of this.collectibles) {
      if (!item.collected && Math.hypot(item.x - this.playerX, item.z - this.playerZ) < 2.35) {
        return true;
      }
    }
    if (
      this.chapterId !== 4 &&
      this.exitUnlocked &&
      Math.hypot(this.exitPos.x - this.playerX, this.exitPos.z - this.playerZ) < 2.6
    ) {
      return true;
    }
    return false;
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
      this.callbacks.onSystemNotice('질주 본능 발동! 5초간 이동 속도가 크게 상승합니다.');
    } else if (this.jobId === 'police') {
      let stunned = 0;
      for (const m of this.monsters) {
        if (Math.hypot(m.x - this.playerX, m.z - this.playerZ) <= 13.5) {
          m.stunTimer = 3.5;
          m.state = 'patrol';
          if (this.chapterId === 4 && m.id === 'saigomo') {
            this.stunSaigomo(3.0, '전술 섬광탄 명중! 사이고모가 3초간 스턴 상태에 빠졌습니다!');
          }
          stunned++;
        }
      }
      this.flashlight.intensity = 42;
      if (this.chapterId !== 4) {
        this.callbacks.onSystemNotice(
          stunned > 0
            ? `전술 섬광탄 명중! 괴물 ${stunned}체를 3.5초간 경직시켰습니다.`
            : '전술 섬광탄 투척! (근처에 괴물이 없었습니다)'
        );
      }
    } else if (this.jobId === 'doctor') {
      this.stamina = this.maxStamina;
      this.exhausted = false;
      this.battery = Math.min(100, this.battery + 25);
      if (this.chapterId === 4) {
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 35);
        this.callbacks.onSystemNotice('아드레날린 주사! HP +35, 스태미나 100%, 배터리 +25% 회복');
      } else {
        this.callbacks.onSystemNotice('아드레날린 주사! 스태미나 100% 및 배터리 +25% 회복');
      }
    } else if (this.jobId === 'exorcist') {
      let sealed = 0;
      for (const m of this.monsters) {
        if (Math.hypot(m.x - this.playerX, m.z - this.playerZ) <= 16.0) {
          m.stunTimer = 5.0;
          m.state = 'patrol';
          if (this.chapterId === 4 && m.id === 'saigomo') {
            this.stunSaigomo(3.0, '정화의 오후다! 사이고모가 3초간 스턴 봉인되었습니다!');
          }
          sealed++;
        }
      }
      if (this.chapterId !== 4) {
        this.callbacks.onSystemNotice(
          sealed > 0
            ? `정화의 오후다! 주변 괴물 ${sealed}체를 5초간 봉인했습니다.`
            : '정화의 오후다 발동! (사거리 내 괴물 없음)'
        );
      }
    } else if (this.jobId === 'developer') {
      for (const m of this.monsters) {
        m.stunTimer = 12.0;
        m.state = 'patrol';
        m.memoryTimer = 0;
      }
      this.skillActiveTimer = 8.0;
      this.stamina = this.maxStamina;
      this.battery = 100;
      this.playerHp = this.playerMaxHp;

      if (this.chapterId === 4) {
        this.stunSaigomo(6.0, '시스템 지배! 사이고모에게 강력한 성검 참격(-150 HP) 및 6초 스턴!');
        this.damageBoss(150);
        return;
      }

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
          this.chapterId === 1
            ? '시스템 지배! 전 괴물 12초 정지 및 지하실 문 앞 안전 지대로 순간이동했습니다!'
            : '시스템 지배! 전 괴물 12초 정지 및 탈출 도리이 앞 안전 지대로 순간이동했습니다!'
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
      soundEngine.stopBgm();
    } else {
      soundEngine.startBgm(this.chapterId, this.chapterId === 4);
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
    if (this.mistGeo) {
      this.mistGeo.dispose();
      this.mistGeo = null;
    }
    if (this.mistMat) {
      this.mistMat.dispose();
      this.mistMat = null;
    }
    this.ambientParticles = null;
    this.mistParticles = null;
    this.particleVelocities = null;
    this.mistVelocities = null;
    this.shiftWallMesh = null;
    this.shiftSlots = [];
    this.basementDoorRig = null;
    this.telegraphRing = null;
    this.bossShieldAura = null;
    this.bossProjectiles = [];
    this.bossShockwaves = [];
    this.bossSpikeZones = [];
    if (this.swordGroup) {
      this.swordGroup.visible = false;
    }
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
    if (this.kintoruControlActive) {
      this.kintoruControlActive = false;
      this.callbacks.onKintoruControlChange?.(false);
    }
  }

  public buildTitleDiorama() {
    this.clearWorld();
    soundEngine.stopBgm();
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

    // Title drifting sakura & crimson embers + ground mist
    this.buildAtmosphereParticles(3, 24, 34);

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
    const isBossFight = chapterId === 4;
    this.collectedItems = 0;
    this.requiredItems = isBossFight ? 0 : meta.requiredItems;
    this.exitUnlocked = false;
    this.activeWallHeight = isBossFight ? WALL_HEIGHT * 2.0 : WALL_HEIGHT;

    // Reset Chapter 4 Boss & Sword Combat state
    this.playerMaxHp = 100;
    this.playerHp = 100;
    this.hurtFlash = 0;
    this.cameraShakeTimer = 0;
    this.cameraShakeStrength = 0;
    this.swordSwingTimer = 0;
    this.swordCooldown = 0;
    this.swordHitApplied = false;
    if (this.swordGroup) {
      this.swordGroup.visible = isBossFight;
    }
    this.bossMaxHp = isBossFight ? (difficulty === 'nightmare' ? 1100 : 1000) : 1000;
    this.bossHp = this.bossMaxHp;
    this.bossHitsLanded = 0;
    this.bossStunTimer = 0;
    this.bossState = 'stalk';
    this.bossStateTimer = 0;
    this.bossAttackCooldown = 1.5;
    this.bossAttackCount = 0;
    this.bossPattern = 'lunge';
    this.bossAttackHitDone = false;
    this.bossSecondWaveDone = false;
    this.bossTrailTimer = 0;
    this.bossAttackWarning = null;

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
    this.kintoruControlActive = false;
    this.kintoruNextTimer =
      chapterId >= 2
        ? (chapterId === 4 ? 17 : 13) + Math.random() * 6
        : 999999;
    this.keys.clear();

    const isDev = jobId === 'developer';

    // Configure Job Flashlight Optics
    if (isDev) {
      this.flashlight.distance = 68;
      this.flashlight.angle = Math.PI / 2.8;
    } else if (jobId === 'police') {
      this.flashlight.distance = 48;
      this.flashlight.angle = Math.PI / 3.3;
    } else {
      this.flashlight.distance = isBossFight ? 46 : 38;
      this.flashlight.angle = Math.PI / 3.8;
    }

    // Dark base illumination so flashlight is needed, while allowing the stronger beam to cut through fog
    const fogDensity = isBossFight
      ? isDev
        ? 0.024
        : 0.038
      : isDev
        ? meta.fogDensity * 0.52
        : meta.fogDensity * 0.8;
    this.scene.background = new THREE.Color(meta.fogColor);
    this.scene.fog = new THREE.FogExp2(meta.fogColor, fogDensity);
    this.scene.environmentIntensity = isDev ? 0.45 : isBossFight ? 0.18 : 0.11;
    this.ambientLight.color.setHex(meta.ambientColor);
    this.ambientLight.intensity = isDev ? 0.34 : isBossFight ? 0.16 : 0.07;
    this.hemiLight.intensity = isDev ? 0.38 : isBossFight ? 0.16 : 0.09;

    if (isDev) {
      this.playerFillLight.color.setHex(0xe0f2fe);
      this.playerFillLight.intensity = 2.6;
      this.playerFillLight.distance = 15.0;
    } else {
      this.playerFillLight.color.setHex(isBossFight ? 0x7f2d34 : 0x475569);
      this.playerFillLight.intensity = isBossFight ? 0.48 : 0.34;
      this.playerFillLight.distance = isBossFight ? 5.2 : 4.0;
    }

    // Floor & Ceiling
    const floorTex =
      chapterId === 1
        ? this.textures.woodFloor
        : chapterId === 2
          ? this.textures.tatamiFloor
          : isBossFight
            ? this.textures.caveStoneFloor
            : this.textures.shrineStone;

    const mapW = map.width * TILE_SIZE;
    const mapH = map.height * TILE_SIZE;

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: chapterId >= 3 ? 0.74 : 0.82,
      metalness: chapterId >= 3 ? 0.14 : 0.04,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(mapW, mapH), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.worldGroup.add(floor);

    const ceilMat = new THREE.MeshStandardMaterial({
      map:
        chapterId === 1
          ? this.textures.schoolCeiling
          : isBossFight
            ? this.textures.caveRockWall
            : this.textures.ceilingWood,
      roughness: isBossFight ? 0.94 : chapterId === 1 ? 0.85 : 0.92,
      metalness: 0.04,
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(mapW, mapH), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = this.activeWallHeight;
    this.worldGroup.add(ceiling);

    // Flooded Swamp / Blood Pool Overlay (~ tiles)
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

    // Instanced Static Walls / Rock Pillars + Dynamic Shifting Maze Walls
    const wallTex =
      chapterId === 1
        ? this.textures.schoolWall
        : isBossFight
          ? this.textures.caveRockWall
          : this.textures.shojiWall;

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: isBossFight ? 0.92 : 0.85,
      metalness: isBossFight ? 0.1 : 0.05,
    });

    const shiftKeySet = new Set<string>();
    this.shiftSlots = map.shiftCandidates.map((sc) => {
      shiftKeySet.add(`${sc.gx},${sc.gz}`);
      const pos = gridToWorld(sc.gx, sc.gz, map);
      return { gx: sc.gx, gz: sc.gz, x: pos.x, z: pos.z };
    });

    let staticWallCount = 0;
    for (let gz = 0; gz < map.height; gz++) {
      for (let gx = 0; gx < map.width; gx++) {
        if (map.cells[gz][gx] === '#' && !shiftKeySet.has(`${gx},${gz}`)) {
          staticWallCount++;
        }
      }
    }

    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, this.activeWallHeight, TILE_SIZE);
    const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, Math.max(1, staticWallCount));
    wallMesh.castShadow = !this.isSoftwareGl;
    wallMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let gz = 0; gz < map.height; gz++) {
      for (let gx = 0; gx < map.width; gx++) {
        if (map.cells[gz][gx] === '#' && !shiftKeySet.has(`${gx},${gz}`)) {
          const pos = gridToWorld(gx, gz, map);
          dummy.position.set(pos.x, this.activeWallHeight / 2, pos.z);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          wallMesh.setMatrixAt(idx++, dummy.matrix);
        }
      }
    }
    wallMesh.computeBoundingSphere();
    this.worldGroup.add(wallMesh);

    if (this.shiftSlots.length > 0) {
      const shiftMesh = new THREE.InstancedMesh(wallGeo, wallMat, this.shiftSlots.length);
      shiftMesh.castShadow = !this.isSoftwareGl;
      shiftMesh.receiveShadow = true;
      shiftMesh.frustumCulled = false;
      this.shiftWallMesh = shiftMesh;
      this.syncShiftWalls();
      this.worldGroup.add(shiftMesh);
    }
    this.mapShiftTimer = 0;

    // Architectural Ceiling Beams / Pipes (Ch.1-3 only; Ch.4 is a natural rock cavern vault)
    if (!isBossFight) {
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
          color: chapterId === 1 ? 0x2b3036 : 0x1b120d,
          roughness: chapterId === 1 ? 0.55 : 0.85,
          metalness: chapterId === 1 ? 0.55 : 0.08,
        });
        const beamGeo = new THREE.BoxGeometry(0.24, 0.22, TILE_SIZE);
        const beamMesh = new THREE.InstancedMesh(beamGeo, beamMat, beamSpots.length);
        const bDummy = new THREE.Object3D();
        beamSpots.forEach((bs, bi) => {
          bDummy.position.set(bs.x, this.activeWallHeight - 0.11, bs.z);
          bDummy.rotation.y = bs.rotY;
          bDummy.updateMatrix();
          beamMesh.setMatrixAt(bi, bDummy.matrix);
        });
        beamMesh.computeBoundingSphere();
        this.worldGroup.add(beamMesh);
      }
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

    // Haunted Wall Claw Scratches & Crooked Ofuda Wards (only attached to static walls so shifting walls never orphan decals)
    let wallDecalCount = 0;
    for (let i = 3; i < map.walkableTiles.length && wallDecalCount < 10; i += 14) {
      const wt = map.walkableTiles[i];
      if (shiftKeySet.has(`${wt.gx},${wt.gz}`)) continue;
      if (isWall(wt.gx, wt.gz - 1, map) && !shiftKeySet.has(`${wt.gx},${wt.gz - 1}`)) {
        const pos = gridToWorld(wt.gx, wt.gz, map);
        const cluster = createWallTalismanCluster(this.textures);
        cluster.position.set(pos.x, 0, pos.z - TILE_SIZE * 0.49);
        this.worldGroup.add(cluster);
        wallDecalCount++;
      } else if (isWall(wt.gx - 1, wt.gz, map) && !shiftKeySet.has(`${wt.gx - 1},${wt.gz}`)) {
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

    // Ch.4: Giant Underground Cavern Props — Stalactites, Stalagmites, Crimson Crystals, Cocoons & Telegraph Ring
    if (isBossFight) {
      // Ceiling Stalactites & Perimeter Stalagmites
      for (let i = 0; i < map.walkableTiles.length; i += 11) {
        const wt = map.walkableTiles[i];
        const pos = gridToWorld(wt.gx, wt.gz, map);
        const stalactite = createCavernStalagmite(true);
        stalactite.position.set(pos.x, this.activeWallHeight + 0.12, pos.z);
        stalactite.scale.setScalar(0.85 + (i % 3) * 0.22);
        this.worldGroup.add(stalactite);
      }

      [
        { gx: 2, gz: 3 },
        { gx: 20, gz: 3 },
        { gx: 2, gz: 11 },
        { gx: 20, gz: 11 },
        { gx: 2, gz: 18 },
        { gx: 20, gz: 18 },
      ].forEach((spot, idx) => {
        if (!isWall(spot.gx, spot.gz, map)) {
          const pos = gridToWorld(spot.gx, spot.gz, map);
          const stalagmite = createCavernStalagmite(false);
          stalagmite.position.set(pos.x + (idx % 2 === 0 ? -0.8 : 0.8), 0, pos.z);
          stalagmite.scale.setScalar(0.75 + (idx % 3) * 0.15);
          this.worldGroup.add(stalagmite);
        }
      });

      // Glowing Crimson Cavern Crystal Clusters to rim-light the cave arena
      [
        { gx: 4, gz: 4 },
        { gx: 18, gz: 4 },
        { gx: 3, gz: 11 },
        { gx: 19, gz: 11 },
        { gx: 4, gz: 17 },
        { gx: 18, gz: 17 },
        { gx: 11, gz: 2 },
        { gx: 11, gz: 20 },
      ].forEach((spot, idx) => {
        if (!isWall(spot.gx, spot.gz, map)) {
          const pos = gridToWorld(spot.gx, spot.gz, map);
          const { group, light } = createCavernCrystalCluster();
          group.position.set(pos.x, 0, pos.z);
          group.rotation.y = idx * 0.95;
          this.worldGroup.add(group);
          this.lanterns.push({ light, baseIntensity: 1.5, phase: idx * 1.3 });
        }
      });

      for (let i = 0; i < map.waterTiles.length; i += 7) {
        const wt = map.waterTiles[i];
        const pos = gridToWorld(wt.gx, wt.gz, map);
        const cocoon = createSpiderCocoon(this.textures);
        cocoon.position.set(pos.x, this.activeWallHeight, pos.z);
        this.worldGroup.add(cocoon);
        this.hangingCocoons.push({ group: cocoon, phase: i * 0.9 });
      }

      this.telegraphRing = createTelegraphRing();
      this.worldGroup.add(this.telegraphRing);

      this.bossShieldAura = createBossShieldAura();
      this.worldGroup.add(this.bossShieldAura);
    }

    // Atmospheric Chapter Particles (Dust, Spirit Ash, Falling Sakura Petals, Blood Embers) & Layered Ground Mist
    this.buildAtmosphereParticles(chapterId, mapW, mapH);

    // Exit Portal (Ch.1 = Steel Basement Door, Ch.2-3 = Crimson Torii Gate, Ch.4 = Sealed Cavern Entrance)
    const exitWorld = gridToWorld(map.exitTile.gx, map.exitTile.gz, map);
    this.exitPos = exitWorld;
    if (chapterId === 1) {
      const doorRig = createBasementDoor(false);
      doorRig.group.position.set(exitWorld.x + 0.35, 0, exitWorld.z + 0.35);
      doorRig.group.rotation.y = -Math.PI * 0.75;
      this.worldGroup.add(doorRig.group);
      this.exitGateGroup = doorRig.group;
      this.basementDoorRig = doorRig;
    } else {
      const exitGate = createToriiGate(isBossFight ? 1.08 : 0.92, isBossFight);
      exitGate.position.set(exitWorld.x, 0, exitWorld.z);
      this.worldGroup.add(exitGate);
      this.exitGateGroup = exitGate;
    }

    const exitLight = new THREE.PointLight(0x991b1b, isBossFight ? 0.9 : 1.4, 8, 1.6);
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
      if (isBossFight && mId === 'saigomo') {
        rig.group.scale.setScalar(1.48);
      }
      rig.group.position.set(pos.x, 0, pos.z);
      this.worldGroup.add(rig.group);

      const patrolPick =
        map.walkableTiles[Math.floor(Math.random() * map.walkableTiles.length)];

      const baseSpeed =
        mId === 'saigomo'
          ? 2.85
          : mId === 'oomukade'
            ? 2.45
            : mId === 'keiko'
              ? 2.3
              : mId === 'megumi'
                ? 2.15
                : 1.95;
      const chaseSpeed =
        mId === 'saigomo'
          ? 4.45
          : mId === 'oomukade'
            ? 4.25
            : mId === 'keiko'
              ? 3.8
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
    this.yaw = isBossFight ? 0 : -Math.PI / 2;
    this.pitch = 0;

    soundEngine.startBgm(chapterId, isBossFight);
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

    // 2. Check Exit Portal (Ch.1-3)
    if (this.chapterId !== 4) {
      const exitDist = Math.hypot(this.exitPos.x - this.playerX, this.exitPos.z - this.playerZ);
      if (exitDist < 2.6 && this.exitUnlocked) {
        soundEngine.stopBgm();
        soundEngine.playPortalUnlock();
        this.mode = 'paused';
        this.releasePointerLock();
        this.callbacks.onChapterClear(this.chapterId, this.elapsedSeconds);
      }
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
        if (this.basementDoorRig) {
          this.basementDoorRig.lockMesh.visible = false;
          this.basementDoorRig.statusLampMat.color.setHex(0x22c55e);
          this.basementDoorRig.statusLampMat.emissive.setHex(0x16a34a);
          this.basementDoorRig.windowMat.color.setHex(0x34d399);
          this.basementDoorRig.windowMat.emissive.setHex(0x10b981);
          this.basementDoorRig.windowMat.emissiveIntensity = 1.35;
        } else if (this.exitGateGroup) {
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

    this.animateAtmosphereParticles(0.016, elapsed, 3);

    if (this.titleBoss) {
      animateMonsterRig(this.titleBoss, 'saigomo', elapsed, false);
    }
  }

  private triggerKintoruControl() {
    this.kintoruControlActive = true;
    this.keys.clear();
    this.isDraggingLook = false;
    this.releasePointerLock();
    this.cameraShakeTimer = 0.45;
    this.cameraShakeStrength = 0.08;
    soundEngine.playKintoruControlStart();
    this.callbacks.onKintoruControlChange?.(true);
  }

  public resolveKintoruControl(survived: boolean) {
    if (!this.kintoruControlActive) return;
    this.kintoruControlActive = false;
    this.callbacks.onKintoruControlChange?.(false);
    this.kintoruNextTimer =
      (this.chapterId === 4 ? 25 : 21) + Math.random() * 10;

    if (survived) {
      this.invulnTimer = Math.max(this.invulnTimer, 2.0);
      soundEngine.playKintoruControlEscape();
      this.callbacks.onSystemNotice('⚡ 킨토루의 지배에서 벗어났습니다! (3초 버티기 성공)');
      return;
    }

    if (this.jobId === 'developer') {
      this.invulnTimer = 2.5;
      soundEngine.playPortalUnlock();
      this.callbacks.onSystemNotice('관리자 권한! 킨토루의 정신 지배를 강제로 끊어냈습니다!');
      return;
    }

    if (this.doctorReviveReady) {
      this.doctorReviveReady = false;
      this.invulnTimer = 3.2;
      soundEngine.playPortalUnlock();
      this.callbacks.onSystemNotice('의사의 응급 처치! 킨토루의 정신 침식을 1회 이겨냈습니다!');
      return;
    }

    if (this.chapterId === 4) {
      this.callbacks.onSystemNotice('💀 킨토루의 손아귀에 정신이 잠식당했습니다! (-45 HP)');
      this.applyPlayerDamage(45, 'saigomo');
    } else {
      const killerId: MonsterId = this.chapterId === 2 ? 'megumi' : 'oomukade';
      const killer =
        this.monsters.find((m) => m.id === killerId) || this.monsters[0];
      if (killer) {
        this.triggerJumpscare(killer);
      }
    }
  }

  private updatePlaying(dt: number, elapsed: number) {
    if (!this.mapData) return;

    // During Kintoru Mind-Control QTE (Ch.2+), freeze movement & monsters while keeping trembling atmosphere alive
    if (this.kintoruControlActive) {
      this.animateAtmosphereParticles(dt, elapsed, this.chapterId);
      const tremorX = Math.sin(elapsed * 42) * 0.025;
      const tremorY = Math.cos(elapsed * 37) * 0.02;
      this.camera.position.set(
        this.playerX + tremorX,
        this.eyeHeight + tremorY,
        this.playerZ
      );
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
      return;
    }

    if (this.chapterId >= 2 && !(this.chapterId === 4 && this.bossStunTimer > 0)) {
      this.kintoruNextTimer -= dt;
      if (this.kintoruNextTimer <= 0) {
        this.triggerKintoruControl();
        return;
      }
    }

    this.elapsedSeconds += dt;
    if (this.skillCooldown > 0) this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    if (this.skillActiveTimer > 0) this.skillActiveTimer = Math.max(0, this.skillActiveTimer - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.swordCooldown > 0) this.swordCooldown = Math.max(0, this.swordCooldown - dt);
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.2);
    if (this.cameraShakeTimer > 0) this.cameraShakeTimer = Math.max(0, this.cameraShakeTimer - dt);

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
    const shakeX =
      this.cameraShakeTimer > 0
        ? (Math.random() - 0.5) * this.cameraShakeStrength * Math.min(1, this.cameraShakeTimer * 2.5)
        : 0;
    const shakeY =
      this.cameraShakeTimer > 0
        ? (Math.random() - 0.5) * this.cameraShakeStrength * Math.min(1, this.cameraShakeTimer * 2.5)
        : 0;

    this.camera.position.set(
      this.playerX + shakeX,
      this.eyeHeight + bobOffset + shakeY,
      this.playerZ
    );
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

    // Smoothly swing Ch.1 Basement Door ajar when unlocked
    if (this.basementDoorRig && this.exitUnlocked) {
      this.basementDoorRig.doorPivot.rotation.y = THREE.MathUtils.damp(
        this.basementDoorRig.doorPivot.rotation.y,
        -0.68,
        5.5,
        dt
      );
    }

    // Animate per-particle dust / sakura petals / embers & drifting ground fog wisps
    this.animateAtmosphereParticles(dt, elapsed, this.chapterId);

    // Every 5 seconds, silently rearrange out-of-sight interior maze corridors (Ch.1-3)
    if (this.chapterId !== 4) {
      this.mapShiftTimer += dt;
      if (this.mapShiftTimer >= 5.0) {
        this.mapShiftTimer -= 5.0;
        this.silentlyShiftMaze();
      }
    }

    // Update Monsters / Chapter 4 Cave Boss Combat
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

    if (this.chapterId === 4) {
      this.updateSwordViewModel(dt, elapsed, isMoving);
      const bossDead = this.updateChapter4BossFight(dt, elapsed, isDeveloper);
      if (bossDead || this.mode !== 'playing') return;

      for (const m of this.monsters) {
        const d = Math.hypot(this.playerX - m.x, this.playerZ - m.z);
        if (d < minMonsterDist) {
          minMonsterDist = d;
          closestMonsterId = m.id;
        }
        if (m.id === 'saigomo' && this.bossStunTimer <= 0) anyChasing = true;
      }
    } else {
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
    }

    // Flashlight flicker when low battery or monster nearby (Developer never flickers)
    if (this.flashlightOn) {
      let flicker = 1;
      if (!isDeveloper && (this.battery < 18 || minMonsterDist < 8.5)) {
        flicker = Math.sin(elapsed * 37) > -0.6 ? 1 : 0.38;
      }
      const baseBeam = isDeveloper ? 36.0 : this.jobId === 'police' ? 28.0 : 22.0;
      this.flashlight.intensity = baseBeam * flicker;
      if (!isDeveloper) {
        this.playerFillLight.intensity = (this.chapterId === 4 ? 0.55 : 0.42) * flicker;
      }
    } else {
      this.flashlight.intensity = 0;
      if (!isDeveloper) {
        this.playerFillLight.intensity = this.chapterId === 4 ? 0.22 : 0.14;
      }
    }

    // Story Subtitle triggers for chase start & 12m escape (Ch.1-3)
    const chapterMeta = CHAPTERS.find((c) => c.id === this.chapterId) || CHAPTERS[0];
    if (this.chapterId !== 4) {
      if (anyChasing && !this.hasTriggeredFirstChase) {
        this.hasTriggeredFirstChase = true;
        this.callbacks.onSubtitle(chapterMeta.subtitles.onFirstChase);
      } else if (this.wasAnyChasing && !anyChasing && minMonsterDist > MAX_AGGRO_RANGE) {
        this.callbacks.onSubtitle(chapterMeta.subtitles.onEscapeChase);
      }
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
    if (
      this.chapterId !== 4 &&
      !prompt &&
      Math.hypot(this.exitPos.x - this.playerX, this.exitPos.z - this.playerZ) < 2.6
    ) {
      prompt = this.exitUnlocked
        ? this.chapterId === 1
          ? '[E] 지하실 문으로 탈출'
          : '[E] 붉은 도리이 너머로 탈출'
        : `봉인됨 (${this.collectedItems}/${this.requiredItems} 수집 필요)`;
    }

    this.hudTimer += dt;
    if (this.hudTimer >= 0.08) {
      this.hudTimer = 0;
      this.pushHudSnapshot(prompt, minMonsterDist, closestMonsterId, anyChasing);
    }
  }

  private updateSwordViewModel(dt: number, elapsed: number, isMoving: boolean) {
    if (!this.swordGroup) return;
    if (this.swordSwingTimer > 0) {
      this.swordSwingTimer = Math.max(0, this.swordSwingTimer - dt);
      const t = 1 - this.swordSwingTimer / this.swordSwingDuration;
      const swingArc = Math.sin(t * Math.PI);
      this.swordGroup.position.set(
        0.36 - swingArc * 0.28,
        -0.34 - swingArc * 0.06,
        -0.58 - swingArc * 0.18
      );
      this.swordGroup.rotation.set(-0.35 - swingArc * 1.15, 0.18 + swingArc * 0.85, 0.22 + swingArc * 0.9);

      if (!this.swordHitApplied && t >= 0.32) {
        this.swordHitApplied = true;
        this.performSwordHitCheck();
      }
    } else {
      const bob = isMoving ? Math.sin(elapsed * 8.5) * 0.015 : Math.sin(elapsed * 2.2) * 0.008;
      this.swordGroup.position.set(0.36, -0.34 + bob, -0.58);
      this.swordGroup.rotation.set(-0.35, 0.18, 0.22);
    }
  }

  private spawnShockwave(x: number, z: number, maxScale: number, colorHex = 0xef4444, duration = 0.55) {
    const mesh = createExpandingShockwave(colorHex);
    mesh.position.set(x, 0, z);
    mesh.scale.setScalar(0.5);
    this.worldGroup.add(mesh);
    this.bossShockwaves.push({
      mesh,
      maxScale,
      age: 0,
      duration,
    });
  }

  private clearBossSpikeZones() {
    for (const sz of this.bossSpikeZones) {
      this.worldGroup.remove(sz.warningMesh);
      if (sz.spikeMesh) this.worldGroup.remove(sz.spikeMesh);
    }
    this.bossSpikeZones = [];
  }

  private performSwordHitCheck() {
    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    const isDev = this.jobId === 'developer';

    for (const m of this.monsters) {
      const dx = m.x - this.playerX;
      const dz = m.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      const reach = m.id === 'saigomo' ? 4.0 : 3.1;
      if (dist > reach) continue;

      const dot = (dx * fwdX + dz * fwdZ) / Math.max(0.01, dist);
      if (dot < 0.28) continue;

      if (m.id === 'saigomo') {
        const isStunned = this.bossStunTimer > 0;

        if (isStunned) {
          const dmg = isDev ? 75 : 50;
          this.bossHitsLanded++;
          soundEngine.playSwordHit(true);
          this.spawnShockwave(m.x, m.z, 2.2, 0xf59e0b, 0.28);

          const pushX = m.x + (dx / Math.max(0.1, dist)) * 0.25;
          const pushZ = m.z + (dz / Math.max(0.1, dist)) * 0.25;
          if (this.canOccupy(pushX, pushZ, 0.55)) {
            m.x = pushX;
            m.z = pushZ;
          }

          this.damageBoss(dmg);
          return;
        }

        // Not stunned yet: parry during windup to break barrier -> 3s Stun! Otherwise deflected!
        if (this.bossState === 'windup') {
          this.clearBossSpikeZones();
          this.spawnShockwave(m.x, m.z, 4.2, 0xfef08a, 0.42);
          soundEngine.playParryCounter();
          this.cameraShakeTimer = 0.22;
          this.cameraShakeStrength = 0.08;
          this.stunSaigomo(3.0, '⚡ 패링 반격! 제어의 결계를 부수고 사이고모를 3초간 스턴시켰습니다!');
          return;
        }

        soundEngine.playBarrierDeflect();
        this.spawnShockwave(m.x, m.z, 2.4, 0xdc2626, 0.25);
        this.callbacks.onSystemNotice(
          '🛡️ 결계 방어! 스턴 상태일 때만 베어 피해를 줄 수 있습니다 (돌진 기둥 충돌 / 공격 준비 중 패링 / 오의 후 과부하)'
        );
        return;
      } else if (m.id === 'keiko') {
        m.stunTimer = 8.0;
        soundEngine.playSwordHit(true);
        this.callbacks.onSystemNotice('축복받은 검으로 어머니 케이코의 폭주를 8초간 잠재웠습니다.');
        return;
      }
    }
  }

  private stunSaigomo(seconds: number, notice: string) {
    this.bossStunTimer = Math.max(this.bossStunTimer, seconds);
    this.bossState = 'stunned';
    this.bossStateTimer = this.bossStunTimer;
    this.bossAttackWarning = null;
    this.clearBossSpikeZones();
    if (this.telegraphRing) this.telegraphRing.visible = false;
    if (this.bossShieldAura) this.bossShieldAura.visible = false;
    soundEngine.playBossStun();
    this.callbacks.onSystemNotice(notice);
  }

  private damageBoss(amount: number) {
    if (this.bossStunTimer <= 0) return;
    this.bossHp = Math.max(0, this.bossHp - amount);
    if (this.bossHp === 0) {
      soundEngine.stopBgm();
      soundEngine.playPortalUnlock();
      this.clearBossSpikeZones();
      if (this.telegraphRing) this.telegraphRing.visible = false;
      if (this.bossShieldAura) this.bossShieldAura.visible = false;
      this.mode = 'paused';
      this.releasePointerLock();
      this.callbacks.onChapterClear(this.chapterId, this.elapsedSeconds);
    }
  }

  private applyPlayerDamage(amount: number, attackerId: MonsterId) {
    if (this.invulnTimer > 0) return;

    if (this.jobId === 'developer') {
      this.invulnTimer = 1.2;
      const boss = this.monsters.find((m) => m.id === 'saigomo');
      if (boss) this.stunSaigomo(3.0, '관리자 무적 실드! 공격을 반사해 사이고모를 3초간 스턴시켰습니다!');
      return;
    }

    this.playerHp = Math.max(0, this.playerHp - amount);
    this.hurtFlash = 1.0;
    this.invulnTimer = 1.05;
    this.cameraShakeTimer = 0.25;
    this.cameraShakeStrength = 0.12;
    soundEngine.playPlayerHit();

    if (this.playerHp <= 0) {
      if (this.doctorReviveReady) {
        this.doctorReviveReady = false;
        this.playerHp = 60;
        this.invulnTimer = 2.6;
        soundEngine.playPortalUnlock();
        this.callbacks.onSystemNotice('의사의 응급 처치 발동! 체력을 60 회복하고 위기를 넘겼습니다.');
        return;
      }
      const attacker = this.monsters.find((m) => m.id === attackerId) || this.monsters[0];
      if (attacker) {
        this.triggerJumpscare(attacker);
      }
    }
  }

  private updateChapter4BossFight(dt: number, elapsed: number, _isDeveloper: boolean): boolean {
    if (!this.mapData) return false;
    const boss = this.monsters.find((m) => m.id === 'saigomo');
    const keiko = this.monsters.find((m) => m.id === 'keiko');

    // Update expanding shockwave VFX
    for (let i = this.bossShockwaves.length - 1; i >= 0; i--) {
      const sw = this.bossShockwaves[i];
      sw.age += dt;
      const p = Math.min(1, sw.age / sw.duration);
      const scale = 0.6 + (sw.maxScale - 0.6) * (1 - (1 - p) * (1 - p));
      sw.mesh.scale.setScalar(scale);
      sw.mesh.children.forEach((child) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
        if (mat) mat.opacity = (1 - p) * 0.85;
      });
      if (sw.age >= sw.duration) {
        this.worldGroup.remove(sw.mesh);
        this.bossShockwaves.splice(i, 1);
      }
    }

    // Update Crimson Spike Eruption Zones
    for (let i = this.bossSpikeZones.length - 1; i >= 0; i--) {
      const sz = this.bossSpikeZones[i];
      sz.age += dt;
      if (!sz.erupted) {
        const pulse = 1.85 + Math.sin(elapsed * 22) * 0.14;
        sz.warningMesh.scale.setScalar(pulse);
      } else if (sz.spikeMesh) {
        const lift = Math.min(1, sz.age / 0.14);
        sz.spikeMesh.scale.set(1.15, lift, 1.15);
        if (sz.age >= 0.85) {
          this.worldGroup.remove(sz.warningMesh);
          this.worldGroup.remove(sz.spikeMesh);
          this.bossSpikeZones.splice(i, 1);
        }
      }
    }

    // Update flying boss cursed projectiles
    for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
      const p = this.bossProjectiles[i];
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.life -= dt;
      p.mesh.position.set(p.x, 1.35, p.z);
      p.mesh.rotation.y += dt * 7;
      p.mesh.rotation.x += dt * 5;

      const grid = worldToGrid(p.x, p.z, this.mapData);
      const hitPlayer = Math.hypot(p.x - this.playerX, p.z - this.playerZ) < 0.9;
      if (hitPlayer) {
        this.worldGroup.remove(p.mesh);
        this.bossProjectiles.splice(i, 1);
        this.applyPlayerDamage(this.difficulty === 'nightmare' ? 28 : 22, 'saigomo');
        if (this.mode !== 'playing') return true;
        continue;
      }
      if (p.life <= 0 || isWall(grid.gx, grid.gz, this.mapData)) {
        this.spawnShockwave(p.x, p.z, 1.4, 0xdc2626, 0.25);
        this.worldGroup.remove(p.mesh);
        this.bossProjectiles.splice(i, 1);
      }
    }

    // Update Saigomo Boss AI
    if (boss) {
      const dx = this.playerX - boss.x;
      const dz = this.playerZ - boss.z;
      const dist = Math.hypot(dx, dz);
      const desiredYaw = Math.atan2(dx, dz);

      if (this.bossShieldAura) {
        this.bossShieldAura.visible = this.bossStunTimer <= 0;
        this.bossShieldAura.position.set(boss.x, 0, boss.z);
        this.bossShieldAura.rotation.y = elapsed * 1.4;
      }

      if (this.bossStunTimer > 0) {
        this.bossStunTimer = Math.max(0, this.bossStunTimer - dt);
        this.bossState = 'stunned';
        this.bossAttackWarning = null;
        if (this.telegraphRing) this.telegraphRing.visible = false;
        boss.rig.group.position.set(boss.x, -0.22, boss.z);
        boss.rig.group.rotation.z = Math.sin(elapsed * 14) * 0.09;
        animateMonsterRig(boss.rig, 'saigomo', elapsed * 0.22, false);
        if (this.bossStunTimer <= 0) {
          boss.rig.group.rotation.z = 0;
          this.bossState = 'stalk';
          this.bossAttackCooldown = 1.15;
          this.callbacks.onSystemNotice('🛡️ 사이고모의 제어의 결계가 다시 전개되었습니다!');
        }
      } else {
        boss.rig.group.rotation.z = 0;
        let diff = desiredYaw - boss.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        boss.yaw += diff * Math.min(1, dt * (this.bossState === 'attack' ? 2.5 : 7.0));

        if (this.bossState === 'stalk') {
          this.bossAttackWarning = null;
          if (this.telegraphRing) this.telegraphRing.visible = false;
          this.bossAttackCooldown -= dt;

          const hasLos = hasLineOfSight(boss.x, boss.z, this.playerX, this.playerZ, this.mapData);
          let steerX = this.playerX;
          let steerZ = this.playerZ;
          if (!hasLos) {
            const bGrid = worldToGrid(boss.x, boss.z, this.mapData);
            const pGrid = worldToGrid(this.playerX, this.playerZ, this.mapData);
            const next = findNextStepBFS(bGrid.gx, bGrid.gz, pGrid.gx, pGrid.gz, this.mapData);
            const wp = gridToWorld(next.gx, next.gz, this.mapData);
            steerX = wp.x;
            steerZ = wp.z;
          }
          const sdx = steerX - boss.x;
          const sdz = steerZ - boss.z;
          const slen = Math.hypot(sdx, sdz);
          if (slen > 0.25 && dist > 2.2) {
            const nx = boss.x + (sdx / slen) * boss.chaseSpeed * dt;
            const nz = boss.z + (sdz / slen) * boss.chaseSpeed * dt;
            if (this.canOccupy(nx, boss.z, 0.65)) boss.x = nx;
            if (this.canOccupy(boss.x, nz, 0.65)) boss.z = nz;
          }

          boss.rig.group.position.set(boss.x, 0, boss.z);
          boss.rig.group.rotation.y = boss.yaw;
          animateMonsterRig(boss.rig, 'saigomo', elapsed, true);

          if (this.bossAttackCooldown <= 0) {
            this.bossAttackCount++;
            // Every 3rd attack (or Phase 2 below 60% HP) unleashes Blood Nova Ultimate -> overheat stun!
            if (this.bossAttackCount % 3 === 0) {
              this.bossPattern = 'bloodNova';
            } else if (dist < 6.4) {
              const r = Math.random();
              this.bossPattern = r < 0.4 ? 'slam' : r < 0.72 ? 'crimsonSpikes' : 'lunge';
            } else {
              const r = Math.random();
              this.bossPattern = r < 0.42 ? 'lunge' : r < 0.75 ? 'webShot' : 'crimsonSpikes';
            }

            this.bossState = 'windup';
            this.bossAttackHitDone = false;
            this.bossSecondWaveDone = false;
            this.bossTrailTimer = 0;
            this.bossStateTimer =
              this.bossPattern === 'bloodNova'
                ? 1.4
                : this.bossPattern === 'crimsonSpikes'
                  ? 1.05
                  : this.bossPattern === 'slam'
                    ? 1.0
                    : this.bossPattern === 'lunge'
                      ? 0.9
                      : 0.75;
            this.bossLungeDirX = dx / Math.max(0.01, dist);
            this.bossLungeDirZ = dz / Math.max(0.01, dist);

            if (this.bossPattern === 'crimsonSpikes') {
              this.clearBossSpikeZones();
              const offsets = [
                { ox: 0, oz: 0 },
                { ox: 3.1, oz: 1.6 },
                { ox: -3.1, oz: -1.6 },
                { ox: 1.8, oz: -3.2 },
                { ox: -1.8, oz: 3.2 },
              ];
              offsets.forEach((o) => {
                const sx = this.playerX + o.ox;
                const sz = this.playerZ + o.oz;
                if (this.canOccupy(sx, sz, 0.35)) {
                  const warn = createGroundWarningDisc();
                  warn.position.set(sx, 0, sz);
                  warn.scale.setScalar(1.95);
                  this.worldGroup.add(warn);
                  this.bossSpikeZones.push({
                    warningMesh: warn,
                    spikeMesh: null,
                    x: sx,
                    z: sz,
                    erupted: false,
                    age: 0,
                  });
                }
              });
            }

            this.bossAttackWarning =
              this.bossPattern === 'bloodNova'
                ? '⚠ [오의] 심연의 혈옥 대폭발! 7.8m 밖으로 피하거나 붉은 핵을 패링하세요!'
                : this.bossPattern === 'crimsonSpikes'
                  ? '⚠ 혈창 대지 폭발! 붉은 바닥 원 밖으로 회피하세요!'
                  : this.bossPattern === 'slam'
                    ? '⚠ 진혼의 거미 대지 강타! 6.8m 밖으로 피하거나 도약 중 패링하세요!'
                    : this.bossPattern === 'lunge'
                      ? '⚠ 광폭 도약 돌진! 동굴 바위 기둥 뒤로 피해서 충돌시키세요!'
                      : '⚠ 거미줄 저주 탄막 2연사! 기둥 뒤로 엄폐하세요!';
            soundEngine.playBossTelegraph(this.bossPattern);
          }
        } else if (this.bossState === 'windup') {
          this.bossStateTimer -= dt;
          // Dramatic leap / hover height during Slam or Blood Nova windup
          const hoverY =
            this.bossPattern === 'slam'
              ? Math.sin((1 - Math.max(0, this.bossStateTimer)) * Math.PI) * 2.15 + 0.35
              : this.bossPattern === 'bloodNova'
                ? 0.9 + Math.sin(elapsed * 12) * 0.18
                : 0.14;
          boss.rig.group.position.set(boss.x, hoverY, boss.z);
          boss.rig.group.rotation.y = boss.yaw;
          animateMonsterRig(boss.rig, 'saigomo', elapsed * 1.6, true);

          if (this.telegraphRing && (this.bossPattern === 'slam' || this.bossPattern === 'bloodNova')) {
            const radius = this.bossPattern === 'bloodNova' ? 7.8 : 6.8;
            this.telegraphRing.visible = true;
            this.telegraphRing.position.set(boss.x, 0.06, boss.z);
            this.telegraphRing.scale.setScalar(radius);
          } else if (this.telegraphRing) {
            this.telegraphRing.visible = false;
          }

          if (this.bossStateTimer <= 0) {
            this.bossState = 'attack';
            this.bossStateTimer =
              this.bossPattern === 'lunge'
                ? 0.68
                : this.bossPattern === 'webShot'
                  ? 0.55
                  : 0.45;
          }
        } else if (this.bossState === 'attack') {
          this.bossStateTimer -= dt;
          if (this.telegraphRing) this.telegraphRing.visible = false;

          if (this.bossPattern === 'lunge') {
            const lungeSpeed = this.difficulty === 'nightmare' ? 16.5 : 15.0;
            const nx = boss.x + this.bossLungeDirX * lungeSpeed * dt;
            const nz = boss.z + this.bossLungeDirZ * lungeSpeed * dt;
            this.bossTrailTimer += dt;
            if (this.bossTrailTimer >= 0.09) {
              this.bossTrailTimer = 0;
              this.spawnShockwave(boss.x, boss.z, 2.0, 0xdc2626, 0.28);
            }
            if (!this.canOccupy(nx, nz, 0.72)) {
              this.spawnShockwave(boss.x, boss.z, 5.2, 0xf59e0b, 0.48);
              this.cameraShakeTimer = 0.35;
              this.cameraShakeStrength = 0.16;
              soundEngine.playBossExplosion(false);
              this.stunSaigomo(3.0, '💥 사이고모가 동굴 암벽에 강하게 충돌해 3초간 스턴되었습니다!');
              return false;
            }
            boss.x = nx;
            boss.z = nz;
            if (!this.bossAttackHitDone && Math.hypot(this.playerX - boss.x, this.playerZ - boss.z) < 2.1) {
              this.bossAttackHitDone = true;
              this.spawnShockwave(boss.x, boss.z, 3.6, 0xef4444, 0.35);
              this.applyPlayerDamage(this.difficulty === 'nightmare' ? 42 : 35, 'saigomo');
              if (this.mode !== 'playing') return true;
            }
          } else if (this.bossPattern === 'webShot') {
            if (!this.bossAttackHitDone) {
              this.bossAttackHitDone = true;
              const baseAngle = Math.atan2(dx, dz);
              [-0.44, -0.22, 0, 0.22, 0.44].forEach((offset) => {
                const ang = baseAngle + offset;
                const orb = createBossWebOrb();
                orb.position.set(boss.x, 1.35, boss.z);
                this.worldGroup.add(orb);
                const pSpeed = this.difficulty === 'nightmare' ? 14.5 : 12.2;
                this.bossProjectiles.push({
                  mesh: orb,
                  x: boss.x + Math.sin(ang) * 1.1,
                  z: boss.z + Math.cos(ang) * 1.1,
                  vx: Math.sin(ang) * pSpeed,
                  vz: Math.cos(ang) * pSpeed,
                  life: 3.4,
                });
              });
              soundEngine.playBossExplosion(false);
            }
            // Second 4-orb staggered salvo mid-attack
            if (!this.bossSecondWaveDone && this.bossStateTimer <= 0.28) {
              this.bossSecondWaveDone = true;
              const baseAngle = Math.atan2(dx, dz);
              [-0.33, -0.11, 0.11, 0.33].forEach((offset) => {
                const ang = baseAngle + offset;
                const orb = createBossWebOrb();
                orb.position.set(boss.x, 1.35, boss.z);
                this.worldGroup.add(orb);
                const pSpeed = this.difficulty === 'nightmare' ? 15.2 : 12.8;
                this.bossProjectiles.push({
                  mesh: orb,
                  x: boss.x + Math.sin(ang) * 1.1,
                  z: boss.z + Math.cos(ang) * 1.1,
                  vx: Math.sin(ang) * pSpeed,
                  vz: Math.cos(ang) * pSpeed,
                  life: 3.4,
                });
              });
            }
          } else if (!this.bossAttackHitDone) {
            this.bossAttackHitDone = true;
            if (this.bossPattern === 'slam') {
              soundEngine.playBossExplosion(true);
              this.spawnShockwave(boss.x, boss.z, 7.2, 0xef4444, 0.55);
              this.cameraShakeTimer = 0.45;
              this.cameraShakeStrength = 0.18;
              if (dist <= 6.8) {
                this.applyPlayerDamage(this.difficulty === 'nightmare' ? 45 : 36, 'saigomo');
                if (this.mode !== 'playing') return true;
              }
            } else if (this.bossPattern === 'crimsonSpikes') {
              soundEngine.playBossExplosion(true);
              this.cameraShakeTimer = 0.4;
              this.cameraShakeStrength = 0.16;
              let hitAnySpike = false;
              for (const sz of this.bossSpikeZones) {
                sz.erupted = true;
                sz.age = 0;
                const spike = createCrimsonSpikePillar();
                spike.position.set(sz.x, 0, sz.z);
                spike.scale.set(1.15, 0.1, 1.15);
                this.worldGroup.add(spike);
                sz.spikeMesh = spike;
                this.spawnShockwave(sz.x, sz.z, 2.5, 0xdc2626, 0.35);
                if (Math.hypot(this.playerX - sz.x, this.playerZ - sz.z) <= 2.15) {
                  hitAnySpike = true;
                }
              }
              if (hitAnySpike) {
                this.applyPlayerDamage(this.difficulty === 'nightmare' ? 42 : 34, 'saigomo');
                if (this.mode !== 'playing') return true;
              }
            } else if (this.bossPattern === 'bloodNova') {
              soundEngine.playBossExplosion(true);
              this.spawnShockwave(boss.x, boss.z, 8.6, 0xdc2626, 0.68);
              this.spawnShockwave(boss.x, boss.z, 6.2, 0xfef2f2, 0.48);
              this.cameraShakeTimer = 0.6;
              this.cameraShakeStrength = 0.24;

              // 8-way 360° radial cursed orb burst
              for (let k = 0; k < 8; k++) {
                const ang = (k * Math.PI * 2) / 8;
                const orb = createBossWebOrb();
                orb.position.set(boss.x, 1.35, boss.z);
                this.worldGroup.add(orb);
                const pSpeed = this.difficulty === 'nightmare' ? 12.8 : 10.6;
                this.bossProjectiles.push({
                  mesh: orb,
                  x: boss.x + Math.sin(ang) * 1.2,
                  z: boss.z + Math.cos(ang) * 1.2,
                  vx: Math.sin(ang) * pSpeed,
                  vz: Math.cos(ang) * pSpeed,
                  life: 3.4,
                });
              }

              if (dist <= 7.8) {
                this.applyPlayerDamage(this.difficulty === 'nightmare' ? 56 : 46, 'saigomo');
                if (this.mode !== 'playing') return true;
              }
            }
          }

          boss.rig.group.position.set(boss.x, 0, boss.z);
          boss.rig.group.rotation.y = boss.yaw;
          animateMonsterRig(boss.rig, 'saigomo', elapsed * 2.0, true);

          if (this.bossStateTimer <= 0) {
            if (this.bossPattern === 'bloodNova') {
              // Massive Ultimate exhausts Saigomo's control core -> 3.0s STUN opening!
              this.stunSaigomo(
                3.0,
                '💢 사이고모가 혈옥 대폭발의 반동으로 지쳐 3초간 스턴 상태에 빠졌습니다! 지금 공격하세요!'
              );
              return false;
            }
            this.bossState = 'recover';
            this.bossStateTimer = 0.45;
            this.bossAttackWarning = null;
          }
        } else if (this.bossState === 'recover') {
          this.bossStateTimer -= dt;
          boss.rig.group.position.set(boss.x, 0, boss.z);
          animateMonsterRig(boss.rig, 'saigomo', elapsed * 0.5, false);
          if (this.bossStateTimer <= 0) {
            this.bossState = 'stalk';
            this.bossAttackCooldown = this.difficulty === 'nightmare' ? 1.15 : 1.55;
          }
        }
      }
    }

    // Secondary Threat in Cavern: Cursed Keiko stalks & can be stunned for 8s by sword
    if (keiko) {
      if (keiko.stunTimer > 0) {
        keiko.stunTimer = Math.max(0, keiko.stunTimer - dt);
        keiko.rig.group.position.set(keiko.x, -0.15, keiko.z);
        animateMonsterRig(keiko.rig, 'keiko', elapsed * 0.3, false);
      } else {
        const kdx = this.playerX - keiko.x;
        const kdz = this.playerZ - keiko.z;
        const kdist = Math.hypot(kdx, kdz);
        if (kdist < 1.35) {
          this.applyPlayerDamage(15, 'keiko');
          keiko.stunTimer = 2.4;
          if (this.mode !== 'playing') return true;
        } else if (kdist <= 13.0) {
          const hasLos = hasLineOfSight(keiko.x, keiko.z, this.playerX, this.playerZ, this.mapData);
          let sx = this.playerX;
          let sz = this.playerZ;
          if (!hasLos) {
            const kg = worldToGrid(keiko.x, keiko.z, this.mapData);
            const pg = worldToGrid(this.playerX, this.playerZ, this.mapData);
            const next = findNextStepBFS(kg.gx, kg.gz, pg.gx, pg.gz, this.mapData);
            const wp = gridToWorld(next.gx, next.gz, this.mapData);
            sx = wp.x;
            sz = wp.z;
          }
          const rx = sx - keiko.x;
          const rz = sz - keiko.z;
          const rlen = Math.hypot(rx, rz);
          if (rlen > 0.05) {
            keiko.x += (rx / rlen) * keiko.baseSpeed * dt;
            keiko.z += (rz / rlen) * keiko.baseSpeed * dt;
            keiko.yaw = Math.atan2(rx, rz);
          }
          keiko.rig.group.position.set(keiko.x, 0, keiko.z);
          keiko.rig.group.rotation.y = keiko.yaw;
          animateMonsterRig(keiko.rig, 'keiko', elapsed, true);
        }
      }
    }

    return false;
  }

  private triggerJumpscare(monster: MonsterEntity) {
    soundEngine.stopBgm();
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
      if (this.chapterId === 4) {
        const boss = this.monsters.find((m) => m.id === 'saigomo');
        if (boss) {
          targetX = boss.x;
          targetZ = boss.z;
        }
      } else if (this.exitUnlocked) {
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
      isBossFight: this.chapterId === 4,
      playerHp: this.playerHp,
      playerMaxHp: this.playerMaxHp,
      hurtFlash: this.hurtFlash,
      bossHp: this.bossHp,
      bossMaxHp: this.bossMaxHp,
      bossStunTimer: this.bossStunTimer,
      bossAttackWarning: this.bossAttackWarning,
      bossHitsLanded: this.bossHitsLanded,
    });
  }

  private buildAtmosphereParticles(chapterId: number, mapW: number, mapH: number) {
    this.particleBounds = { w: mapW, h: mapH };

    // 1. Primary ambient particles: dust motes (Ch1), spirit wisps (Ch2), falling sakura petals (Ch3), cavern embers (Ch4)
    const particleCount = chapterId === 3 ? 480 : 400;
    const pPositions = new Float32Array(particleCount * 3);
    const pVels = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * mapW * 0.92;
      pPositions[i * 3 + 1] = 0.2 + Math.random() * (this.activeWallHeight - 0.45);
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * mapH * 0.92;

      if (chapterId === 3) {
        // Gentle diagonal falling & fluttering sakura petals
        pVels[i * 3] = 0.22 + Math.random() * 0.24;
        pVels[i * 3 + 1] = -(0.35 + Math.random() * 0.32);
        pVels[i * 3 + 2] = 0.1 + Math.random() * 0.22;
      } else if (chapterId === 4 || chapterId === 2) {
        // Rising embers / eerie spirit ash
        pVels[i * 3] = (Math.random() - 0.5) * 0.16;
        pVels[i * 3 + 1] = 0.12 + Math.random() * 0.22;
        pVels[i * 3 + 2] = (Math.random() - 0.5) * 0.16;
      } else {
        // Slowly settling school dust motes & ash
        pVels[i * 3] = (Math.random() - 0.5) * 0.14;
        pVels[i * 3 + 1] = -(0.04 + Math.random() * 0.08);
        pVels[i * 3 + 2] = (Math.random() - 0.5) * 0.14;
      }
    }
    this.particleVelocities = pVels;
    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const particleColor =
      chapterId === 3 ? 0xfbcfe8 : chapterId === 4 ? 0xf87171 : chapterId === 2 ? 0xd8b4fe : 0xdbeafe;
    this.particleMat = new THREE.PointsMaterial({
      color: particleColor,
      map: chapterId === 3 ? this.textures.sakuraPetal : this.textures.particleMote,
      size: chapterId === 3 ? 0.22 : chapterId === 4 ? 0.14 : 0.12,
      transparent: true,
      opacity: chapterId === 3 ? 0.82 : chapterId === 4 ? 0.72 : 0.48,
      depthWrite: false,
    });
    this.ambientParticles = new THREE.Points(this.particleGeo, this.particleMat);
    this.ambientParticles.frustumCulled = false;
    this.worldGroup.add(this.ambientParticles);

    // 2. Layered Low-Lying Ground Fog Wisps drifting across corridors, swamps & cave floor
    const mistCount = 120;
    const mPositions = new Float32Array(mistCount * 3);
    const mVels = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      mPositions[i * 3] = (Math.random() - 0.5) * mapW * 0.9;
      mPositions[i * 3 + 1] = 0.35 + Math.random() * 0.85;
      mPositions[i * 3 + 2] = (Math.random() - 0.5) * mapH * 0.9;

      mVels[i * 3] = (Math.random() - 0.5) * 0.28;
      mVels[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
      mVels[i * 3 + 2] = (Math.random() - 0.5) * 0.28;
    }
    this.mistVelocities = mVels;
    this.mistGeo = new THREE.BufferGeometry();
    this.mistGeo.setAttribute('position', new THREE.BufferAttribute(mPositions, 3));
    const mistColor =
      chapterId === 4 ? 0x5c1018 : chapterId === 3 ? 0x4b1d3f : chapterId === 2 ? 0x2a1b3d : 0x334155;
    this.mistMat = new THREE.PointsMaterial({
      color: mistColor,
      map: this.textures.mistPuff,
      size: 2.35,
      transparent: true,
      opacity: chapterId >= 3 ? 0.16 : 0.12,
      depthWrite: false,
    });
    this.mistParticles = new THREE.Points(this.mistGeo, this.mistMat);
    this.mistParticles.frustumCulled = false;
    this.worldGroup.add(this.mistParticles);
  }

  private animateAtmosphereParticles(dt: number, elapsed: number, chapterId: number) {
    const halfW = this.particleBounds.w * 0.48;
    const halfH = this.particleBounds.h * 0.48;
    const maxY = this.activeWallHeight - 0.25;

    if (this.particleGeo && this.particleVelocities) {
      const attr = this.particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const vels = this.particleVelocities;
      const count = arr.length / 3;

      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const flutter =
          chapterId === 3 ? Math.sin(elapsed * 2.2 + i * 0.7) * 0.35 : Math.sin(elapsed * 1.1 + i) * 0.08;
        arr[ix] += (vels[ix] + flutter) * dt;
        arr[ix + 1] += vels[ix + 1] * dt;
        arr[ix + 2] += (vels[ix + 2] + Math.cos(elapsed * 1.5 + i * 0.5) * 0.12) * dt;

        if (arr[ix] > halfW) arr[ix] = -halfW;
        else if (arr[ix] < -halfW) arr[ix] = halfW;

        if (arr[ix + 2] > halfH) arr[ix + 2] = -halfH;
        else if (arr[ix + 2] < -halfH) arr[ix + 2] = halfH;

        if (arr[ix + 1] < 0.12) arr[ix + 1] = maxY;
        else if (arr[ix + 1] > maxY) arr[ix + 1] = 0.2;
      }
      attr.needsUpdate = true;
    }

    if (this.mistGeo && this.mistVelocities) {
      const mAttr = this.mistGeo.getAttribute('position') as THREE.BufferAttribute;
      const mArr = mAttr.array as Float32Array;
      const mVels = this.mistVelocities;
      const mCount = mArr.length / 3;

      for (let i = 0; i < mCount; i++) {
        const ix = i * 3;
        mArr[ix] += mVels[ix] * dt;
        mArr[ix + 1] = 0.35 + ((mArr[ix + 1] + mVels[ix + 1] * dt - 0.35 + 0.9) % 0.9);
        mArr[ix + 2] += mVels[ix + 2] * dt;

        if (mArr[ix] > halfW) mArr[ix] = -halfW;
        else if (mArr[ix] < -halfW) mArr[ix] = halfW;

        if (mArr[ix + 2] > halfH) mArr[ix + 2] = -halfH;
        else if (mArr[ix + 2] < -halfH) mArr[ix + 2] = halfH;
      }
      mAttr.needsUpdate = true;
    }
  }

  private syncShiftWalls() {
    if (!this.shiftWallMesh || !this.mapData) return;
    for (let i = 0; i < this.shiftSlots.length; i++) {
      const slot = this.shiftSlots[i];
      const active = this.mapData.cells[slot.gz][slot.gx] === '#';
      if (active) {
        this.shiftDummy.position.set(slot.x, WALL_HEIGHT / 2, slot.z);
        this.shiftDummy.scale.set(1, 1, 1);
      } else {
        this.shiftDummy.position.set(slot.x, -WALL_HEIGHT, slot.z);
        this.shiftDummy.scale.set(0, 0, 0);
      }
      this.shiftDummy.updateMatrix();
      this.shiftWallMesh.setMatrixAt(i, this.shiftDummy.matrix);
    }
    this.shiftWallMesh.instanceMatrix.needsUpdate = true;
    this.shiftWallMesh.computeBoundingSphere();
  }

  private silentlyShiftMaze() {
    if (!this.mapData || this.shiftSlots.length === 0) return;
    const map = this.mapData;
    const playerGrid = worldToGrid(this.playerX, this.playerZ, map);

    // Build set of grid cells occupied by monsters (+1 tile margin) and uncollected items
    const blockedSet = new Set<string>();
    blockedSet.add(`${playerGrid.gx},${playerGrid.gz}`);
    for (const m of this.monsters) {
      const mg = worldToGrid(m.x, m.z, map);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          blockedSet.add(`${mg.gx + dx},${mg.gz + dz}`);
        }
      }
    }
    for (const item of this.collectibles) {
      if (item.collected) continue;
      const ig = worldToGrid(item.x, item.z, map);
      blockedSet.add(`${ig.gx},${ig.gz}`);
    }

    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);

    const closedHidden: Array<{ gx: number; gz: number }> = [];
    const openHidden: Array<{ gx: number; gz: number }> = [];

    for (const slot of this.shiftSlots) {
      const dx = slot.x - this.playerX;
      const dz = slot.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist < 7.2) continue;

      const dot = (dx * fwdX + dz * fwdZ) / Math.max(0.01, dist);
      // Must be behind player OR occluded behind existing walls so player never sees walls pop
      const hiddenFromEye =
        dot < 0.28 || !hasLineOfSight(this.playerX, this.playerZ, slot.x, slot.z, map);
      if (!hiddenFromEye) continue;

      const ch = map.cells[slot.gz][slot.gx];
      if (ch === '#') {
        closedHidden.push({ gx: slot.gx, gz: slot.gz });
      } else if (ch === '.' && !blockedSet.has(`${slot.gx},${slot.gz}`)) {
        openHidden.push({ gx: slot.gx, gz: slot.gz });
      }
    }

    if (closedHidden.length === 0 && openHidden.length === 0) return;

    // Gather all reachability targets (uncollected items, exit, and monsters)
    const targets: Array<{ gx: number; gz: number }> = [{ ...map.exitTile }];
    for (const item of this.collectibles) {
      if (!item.collected) {
        targets.push(worldToGrid(item.x, item.z, map));
      }
    }
    for (const m of this.monsters) {
      targets.push(worldToGrid(m.x, m.z, map));
    }

    const pickRandom = <T,>(arr: T[], maxCount: number): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy.slice(0, maxCount);
    };

    const toOpen = pickRandom(closedHidden, Math.min(2, closedHidden.length));
    const toClose = pickRandom(openHidden, Math.min(2, openHidden.length));

    for (const c of toOpen) map.cells[c.gz][c.gx] = '.';
    for (const c of toClose) map.cells[c.gz][c.gx] = '#';

    if (canReachAllTargets(playerGrid.gx, playerGrid.gz, targets, map)) {
      this.syncShiftWalls();
    } else {
      // Revert closes and keep openings (or revert all if still blocked)
      for (const c of toClose) map.cells[c.gz][c.gx] = '.';
      if (toOpen.length > 0 && canReachAllTargets(playerGrid.gx, playerGrid.gz, targets, map)) {
        this.syncShiftWalls();
      } else {
        for (const c of toOpen) map.cells[c.gz][c.gx] = '#';
      }
    }

    // Ensure patrolling monsters don't keep targeting a newly closed tile
    for (const m of this.monsters) {
      if (isWall(m.targetGx, m.targetGz, map) && map.walkableTiles.length > 0) {
        const pick =
          map.walkableTiles[Math.floor(Math.random() * map.walkableTiles.length)];
        m.targetGx = pick.gx;
        m.targetGz = pick.gz;
      }
    }
  }

  public dispose() {
    this.disposed = true;
    soundEngine.stopBgm();
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
