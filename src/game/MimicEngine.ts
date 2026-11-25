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
  parseChaseMap,
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
  createPoisonWellProp,
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
  setSwordWhiteFlame,
} from './models';
import { soundEngine } from './soundEngine';
import { ProceduralTextureSet, createProceduralTextures } from './textures';

export interface HudSnapshot {
  stamina: number;
  maxStamina: number;
  battery: number;
  maxBattery: number;
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
  studentTeleportCooldown: number;
  maxStudentTeleportCooldown: number;
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
  finalChaseActive: boolean;
  finalChaseElapsed: number;
  inChaseMap: boolean;
  carriedRat: 'none' | 'raw' | 'poisoned';
  difficulty: DifficultyMode;
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
  kind: 'key' | 'ofuda' | 'butterfly' | 'seal' | 'rat' | 'battery' | 'diary';
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
  private battery = 200;
  private maxBattery = 200;
  private flashlightOn = true;
  private crouching = false;
  private exhausted = false;
  private headBobPhase = 0;
  private stepDistAccum = 0;
  private skillCooldown = 0;
  private maxSkillCooldown = 22;
  private skillActiveTimer = 0;
  private studentTeleportCooldown = 0;
  private readonly maxStudentTeleportCooldown = 8;
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
  private finalChaseActive = false;
  private finalChaseElapsed = 0;
  private finalChaseTremorTimer = 0;
  private inChaseMap = false;
  private carriedRat: 'none' | 'raw' | 'poisoned' = 'none';
  private ratsFedCount = 0;
  private poisonWellPos: { x: number; z: number } | null = null;
  private poisonWellLight: THREE.PointLight | null = null;

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
  private touchSprinting = false;

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
    this.renderer.domElement.style.touchAction = 'none';
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

  private isBossChapter(chId = this.chapterId): boolean {
    return chId === 4 || chId === 8;
  }

  private getBossId(): MonsterId {
    return this.chapterId === 8 ? 'enzukai' : 'saigomo';
  }

  private getBossMinionId(): MonsterId {
    return this.chapterId === 8 ? 'senzai_fallen' : 'keiko';
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    this.keys.add(code);

    if (this.mode !== 'playing' || this.kintoruControlActive) return;

    if (code === 'KeyF') {
      this.toggleFlashlight();
    } else if (code === 'KeyC') {
      this.crouching = !this.crouching;
    } else if (code === 'KeyE') {
      if (this.isBossChapter() && !this.inChaseMap && !this.hasNearbyInteractable()) {
        this.triggerSwordAttack();
      } else {
        this.triggerInteract();
      }
    } else if (code === 'Space') {
      if (this.isBossChapter()) {
        e.preventDefault();
        this.triggerSwordAttack();
      }
    } else if (code === 'KeyG') {
      this.triggerJobSkill();
    } else if (code === 'KeyQ') {
      if (this.jobId === 'student') {
        this.triggerStudentTeleportSkill();
      }
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
    const isCoarsePointer =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (isCoarsePointer) return;

    this.isDraggingLook = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (e.button === 0 && this.isBossChapter() && !this.inChaseMap) {
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

  public setTouchSprint(sprinting: boolean) {
    this.touchSprinting = sprinting;
  }

  public adjustLook(dx: number, dy: number) {
    if (this.mode !== 'playing' || this.kintoruControlActive) return;
    this.yaw -= dx * 0.0046;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0046, -1.22, 1.22);
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
    if (this.mode !== 'playing' || !this.isBossChapter() || this.inChaseMap) return;
    if (this.swordCooldown > 0) return;

    const isHacker = this.jobId === 'hacker';
    const isDev = this.jobId === 'developer';
    this.swordSwingDuration = isHacker ? 0.18 : isDev ? 0.2 : 0.28;
    this.swordSwingTimer = this.swordSwingDuration;
    this.swordCooldown = isHacker ? 0.22 : isDev ? 0.25 : 0.42;
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
      this.chapterId === 5 &&
      !this.inChaseMap &&
      this.poisonWellPos &&
      Math.hypot(this.poisonWellPos.x - this.playerX, this.poisonWellPos.z - this.playerZ) < 2.85
    ) {
      return true;
    }
    if (
      this.exitUnlocked &&
      Math.hypot(this.exitPos.x - this.playerX, this.exitPos.z - this.playerZ) < 2.75
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

    const stunDur = this.difficulty === 'nightmare' ? 2.4 : 3.0;
    if (this.jobId === 'student') {
      this.skillActiveTimer = 5.0;
      this.stamina = this.maxStamina;
      this.callbacks.onSystemNotice('질주 본능 발동! 5초간 이동 속도가 크게 상승합니다.');
    } else if (this.jobId === 'police') {
      let stunned = 0;
      const bossId = this.getBossId();
      const bossName = bossId === 'enzukai' ? '엔즈카이' : '사이고모';
      for (const m of this.monsters) {
        if (Math.hypot(m.x - this.playerX, m.z - this.playerZ) <= 13.5) {
          m.stunTimer = 3.5;
          m.state = 'patrol';
          if (this.isBossChapter() && !this.inChaseMap && !this.exitUnlocked && m.id === bossId) {
            this.stunBoss(stunDur, `전술 섬광탄 명중! ${bossName}가 ${stunDur}초간 스턴 상태에 빠졌습니다!`);
          }
          stunned++;
        }
      }
      this.flashlight.intensity = 42;
      if (!this.isBossChapter() || this.inChaseMap) {
        this.callbacks.onSystemNotice(
          stunned > 0
            ? `전술 섬광탄 명중! 괴물 ${stunned}체를 3.5초간 경직시켰습니다.`
            : '전술 섬광탄 투척! (근처에 괴물이 없었습니다)'
        );
      }
    } else if (this.jobId === 'doctor') {
      this.stamina = this.maxStamina;
      this.exhausted = false;
      const charge = Math.round(this.maxBattery * 0.25);
      this.battery = Math.min(this.maxBattery, this.battery + charge);
      if (this.isBossChapter() && !this.inChaseMap) {
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 35);
        this.callbacks.onSystemNotice(`아드레날린 주사! HP +35, 스태미나 100%, 배터리 +${charge} 회복`);
      } else {
        this.callbacks.onSystemNotice(`아드레날린 주사! 스태미나 100% 및 배터리 +${charge} 회복`);
      }
    } else if (this.jobId === 'exorcist') {
      let sealed = 0;
      const bossId = this.getBossId();
      const bossName = bossId === 'enzukai' ? '엔즈카이' : '사이고모';
      for (const m of this.monsters) {
        if (Math.hypot(m.x - this.playerX, m.z - this.playerZ) <= 16.0) {
          m.stunTimer = 5.0;
          m.state = 'patrol';
          if (this.isBossChapter() && !this.inChaseMap && !this.exitUnlocked && m.id === bossId) {
            this.stunBoss(stunDur, `정화의 오후다! ${bossName}가 ${stunDur}초간 스턴 봉인되었습니다!`);
          }
          sealed++;
        }
      }
      if (!this.isBossChapter() || this.inChaseMap) {
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
      this.battery = this.maxBattery;
      this.playerHp = this.playerMaxHp;

      if (this.isBossChapter() && !this.inChaseMap && !this.exitUnlocked) {
        const bossName = this.chapterId === 8 ? '엔즈카이' : '사이고모';
        this.stunBoss(6.0, `시스템 지배! ${bossName}에게 강력한 성검 참격(-150 HP) 및 6초 스턴!`);
        this.damageBoss(150);
        return;
      }

      if (!this.exitUnlocked) {
        if (this.chapterId === 5) {
          this.carriedRat = 'none';
          this.advanceChapter5Feeding(true);
          return;
        }
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
        this.warpPlayerNearExit();
        this.callbacks.onSystemNotice(
          this.chapterId === 1 && !this.inChaseMap
            ? '시스템 지배! 전 괴물 12초 정지 및 지하실 문 앞 안전 지대로 순간이동했습니다!'
            : '시스템 지배! 전 괴물 12초 정지 및 탈출 출구 앞 안전 지대로 순간이동했습니다!'
        );
        return;
      }
      this.callbacks.onSystemNotice('시스템 지배! 모든 괴물을 12초간 강제 정지시켰습니다.');
    } else if (this.jobId === 'hacker') {
      for (const m of this.monsters) {
        m.stunTimer = 15.0;
        m.state = 'patrol';
        m.memoryTimer = 0;
      }
      this.skillActiveTimer = 10.0;
      this.stamina = this.maxStamina;
      this.battery = this.maxBattery;
      this.playerHp = this.playerMaxHp;

      if (this.isBossChapter() && !this.inChaseMap && !this.exitUnlocked) {
        for (const p of this.bossProjectiles) {
          this.worldGroup.remove(p.mesh);
        }
        this.bossProjectiles = [];
        const bossName = this.chapterId === 8 ? '엔즈카이' : '사이고모';
        this.stunBoss(5.0, `시스템 백도어! 탄막 삭제 · ${bossName} 결계 파괴(-250 HP) 및 5초 스턴!`);
        this.damageBoss(250);
        return;
      }

      if (!this.exitUnlocked) {
        if (this.chapterId === 5) {
          this.carriedRat = 'none';
          while (this.ratsFedCount < 3) {
            this.advanceChapter5Feeding(false);
          }
          this.callbacks.onSystemNotice(
            '시스템 백도어! 전 괴물 15초 마비 및 미오와 린에게 독 쥐 3회 먹이기를 강제 완료했습니다!'
          );
          return;
        }
        let hackedCount = 0;
        for (const item of this.collectibles) {
          if (item.collected) continue;
          if (item.kind === 'battery' || item.kind === 'diary') continue;
          this.collectItemEntity(item);
          hackedCount++;
        }
        if (hackedCount > 0) {
          this.callbacks.onSystemNotice(
            `시스템 백도어! 전 괴물 15초 마비 및 맵의 남은 봉인 ${hackedCount}개를 일괄 해킹했습니다!`
          );
          return;
        }
      } else if (this.mapData) {
        this.warpPlayerNearExit();
        this.callbacks.onSystemNotice(
          this.chapterId === 1 && !this.inChaseMap
            ? '시스템 백도어! 전 괴물 15초 마비 및 지하실 문 앞 안전 지대로 워프했습니다!'
            : '시스템 백도어! 전 괴물 15초 마비 및 탈출 출구 앞 안전 지대로 워프했습니다!'
        );
        return;
      }
      this.callbacks.onSystemNotice('시스템 백도어! 전 괴물을 15초간 강제 마비시켰습니다.');
    }
  }

  public triggerStudentTeleportSkill() {
    if (this.mode !== 'playing' || this.jobId !== 'student' || !this.mapData) return;
    if (this.studentTeleportCooldown > 0) return;

    let targetItem: CollectibleEntity | null = null;
    let bestDist = Infinity;

    // Prioritize uncollected objective items first (keys/ofuda/butterflies/seals/rats)
    for (const item of this.collectibles) {
      if (item.collected) continue;
      if (item.kind === 'battery' || item.kind === 'diary') continue;
      const d = Math.hypot(item.x - this.playerX, item.z - this.playerZ);
      if (d < bestDist) {
        bestDist = d;
        targetItem = item;
      }
    }

    // Fallback to nearest battery or diary if no objective collectibles remain
    if (!targetItem) {
      for (const item of this.collectibles) {
        if (item.collected) continue;
        const d = Math.hypot(item.x - this.playerX, item.z - this.playerZ);
        if (d < bestDist) {
          bestDist = d;
          targetItem = item;
        }
      }
    }

    if (!targetItem) {
      this.callbacks.onSystemNotice('맵에 순간이동할 수 있는 아이템이 남아있지 않습니다.');
      return;
    }

    this.studentTeleportCooldown = this.maxStudentTeleportCooldown;
    soundEngine.playPortalUnlock();

    const dirX = this.playerX - targetItem.x;
    const dirZ = this.playerZ - targetItem.z;
    const dirLen = Math.hypot(dirX, dirZ) || 1;
    const offsets: Array<[number, number]> = [
      [(dirX / dirLen) * 1.35, (dirZ / dirLen) * 1.35],
      [0, 1.35],
      [0, -1.35],
      [1.35, 0],
      [-1.35, 0],
      [1.0, 1.0],
      [-1.0, 1.0],
      [1.0, -1.0],
      [-1.0, -1.0],
    ];

    let safeX = targetItem.x;
    let safeZ = targetItem.z;
    for (const [ox, oz] of offsets) {
      const cx = targetItem.x + ox;
      const cz = targetItem.z + oz;
      if (this.canOccupy(cx, cz) && hasLineOfSight(cx, cz, targetItem.x, targetItem.z, this.mapData)) {
        safeX = cx;
        safeZ = cz;
        break;
      }
    }

    this.playerX = safeX;
    this.playerZ = safeZ;
    const lookDx = targetItem.x - safeX;
    const lookDz = targetItem.z - safeZ;
    if (Math.hypot(lookDx, lookDz) > 0.15) {
      this.yaw = Math.atan2(-lookDx, -lookDz);
      this.pitch = -0.14;
    }
    this.invulnTimer = Math.max(this.invulnTimer, 0.9);

    const itemLabel =
      targetItem.kind === 'battery'
        ? '예비 배터리'
        : targetItem.kind === 'diary'
          ? '숨겨진 일기'
          : targetItem.kind === 'rat'
            ? '시궁쥐'
            : '봉인 아이템';
    this.callbacks.onSystemNotice(`✨ 아이템 도약 [Q]! 가장 가까운 ${itemLabel} 앞으로 순간이동했습니다!`);
  }

  private warpPlayerNearExit() {
    if (!this.mapData) return;
    const exitGrid = worldToGrid(this.exitPos.x, this.exitPos.z, this.mapData);
    const dirs = [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ];
    for (const [ox, oz] of dirs) {
      const tx = exitGrid.gx + ox;
      const tz = exitGrid.gz + oz;
      if (!isWall(tx, tz, this.mapData)) {
        const safePos = gridToWorld(tx, tz, this.mapData);
        this.playerX = safePos.x;
        this.playerZ = safePos.z;
        this.yaw = Math.atan2(-(this.exitPos.x - this.playerX), -(this.exitPos.z - this.playerZ));
        break;
      }
    }
  }

  public setPaused(paused: boolean) {
    if (this.mode === 'title' || this.mode === 'jumpscare') return;
    this.mode = paused ? 'paused' : 'playing';
    if (paused) {
      this.keys.clear();
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      this.touchSprinting = false;
      this.isDraggingLook = false;
      this.releasePointerLock();
      soundEngine.stopBgm();
    } else {
      soundEngine.startBgm(
        this.chapterId,
        this.isBossChapter() && !this.inChaseMap && !this.exitUnlocked,
        this.inChaseMap || this.finalChaseActive,
        this.difficulty === 'nightmare'
      );
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
    this.poisonWellPos = null;
    this.poisonWellLight = null;
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
    const isBossFight = this.isBossChapter(chapterId);
    this.inChaseMap = false;
    this.carriedRat = 'none';
    this.ratsFedCount = 0;
    this.collectedItems = 0;
    this.requiredItems = isBossFight ? 0 : meta.requiredItems;
    this.exitUnlocked = false;
    this.finalChaseActive = false;
    this.finalChaseElapsed = 0;
    this.finalChaseTremorTimer = 0;
    this.activeWallHeight = isBossFight ? WALL_HEIGHT * 2.0 : WALL_HEIGHT;

    // Reset Chapter 4 / 8 Boss & Sword Combat state
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
      setSwordWhiteFlame(this.swordGroup, chapterId === 8);
    }
    this.bossMaxHp = isBossFight ? (difficulty === 'nightmare' ? 1400 : 1000) : 1000;
    this.bossHp = this.bossMaxHp;
    this.bossHitsLanded = 0;
    this.bossStunTimer = 0;
    this.bossState = 'stalk';
    this.bossStateTimer = 0;
    this.bossAttackCooldown = difficulty === 'nightmare' ? 1.15 : 1.5;
    this.bossAttackCount = 0;
    this.bossPattern = 'lunge';
    this.bossAttackHitDone = false;
    this.bossSecondWaveDone = false;
    this.bossTrailTimer = 0;
    this.bossAttackWarning = null;

    this.maxStamina = jobId === 'student' ? 130 : 100;
    this.stamina = this.maxStamina;
    this.maxBattery = 200;
    this.battery = this.maxBattery;
    this.flashlightOn = true;
    this.crouching = false;
    this.exhausted = false;
    this.eyeHeight = 1.65;
    this.skillCooldown = 0;
    this.maxSkillCooldown = jobMeta.cooldownSec;
    this.skillActiveTimer = 0;
    this.studentTeleportCooldown = 0;
    this.doctorReviveReady = jobId === 'doctor';
    this.invulnTimer = 0;
    this.hasTriggeredFirstChase = false;
    this.wasAnyChasing = false;
    this.halfSubtitleShown = false;
    this.jumpscareMonster = null;
    this.kintoruControlActive = false;
    const isNightmare = difficulty === 'nightmare';
    const hasMindControlQte = isNightmare || (chapterId >= 2 && chapterId <= 4) || chapterId >= 6;
    this.kintoruNextTimer = hasMindControlQte
      ? (isNightmare ? 9 : isBossFight ? 17 : 13) + Math.random() * 5
      : 999999;
    this.keys.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchSprinting = false;
    this.isDraggingLook = false;

    this.buildWorldFromMapData(map, false);

    // Monsters
    const speedScale = isNightmare ? 1.32 : 1.0;
    const spawnList: MonsterId[] = [...meta.monsters];
    if (isNightmare && !isBossFight && meta.monsters.length > 0) {
      // Nightmare Mode spawns an extra relentless stalker
      spawnList.push(meta.monsters[0]);
    }
    this.spawnMonstersFromList(spawnList, map, speedScale, isBossFight, false);

    // Place Player at Start
    const startWorld = gridToWorld(map.playerStart.gx, map.playerStart.gz, map);
    this.playerX = startWorld.x;
    this.playerZ = startWorld.z;
    this.yaw = isBossFight ? 0 : -Math.PI / 2;
    this.pitch = 0;

    soundEngine.startBgm(chapterId, isBossFight, false, isNightmare);
    this.pushHudSnapshot(null, 99, null, false);
    this.callbacks.onSubtitle(meta.subtitles.onStart);
  }

  private buildWorldFromMapData(map: ChapterMapData, isChaseMap: boolean) {
    const chapterId = this.chapterId;
    const jobId = this.jobId;
    const isNightmare = this.difficulty === 'nightmare';
    const isBossFight = this.isBossChapter(chapterId) && !isChaseMap;
    const meta = CHAPTERS.find((c) => c.id === chapterId) || CHAPTERS[0];
    this.activeWallHeight = isBossFight ? WALL_HEIGHT * 2.0 : WALL_HEIGHT;

    const isHacker = jobId === 'hacker';
    const isGodJob = jobId === 'developer' || isHacker;

    // Configure Job + Nightmare Flashlight Optics
    const nmRangeScale = isNightmare && !isGodJob ? 0.82 : 1.0;
    if (isGodJob) {
      this.flashlight.distance = 68;
      this.flashlight.angle = Math.PI / 2.8;
    } else if (jobId === 'police') {
      this.flashlight.distance = 48 * nmRangeScale;
      this.flashlight.angle = Math.PI / 3.3;
    } else {
      this.flashlight.distance = (isBossFight ? 46 : 38) * nmRangeScale;
      this.flashlight.angle = isNightmare ? Math.PI / 4.2 : Math.PI / 3.8;
    }

    const baseFogColor = isChaseMap
      ? chapterId >= 5
        ? 0x240716
        : 0x240408
      : isNightmare
        ? 0x120205
        : meta.fogColor;
    const baseFog = isBossFight
      ? isGodJob
        ? 0.022
        : 0.038
      : isGodJob
        ? meta.fogDensity * 0.48
        : meta.fogDensity * 0.8;
    const fogDensity = baseFog * (isNightmare ? 1.42 : 1.0);

    this.scene.background = new THREE.Color(baseFogColor);
    this.scene.fog = new THREE.FogExp2(baseFogColor, fogDensity);
    this.scene.environmentIntensity = isGodJob
      ? 0.46
      : isNightmare
        ? 0.055
        : isBossFight
          ? 0.18
          : 0.11;
    this.ambientLight.color.setHex(isNightmare ? 0x1a0408 : meta.ambientColor);
    this.ambientLight.intensity = isGodJob
      ? 0.36
      : isNightmare
        ? isBossFight
          ? 0.075
          : 0.03
        : isBossFight
          ? 0.16
          : 0.07;
    this.hemiLight.intensity = isGodJob
      ? 0.4
      : isNightmare
        ? isBossFight
          ? 0.08
          : 0.035
        : isBossFight
          ? 0.16
          : 0.09;

    if (isGodJob) {
      this.playerFillLight.color.setHex(isHacker ? 0xa5f3fc : 0xe0f2fe);
      this.playerFillLight.intensity = isHacker ? 2.8 : 2.6;
      this.playerFillLight.distance = 16.0;
    } else {
      this.playerFillLight.color.setHex(
        isNightmare ? 0x5c191f : chapterId === 8 ? 0x854d0e : isBossFight ? 0x7f2d34 : 0x475569
      );
      this.playerFillLight.intensity = isNightmare
        ? isBossFight
          ? 0.32
          : 0.22
        : isBossFight
          ? 0.48
          : 0.34;
      this.playerFillLight.distance = isNightmare ? 3.2 : isBossFight ? 5.2 : 4.0;
    }

    // Floor & Ceiling
    const floorTex =
      chapterId === 1
        ? this.textures.woodFloor
        : chapterId === 2
          ? this.textures.tatamiFloor
          : chapterId === 4
            ? this.textures.caveStoneFloor
            : chapterId === 7
              ? this.textures.jigokuAshFloor
              : chapterId === 8
                ? this.textures.tokyoAsphaltFloor
                : this.textures.shrineStone;

    const mapW = map.width * TILE_SIZE;
    const mapH = map.height * TILE_SIZE;

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: chapterId >= 3 ? 0.74 : 0.82,
      metalness: chapterId === 8 || chapterId === 6 ? 0.22 : chapterId >= 3 ? 0.14 : 0.04,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(mapW, mapH), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.worldGroup.add(floor);

    const ceilMat = new THREE.MeshStandardMaterial({
      map:
        chapterId === 1
          ? this.textures.schoolCeiling
          : chapterId === 4
            ? this.textures.caveRockWall
            : chapterId === 6
              ? this.textures.abyssalSanctumWall
              : chapterId === 7
                ? this.textures.jigokuObsidianWall
                : chapterId === 8
                  ? this.textures.tokyoRuinsWall
                  : this.textures.ceilingWood,
      roughness: isBossFight ? 0.94 : chapterId === 1 ? 0.85 : 0.92,
      metalness: 0.04,
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(mapW, mapH), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = this.activeWallHeight;
    this.worldGroup.add(ceiling);

    // Flooded Swamp / Blood Pool / Deep Sea Overlay (~ tiles)
    if (map.waterTiles.length > 0) {
      const waterMat = new THREE.MeshStandardMaterial({
        map: chapterId === 4 || chapterId === 7 ? this.textures.bloodWater : this.textures.shrineWater,
        roughness: 0.12,
        metalness: 0.72,
        transparent: true,
        opacity: chapterId === 6 ? 0.9 : 0.84,
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
        : chapterId === 3
          ? this.textures.shrineWall
          : chapterId === 4
            ? this.textures.caveRockWall
            : chapterId === 5
              ? this.textures.islandCliffWall
              : chapterId === 6
                ? this.textures.abyssalSanctumWall
                : chapterId === 7
                  ? this.textures.jigokuObsidianWall
                  : chapterId === 8
                    ? this.textures.tokyoRuinsWall
                    : this.textures.shojiWall;

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: isBossFight ? 0.92 : 0.85,
      metalness: chapterId === 8 ? 0.18 : isBossFight ? 0.1 : 0.05,
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
          color: chapterId === 1 || chapterId === 6 ? 0x2b3036 : 0x1b120d,
          roughness: chapterId === 1 || chapterId === 6 ? 0.55 : 0.85,
          metalness: chapterId === 1 || chapterId === 6 ? 0.55 : 0.08,
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

    // School Ceiling Fluorescents (Ch1) vs Paper Lanterns (Ch2-8)
    const lanternColor =
      chapterId === 8
        ? 0xeab308
        : chapterId === 4
          ? 0xdc2626
          : chapterId === 7
            ? 0xf472b6
            : chapterId === 6
              ? 0xe11d48
              : chapterId === 5
                ? 0x0d9488
                : chapterId === 3
                  ? 0xdb2777
                  : 0xea580c;
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

    // Desks / Coastal Tables / Tokyo Street Barricades (F tiles)
    map.desks.forEach((d, i) => {
      const pos = gridToWorld(d.gx, d.gz, map);
      const prop =
        chapterId === 2 || chapterId === 5 || chapterId === 6 || chapterId === 7
          ? createChabudaiTable()
          : createSchoolDesk();
      prop.position.set(pos.x, 0, pos.z);
      prop.rotation.y = i % 2 === 0 ? 0.14 : -0.24;
      if ((chapterId === 1 || chapterId === 8) && i % 4 === 2) {
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

    // Hallway Bulletin Notice Boards (Ch1 main map)
    if (chapterId === 1 && !isChaseMap) {
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

    // Sacred Cursed Trees (Ch3 Cherry Blossoms, Ch5 Aogashima Coastal Pines, Ch7 Jigoku Dead Trees)
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

    // Book II Ch.1: Poisoned Well landmark for dipping rats
    if (map.poisonWell) {
      const wellWorld = gridToWorld(map.poisonWell.gx, map.poisonWell.gz, map);
      const { group: wellGroup, light: wellLight } = createPoisonWellProp();
      wellGroup.position.set(wellWorld.x, 0, wellWorld.z);
      this.worldGroup.add(wellGroup);
      this.poisonWellPos = { x: wellWorld.x, z: wellWorld.z };
      this.poisonWellLight = wellLight;
      this.lanterns.push({ light: wellLight, baseIntensity: 2.8, phase: 0.5 });
    }

    // Ch.2: Head-turning Cursed Dolls & Hospital Gurneys
    if (chapterId === 2 && !isChaseMap) {
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

    // Ch.3, Ch.4, Ch.5, Ch.6 & Ch.7: Eerie Stone Jizo Statues watching from the Mist
    if (!isChaseMap && (chapterId === 3 || chapterId === 4 || chapterId === 5 || chapterId === 6 || chapterId === 7)) {
      const jizoSpots =
        chapterId === 5
          ? [
              { gx: 5, gz: 5 },
              { gx: 18, gz: 5 },
              { gx: 5, gz: 19 },
            ]
          : chapterId === 6
            ? [
                { gx: 7, gz: 10 },
                { gx: 15, gz: 10 },
                { gx: 11, gz: 17 },
              ]
            : chapterId === 7
              ? [
                  { gx: 8, gz: 11 },
                  { gx: 12, gz: 12 },
                ]
              : [
                  { gx: 7, gz: 5 },
                  { gx: 15, gz: 5 },
                  { gx: 7, gz: 16 },
                  { gx: 15, gz: 16 },
                ];
      jizoSpots.forEach((spot, idx) => {
        if (!isWall(spot.gx, spot.gz, map)) {
          const pos = gridToWorld(spot.gx, spot.gz, map);
          const jizo = createStoneJizoStatue();
          jizo.position.set(pos.x + (idx % 2 === 0 ? -0.9 : 0.9), 0, pos.z);
          jizo.lookAt(0, 0, 0);
          this.worldGroup.add(jizo);
        }
      });
    }

    // Ch.4 ONLY: Giant Underground Cavern Props — Stalactites, Stalagmites, Crimson Crystals & Cocoons
    if (chapterId === 4 && !isChaseMap) {
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
    }

    // Boss Arena Telegraph Ring & Barrier Aura (Ch.4 Cave & Ch.8 Ruined Tokyo)
    if (isBossFight) {
      this.telegraphRing = createTelegraphRing();
      this.worldGroup.add(this.telegraphRing);

      this.bossShieldAura = createBossShieldAura();
      this.worldGroup.add(this.bossShieldAura);
    }

    // Atmospheric Chapter Particles (Dust, Spirit Ash, Falling Sakura Petals, Blood Embers) & Layered Ground Mist
    this.buildAtmosphereParticles(chapterId, mapW, mapH);

    // Exit Portal (Ch.1 = Steel Basement Door, Ch.2+ = Crimson/Green Torii Gate)
    const exitWorld = gridToWorld(map.exitTile.gx, map.exitTile.gz, map);
    this.exitPos = exitWorld;
    if (chapterId === 1 && !isChaseMap) {
      const doorRig = createBasementDoor(this.exitUnlocked);
      doorRig.group.position.set(exitWorld.x + 0.35, 0, exitWorld.z + 0.35);
      doorRig.group.rotation.y = -Math.PI * 0.75;
      this.worldGroup.add(doorRig.group);
      this.exitGateGroup = doorRig.group;
      this.basementDoorRig = doorRig;
    } else {
      const exitGate = createToriiGate(isBossFight ? 1.08 : 0.94, isBossFight || this.exitUnlocked);
      exitGate.position.set(exitWorld.x, 0, exitWorld.z);
      this.worldGroup.add(exitGate);
      this.exitGateGroup = exitGate;
    }

    const exitLight = new THREE.PointLight(
      this.exitUnlocked ? 0x22c55e : 0x991b1b,
      this.exitUnlocked ? 3.8 : isBossFight ? 0.9 : 1.4,
      this.exitUnlocked ? 14 : 8,
      1.6
    );
    exitLight.position.set(exitWorld.x, 1.8, exitWorld.z);
    this.worldGroup.add(exitLight);
    this.exitPortalLight = exitLight;

    // Collectibles
    const chapterDiaries = DIARIES.filter((d) => d.chapterId === chapterId);
    let diaryIdx = 0;
    let batterySeen = 0;

    map.items.forEach((item, i) => {
      if (item.kind === 'battery') {
        batterySeen++;
        if (isNightmare && batterySeen % 2 === 0) return;
      }

      const pos = gridToWorld(item.gx, item.gz, map);
      const mesh = createCollectibleMesh(item.kind, this.textures);
      const baseY = item.kind === 'rat' ? 0.24 : item.kind === 'diary' ? 0.55 : 1.05;
      mesh.position.set(pos.x, baseY, pos.z);
      this.worldGroup.add(mesh);

      let light: THREE.PointLight | undefined;
      if (item.kind !== 'battery') {
        const glowColor =
          item.kind === 'key'
            ? 0xf59e0b
            : item.kind === 'rat'
              ? 0xf97316
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
  }

  private spawnMonstersFromList(
    monsterIds: MonsterId[],
    map: ChapterMapData,
    speedScale: number,
    isBossFight: boolean,
    isChaseSpawn: boolean
  ) {
    monsterIds.forEach((mId, i) => {
      const spawn = map.monsterSpawns[i % map.monsterSpawns.length] || { gx: 11, gz: 11 };
      const pos = gridToWorld(spawn.gx, spawn.gz, map);
      const rig = createMonsterRig(mId, this.textures);
      if ((isBossFight || isChaseSpawn) && (mId === 'saigomo' || mId === 'enzukai')) {
        rig.group.scale.setScalar(isChaseSpawn ? 1.28 : 1.48);
      }
      rig.group.position.set(pos.x, 0, pos.z);
      this.worldGroup.add(rig.group);

      const patrolPick =
        map.walkableTiles[Math.floor(Math.random() * map.walkableTiles.length)];

      const baseSpeed =
        mId === 'saigomo' || mId === 'enzukai'
          ? 2.85
          : mId === 'oomukade' || mId === 'nure'
            ? 2.45
            : mId === 'nagisa' || mId === 'jigoku_warden'
              ? 2.4
              : mId === 'kuishinbo' || mId === 'hyakume'
                ? 2.35
                : mId === 'keiko' || mId === 'senzai_fallen'
                  ? 2.3
                  : mId === 'rin_mio'
                    ? 2.25
                    : mId === 'megumi' || mId === 'kyogi'
                      ? 2.15
                      : 1.95;
      const chaseSpeed =
        mId === 'saigomo' || mId === 'enzukai'
          ? 4.45
          : mId === 'oomukade' || mId === 'nure'
            ? 4.25
            : mId === 'nagisa' || mId === 'jigoku_warden'
              ? 4.15
              : mId === 'kuishinbo' || mId === 'hyakume'
                ? 4.1
                : mId === 'rin_mio' || mId === 'senzai_fallen'
                  ? 3.95
                  : mId === 'megumi'
                    ? 3.9
                    : mId === 'keiko' || mId === 'kyogi'
                      ? 3.8
                      : 3.65;

      this.monsters.push({
        id: mId,
        rig,
        x: pos.x,
        z: pos.z,
        yaw: 0,
        state: isChaseSpawn ? 'chase' : 'patrol',
        targetGx: patrolPick.gx,
        targetGz: patrolPick.gz,
        baseSpeed: baseSpeed * speedScale,
        chaseSpeed: chaseSpeed * speedScale,
        memoryTimer: isChaseSpawn ? 999 : 0,
        pathRefreshTimer: 0,
        stunTimer: isChaseSpawn ? 1.35 + i * 0.25 : 0,
      });
    });
  }

  public triggerInteract() {
    if (this.mode !== 'playing' || !this.mapData) return;

    // 0. In Book II Ch.1: Check feeding poisoned rat to Rin & Mio (generous 4.2m range)
    if (this.chapterId === 5 && !this.inChaseMap && this.carriedRat === 'poisoned') {
      const rinMio = this.monsters.find((m) => m.id === 'rin_mio' && m.stunTimer <= 0);
      if (rinMio && Math.hypot(rinMio.x - this.playerX, rinMio.z - this.playerZ) < 4.25) {
        this.carriedRat = 'none';
        rinMio.stunTimer = 5.5;
        rinMio.state = 'patrol';
        rinMio.memoryTimer = 0;
        this.spawnShockwave(rinMio.x, rinMio.z, 2.8, 0x22c55e, 0.42);
        soundEngine.playPoisonSplash();
        this.advanceChapter5Feeding(false);
        return;
      }
    }

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

    // 2. Check Poisoned Well in Book II Ch.1
    if (
      this.chapterId === 5 &&
      !this.inChaseMap &&
      this.poisonWellPos &&
      Math.hypot(this.poisonWellPos.x - this.playerX, this.poisonWellPos.z - this.playerZ) < 2.85
    ) {
      if (this.carriedRat === 'raw') {
        this.carriedRat = 'poisoned';
        soundEngine.playPoisonSplash();
        this.spawnShockwave(this.poisonWellPos.x, this.poisonWellPos.z, 2.4, 0x22c55e, 0.4);
        this.callbacks.onSystemNotice(
          '☠️ 독이 든 우물에 쥐를 담갔습니다! 이제 미오와 린에게 다가가 [E]로 먹이세요!'
        );
      } else if (this.carriedRat === 'poisoned') {
        this.callbacks.onSystemNotice('이미 독에 절여진 쥐를 들고 있습니다! 미오와 린에게 먹이세요.');
      } else {
        this.callbacks.onSystemNotice('독이 든 우물입니다. 먼저 섬에서 시궁쥐를 잡아오세요!');
      }
      return;
    }

    // 3. Check Exit Portal: Exploration/Boss unlocks -> enter Dedicated Chase Map; Chase Map exit -> Clear Chapter!
    if (this.exitUnlocked) {
      const exitDist = Math.hypot(this.exitPos.x - this.playerX, this.exitPos.z - this.playerZ);
      if (exitDist < 2.75) {
        if (!this.inChaseMap) {
          this.enterDedicatedChaseMap();
        } else {
          this.completeChapterEscape();
        }
      }
    }
  }

  private advanceChapter5Feeding(fromDeveloper: boolean) {
    this.ratsFedCount = Math.min(3, this.ratsFedCount + 1);
    this.collectedItems = this.ratsFedCount;
    const chapterMeta = CHAPTERS.find((c) => c.id === 5)!;
    this.callbacks.onItemCollected(this.ratsFedCount, 3, 'rat_feed');

    if (this.ratsFedCount === 1) {
      this.callbacks.onSubtitle(chapterMeta.subtitles.onFirstItem);
    } else if (this.ratsFedCount === 2) {
      this.callbacks.onSubtitle(chapterMeta.subtitles.onHalfItem);
    }

    if (fromDeveloper) {
      this.callbacks.onSystemNotice(
        `시스템 지배! 전 괴물 12초 정지 및 미오와 린에게 독 쥐 먹이기 (${this.ratsFedCount}/3) 완료!`
      );
    } else if (this.ratsFedCount < 3) {
      this.callbacks.onSystemNotice(
        `🐀 미오와 린에게 독이 든 쥐를 먹였습니다! (${this.ratsFedCount}/3) — 5.5초간 고통에 몸부림칩니다.`
      );
    }

    if (this.ratsFedCount >= 3 && !this.exitUnlocked) {
      this.unlockExplorationExit();
    }
  }

  private completeChapterEscape() {
    if (this.mode !== 'playing') return;
    soundEngine.stopBgm();
    soundEngine.playPortalUnlock();
    this.mode = 'paused';
    this.releasePointerLock();
    this.callbacks.onChapterClear(this.chapterId, this.elapsedSeconds);
  }

  private getFinalChaseSubtitle(chapterId: number): CutsceneLine {
    switch (chapterId) {
      case 1:
        return {
          speaker: '야스',
          accent: '#ef4444',
          text: '“지하실 문 안쪽 추격 통로가 열렸다! 시즈와 비와키가 미친 듯이 쫓아오니 출구까지 멈추지 말고 달려!”',
        };
      case 2:
        return {
          speaker: '킨토루 (사마)',
          accent: '#ef4444',
          text: '“도망칠 수 있을 것 같으냐! 황궁의 어두운 회랑 끝까지 메구미와 비와키가 네 숨통을 쫓는다!”',
        };
      case 3:
        return {
          speaker: '야스',
          accent: '#ef4444',
          text: '“벚꽃 늪 너머 추격 회랑이야! 오오무카데와 메구미의 추격을 뚫고 출구 도리이로 달려!”',
        };
      case 4:
        return {
          speaker: '사이고모 (단말마)',
          accent: '#ef4444',
          text: '“크아악…! 나 혼자 소멸할 순 없다! 붕괴하는 동굴 탈출구까지 끝까지 뒤쫓아가마!”',
        };
      case 5:
        return {
          speaker: '미오와 린',
          accent: '#f472b6',
          text: '“독을 먹인 대가를 치러라… 선착장 끝까지 우리가 직접 너를 찢어발겨 주마!!”',
        };
      case 6:
        return {
          speaker: '우치우미 센자이',
          accent: '#f59e0b',
          text: '“성역 회랑이 무너지고 있다… 나기사와 함께 깊은 바다 속으로 가라앉아라, 이사무!”',
        };
      case 7:
        return {
          speaker: '지옥의 인도자',
          accent: '#f97316',
          text: '“시니가미와 계약한 배신자여! 피의 강 탈출로가 닫히기 전에 절대 빠져나가지 못한다!”',
        };
      default:
        return {
          speaker: '엔즈카이 (질투의 짐승)',
          accent: '#eab308',
          text: '“백염 따위에 나 혼자 무너질 순 없다! 무너진 도쿄 고가도로 끝까지 쫓아가마!”',
        };
    }
  }

  private unlockExplorationExit() {
    this.exitUnlocked = true;
    soundEngine.playPortalUnlock();
    const meta = CHAPTERS.find((c) => c.id === this.chapterId) || CHAPTERS[0];
    this.callbacks.onSubtitle(meta.subtitles.onAllItems);

    if (this.exitPortalLight) {
      this.exitPortalLight.color.setHex(0x22c55e);
      this.exitPortalLight.intensity = 3.8;
      this.exitPortalLight.distance = 14;
    }
    if (this.basementDoorRig) {
      this.basementDoorRig.lockMesh.visible = false;
      this.basementDoorRig.statusLampMat.color.setHex(0x22c55e);
      this.basementDoorRig.statusLampMat.emissive.setHex(0x16a34a);
      this.basementDoorRig.windowMat.color.setHex(0x34d399);
      this.basementDoorRig.windowMat.emissive.setHex(0x10b981);
      this.basementDoorRig.windowMat.emissiveIntensity = 1.5;
    } else if (this.exitGateGroup) {
      this.exitGateGroup.scale.setScalar(1.08);
    }

    this.callbacks.onSystemNotice(
      this.chapterId === 1
        ? '🔓 지하실 문이 열렸습니다! 문 안으로 들어가 추격전을 돌파하세요!'
        : this.chapterId === 5
          ? '🔓 선착장 출구가 열렸습니다! 출구로 들어가 미오와 린의 추격을 따돌리세요!'
          : '🔓 탈출 출구가 열렸습니다! 초록빛 도리이로 들어가 추격전을 돌파하세요!'
    );
  }

  private unlockBossEscapeExit() {
    if (!this.mapData) return;
    this.exitUnlocked = true;
    this.bossStunTimer = 0;
    this.bossAttackWarning = null;
    this.clearBossSpikeZones();
    for (const p of this.bossProjectiles) {
      this.worldGroup.remove(p.mesh);
    }
    this.bossProjectiles = [];
    if (this.telegraphRing) this.telegraphRing.visible = false;
    if (this.bossShieldAura) this.bossShieldAura.visible = false;

    for (const m of this.monsters) {
      m.stunTimer = 999;
      m.rig.group.position.set(m.x, -0.35, m.z);
    }

    const southExit = gridToWorld(this.mapData.exitTile.gx, this.mapData.exitTile.gz, this.mapData);
    const northExit = gridToWorld(11, 1, this.mapData);
    const dSouth = Math.hypot(southExit.x - this.playerX, southExit.z - this.playerZ);
    const dNorth = Math.hypot(northExit.x - this.playerX, northExit.z - this.playerZ);
    const chosenExit = dNorth < dSouth ? northExit : southExit;
    this.exitPos = chosenExit;

    if (this.exitGateGroup) {
      this.exitGateGroup.position.set(chosenExit.x, 0, chosenExit.z);
      this.exitGateGroup.scale.setScalar(1.16);
    }
    if (this.exitPortalLight) {
      this.exitPortalLight.position.set(chosenExit.x, 2.0, chosenExit.z);
      this.exitPortalLight.color.setHex(0x22c55e);
      this.exitPortalLight.intensity = 4.5;
      this.exitPortalLight.distance = 16;
    }

    soundEngine.playBossExplosion(true);
    soundEngine.playPortalUnlock();
    this.cameraShakeTimer = 0.6;
    this.cameraShakeStrength = 0.16;

    this.callbacks.onSystemNotice(
      this.chapterId === 8
        ? '🔓 엔즈카이 격파! 초록빛 탈출 도리이로 들어가 도쿄 붕괴 추격전을 돌파하세요!'
        : '🔓 사이고모 격파! 초록빛 탈출 도리이로 들어가 동굴 붕괴 추격전을 돌파하세요!'
    );
  }

  private enterDedicatedChaseMap() {
    if (this.inChaseMap) return;
    this.clearWorld();

    this.inChaseMap = true;
    this.finalChaseActive = true;
    this.finalChaseElapsed = 0;
    this.finalChaseTremorTimer = 0.9;
    this.exitUnlocked = true;
    this.bossStunTimer = 0;
    this.bossAttackWarning = null;
    if (this.swordGroup) {
      this.swordGroup.visible = false;
    }

    const chaseMap = parseChaseMap(this.chapterId);
    this.mapData = chaseMap;

    this.stamina = this.maxStamina;
    this.exhausted = false;
    this.battery = Math.max(this.battery, Math.round(this.maxBattery * 0.7));
    this.playerHp = Math.max(this.playerHp, 65);
    this.invulnTimer = 1.2;

    this.buildWorldFromMapData(chaseMap, true);

    const meta = CHAPTERS.find((c) => c.id === this.chapterId) || CHAPTERS[0];
    const isNightmare = this.difficulty === 'nightmare';
    const chaseSpeedScale = isNightmare ? 1.32 : 1.04;

    // Book II Ch.1 specifically has Mio & Rin chasing in the dedicated chase map!
    let chaseMonsters: MonsterId[];
    if (this.chapterId === 5) {
      chaseMonsters = isNightmare ? ['rin_mio', 'rin_mio', 'rin_mio'] : ['rin_mio', 'rin_mio'];
    } else {
      chaseMonsters = [...meta.monsters];
      if (isNightmare && meta.monsters.length > 0) {
        chaseMonsters.push(meta.monsters[0]);
      }
    }
    this.spawnMonstersFromList(chaseMonsters, chaseMap, chaseSpeedScale, false, true);

    const startWorld = gridToWorld(chaseMap.playerStart.gx, chaseMap.playerStart.gz, chaseMap);
    this.playerX = startWorld.x;
    this.playerZ = startWorld.z;
    this.yaw = -Math.PI / 2; // Face East directly toward the far escape gate
    this.pitch = 0;

    this.cameraShakeTimer = 0.65;
    this.cameraShakeStrength = 0.14;

    soundEngine.playPortalUnlock();
    soundEngine.playFinalChaseAlarm();
    soundEngine.startBgm(this.chapterId, false, true, isNightmare);

    this.callbacks.onSubtitle(this.getFinalChaseSubtitle(this.chapterId));
    this.callbacks.onSystemNotice(
      this.chapterId === 5
        ? '🚨 추격전 전용 맵 돌입! 미오와 린이 끝까지 쫓아옵니다 — 탈출구까지 전력 질주하세요!'
        : '🚨 추격전 전용 맵 돌입! 뒤에서 몰려오는 마수들을 뿌리치고 출구까지 달리세요!'
    );
    this.pushHudSnapshot(null, 12, chaseMonsters[0] || null, true);
  }

  private collectItemEntity(item: CollectibleEntity) {
    if (item.kind === 'rat') {
      if (this.carriedRat !== 'none') {
        this.callbacks.onSystemNotice(
          this.carriedRat === 'raw'
            ? '이미 쥐를 들고 있습니다! 먼저 [독이 든 우물]에 담그세요.'
            : '이미 독 쥐를 들고 있습니다! 미오와 린에게 다가가 [E]로 먹이세요.'
        );
        return;
      }
      item.collected = true;
      item.mesh.visible = false;
      if (item.light) item.light.intensity = 0;
      this.carriedRat = 'raw';
      soundEngine.playPickup('key');
      this.callbacks.onSystemNotice(
        '🐀 쥐를 잡았습니다! 섬 중앙의 [독이 든 우물]로 가져가 [E]로 독을 묻히세요!'
      );
      return;
    }

    item.collected = true;
    item.mesh.visible = false;
    if (item.light) item.light.intensity = 0;

    if (item.kind === 'battery') {
      this.battery = Math.min(this.maxBattery, this.battery + (this.difficulty === 'nightmare' ? 55 : 75));
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
        this.unlockExplorationExit();
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
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchSprinting = false;
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
    const isBoss = this.isBossChapter() && !this.inChaseMap;
    const isBook2 = this.chapterId >= 5;
    const curseName = isBook2 ? '엔즈카이의 질투' : '킨토루의 지배';
    const isNightmare = this.difficulty === 'nightmare';
    this.kintoruNextTimer = (isNightmare ? 14 : isBoss ? 25 : 21) + Math.random() * 8;

    if (survived) {
      this.invulnTimer = Math.max(this.invulnTimer, 2.0);
      soundEngine.playKintoruControlEscape();
      this.callbacks.onSystemNotice(`⚡ ${curseName}에서 벗어났습니다! (6초 버티기 성공)`);
      return;
    }

    if (this.jobId === 'developer' || this.jobId === 'hacker') {
      this.invulnTimer = 2.5;
      soundEngine.playPortalUnlock();
      this.callbacks.onSystemNotice(
        this.jobId === 'hacker'
          ? `방화벽 가동! ${curseName} 해킹을 역추적해 차단했습니다!`
          : `관리자 권한! ${curseName}를 강제로 끊어냈습니다!`
      );
      return;
    }

    if (this.doctorReviveReady) {
      this.doctorReviveReady = false;
      this.invulnTimer = 3.2;
      soundEngine.playPortalUnlock();
      this.callbacks.onSystemNotice(`의사의 응급 처치! ${curseName} 침식을 1회 이겨냈습니다!`);
      return;
    }

    if (isBoss) {
      const bossId = this.getBossId();
      this.callbacks.onSystemNotice(
        isBook2
          ? '💀 엔즈카이의 질투에 정신이 잠식당했습니다! (-45 HP)'
          : '💀 킨토루의 손아귀에 정신이 잠식당했습니다! (-45 HP)'
      );
      this.applyPlayerDamage(45, bossId);
    } else {
      const killerId: MonsterId =
        this.chapterId === 2
          ? 'megumi'
          : this.chapterId === 3
            ? 'oomukade'
            : this.chapterId === 6
              ? 'nagisa'
              : this.chapterId === 7
                ? 'jigoku_warden'
                : 'nure';
      const killer =
        this.monsters.find((m) => m.id === killerId) || this.monsters[0];
      if (killer) {
        this.triggerJumpscare(killer);
      }
    }
  }

  private updatePlaying(dt: number, elapsed: number) {
    if (!this.mapData) return;

    // During Mind-Control QTE (Ch.2-4, Ch.6-8), freeze movement & monsters while keeping trembling atmosphere alive
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

    const isNightmare = this.difficulty === 'nightmare';
    const hasMindControlQte =
      !this.inChaseMap &&
      !this.finalChaseActive &&
      (isNightmare || (this.chapterId >= 2 && this.chapterId <= 4) || this.chapterId >= 6);
    if (hasMindControlQte && !(this.isBossChapter() && !this.inChaseMap && this.bossStunTimer > 0)) {
      this.kintoruNextTimer -= dt;
      if (this.kintoruNextTimer <= 0) {
        this.triggerKintoruControl();
        return;
      }
    }

    this.elapsedSeconds += dt;
    if (this.skillCooldown > 0) this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    if (this.skillActiveTimer > 0) this.skillActiveTimer = Math.max(0, this.skillActiveTimer - dt);
    if (this.studentTeleportCooldown > 0) {
      this.studentTeleportCooldown = Math.max(0, this.studentTeleportCooldown - dt);
    }
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.swordCooldown > 0) this.swordCooldown = Math.max(0, this.swordCooldown - dt);
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.2);
    if (this.cameraShakeTimer > 0) this.cameraShakeTimer = Math.max(0, this.cameraShakeTimer - dt);

    // Optional keyboard look (Q / R; Q is reserved for Student's item teleport skill)
    if (this.keys.has('KeyQ') && this.jobId !== 'student') this.yaw += 1.9 * dt;
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
    const isHacker = this.jobId === 'hacker';
    const isDeveloper = this.jobId === 'developer';
    const isGodJob = isDeveloper || isHacker;
    const studentBoost = this.jobId === 'student' && this.skillActiveTimer > 0;
    const wantsSprint =
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchSprinting) &&
      isMoving &&
      !this.crouching &&
      !this.exhausted;

    if (isGodJob || studentBoost) {
      this.stamina = this.maxStamina;
      this.exhausted = false;
    } else if (wantsSprint) {
      const sprintDrain = isNightmare ? 29 : 24;
      this.stamina = Math.max(0, this.stamina - sprintDrain * dt);
      if (this.stamina <= 1) this.exhausted = true;
    } else {
      const regenMult = this.jobId === 'student' ? 1.35 : isNightmare ? 0.85 : 1.0;
      this.stamina = Math.min(
        this.maxStamina,
        this.stamina + (isMoving ? 10 : 18) * regenMult * dt
      );
      if (this.exhausted && this.stamina >= 28) this.exhausted = false;
    }

    const sprinting = wantsSprint && this.stamina > 0;
    const jobSpeedMult = isHacker
      ? this.skillActiveTimer > 0
        ? 2.2
        : 1.75
      : isDeveloper
        ? this.skillActiveTimer > 0
          ? 2.05
          : 1.65
        : this.jobId === 'student'
          ? studentBoost
            ? 1.47
            : this.invulnTimer > 0
              ? 1.35
              : 1.15
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

    // Flashlight & Battery (Job & Nightmare aware)
    const baseDrain = isNightmare ? 3.2 : 1.55;
    const drainMult =
      isGodJob
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
      this.battery = Math.min(20, this.battery + (isNightmare ? 0.9 : 1.4) * dt);
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
      item.mesh.rotation.y = elapsed * (item.kind === 'rat' ? 2.4 : 1.6);
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
    if (this.basementDoorRig && this.exitUnlocked && !this.inChaseMap) {
      this.basementDoorRig.doorPivot.rotation.y = THREE.MathUtils.damp(
        this.basementDoorRig.doorPivot.rotation.y,
        -0.68,
        5.5,
        dt
      );
    }

    // Animate per-particle dust / sakura petals / embers & drifting ground fog wisps
    this.animateAtmosphereParticles(dt, elapsed, this.chapterId);

    // Silently rearrange out-of-sight interior maze corridors (Exploration maps only)
    const shiftInterval = isNightmare ? 3.0 : 5.0;
    if (!this.isBossChapter() && !this.inChaseMap) {
      this.mapShiftTimer += dt;
      if (this.mapShiftTimer >= shiftInterval) {
        this.mapShiftTimer -= shiftInterval;
        this.silentlyShiftMaze();
      }
    }

    // Check entering unlocked exit -> warps into Dedicated Chase Map!
    if (!this.inChaseMap && this.exitUnlocked) {
      const exitDist = Math.hypot(this.exitPos.x - this.playerX, this.exitPos.z - this.playerZ);
      if (exitDist < 1.95) {
        this.enterDedicatedChaseMap();
        return;
      }
    }

    // On Dedicated Chase Map: track tremors & complete chapter upon reaching the escape gate
    if (this.inChaseMap) {
      this.finalChaseElapsed += dt;
      this.finalChaseTremorTimer -= dt;
      if (this.finalChaseTremorTimer <= 0) {
        this.finalChaseTremorTimer = isNightmare ? 1.5 : 2.1;
        this.cameraShakeTimer = 0.24;
        this.cameraShakeStrength = isNightmare ? 0.12 : 0.09;
        if (this.isBossChapter()) {
          soundEngine.playBossExplosion(false);
        }
      }
      if (Math.hypot(this.exitPos.x - this.playerX, this.exitPos.z - this.playerZ) < 2.25) {
        this.completeChapterEscape();
        return;
      }
    }

    // Update Monsters / Chapter 4 & 8 Boss Combat
    const MAX_AGGRO_RANGE = isNightmare ? 15.5 : 12.0;
    const playerGrid = worldToGrid(this.playerX, this.playerZ, this.mapData);
    let minMonsterDist = 999;
    let closestMonsterId: MonsterId | null = null;
    let anyChasing = false;

    const baseDetection = this.flashlightOn
      ? sprinting
        ? MAX_AGGRO_RANGE
        : MAX_AGGRO_RANGE * 0.93
      : this.crouching
        ? MAX_AGGRO_RANGE * 0.48
        : sprinting
          ? MAX_AGGRO_RANGE * 0.92
          : MAX_AGGRO_RANGE * 0.72;
    const stealthMult =
      isGodJob && this.skillActiveTimer > 0
        ? 0.0
        : isGodJob
          ? 0.48
          : this.jobId === 'doctor'
            ? 0.78
            : 1.0;
    const detectionRange = Math.min(MAX_AGGRO_RANGE, baseDetection * stealthMult);

    if (this.isBossChapter() && !this.inChaseMap) {
      this.updateSwordViewModel(dt, elapsed, isMoving);
      if (!this.exitUnlocked) {
        const bossDead = this.updateBossFight(dt, elapsed, isGodJob);
        if (bossDead || this.mode !== 'playing') return;
      }

      const bossId = this.getBossId();
      for (const m of this.monsters) {
        const d = Math.hypot(this.playerX - m.x, this.playerZ - m.z);
        if (d < minMonsterDist) {
          minMonsterDist = d;
          closestMonsterId = m.id;
        }
        if (!this.exitUnlocked && m.id === bossId && this.bossStunTimer <= 0) anyChasing = true;
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

        // In Ch.5, if carrying a poisoned rat near rin_mio (< 1.55m), give player room to feed [E] without cheap instant death unless they walk straight into body (< 0.85m)
        const catchRadius =
          this.chapterId === 5 &&
          !this.inChaseMap &&
          m.id === 'rin_mio' &&
          this.carriedRat === 'poisoned'
            ? 0.85
            : 1.18;

        // Check Catch -> Developer/Hacker God Shield, Doctor Second Chance, or Jumpscare!
        if (distToPlayer < catchRadius && this.invulnTimer <= 0) {
          if (isGodJob) {
            this.invulnTimer = 1.6;
            m.stunTimer = isHacker ? 7.0 : 5.0;
            m.state = 'patrol';
            m.memoryTimer = 0;
            soundEngine.playPortalUnlock();
            this.callbacks.onSystemNotice(
              isHacker
                ? '해커 방화벽 역공! 괴물을 7초간 시스템 마비시켰습니다.'
                : '관리자 무적 실드! 괴물의 공격을 반사하고 5초간 경직시켰습니다.'
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

        if (this.inChaseMap && !(isGodJob && this.skillActiveTimer > 0)) {
          m.state = 'chase';
          m.memoryTimer = 999;
          m.targetGx = playerGrid.gx;
          m.targetGz = playerGrid.gz;
        } else if (m.state === 'chase' && distToPlayer > MAX_AGGRO_RANGE) {
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
          m.memoryTimer = isNightmare ? 6.0 : 4.2;
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
        const finalChaseCap = isNightmare ? 5.12 : 4.68;
        let spd =
          m.state === 'chase'
            ? this.inChaseMap
              ? Math.min(finalChaseCap, m.chaseSpeed * 1.1)
              : m.chaseSpeed
            : m.baseSpeed;
        if (
          this.chapterId === 5 &&
          !this.inChaseMap &&
          m.id === 'rin_mio' &&
          this.carriedRat === 'poisoned' &&
          distToPlayer < 4.5
        ) {
          spd *= 0.65;
        }

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

    // Flashlight flicker when low battery or monster nearby (more intense in Nightmare; Developer/Hacker never flicker)
    if (this.flashlightOn) {
      let flicker = 1;
      const lowBatThresh = isNightmare ? 45 : 22;
      const proxThresh = isNightmare ? 11.5 : 8.5;
      if (!isGodJob && (this.battery < lowBatThresh || minMonsterDist < proxThresh)) {
        flicker = Math.sin(elapsed * 37) > (isNightmare ? -0.35 : -0.6) ? 1 : 0.32;
      }
      const baseBeam = isGodJob
        ? 36.0
        : (this.jobId === 'police' ? 28.0 : 22.0) * (isNightmare ? 0.8 : 1.0);
      this.flashlight.intensity = baseBeam * flicker;
      if (!isGodJob) {
        this.playerFillLight.intensity =
          (isNightmare ? 0.25 : this.isBossChapter() && !this.inChaseMap ? 0.55 : 0.42) * flicker;
      }
    } else {
      this.flashlight.intensity = 0;
      if (!isGodJob) {
        this.playerFillLight.intensity = isNightmare ? 0.09 : this.isBossChapter() ? 0.22 : 0.14;
      }
    }

    // Story Subtitle triggers for chase start & escape (Exploration maps before entering chase map)
    const chapterMeta = CHAPTERS.find((c) => c.id === this.chapterId) || CHAPTERS[0];
    if (!this.isBossChapter() && !this.inChaseMap) {
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
    if (this.chapterId === 5 && !this.inChaseMap && this.carriedRat === 'poisoned') {
      const rinMio = this.monsters.find((m) => m.id === 'rin_mio' && m.stunTimer <= 0);
      if (rinMio && Math.hypot(rinMio.x - this.playerX, rinMio.z - this.playerZ) < 4.25) {
        prompt = `[E] 미오와 린에게 독 쥐 먹이기 (${this.ratsFedCount}/3)`;
      }
    }
    if (!prompt) {
      for (const item of this.collectibles) {
        if (item.collected) continue;
        if (Math.hypot(item.x - this.playerX, item.z - this.playerZ) < 2.35) {
          prompt =
            item.kind === 'battery'
              ? '[E] 손전등 건전지 획득'
              : item.kind === 'diary'
                ? '[E] 남겨진 기록 읽기'
                : item.kind === 'rat'
                  ? '[E] 시궁쥐 잡기'
                  : item.kind === 'key'
                    ? '[E] 교실 열쇠 획득'
                    : item.kind === 'ofuda'
                      ? this.chapterId >= 5
                        ? '[E] 심해 성역 부적 획득'
                        : '[E] 조상의 기억 부적 획득'
                      : item.kind === 'butterfly'
                        ? this.chapterId >= 5
                          ? '[E] 영혼의 등불 밝히기'
                          : '[E] 나비 영혼 등불 바치기'
                        : this.chapterId >= 5
                          ? '[E] 백염의 성검 인장 획득'
                          : '[E] 축복받은 검의 인장 획득';
          break;
        }
      }
    }
    if (
      !prompt &&
      this.chapterId === 5 &&
      !this.inChaseMap &&
      this.poisonWellPos &&
      Math.hypot(this.poisonWellPos.x - this.playerX, this.poisonWellPos.z - this.playerZ) < 2.85
    ) {
      prompt =
        this.carriedRat === 'raw'
          ? '[E] 독이 든 우물에 쥐 담그기'
          : this.carriedRat === 'poisoned'
            ? '독 쥐 보유 중 · 미오와 린에게 먹이세요'
            : '독이 든 우물 (먼저 섬에서 쥐를 잡으세요)';
    }
    if (
      (!this.isBossChapter() || this.exitUnlocked || this.inChaseMap) &&
      !prompt &&
      Math.hypot(this.exitPos.x - this.playerX, this.exitPos.z - this.playerZ) < 2.75
    ) {
      prompt = this.exitUnlocked
        ? this.inChaseMap
          ? '[E] 추격전 최종 탈출!'
          : this.chapterId === 1
            ? '[E] 지하실 문으로 들어가 추격전 시작'
            : '[E] 출구로 들어가 추격전 시작'
        : this.chapterId === 5
          ? `봉인됨 (독 쥐 먹이기 ${this.ratsFedCount}/3 필요)`
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
    const isHacker = this.jobId === 'hacker';
    const isDev = this.jobId === 'developer';
    const bossId = this.getBossId();
    const minionId = this.getBossMinionId();
    const bossName = bossId === 'enzukai' ? '엔즈카이' : '사이고모';
    const barrierName = bossId === 'enzukai' ? '질투의 결계' : '제어의 결계';

    for (const m of this.monsters) {
      const dx = m.x - this.playerX;
      const dz = m.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      const reach = m.id === bossId ? 4.0 : 3.1;
      if (dist > reach) continue;

      const dot = (dx * fwdX + dz * fwdZ) / Math.max(0.01, dist);
      if (dot < 0.28) continue;

      if (m.id === bossId) {
        if (this.finalChaseActive) {
          m.stunTimer = 1.3;
          soundEngine.playSwordHit(true);
          this.spawnShockwave(m.x, m.z, 2.5, 0xf59e0b, 0.3);
          const pushX = m.x + (dx / Math.max(0.1, dist)) * 1.1;
          const pushZ = m.z + (dz / Math.max(0.1, dist)) * 1.1;
          if (this.canOccupy(pushX, pushZ, 0.6)) {
            m.x = pushX;
            m.z = pushZ;
          }
          this.callbacks.onSystemNotice(`⚡ 일격 반격! ${bossName}의 원념을 1.3초간 저지했습니다!`);
          return;
        }

        const isStunned = this.bossStunTimer > 0;

        if (isStunned) {
          const dmg = isHacker ? 100 : isDev ? 75 : 50;
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

        // Not stunned yet: parry during windup to break barrier -> Stun! Otherwise deflected!
        if (this.bossState === 'windup') {
          this.clearBossSpikeZones();
          this.spawnShockwave(m.x, m.z, 4.2, 0xfef08a, 0.42);
          soundEngine.playParryCounter();
          this.cameraShakeTimer = 0.22;
          this.cameraShakeStrength = 0.08;
          const stunSec = this.difficulty === 'nightmare' ? 2.4 : 3.0;
          this.stunBoss(stunSec, `⚡ 패링 반격! ${barrierName}를 부수고 ${bossName}를 ${stunSec}초간 스턴시켰습니다!`);
          return;
        }

        soundEngine.playBarrierDeflect();
        this.spawnShockwave(m.x, m.z, 2.4, bossId === 'enzukai' ? 0xeab308 : 0xdc2626, 0.25);
        this.callbacks.onSystemNotice(
          '🛡️ 결계 방어! 스턴 상태일 때만 베어 피해를 줄 수 있습니다 (돌진 기둥 충돌 / 공격 준비 중 패링 / 오의 후 과부하)'
        );
        return;
      } else if (m.id === minionId) {
        m.stunTimer = 8.0;
        soundEngine.playSwordHit(true);
        this.callbacks.onSystemNotice(
          minionId === 'senzai_fallen'
            ? '백염의 성검으로 타락한 형 센자이의 저주를 8초간 잠재웠습니다!'
            : '축복받은 검으로 어머니 케이코의 폭주를 8초간 잠재웠습니다.'
        );
        return;
      }
    }
  }

  private stunBoss(seconds: number, notice: string) {
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
    if (this.bossStunTimer <= 0 || this.exitUnlocked) return;
    this.bossHp = Math.max(0, this.bossHp - amount);
    if (this.bossHp === 0) {
      this.unlockBossEscapeExit();
    }
  }

  private applyPlayerDamage(amount: number, attackerId: MonsterId) {
    if (this.invulnTimer > 0) return;
    const bossId = this.getBossId();
    const bossName = bossId === 'enzukai' ? '엔즈카이' : '사이고모';

    if (this.jobId === 'developer' || this.jobId === 'hacker') {
      this.invulnTimer = 1.2;
      const boss = this.monsters.find((m) => m.id === bossId);
      if (boss) {
        this.stunBoss(
          3.0,
          this.jobId === 'hacker'
            ? `해커 방화벽 반사! 보스의 공격을 역해킹해 ${bossName}를 3초간 스턴시켰습니다!`
            : `관리자 무적 실드! 공격을 반사해 ${bossName}를 3초간 스턴시켰습니다!`
        );
      }
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

  private updateBossFight(dt: number, elapsed: number, _isDeveloper: boolean): boolean {
    if (!this.mapData) return false;
    const bossId = this.getBossId();
    const minionId = this.getBossMinionId();
    const isEnzukai = bossId === 'enzukai';
    const bossName = isEnzukai ? '엔즈카이' : '사이고모';
    const bossBarrier = isEnzukai ? '엔즈카이의 질투의 결계' : '사이고모의 제어의 결계';
    const bossWaveColor = isEnzukai ? 0xeab308 : 0xdc2626;
    const boss = this.monsters.find((m) => m.id === bossId);
    const minion = this.monsters.find((m) => m.id === minionId);

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

    // Update Spike Eruption Zones
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
        this.applyPlayerDamage(this.difficulty === 'nightmare' ? 28 : 22, bossId);
        if (this.mode !== 'playing') return true;
        continue;
      }
      if (p.life <= 0 || isWall(grid.gx, grid.gz, this.mapData)) {
        this.spawnShockwave(p.x, p.z, 1.4, bossWaveColor, 0.25);
        this.worldGroup.remove(p.mesh);
        this.bossProjectiles.splice(i, 1);
      }
    }

    // Update Boss AI (Saigomo or Enzukai)
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
        animateMonsterRig(boss.rig, bossId, elapsed * 0.22, false);
        if (this.bossStunTimer <= 0) {
          boss.rig.group.rotation.z = 0;
          this.bossState = 'stalk';
          this.bossAttackCooldown = 1.15;
          this.callbacks.onSystemNotice(`🛡️ ${bossBarrier}가 다시 전개되었습니다!`);
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
          animateMonsterRig(boss.rig, bossId, elapsed, true);

          if (this.bossAttackCooldown <= 0) {
            this.bossAttackCount++;
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
                ? isEnzukai
                  ? '⚠ [오의] 질투의 심연 대폭발! 7.8m 밖으로 피하거나 황금 핵을 패링하세요!'
                  : '⚠ [오의] 심연의 혈옥 대폭발! 7.8m 밖으로 피하거나 붉은 핵을 패링하세요!'
                : this.bossPattern === 'crimsonSpikes'
                  ? '⚠ 심연의 창 대지 폭발! 붉은 바닥 원 밖으로 회피하세요!'
                  : this.bossPattern === 'slam'
                    ? isEnzukai
                      ? '⚠ 질투의 한야 대지 강타! 6.8m 밖으로 피하거나 도약 중 패링하세요!'
                      : '⚠ 진혼의 거미 대지 강타! 6.8m 밖으로 피하거나 도약 중 패링하세요!'
                    : this.bossPattern === 'lunge'
                      ? '⚠ 광폭 도약 돌진! 동굴 바위 기둥 뒤로 피해서 충돌시키세요!'
                      : isEnzukai
                        ? '⚠ 저주 황금탄막 2연사! 기둥 뒤로 엄폐하세요!'
                        : '⚠ 거미줄 저주 탄막 2연사! 기둥 뒤로 엄폐하세요!';
            soundEngine.playBossTelegraph(this.bossPattern);
          }
        } else if (this.bossState === 'windup') {
          this.bossStateTimer -= dt;
          const hoverY =
            this.bossPattern === 'slam'
              ? Math.sin((1 - Math.max(0, this.bossStateTimer)) * Math.PI) * 2.15 + 0.35
              : this.bossPattern === 'bloodNova'
                ? 0.9 + Math.sin(elapsed * 12) * 0.18
                : 0.14;
          boss.rig.group.position.set(boss.x, hoverY, boss.z);
          boss.rig.group.rotation.y = boss.yaw;
          animateMonsterRig(boss.rig, bossId, elapsed * 1.6, true);

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
              this.spawnShockwave(boss.x, boss.z, 2.0, bossWaveColor, 0.28);
            }
            if (!this.canOccupy(nx, nz, 0.72)) {
              this.spawnShockwave(boss.x, boss.z, 5.2, 0xf59e0b, 0.48);
              this.cameraShakeTimer = 0.35;
              this.cameraShakeStrength = 0.16;
              soundEngine.playBossExplosion(false);
              this.stunBoss(
                3.0,
                isEnzukai
                  ? `💥 ${bossName}가 무너진 도쿄 빌딩 기둥에 강하게 충돌해 3초간 스턴되었습니다!`
                  : `💥 ${bossName}가 동굴 암벽에 강하게 충돌해 3초간 스턴되었습니다!`
              );
              return false;
            }
            boss.x = nx;
            boss.z = nz;
            if (!this.bossAttackHitDone && Math.hypot(this.playerX - boss.x, this.playerZ - boss.z) < 2.1) {
              this.bossAttackHitDone = true;
              this.spawnShockwave(boss.x, boss.z, 3.6, 0xef4444, 0.35);
              this.applyPlayerDamage(this.difficulty === 'nightmare' ? 42 : 35, bossId);
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
              this.spawnShockwave(boss.x, boss.z, 7.2, bossWaveColor, 0.55);
              this.cameraShakeTimer = 0.45;
              this.cameraShakeStrength = 0.18;
              if (dist <= 6.8) {
                this.applyPlayerDamage(this.difficulty === 'nightmare' ? 45 : 36, bossId);
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
                this.spawnShockwave(sz.x, sz.z, 2.5, bossWaveColor, 0.35);
                if (Math.hypot(this.playerX - sz.x, this.playerZ - sz.z) <= 2.15) {
                  hitAnySpike = true;
                }
              }
              if (hitAnySpike) {
                this.applyPlayerDamage(this.difficulty === 'nightmare' ? 42 : 34, bossId);
                if (this.mode !== 'playing') return true;
              }
            } else if (this.bossPattern === 'bloodNova') {
              soundEngine.playBossExplosion(true);
              this.spawnShockwave(boss.x, boss.z, 8.6, bossWaveColor, 0.68);
              this.spawnShockwave(boss.x, boss.z, 6.2, 0xfef2f2, 0.48);
              this.cameraShakeTimer = 0.6;
              this.cameraShakeStrength = 0.24;

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
                this.applyPlayerDamage(this.difficulty === 'nightmare' ? 56 : 46, bossId);
                if (this.mode !== 'playing') return true;
              }
            }
          }

          boss.rig.group.position.set(boss.x, 0, boss.z);
          boss.rig.group.rotation.y = boss.yaw;
          animateMonsterRig(boss.rig, bossId, elapsed * 2.0, true);

          if (this.bossStateTimer <= 0) {
            if (this.bossPattern === 'bloodNova') {
              this.stunBoss(
                3.0,
                `💢 ${bossName}가 오의 대폭발의 반동으로 지쳐 3초간 스턴 상태에 빠졌습니다! 지금 공격하세요!`
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
          animateMonsterRig(boss.rig, bossId, elapsed * 0.5, false);
          if (this.bossStateTimer <= 0) {
            this.bossState = 'stalk';
            this.bossAttackCooldown = this.difficulty === 'nightmare' ? 1.15 : 1.55;
          }
        }
      }
    }

    // Secondary Threat in Cavern: Keiko (Ch.4) / Kyogi (Ch.8) stalks & can be stunned for 8s by sword
    if (minion) {
      if (minion.stunTimer > 0) {
        minion.stunTimer = Math.max(0, minion.stunTimer - dt);
        minion.rig.group.position.set(minion.x, -0.15, minion.z);
        animateMonsterRig(minion.rig, minionId, elapsed * 0.3, false);
      } else {
        const kdx = this.playerX - minion.x;
        const kdz = this.playerZ - minion.z;
        const kdist = Math.hypot(kdx, kdz);
        if (kdist < 1.35) {
          this.applyPlayerDamage(15, minionId);
          minion.stunTimer = 2.4;
          if (this.mode !== 'playing') return true;
        } else if (kdist <= 13.0) {
          const hasLos = hasLineOfSight(minion.x, minion.z, this.playerX, this.playerZ, this.mapData);
          let sx = this.playerX;
          let sz = this.playerZ;
          if (!hasLos) {
            const kg = worldToGrid(minion.x, minion.z, this.mapData);
            const pg = worldToGrid(this.playerX, this.playerZ, this.mapData);
            const next = findNextStepBFS(kg.gx, kg.gz, pg.gx, pg.gz, this.mapData);
            const wp = gridToWorld(next.gx, next.gz, this.mapData);
            sx = wp.x;
            sz = wp.z;
          }
          const rx = sx - minion.x;
          const rz = sz - minion.z;
          const rlen = Math.hypot(rx, rz);
          if (rlen > 0.05) {
            minion.x += (rx / rlen) * minion.baseSpeed * dt;
            minion.z += (rz / rlen) * minion.baseSpeed * dt;
            minion.yaw = Math.atan2(rx, rz);
          }
          minion.rig.group.position.set(minion.x, 0, minion.z);
          minion.rig.group.rotation.y = minion.yaw;
          animateMonsterRig(minion.rig, minionId, elapsed, true);
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
        m.id === 'saigomo' || m.id === 'biwaki' || m.id === 'enzukai' || m.id === 'jigoku_warden'
          ? 2.1
          : m.id === 'oomukade'
            ? 1.68
            : m.id === 'kuishinbo' || m.id === 'hyakume'
              ? 2.02
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

    if (
      this.inChaseMap ||
      this.finalChaseActive ||
      this.exitUnlocked ||
      this.jobId === 'exorcist' ||
      this.jobId === 'developer' ||
      this.jobId === 'hacker'
    ) {
      let targetX: number | null = null;
      let targetZ: number | null = null;
      if (this.inChaseMap || this.finalChaseActive || this.exitUnlocked) {
        targetX = this.exitPos.x;
        targetZ = this.exitPos.z;
      } else if (this.chapterId === 5) {
        if (this.carriedRat === 'raw' && this.poisonWellPos) {
          targetX = this.poisonWellPos.x;
          targetZ = this.poisonWellPos.z;
        } else if (this.carriedRat === 'poisoned') {
          const rm = this.monsters.find((m) => m.id === 'rin_mio');
          if (rm) {
            targetX = rm.x;
            targetZ = rm.z;
          }
        } else {
          let bestD = Infinity;
          for (const item of this.collectibles) {
            if (item.collected || item.kind !== 'rat') continue;
            const d = Math.hypot(item.x - this.playerX, item.z - this.playerZ);
            if (d < bestD) {
              bestD = d;
              targetX = item.x;
              targetZ = item.z;
            }
          }
        }
      } else if (this.isBossChapter()) {
        const bossId = this.getBossId();
        const boss = this.monsters.find((m) => m.id === bossId);
        if (boss) {
          targetX = boss.x;
          targetZ = boss.z;
        }
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
      maxBattery: this.maxBattery,
      flashlightOn: this.flashlightOn,
      crouching: this.crouching,
      collectedItems: this.chapterId === 5 ? this.ratsFedCount : this.collectedItems,
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
      studentTeleportCooldown: this.studentTeleportCooldown,
      maxStudentTeleportCooldown: this.maxStudentTeleportCooldown,
      doctorReviveReady: this.doctorReviveReady,
      nearestObjectiveDist,
      nearestObjectiveAngleDeg,
      isBossFight: this.isBossChapter() && !this.inChaseMap && !this.exitUnlocked,
      playerHp: this.playerHp,
      playerMaxHp: this.playerMaxHp,
      hurtFlash: this.hurtFlash,
      bossHp: this.bossHp,
      bossMaxHp: this.bossMaxHp,
      bossStunTimer: this.bossStunTimer,
      bossAttackWarning: this.bossAttackWarning,
      bossHitsLanded: this.bossHitsLanded,
      finalChaseActive: this.finalChaseActive,
      finalChaseElapsed: this.finalChaseElapsed,
      inChaseMap: this.inChaseMap,
      carriedRat: this.carriedRat,
      difficulty: this.difficulty,
    });
  }

  private buildAtmosphereParticles(chapterId: number, mapW: number, mapH: number) {
    this.particleBounds = { w: mapW, h: mapH };

    // 1. Primary ambient particles: dust motes (Ch1), spirit wisps (Ch2/5/6), falling petals (Ch3), embers (Ch4/7/8)
    const isPetalChapter = chapterId === 3;
    const isBossParticle = chapterId === 4 || chapterId === 7 || chapterId === 8;
    const particleCount = isPetalChapter ? 480 : 400;
    const pPositions = new Float32Array(particleCount * 3);
    const pVels = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * mapW * 0.92;
      pPositions[i * 3 + 1] = 0.2 + Math.random() * (this.activeWallHeight - 0.45);
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * mapH * 0.92;

      if (isPetalChapter) {
        // Gentle diagonal falling & fluttering sakura petals (Ch3)
        pVels[i * 3] = 0.22 + Math.random() * 0.24;
        pVels[i * 3 + 1] = -(0.35 + Math.random() * 0.32);
        pVels[i * 3 + 2] = 0.1 + Math.random() * 0.22;
      } else if (chapterId === 4 || chapterId === 2 || chapterId === 5 || chapterId === 6 || chapterId === 7 || chapterId === 8) {
        // Rising embers / Jigoku ash / abyssal sea spores / White Flame motes
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
      chapterId === 3
        ? 0xfbcfe8
        : chapterId === 7
          ? 0xf97316
          : chapterId === 4
            ? 0xf87171
            : chapterId === 8
              ? 0xe0f2fe
              : chapterId === 5
                ? 0x7dd3fc
                : chapterId === 6
                  ? 0x2dd4bf
                  : chapterId === 2
                    ? 0xd8b4fe
                    : 0xdbeafe;
    this.particleMat = new THREE.PointsMaterial({
      color: particleColor,
      map: isPetalChapter ? this.textures.sakuraPetal : this.textures.particleMote,
      size: isPetalChapter ? 0.22 : isBossParticle ? 0.14 : 0.12,
      transparent: true,
      opacity: isPetalChapter ? 0.82 : isBossParticle ? 0.72 : 0.48,
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
      chapterId === 4
        ? 0x5c1018
        : chapterId === 8
          ? 0x1e293b
          : chapterId === 3
            ? 0x4b1d3f
            : chapterId === 7
              ? 0x4a120a
              : chapterId === 5
                ? 0x0f2b38
                : chapterId === 6
                  ? 0x06373a
                  : chapterId === 2
                    ? 0x2a1b3d
                    : 0x334155;
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
    const isPetal = chapterId === 3;

    if (this.particleGeo && this.particleVelocities) {
      const attr = this.particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const vels = this.particleVelocities;
      const count = arr.length / 3;

      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const flutter =
          isPetal ? Math.sin(elapsed * 2.2 + i * 0.7) * 0.35 : Math.sin(elapsed * 1.1 + i) * 0.08;
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
