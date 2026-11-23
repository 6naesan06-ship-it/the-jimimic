import * as THREE from 'three';
import { MonsterId } from '../data/lore';
import { ProceduralTextureSet } from './textures';

export interface AnimatedMonsterRig {
  group: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  spiderLegs?: THREE.Object3D[];
  orbitRing?: THREE.Object3D;
  auraLight: THREE.PointLight;
}

export function createMonsterRig(
  type: MonsterId,
  textures: ProceduralTextureSet
): AnimatedMonsterRig {
  const group = new THREE.Group();
  const head = new THREE.Group();
  let leftArm: THREE.Object3D = new THREE.Group();
  let rightArm: THREE.Object3D = new THREE.Group();
  const spiderLegs: THREE.Object3D[] = [];
  let orbitRing: THREE.Object3D | undefined;

  const faceTex =
    type === 'shizu'
      ? textures.shizuFace
      : type === 'biwaki'
        ? textures.biwakiFace
        : type === 'megumi'
          ? textures.megumiFace
          : type === 'oomukade'
            ? textures.oomukadeFace
            : type === 'saigomo'
              ? textures.saigomoFace
              : textures.keikoFace;

  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.42,
    metalness: 0.05,
  });

  const eyeGlowColor =
    type === 'saigomo'
      ? 0xef4444
      : type === 'oomukade'
        ? 0xf59e0b
        : type === 'megumi'
          ? 0xc026d3
          : type === 'biwaki'
            ? 0x6366f1
            : 0xe11d48;

  const auraLight = new THREE.PointLight(eyeGlowColor, 1.8, 7.5, 1.8);
  auraLight.position.set(0, 1.75, 0.45);
  group.add(auraLight);

  if (type === 'shizu' || type === 'keiko') {
    const isKeiko = type === 'keiko';
    const robeMat = new THREE.MeshStandardMaterial({
      color: isKeiko ? 0x1c1518 : 0xd6d3cd,
      roughness: 0.88,
      metalness: 0.03,
    });
    const darkSashMat = new THREE.MeshStandardMaterial({
      color: isKeiko ? 0x7f1d1d : 0x261719,
      roughness: 0.72,
      metalness: 0.1,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x0b0b0d,
      roughness: 0.92,
      metalness: 0.04,
    });

    const lowerRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.44, 1.25, 10), robeMat);
    lowerRobe.position.y = 0.625;
    lowerRobe.castShadow = true;
    group.add(lowerRobe);

    const upperTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.68, 10), robeMat);
    upperTorso.position.y = 1.52;
    upperTorso.castShadow = true;
    group.add(upperTorso);

    const obi = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.265, 0.22, 10), darkSashMat);
    obi.position.y = 1.24;
    group.add(obi);

    head.position.set(0, 1.98, 0.04);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), faceMat);
    headMesh.rotation.y = -Math.PI / 2;
    head.add(headMesh);

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.225, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCap.position.y = 0.02;
    head.add(hairCap);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.14), hairMat);
    hairBack.position.set(0, -0.24, -0.14);
    head.add(hairBack);
    group.add(head);

    leftArm = buildClawedArm(robeMat, hairMat, -1);
    leftArm.position.set(-0.28, 1.76, 0.02);
    rightArm = buildClawedArm(robeMat, hairMat, 1);
    rightArm.position.set(0.28, 1.76, 0.02);
    group.add(leftArm, rightArm);
  } else if (type === 'biwaki') {
    const indigoMat = new THREE.MeshStandardMaterial({
      color: 0x16192c,
      roughness: 0.78,
      metalness: 0.12,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.7,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3b1f12,
      roughness: 0.7,
    });

    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 1.38, 10), indigoMat);
    robe.position.y = 0.69;
    robe.castShadow = true;
    group.add(robe);

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.74, 10), indigoMat);
    chest.position.y = 1.65;
    group.add(chest);

    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.2, 10), goldMat);
    sash.position.y = 1.36;
    group.add(sash);

    // Biwa lute strapped to back
    const biwaBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), woodMat);
    biwaBody.scale.set(0.85, 1.25, 0.28);
    biwaBody.position.set(0, 1.55, -0.32);
    group.add(biwaBody);

    const biwaNeck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.06), woodMat);
    biwaNeck.position.set(0, 2.08, -0.32);
    group.add(biwaNeck);

    head.position.set(0, 2.12, 0.04);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), faceMat);
    headMesh.rotation.y = -Math.PI / 2;
    head.add(headMesh);
    group.add(head);

    leftArm = buildClawedArm(indigoMat, goldMat, -1);
    leftArm.position.set(-0.3, 1.85, 0.02);
    rightArm = buildClawedArm(indigoMat, goldMat, 1);
    rightArm.position.set(0.3, 1.85, 0.02);
    group.add(leftArm, rightArm);
  } else if (type === 'megumi') {
    // Megumi: Cursed porcelain ancestral doll
    const dollDress = new THREE.MeshStandardMaterial({
      color: 0x4c1d45,
      roughness: 0.65,
      metalness: 0.08,
    });
    const crimsonRibbon = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.6,
    });
    const porcelain = new THREE.MeshStandardMaterial({
      color: 0xe7e5e4,
      roughness: 0.35,
    });

    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.48, 1.18, 12), dollDress);
    skirt.position.y = 0.59;
    skirt.castShadow = true;
    group.add(skirt);

    const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.64, 12), dollDress);
    bodice.position.y = 1.46;
    group.add(bodice);

    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.14), crimsonRibbon);
    bow.position.set(0, 1.2, -0.2);
    group.add(bow);

    head.position.set(0, 1.94, 0.04);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), faceMat);
    headMesh.rotation.y = -Math.PI / 2;
    head.add(headMesh);

    const hairBob = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
      new THREE.MeshStandardMaterial({ color: 0x0f0d12, roughness: 0.85 })
    );
    head.add(hairBob);
    group.add(head);

    leftArm = buildClawedArm(dollDress, porcelain, -1, 0.95);
    leftArm.position.set(-0.26, 1.7, 0.02);
    rightArm = buildClawedArm(dollDress, porcelain, 1, 0.95);
    rightArm.position.set(0.26, 1.7, 0.02);
    group.add(leftArm, rightArm);
  } else if (type === 'oomukade') {
    // Oomukade: Giant Centipede form of Kintoru
    const carapaceMat = new THREE.MeshStandardMaterial({
      color: 0x2b0b12,
      roughness: 0.35,
      metalness: 0.52,
    });
    const chitinMat = new THREE.MeshStandardMaterial({
      color: 0x160c10,
      roughness: 0.4,
      metalness: 0.45,
    });
    const amberGlowMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0xb45309,
      emissiveIntensity: 0.55,
      roughness: 0.3,
    });

    // Segmented centipede tail curving behind
    for (let seg = 0; seg < 4; seg++) {
      const segMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.36 - seg * 0.04, 12, 10),
        seg % 2 === 0 ? carapaceMat : chitinMat
      );
      segMesh.scale.set(1.0, 0.78, 1.15);
      segMesh.position.set(0, 0.65 + (3 - seg) * 0.14, -0.25 - seg * 0.42);
      segMesh.castShadow = true;
      group.add(segMesh);
    }

    const thorax = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.82, 10), carapaceMat);
    thorax.position.set(0, 1.28, 0.12);
    thorax.rotation.x = 0.25;
    group.add(thorax);

    head.position.set(0, 1.76, 0.26);
    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), faceMat);
    headSphere.rotation.y = -Math.PI / 2;
    head.add(headSphere);

    [-1, 1].forEach((side) => {
      const mandible = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.34, 6), amberGlowMat);
      mandible.position.set(side * 0.14, -0.1, 0.22);
      mandible.rotation.x = Math.PI * 0.45;
      mandible.rotation.z = side * 0.35;
      head.add(mandible);
    });
    group.add(head);

    // 8 Scuttling Centipede Legs
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const idx = i % 4;
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.24, 0.96, 0.05 - idx * 0.32);

      const upperSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.024, 0.68, 6), chitinMat);
      upperSeg.rotation.z = side * -1.05;
      upperSeg.position.set(side * 0.3, 0.2, 0);
      legPivot.add(upperSeg);

      const lowerSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.012, 0.85, 6), amberGlowMat);
      lowerSeg.rotation.z = side * 0.28;
      lowerSeg.position.set(side * 0.6, -0.22, 0);
      legPivot.add(lowerSeg);

      group.add(legPivot);
      spiderLegs.push(legPivot);
    }

    leftArm = buildClawedArm(carapaceMat, amberGlowMat, -1);
    leftArm.position.set(-0.27, 1.56, 0.22);
    rightArm = buildClawedArm(carapaceMat, amberGlowMat, 1);
    rightArm.position.set(0.27, 1.56, 0.22);
    group.add(leftArm, rightArm);
  } else {
    // Saigomo (Spider Demon Final Form of Kintoru): Crimson Hakama + Spider Legs + Noh Mask + Orbiting Ofuda
    const crimsonSilk = new THREE.MeshStandardMaterial({
      color: 0x88131d,
      roughness: 0.58,
      metalness: 0.14,
    });
    const blackLacquer = new THREE.MeshStandardMaterial({
      color: 0x0d0b0f,
      roughness: 0.28,
      metalness: 0.42,
    });
    const goldTrim = new THREE.MeshStandardMaterial({
      color: 0xd4a438,
      roughness: 0.25,
      metalness: 0.85,
    });

    const hakama = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.52, 1.32, 12), crimsonSilk);
    hakama.position.y = 0.66;
    hakama.castShadow = true;
    group.add(hakama);

    const kimono = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.75, 12), blackLacquer);
    kimono.position.y = 1.62;
    kimono.castShadow = true;
    group.add(kimono);

    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.24, 12), goldTrim);
    sash.position.y = 1.35;
    group.add(sash);

    // 6 Giant Spider Legs emerging from back
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1;
      const idx = i % 3;
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.24, 1.48 - idx * 0.14, -0.18);

      const upperSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.82, 6), blackLacquer);
      upperSeg.rotation.z = side * -1.08;
      upperSeg.position.set(side * 0.36, 0.28, -0.12);
      legPivot.add(upperSeg);

      const lowerSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.012, 1.1, 6), crimsonSilk);
      lowerSeg.rotation.z = side * 0.35;
      lowerSeg.position.set(side * 0.72, -0.25, -0.14);
      legPivot.add(lowerSeg);

      group.add(legPivot);
      spiderLegs.push(legPivot);
    }

    head.position.set(0, 2.15, 0.03);
    const mask = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), faceMat);
    mask.rotation.y = -Math.PI / 2;
    mask.scale.set(1, 1.12, 0.92);
    head.add(mask);

    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), blackLacquer);
    crown.position.y = 0.04;
    head.add(crown);

    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 6), goldTrim);
      horn.position.set(side * 0.14, 0.26, 0.02);
      horn.rotation.z = side * -0.32;
      head.add(horn);
    });
    group.add(head);

    leftArm = buildClawedArm(crimsonSilk, blackLacquer, -1);
    leftArm.position.set(-0.31, 1.88, 0.04);
    rightArm = buildClawedArm(crimsonSilk, blackLacquer, 1);
    rightArm.position.set(0.31, 1.88, 0.04);
    group.add(leftArm, rightArm);

    const ring = new THREE.Group();
    ring.position.y = 1.55;
    const ofudaMat = new THREE.MeshStandardMaterial({
      map: textures.ofuda,
      emissive: 0x991b1b,
      emissiveIntensity: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.7,
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.34), ofudaMat);
      card.position.set(Math.cos(angle) * 0.72, Math.sin(i * 1.4) * 0.14, Math.sin(angle) * 0.72);
      card.lookAt(0, card.position.y, 0);
      ring.add(card);
    }
    group.add(ring);
    orbitRing = ring;
  }

  return {
    group,
    head,
    leftArm,
    rightArm,
    spiderLegs: spiderLegs.length > 0 ? spiderLegs : undefined,
    orbitRing,
    auraLight,
  };
}

function buildClawedArm(
  sleeveMat: THREE.Material,
  handMat: THREE.Material,
  side: -1 | 1,
  scaleLen = 1
): THREE.Group {
  const arm = new THREE.Group();
  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.085, 0.52 * scaleLen, 7),
    sleeveMat
  );
  upper.position.set(side * 0.04, -0.24 * scaleLen, 0.14);
  upper.rotation.x = -0.85;
  arm.add(upper);

  const fore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.032, 0.48 * scaleLen, 7),
    handMat
  );
  fore.position.set(side * 0.04, -0.34 * scaleLen, 0.48 * scaleLen);
  fore.rotation.x = -1.35;
  arm.add(fore);

  return arm;
}

export function animateMonsterRig(
  rig: AnimatedMonsterRig,
  type: MonsterId,
  elapsed: number,
  isChasing: boolean
) {
  const rate = isChasing ? 9.5 : 3.6;

  const twitch = Math.sin(elapsed * (isChasing ? 16 : 4.2)) * (isChasing ? 0.14 : 0.06);
  const headBaseTilt =
    type === 'shizu'
      ? 0.42
      : type === 'megumi'
        ? 0.28
        : type === 'keiko'
          ? -0.18
          : type === 'saigomo'
            ? -0.12
            : 0.1;
  rig.head.rotation.z = headBaseTilt + twitch;
  rig.head.rotation.x = Math.sin(elapsed * rate * 0.5) * 0.08;

  const reachAngle = isChasing ? -0.55 : 0.15;
  rig.leftArm.rotation.x = reachAngle + Math.sin(elapsed * rate) * 0.25;
  rig.rightArm.rotation.x = reachAngle - Math.sin(elapsed * rate) * 0.25;

  if (rig.spiderLegs) {
    rig.spiderLegs.forEach((leg, i) => {
      const phase = i * 1.1;
      leg.rotation.y = Math.sin(elapsed * (isChasing ? 15 : 6) + phase) * 0.34;
      leg.rotation.z = Math.cos(elapsed * (isChasing ? 15 : 6) + phase) * 0.12;
    });
  }

  if (rig.orbitRing) {
    rig.orbitRing.rotation.y = elapsed * (isChasing ? 2.4 : 0.9);
    rig.orbitRing.position.y = 1.55 + Math.sin(elapsed * 2.2) * 0.08;
  }

  rig.auraLight.intensity = (isChasing ? 2.6 : 1.5) + Math.sin(elapsed * 13) * 0.35;
}

// --- Composite Environment Props (3-12 parts, grounded bottom-center) ---

export function createToriiGate(scale = 1, unlocked = false): THREE.Group {
  const group = new THREE.Group();
  const redWood = new THREE.MeshStandardMaterial({
    color: unlocked ? 0xb91c1c : 0x6b1116,
    roughness: 0.55,
    metalness: 0.12,
  });
  const blackCap = new THREE.MeshStandardMaterial({
    color: 0x111114,
    roughness: 0.4,
    metalness: 0.35,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.9,
    metalness: 0.05,
  });

  [-0.95, 0.95].forEach((px) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.32, 8), stoneMat);
    base.position.set(px, 0.16, 0);
    group.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.75, 10), redWood);
    pillar.position.set(px, 1.52, 0);
    pillar.castShadow = true;
    group.add(pillar);
  });

  // Lower crossbeam (Nuki)
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.16, 0.18), redWood);
  nuki.position.set(0, 2.38, 0);
  group.add(nuki);

  // Top curved lintel (Kasagi)
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.22, 0.3), redWood);
  kasagi.position.set(0, 2.86, 0);
  group.add(kasagi);

  const topCap = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.11, 0.34), blackCap);
  topCap.position.set(0, 2.98, 0);
  group.add(topCap);

  // Center plaque (Gakuzuka)
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.12), blackCap);
  plaque.position.set(0, 2.62, 0.04);
  group.add(plaque);

  group.scale.setScalar(scale);
  return group;
}

export function createPaperLantern(color = 0xff8a3d): { group: THREE.Group; light: THREE.PointLight } {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x1e130d, roughness: 0.78 });
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: color,
    emissiveIntensity: 1.3,
    roughness: 0.65,
  });

  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), woodMat);
  cord.position.y = 0.45;
  group.add(cord);

  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.06, 10), woodMat);
  topCap.position.y = 0.22;
  group.add(topCap);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), paperMat);
  body.scale.set(1, 1.35, 1);
  group.add(body);

  const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.06, 10), woodMat);
  botCap.position.y = -0.24;
  group.add(botCap);

  const light = new THREE.PointLight(color, 0.72, 6.2, 2.0);
  light.position.set(0, -0.05, 0);
  group.add(light);

  return { group, light };
}

export function createCollectibleMesh(
  kind: 'key' | 'ofuda' | 'butterfly' | 'seal' | 'battery' | 'diary',
  textures: ProceduralTextureSet
): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'key') {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0x92400e,
      emissiveIntensity: 0.65,
      roughness: 0.22,
      metalness: 0.9,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 16), goldMat);
    ring.position.y = 0.22;
    group.add(ring);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 8), goldMat);
    shaft.position.y = 0.02;
    group.add(shaft);

    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.03), goldMat);
    bit.position.set(0.05, -0.1, 0);
    group.add(bit);
  } else if (kind === 'butterfly') {
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xf9a8d4,
      emissive: 0xec4899,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      roughness: 0.3,
    });
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
      roughness: 0.35,
    });

    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8), bodyMat);
    core.rotation.x = Math.PI / 4;
    group.add(core);

    [-1, 1].forEach((side) => {
      const upperWing = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), wingMat);
      upperWing.position.set(side * 0.14, 0.06, 0);
      upperWing.rotation.y = side * 0.45;
      group.add(upperWing);

      const lowerWing = new THREE.Mesh(new THREE.CircleGeometry(0.11, 10), wingMat);
      lowerWing.position.set(side * 0.11, -0.09, -0.02);
      lowerWing.rotation.y = side * 0.45;
      group.add(lowerWing);
    });

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.014, 6, 20),
      new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        emissive: 0xdb2777,
        emissiveIntensity: 0.65,
      })
    );
    group.add(halo);
  } else if (kind === 'ofuda' || kind === 'seal') {
    const isSeal = kind === 'seal';
    const cardMat = new THREE.MeshStandardMaterial({
      map: textures.ofuda,
      emissive: isSeal ? 0xef4444 : 0xb91c1c,
      emissiveIntensity: 0.55,
      side: THREE.DoubleSide,
      roughness: 0.6,
    });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.48), cardMat);
    group.add(card);

    const frameMat = new THREE.MeshStandardMaterial({
      color: isSeal ? 0xfbbf24 : 0x7f1d1d,
      emissive: isSeal ? 0xd97706 : 0x450a0a,
      emissiveIntensity: 0.4,
      metalness: 0.75,
      roughness: 0.3,
    });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.015, 6, 20), frameMat);
    group.add(halo);
  } else if (kind === 'battery') {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.4,
      metalness: 0.5,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.6,
    });
    const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.24, 12), bodyMat);
    group.add(cell);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.08, 12), capMat);
    band.position.y = 0.06;
    group.add(band);
    const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 8), capMat);
    nub.position.y = 0.135;
    group.add(nub);
  } else {
    // Diary notebook
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x451a1a,
      roughness: 0.75,
      metalness: 0.1,
    });
    const pageMat = new THREE.MeshStandardMaterial({
      color: 0xe7e5e4,
      emissive: 0x57534e,
      emissiveIntensity: 0.35,
      roughness: 0.85,
    });
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.36), coverMat);
    group.add(cover);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.048, 0.33), pageMat);
    pages.position.x = 0.01;
    group.add(pages);
  }

  return group;
}

export function createSchoolDesk(): THREE.Group {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5c3d26, roughness: 0.72 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x32353b, roughness: 0.42, metalness: 0.72 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xd6d3c9, roughness: 0.9 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.045, 0.52), wood);
  top.position.y = 0.72;
  top.castShadow = true;
  group.add(top);

  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.44), steel);
  tray.position.y = 0.645;
  group.add(tray);

  // Desk tubular steel legs
  [
    [-0.32, -0.2],
    [0.32, -0.2],
    [-0.32, 0.2],
    [0.32, 0.2],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 6), steel);
    leg.position.set(lx, 0.35, lz);
    group.add(leg);
  });

  // Left-behind open notebook on desk
  const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.014, 0.18), paperMat);
  notebook.position.set(-0.08, 0.75, 0.02);
  notebook.rotation.y = 0.28;
  group.add(notebook);

  // Separate slightly crooked wooden-slat school chair
  const chair = new THREE.Group();
  chair.position.set(0.04, 0, 0.48);
  chair.rotation.y = -0.22;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.4), wood);
  seat.position.y = 0.42;
  chair.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.035), wood);
  back.position.set(0, 0.66, 0.19);
  chair.add(back);
  [
    [-0.17, -0.16],
    [0.17, -0.16],
    [-0.17, 0.16],
    [0.17, 0.16],
  ].forEach(([cx, cz]) => {
    const cLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, cz > 0 ? 0.76 : 0.42, 6),
      steel
    );
    cLeg.position.set(cx, cz > 0 ? 0.38 : 0.21, cz);
    chair.add(cLeg);
  });
  group.add(chair);

  return group;
}

export function createSchoolLocker(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x20262b,
    roughness: 0.6,
    metalness: 0.45,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    map: textures.lockerMetal,
    roughness: 0.55,
    metalness: 0.5,
  });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.12, 2.05, 0.52), bodyMat);
  frame.position.y = 1.025;
  frame.castShadow = true;
  group.add(frame);

  const doors = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 1.98), doorMat);
  doors.position.set(0, 1.025, 0.265);
  group.add(doors);

  return group;
}

export function createChalkboard(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const boardMat = new THREE.MeshStandardMaterial({
    map: textures.chalkboard,
    roughness: 0.85,
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.28, 0.08), boardMat);
  board.position.y = 1.85;
  group.add(board);

  const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.7 });
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.06, 0.16), ledgeMat);
  ledge.position.set(0, 1.19, 0.06);
  group.add(ledge);

  // Chalkboard eraser + chalk stick on tray
  const eraserMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
  const eraser = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.07), eraserMat);
  eraser.position.set(-0.55, 1.24, 0.08);
  group.add(eraser);

  // Frozen School Wall Clock mounted above the chalkboard
  const clockRimMat = new THREE.MeshStandardMaterial({ color: 0x1f2024, roughness: 0.4, metalness: 0.5 });
  const clockFaceMat = new THREE.MeshStandardMaterial({ map: textures.wallClock, roughness: 0.4 });
  const clockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 18), clockRimMat);
  clockBody.rotation.x = Math.PI / 2;
  clockBody.position.set(0, 2.86, 0.03);
  group.add(clockBody);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.21, 18), clockFaceMat);
  clockFace.position.set(0, 2.86, 0.065);
  group.add(clockFace);

  return group;
}

export function createTeacherPodium(): THREE.Group {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x452b19, roughness: 0.74 });
  const bookMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.96, 0.56), wood);
  body.position.y = 0.48;
  body.castShadow = true;
  group.add(body);

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.06, 0.64), wood);
  top.position.y = 0.98;
  group.add(top);

  const registerBook = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.22), bookMat);
  registerBook.position.set(0.12, 1.03, 0);
  registerBook.rotation.y = -0.18;
  group.add(registerBook);

  return group;
}

export function createSchoolBulletinBoard(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const boardMat = new THREE.MeshStandardMaterial({
    map: textures.schoolNotice,
    roughness: 0.82,
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.95, 0.05), boardMat);
  board.position.y = 1.72;
  group.add(board);
  return group;
}

export function createFluorescentLight(
  flickering: boolean
): { group: THREE.Group; light: THREE.PointLight; tubeMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const housingMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.4,
    metalness: 0.6,
  });
  const tubeColor = flickering ? 0xcfe8ff : 0xe6f2ff;
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8ff,
    emissive: tubeColor,
    emissiveIntensity: flickering ? 0.9 : 1.35,
    roughness: 0.2,
  });

  const housing = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.28), housingMat);
  group.add(housing);

  [-0.065, 0.065].forEach((tz) => {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.18, 8), tubeMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, -0.05, tz);
    group.add(tube);
  });

  const light = new THREE.PointLight(tubeColor, flickering ? 0.65 : 0.92, 6.8, 2.0);
  light.position.set(0, -0.22, 0);
  group.add(light);

  return { group, light, tubeMat };
}

export function createEmergencyExitSign(
  textures: ProceduralTextureSet
): { group: THREE.Group; light: THREE.PointLight } {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    map: textures.exitSign,
    emissive: 0x10b981,
    emissiveIntensity: 0.7,
    roughness: 0.4,
  });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 0.08), mat);
  group.add(box);

  const light = new THREE.PointLight(0x34d399, 0.48, 4.5, 2.1);
  light.position.set(0, -0.25, 0);
  group.add(light);

  return { group, light };
}

export function createChabudaiTable(): THREE.Group {
  const group = new THREE.Group();
  const lacquer = new THREE.MeshStandardMaterial({
    color: 0x3f1414,
    roughness: 0.35,
    metalness: 0.15,
  });
  const cushionMat = new THREE.MeshStandardMaterial({
    color: 0x451a24,
    roughness: 0.9,
  });

  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.06, 16), lacquer);
  top.position.y = 0.36;
  group.add(top);

  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.34, 8), lacquer);
    leg.position.set(Math.cos(ang) * 0.45, 0.17, Math.sin(ang) * 0.45);
    group.add(leg);

    const zabuton = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), cushionMat);
    zabuton.position.set(Math.cos(ang) * 0.92, 0.03, Math.sin(ang) * 0.92);
    zabuton.rotation.y = ang;
    group.add(zabuton);
  }

  return group;
}

export function createSpiderWebCanopy(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const webMat = new THREE.MeshBasicMaterial({
    map: textures.spiderWeb,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const w1 = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), webMat);
  w1.position.set(0, 2.65, 0);
  w1.rotation.x = Math.PI / 2.6;
  w1.rotation.z = 0.4;
  group.add(w1);

  const w2 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), webMat);
  w2.position.set(0.65, 2.3, -0.5);
  w2.rotation.y = Math.PI / 3;
  group.add(w2);

  return group;
}

export function createSacredTree(
  textures: ProceduralTextureSet,
  cherryBlossom = false
): THREE.Group {
  const group = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x1a1412,
    roughness: 0.94,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xb49a70,
    roughness: 0.88,
  });
  const ofudaMat = new THREE.MeshStandardMaterial({
    map: textures.ofuda,
    emissive: cherryBlossom ? 0xdb2777 : 0x991b1b,
    emissiveIntensity: 0.45,
    side: THREE.DoubleSide,
  });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 3.2, 10), barkMat);
  trunk.position.y = 1.6;
  trunk.castShadow = true;
  group.add(trunk);

  // Shimenawa sacred rope ring
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.065, 8, 16), ropeMat);
  rope.rotation.x = Math.PI / 2;
  rope.position.y = 1.55;
  group.add(rope);

  const blossomMat = cherryBlossom
    ? new THREE.MeshStandardMaterial({
        color: 0xf9a8d4,
        emissive: 0xbe185d,
        emissiveIntensity: 0.35,
        roughness: 0.75,
      })
    : null;

  // Hanging Ofuda & gnarled branches (+ optional Sakura blossom canopies)
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 1.35, 7), barkMat);
    branch.position.set(Math.cos(ang) * 0.45, 2.85, Math.sin(ang) * 0.45);
    branch.rotation.z = Math.cos(ang) * -0.75;
    branch.rotation.x = Math.sin(ang) * 0.75;
    group.add(branch);

    if (blossomMat) {
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), blossomMat);
      canopy.scale.set(1.15, 0.65, 1.15);
      canopy.position.set(Math.cos(ang) * 0.88, 3.25, Math.sin(ang) * 0.88);
      group.add(canopy);
    }

    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.34), ofudaMat);
    card.position.set(Math.cos(ang) * 0.46, 1.32, Math.sin(ang) * 0.46);
    card.lookAt(Math.cos(ang) * 2, 1.32, Math.sin(ang) * 2);
    group.add(card);
  }

  if (blossomMat) {
    const crownCanopy = new THREE.Mesh(new THREE.SphereGeometry(0.92, 12, 10), blossomMat);
    crownCanopy.scale.set(1.2, 0.65, 1.2);
    crownCanopy.position.y = 3.55;
    group.add(crownCanopy);
  }

  return group;
}

export function createStoneToro(): { group: THREE.Group; light: THREE.PointLight } {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x2e2e33,
    roughness: 0.92,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xef4444,
    emissiveIntensity: 1.5,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.3, 6), stoneMat);
  base.position.y = 0.15;
  group.add(base);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.95, 6), stoneMat);
  post.position.y = 0.77;
  group.add(post);

  const chamber = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), glowMat);
  chamber.position.y = 1.42;
  group.add(chamber);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.32, 6), stoneMat);
  roof.position.y = 1.74;
  group.add(roof);

  const light = new THREE.PointLight(0xef4444, 0.68, 5.4, 2.0);
  light.position.y = 1.45;
  group.add(light);

  return { group, light };
}

export function createCursedDollProp(
  textures: ProceduralTextureSet
): { group: THREE.Group; head: THREE.Group } {
  const group = new THREE.Group();
  const standMat = new THREE.MeshStandardMaterial({ color: 0x18100d, roughness: 0.85 });
  const kimonoMat = new THREE.MeshStandardMaterial({ color: 0x451226, roughness: 0.72 });
  const sashMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
  const faceMat = new THREE.MeshStandardMaterial({ map: textures.megumiFace, roughness: 0.35 });

  // Lacquered display plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.56), standMat);
  plinth.position.y = 0.21;
  plinth.castShadow = true;
  group.add(plinth);

  // Seated doll kimono body
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 0.48, 10), kimonoMat);
  skirt.position.y = 0.66;
  group.add(skirt);

  const obi = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 10), sashMat);
  obi.position.y = 0.72;
  group.add(obi);

  // Articulated turning head
  const head = new THREE.Group();
  head.position.set(0, 1.02, 0.02);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), faceMat);
  face.rotation.y = -Math.PI / 2;
  head.add(face);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
    hairMat
  );
  head.add(hair);
  group.add(head);

  return { group, head };
}

export function createHospitalGurney(): THREE.Group {
  const group = new THREE.Group();
  const rustSteel = new THREE.MeshStandardMaterial({
    color: 0x3b3835,
    roughness: 0.55,
    metalness: 0.65,
  });
  const sheetMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    roughness: 0.9,
  });
  const stainMat = new THREE.MeshStandardMaterial({
    color: 0x450a0a,
    roughness: 0.75,
  });

  // Mattress & frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 1.75), rustSteel);
  frame.position.y = 0.68;
  group.add(frame);

  const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.1, 1.66), sheetMat);
  mattress.position.y = 0.76;
  mattress.castShadow = true;
  group.add(mattress);

  const bloodStain = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.015, 0.65), stainMat);
  bloodStain.position.set(0.06, 0.815, -0.18);
  bloodStain.rotation.y = 0.25;
  group.add(bloodStain);

  // 4 tubular legs + IV pole
  [
    [-0.34, -0.72],
    [0.34, -0.72],
    [-0.34, 0.72],
    [0.34, 0.72],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.66, 6), rustSteel);
    leg.position.set(lx, 0.33, lz);
    group.add(leg);
  });

  const ivPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 1.7, 6), rustSteel);
  ivPole.position.set(-0.36, 1.15, -0.76);
  group.add(ivPole);

  return group;
}

export function createStoneJizoStatue(): THREE.Group {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x2a2b2f, roughness: 0.94 });
  const bibMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.85 });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x991b1b,
    emissiveIntensity: 0.9,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.62), stone);
  base.position.y = 0.12;
  group.add(base);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.74, 10), stone);
  torso.position.y = 0.61;
  torso.castShadow = true;
  group.add(torso);

  const bib = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.24, 8), bibMat);
  bib.position.set(0, 0.84, 0.05);
  bib.rotation.x = Math.PI;
  group.add(bib);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), stone);
  head.position.y = 1.12;
  group.add(head);

  [-0.06, 0.06].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
    eye.position.set(ex, 1.14, 0.16);
    group.add(eye);
  });

  return group;
}

export function createSpiderCocoon(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const silkMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    map: textures.spiderWeb,
    roughness: 0.88,
  });
  const stainMat = new THREE.MeshStandardMaterial({
    color: 0x450a0a,
    emissive: 0x450a0a,
    emissiveIntensity: 0.35,
    roughness: 0.72,
  });

  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 1.05, 6), silkMat);
  cord.position.y = -0.52;
  group.add(cord);

  const sac = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), silkMat);
  sac.scale.set(0.85, 1.65, 0.85);
  sac.position.y = -1.25;
  group.add(sac);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), stainMat);
  core.scale.set(0.9, 1.35, 0.9);
  core.position.set(0, -1.25, 0.05);
  group.add(core);

  return group;
}

export function createWallTalismanCluster(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const scratchMat = new THREE.MeshBasicMaterial({
    map: textures.wallScratch,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const scratch = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), scratchMat);
  scratch.position.set(0, 1.65, 0.02);
  group.add(scratch);

  const ofudaMat = new THREE.MeshStandardMaterial({
    map: textures.ofuda,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.25,
    roughness: 0.7,
  });
  [-0.22, 0.04, 0.28].forEach((ox, idx) => {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.3), ofudaMat);
    card.position.set(ox, 1.85 - idx * 0.14, 0.03);
    card.rotation.z = (idx - 1) * 0.24;
    group.add(card);
  });

  return group;
}

