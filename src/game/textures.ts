import * as THREE from 'three';
import { MonsterId } from '../data/lore';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTextureSet {
  woodFloor: THREE.CanvasTexture;
  tatamiFloor: THREE.CanvasTexture;
  shrineStone: THREE.CanvasTexture;
  shrineWater: THREE.CanvasTexture;
  bloodWater: THREE.CanvasTexture;
  schoolWall: THREE.CanvasTexture;
  schoolCeiling: THREE.CanvasTexture;
  shojiWall: THREE.CanvasTexture;
  shrineWall: THREE.CanvasTexture;
  ceilingWood: THREE.CanvasTexture;
  ofuda: THREE.CanvasTexture;
  chalkboard: THREE.CanvasTexture;
  lockerMetal: THREE.CanvasTexture;
  wallClock: THREE.CanvasTexture;
  schoolNotice: THREE.CanvasTexture;
  spiderWeb: THREE.CanvasTexture;
  exitSign: THREE.CanvasTexture;
  bloodDecal: THREE.CanvasTexture;
  wallScratch: THREE.CanvasTexture;
  particleMote: THREE.CanvasTexture;
  shizuFace: THREE.CanvasTexture;
  biwakiFace: THREE.CanvasTexture;
  megumiFace: THREE.CanvasTexture;
  oomukadeFace: THREE.CanvasTexture;
  saigomoFace: THREE.CanvasTexture;
  keikoFace: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));

  // 1. Weathered Japanese School Wood Floor
  const [woodC, woodCtx] = makeCanvas(512, 512);
  woodCtx.fillStyle = '#241811';
  woodCtx.fillRect(0, 0, 512, 512);
  const plankCount = 8;
  const plankH = 512 / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const shade = 26 + ((i * 19) % 14);
    woodCtx.fillStyle = `rgb(${shade + 14}, ${shade + 2}, ${shade - 6})`;
    woodCtx.fillRect(0, i * plankH, 512, plankH - 2);
    // Grain lines
    woodCtx.strokeStyle = 'rgba(10, 6, 4, 0.35)';
    woodCtx.lineWidth = 1;
    for (let g = 0; g < 10; g++) {
      woodCtx.beginPath();
      const y = i * plankH + (g + 0.5) * (plankH / 10);
      woodCtx.moveTo(0, y);
      woodCtx.bezierCurveTo(170, y + ((g % 3) - 1) * 4, 340, y - ((g % 2) - 0.5) * 4, 512, y);
      woodCtx.stroke();
    }
    // Plank joint
    const jointX = ((i * 173 + 90) % 420) + 40;
    woodCtx.fillStyle = '#0d0805';
    woodCtx.fillRect(jointX, i * plankH, 3, plankH);
  }
  // Grime & dark scuffing
  for (let s = 0; s < 40; s++) {
    woodCtx.fillStyle = `rgba(12, 8, 6, ${0.08 + Math.random() * 0.14})`;
    woodCtx.beginPath();
    woodCtx.arc(Math.random() * 512, Math.random() * 512, 12 + Math.random() * 34, 0, Math.PI * 2);
    woodCtx.fill();
  }
  const woodFloor = finalizeTexture(woodC, aniso, 16, 16);

  // 2. Tatami Mat Floor (Sato Manor)
  const [tatC, tatCtx] = makeCanvas(512, 512);
  tatCtx.fillStyle = '#2d2d1d';
  tatCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 4) {
    tatCtx.fillStyle = y % 8 === 0 ? 'rgba(65, 64, 40, 0.45)' : 'rgba(22, 22, 14, 0.45)';
    tatCtx.fillRect(0, y, 512, 2);
  }
  // Dark crimson border strips
  tatCtx.fillStyle = '#1b0d0e';
  tatCtx.fillRect(0, 0, 512, 18);
  tatCtx.fillRect(0, 248, 512, 16);
  tatCtx.fillRect(0, 0, 18, 256);
  tatCtx.fillRect(256, 256, 18, 256);
  // Subtle blood stain smudge
  const grad = tatCtx.createRadialGradient(340, 380, 6, 340, 380, 75);
  grad.addColorStop(0, 'rgba(95, 10, 12, 0.52)');
  grad.addColorStop(1, 'rgba(95, 10, 12, 0)');
  tatCtx.fillStyle = grad;
  tatCtx.fillRect(240, 280, 200, 200);
  const tatamiFloor = finalizeTexture(tatC, aniso, 14, 14);

  // 3. Shrine Mossy Stone Ground
  const [stC, stCtx] = makeCanvas(512, 512);
  stCtx.fillStyle = '#16171b';
  stCtx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const shade = 20 + ((r * 7 + c * 13) % 16);
      stCtx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 6})`;
      stCtx.fillRect(c * 85 + 3, r * 85 + 3, 79, 79);
    }
  }
  for (let m = 0; m < 75; m++) {
    stCtx.fillStyle = m % 4 === 0 ? 'rgba(30, 48, 32, 0.28)' : 'rgba(8, 8, 10, 0.32)';
    stCtx.beginPath();
    stCtx.arc(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 22, 0, Math.PI * 2);
    stCtx.fill();
  }
  const shrineStone = finalizeTexture(stC, aniso, 16, 16);

  // 4. Realistic 1990s Japanese School Wall (frosted transom windows + plaster + wood wainscoting)
  const [swC, swCtx] = makeCanvas(512, 512);
  // Base aged plaster
  swCtx.fillStyle = '#3b3d39';
  swCtx.fillRect(0, 0, 512, 310);

  // Upper frosted-glass corridor transom windows (top band)
  swCtx.fillStyle = '#1b1612';
  swCtx.fillRect(0, 22, 512, 134);
  for (let wx = 18; wx < 490; wx += 118) {
    const winGrad = swCtx.createLinearGradient(wx, 34, wx, 144);
    winGrad.addColorStop(0, '#4d5d6d');
    winGrad.addColorStop(0.55, '#334150');
    winGrad.addColorStop(1, '#242e38');
    swCtx.fillStyle = winGrad;
    swCtx.fillRect(wx, 34, 102, 110);
    // Frosted pane inner bevel
    swCtx.strokeStyle = 'rgba(210, 225, 240, 0.16)';
    swCtx.lineWidth = 2;
    swCtx.strokeRect(wx + 3, 37, 96, 104);
  }
  // Upper ceiling trim
  swCtx.fillStyle = '#16110e';
  swCtx.fillRect(0, 0, 512, 24);

  // Middle plaster wall aging, damp water stains, grime streaks & subtle bloody smudge
  for (let d = 0; d < 42; d++) {
    swCtx.fillStyle = `rgba(10, 10, 9, ${0.14 + Math.random() * 0.22})`;
    swCtx.fillRect(
      Math.random() * 512,
      156 + Math.random() * 140,
      6 + Math.random() * 26,
      26 + Math.random() * 115
    );
  }
  // Faint smeared palm smudge on frosted window
  swCtx.fillStyle = 'rgba(110, 14, 18, 0.28)';
  swCtx.beginPath();
  swCtx.arc(185, 96, 16, 0, Math.PI * 2);
  swCtx.fill();

  // Lower dark timber wainscoting + chair rail + baseboard
  swCtx.fillStyle = '#140d09';
  swCtx.fillRect(0, 298, 512, 14);
  swCtx.fillStyle = '#291a12';
  swCtx.fillRect(0, 312, 512, 178);
  for (let x = 0; x < 512; x += 32) {
    swCtx.fillStyle = 'rgba(10, 6, 4, 0.55)';
    swCtx.fillRect(x, 312, 3, 178);
    swCtx.fillStyle = 'rgba(72, 46, 30, 0.22)';
    swCtx.fillRect(x + 4, 314, 10, 174);
  }
  swCtx.fillStyle = '#0e0906';
  swCtx.fillRect(0, 488, 512, 24);
  const schoolWall = finalizeTexture(swC, aniso, 1, 1);

  // 4b. School Acoustic Grid Ceiling Tiles
  const [scC, scCtx] = makeCanvas(256, 256);
  scCtx.fillStyle = '#2a2d30';
  scCtx.fillRect(0, 0, 256, 256);
  scCtx.strokeStyle = '#16181a';
  scCtx.lineWidth = 4;
  for (let x = 0; x <= 256; x += 64) {
    scCtx.beginPath();
    scCtx.moveTo(x, 0);
    scCtx.lineTo(x, 256);
    scCtx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    scCtx.beginPath();
    scCtx.moveTo(0, y);
    scCtx.lineTo(256, y);
    scCtx.stroke();
  }
  for (let i = 0; i < 180; i++) {
    scCtx.fillStyle = `rgba(12, 14, 16, ${0.15 + Math.random() * 0.25})`;
    scCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const schoolCeiling = finalizeTexture(scC, aniso, 18, 18);

  // 5. Shoji Paper Lattice Wall (Sato Manor)
  const [shC, shCtx] = makeCanvas(512, 512);
  shCtx.fillStyle = '#3e382f';
  shCtx.fillRect(0, 0, 512, 512);
  // Aged rice paper tint (darker decayed tone)
  shCtx.fillStyle = '#6c6252';
  shCtx.fillRect(18, 18, 476, 360);
  // Eerie silhouette shadow + dried blood smear behind shoji paper
  const shGrad = shCtx.createRadialGradient(256, 200, 20, 256, 200, 175);
  shGrad.addColorStop(0, 'rgba(20, 12, 14, 0.78)');
  shGrad.addColorStop(0.55, 'rgba(65, 10, 12, 0.42)');
  shGrad.addColorStop(1, 'rgba(20, 12, 14, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(18, 18, 476, 360);
  // Wooden lattice grid
  shCtx.fillStyle = '#1c120d';
  for (let gx = 18; gx <= 494; gx += 68) {
    shCtx.fillRect(gx - 4, 18, 8, 360);
  }
  for (let gy = 18; gy <= 378; gy += 60) {
    shCtx.fillRect(18, gy - 4, 476, 8);
  }
  // Lower dark timber base
  shCtx.fillStyle = '#19100b';
  shCtx.fillRect(0, 378, 512, 134);
  const shojiWall = finalizeTexture(shC, aniso, 1, 1);

  // 6. Crimson Lacquer Shrine Wall
  const [srC, srCtx] = makeCanvas(512, 512);
  srCtx.fillStyle = '#190c0e';
  srCtx.fillRect(0, 0, 512, 512);
  srCtx.fillStyle = '#4a1014';
  srCtx.fillRect(0, 24, 512, 28);
  srCtx.fillRect(0, 460, 512, 52);
  for (let px = 0; px < 512; px += 128) {
    srCtx.fillStyle = '#380c10';
    srCtx.fillRect(px, 0, 22, 512);
  }
  // Subtle gold/crimson crest pattern
  srCtx.strokeStyle = 'rgba(180, 40, 40, 0.35)';
  srCtx.lineWidth = 4;
  srCtx.beginPath();
  srCtx.arc(256, 240, 72, 0, Math.PI * 2);
  srCtx.stroke();
  const shrineWall = finalizeTexture(srC, aniso, 1, 1);

  // 7. Dark Wooden Beam Ceiling
  const [cC, cCtx] = makeCanvas(256, 256);
  cCtx.fillStyle = '#120d0a';
  cCtx.fillRect(0, 0, 256, 256);
  cCtx.fillStyle = '#1c130e';
  for (let y = 0; y < 256; y += 32) {
    cCtx.fillRect(0, y, 256, 26);
  }
  const ceilingWood = finalizeTexture(cC, aniso, 14, 14);

  // 8. Ofuda Talisman Texture
  const [ofC, ofCtx] = makeCanvas(128, 256);
  ofCtx.fillStyle = '#efe5cf';
  ofCtx.fillRect(0, 0, 128, 256);
  ofCtx.strokeStyle = '#991b1b';
  ofCtx.lineWidth = 6;
  ofCtx.strokeRect(10, 10, 108, 236);
  // Stylized brush seal kanji lines
  ofCtx.fillStyle = '#7f1d1d';
  ofCtx.fillRect(56, 36, 16, 180);
  ofCtx.fillRect(30, 68, 68, 12);
  ofCtx.fillRect(34, 118, 60, 12);
  ofCtx.fillRect(28, 168, 72, 12);
  const ofuda = finalizeTexture(ofC, aniso, 1, 1);

  // 8b. Shrine Flooded Water Surface
  const [swatC, swatCtx] = makeCanvas(256, 256);
  swatCtx.fillStyle = '#070a10';
  swatCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 24; i++) {
    swatCtx.strokeStyle = `rgba(90, 120, 150, ${0.08 + (i % 4) * 0.03})`;
    swatCtx.lineWidth = 1.5;
    swatCtx.beginPath();
    swatCtx.arc((i * 53) % 256, (i * 89) % 256, 14 + (i % 5) * 9, 0, Math.PI * 2);
    swatCtx.stroke();
  }
  const shrineWater = finalizeTexture(swatC, aniso, 1, 1);

  // 8b-2. Blood Swamp Water Surface (Ch.4)
  const [bwatC, bwatCtx] = makeCanvas(256, 256);
  bwatCtx.fillStyle = '#240508';
  bwatCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 24; i++) {
    bwatCtx.strokeStyle = `rgba(180, 28, 38, ${0.12 + (i % 4) * 0.04})`;
    bwatCtx.lineWidth = 1.6;
    bwatCtx.beginPath();
    bwatCtx.arc((i * 53) % 256, (i * 89) % 256, 14 + (i % 5) * 9, 0, Math.PI * 2);
    bwatCtx.stroke();
  }
  const bloodWater = finalizeTexture(bwatC, aniso, 1, 1);

  // 8c. Realistic Japanese School Chalkboard with chalk dust, date & eerie marks
  const [cbC, cbCtx] = makeCanvas(512, 256);
  cbCtx.fillStyle = '#173025';
  cbCtx.fillRect(0, 0, 512, 256);
  // Chalk dust clouding
  const dustGrad = cbCtx.createRadialGradient(220, 128, 20, 220, 128, 220);
  dustGrad.addColorStop(0, 'rgba(215, 225, 220, 0.14)');
  dustGrad.addColorStop(1, 'rgba(215, 225, 220, 0.02)');
  cbCtx.fillStyle = dustGrad;
  cbCtx.fillRect(14, 14, 484, 228);

  cbCtx.strokeStyle = '#3f2616';
  cbCtx.lineWidth = 14;
  cbCtx.strokeRect(7, 7, 498, 242);

  // Right-side classroom schedule & duty header (2021.08.07 LA Quinta High)
  cbCtx.fillStyle = 'rgba(230, 235, 230, 0.56)';
  cbCtx.font = '15px serif';
  cbCtx.fillText('2021.08.07', 394, 46);
  cbCtx.fillText('LA Quinta', 394, 70);
  cbCtx.strokeStyle = 'rgba(230, 235, 230, 0.28)';
  cbCtx.lineWidth = 2;
  cbCtx.beginPath();
  cbCtx.moveTo(384, 24);
  cbCtx.lineTo(384, 224);
  cbCtx.stroke();

  // Eerie scribbled chalk warning
  cbCtx.fillStyle = 'rgba(235, 240, 235, 0.58)';
  cbCtx.font = 'bold 32px serif';
  cbCtx.fillText('逃 げ ろ', 54, 96);
  cbCtx.font = '18px serif';
  cbCtx.fillText('6人を捜せ · 鍵 4つ', 54, 152);
  // Blood smear on chalkboard
  const bGrad = cbCtx.createRadialGradient(310, 142, 8, 310, 142, 68);
  bGrad.addColorStop(0, 'rgba(145, 14, 20, 0.72)');
  bGrad.addColorStop(1, 'rgba(145, 14, 20, 0)');
  cbCtx.fillStyle = bGrad;
  cbCtx.fillRect(230, 68, 150, 150);
  const chalkboard = finalizeTexture(cbC, aniso, 1, 1);

  // 8d. Detailed School Steel Locker Doors
  const [lkC, lkCtx] = makeCanvas(256, 512);
  lkCtx.fillStyle = '#2c333a';
  lkCtx.fillRect(0, 0, 256, 512);
  lkCtx.strokeStyle = '#14171a';
  lkCtx.lineWidth = 6;
  lkCtx.strokeRect(8, 8, 112, 496);
  lkCtx.strokeRect(136, 8, 112, 496);
  // Louver vents + nameplates + recessed handles
  lkCtx.fillStyle = '#111316';
  for (let v = 0; v < 5; v++) {
    lkCtx.fillRect(28, 44 + v * 14, 72, 6);
    lkCtx.fillRect(156, 44 + v * 14, 72, 6);
  }
  lkCtx.fillStyle = '#d4d4d8';
  lkCtx.fillRect(42, 134, 44, 16);
  lkCtx.fillRect(170, 134, 44, 16);
  lkCtx.fillStyle = '#52525b';
  lkCtx.fillRect(96, 232, 10, 42);
  lkCtx.fillRect(224, 232, 10, 42);
  // Bottom rust tint
  const rGrad = lkCtx.createLinearGradient(0, 430, 0, 512);
  rGrad.addColorStop(0, 'rgba(90, 42, 22, 0)');
  rGrad.addColorStop(1, 'rgba(90, 42, 22, 0.55)');
  lkCtx.fillStyle = rGrad;
  lkCtx.fillRect(0, 430, 256, 82);
  const lockerMetal = finalizeTexture(lkC, aniso, 1, 1);

  // 8d-2. Frozen Classroom Wall Clock (02:44)
  const [wcC, wcCtx] = makeCanvas(256, 256);
  wcCtx.fillStyle = '#e5e5e0';
  wcCtx.beginPath();
  wcCtx.arc(128, 128, 120, 0, Math.PI * 2);
  wcCtx.fill();
  wcCtx.strokeStyle = '#18181b';
  wcCtx.lineWidth = 10;
  wcCtx.stroke();
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    wcCtx.beginPath();
    wcCtx.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92);
    wcCtx.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108);
    wcCtx.lineWidth = h % 3 === 0 ? 5 : 2.5;
    wcCtx.stroke();
  }
  // Hands frozen at 02:44
  wcCtx.strokeStyle = '#09090b';
  wcCtx.lineWidth = 6;
  wcCtx.beginPath();
  wcCtx.moveTo(128, 128);
  wcCtx.lineTo(176, 98);
  wcCtx.stroke();
  wcCtx.lineWidth = 4;
  wcCtx.beginPath();
  wcCtx.moveTo(128, 128);
  wcCtx.lineTo(82, 62);
  wcCtx.stroke();
  // Cracked glass line
  wcCtx.strokeStyle = 'rgba(40, 40, 45, 0.65)';
  wcCtx.lineWidth = 2;
  wcCtx.beginPath();
  wcCtx.moveTo(48, 52);
  wcCtx.lineTo(116, 122);
  wcCtx.lineTo(192, 168);
  wcCtx.stroke();
  const wallClock = finalizeTexture(wcC, aniso, 1, 1);

  // 8d-3. Hallway Cork Notice Board with Missing Posters
  const [snC, snCtx] = makeCanvas(256, 256);
  snCtx.fillStyle = '#5c412a';
  snCtx.fillRect(0, 0, 256, 256);
  snCtx.strokeStyle = '#26180f';
  snCtx.lineWidth = 14;
  snCtx.strokeRect(7, 7, 242, 242);
  // Pinned flyers
  snCtx.fillStyle = '#d6d3c9';
  snCtx.fillRect(28, 32, 86, 108);
  snCtx.fillRect(136, 44, 90, 114);
  snCtx.fillRect(46, 154, 110, 74);
  snCtx.fillStyle = '#991b1b';
  snCtx.font = 'bold 14px sans-serif';
  snCtx.fillText('尋 ね 人', 44, 58);
  snCtx.fillText('立入禁止', 152, 72);
  snCtx.fillStyle = '#27272a';
  snCtx.fillRect(44, 72, 54, 4);
  snCtx.fillRect(44, 84, 48, 4);
  snCtx.fillRect(150, 92, 60, 4);
  const schoolNotice = finalizeTexture(snC, aniso, 1, 1);

  // 8e. Transparent Spiderweb Texture (Kino's Nest)
  const [wbC, wbCtx] = makeCanvas(256, 256);
  wbCtx.clearRect(0, 0, 256, 256);
  wbCtx.strokeStyle = 'rgba(215, 210, 220, 0.58)';
  wbCtx.lineWidth = 1.6;
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    wbCtx.beginPath();
    wbCtx.moveTo(128, 128);
    wbCtx.lineTo(128 + Math.cos(ang) * 124, 128 + Math.sin(ang) * 124);
    wbCtx.stroke();
  }
  for (let r = 24; r <= 120; r += 22) {
    wbCtx.beginPath();
    for (let a = 0; a <= 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const px = 128 + Math.cos(ang) * r;
      const py = 128 + Math.sin(ang) * r;
      if (a === 0) wbCtx.moveTo(px, py);
      else wbCtx.lineTo(px, py);
    }
    wbCtx.stroke();
  }
  const spiderWeb = finalizeTexture(wbC, aniso, 1, 1);

  // 8f. Japanese Emergency Exit Sign (非常口)
  const [exC, exCtx] = makeCanvas(256, 128);
  exCtx.fillStyle = '#0b3b24';
  exCtx.fillRect(0, 0, 256, 128);
  exCtx.strokeStyle = '#d1fae5';
  exCtx.lineWidth = 6;
  exCtx.strokeRect(8, 8, 240, 112);
  exCtx.fillStyle = '#ecfdf5';
  exCtx.font = 'bold 42px sans-serif';
  exCtx.textAlign = 'center';
  exCtx.fillText('非常口', 128, 80);
  const exitSign = finalizeTexture(exC, aniso, 1, 1);

  // 8g. Transparent Floor Blood Pool & Drag Marks
  const [bdC, bdCtx] = makeCanvas(256, 256);
  bdCtx.clearRect(0, 0, 256, 256);
  const bPool = bdCtx.createRadialGradient(118, 120, 10, 118, 120, 82);
  bPool.addColorStop(0, 'rgba(92, 4, 9, 0.92)');
  bPool.addColorStop(0.55, 'rgba(64, 3, 7, 0.72)');
  bPool.addColorStop(1, 'rgba(40, 2, 5, 0)');
  bdCtx.fillStyle = bPool;
  bdCtx.beginPath();
  bdCtx.arc(118, 120, 84, 0, Math.PI * 2);
  bdCtx.fill();
  // Viscous drag streaks & droplets
  bdCtx.strokeStyle = 'rgba(84, 5, 10, 0.78)';
  bdCtx.lineCap = 'round';
  for (let s = 0; s < 5; s++) {
    bdCtx.lineWidth = 4 + (s % 3) * 3;
    bdCtx.beginPath();
    bdCtx.moveTo(100 + s * 10, 130);
    bdCtx.bezierCurveTo(135 + s * 8, 165, 170 + s * 6, 195, 220 + (s % 2) * 18, 232);
    bdCtx.stroke();
  }
  const bloodDecal = finalizeTexture(bdC, aniso, 1, 1);

  // 8h. Transparent Haunted Wall Claw Scratches & Blood Scrawl
  const [wsC, wsCtx] = makeCanvas(256, 256);
  wsCtx.clearRect(0, 0, 256, 256);
  wsCtx.strokeStyle = 'rgba(115, 10, 14, 0.85)';
  wsCtx.lineCap = 'round';
  for (let c = 0; c < 4; c++) {
    wsCtx.lineWidth = 5 - c * 0.6;
    wsCtx.beginPath();
    wsCtx.moveTo(42 + c * 26, 36 + c * 4);
    wsCtx.quadraticCurveTo(96 + c * 24, 124, 152 + c * 22, 212);
    wsCtx.stroke();
  }
  wsCtx.fillStyle = 'rgba(135, 12, 16, 0.72)';
  wsCtx.font = 'bold 28px serif';
  wsCtx.fillText('後ろ', 162, 74);
  const wallScratch = finalizeTexture(wsC, aniso, 1, 1);

  // 8i. Soft Radial Particle Mote Sprite
  const [pmC, pmCtx] = makeCanvas(64, 64);
  const pmGrad = pmCtx.createRadialGradient(32, 32, 1, 32, 32, 30);
  pmGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  pmGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.45)');
  pmGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  pmCtx.fillStyle = pmGrad;
  pmCtx.fillRect(0, 0, 64, 64);
  const particleMote = finalizeTexture(pmC, aniso, 1, 1);

  // 9. Monster Face Textures
  const shizuFace = createMonsterFaceTexture('shizu', aniso);
  const biwakiFace = createMonsterFaceTexture('biwaki', aniso);
  const megumiFace = createMonsterFaceTexture('megumi', aniso);
  const oomukadeFace = createMonsterFaceTexture('oomukade', aniso);
  const saigomoFace = createMonsterFaceTexture('saigomo', aniso);
  const keikoFace = createMonsterFaceTexture('keiko', aniso);

  return {
    woodFloor,
    tatamiFloor,
    shrineStone,
    shrineWater,
    bloodWater,
    schoolWall,
    schoolCeiling,
    shojiWall,
    shrineWall,
    ceilingWood,
    ofuda,
    chalkboard,
    lockerMetal,
    wallClock,
    schoolNotice,
    spiderWeb,
    exitSign,
    bloodDecal,
    wallScratch,
    particleMote,
    shizuFace,
    biwakiFace,
    megumiFace,
    oomukadeFace,
    saigomoFace,
    keikoFace,
    dispose: () => {
      woodFloor.dispose();
      tatamiFloor.dispose();
      shrineStone.dispose();
      shrineWater.dispose();
      bloodWater.dispose();
      schoolWall.dispose();
      schoolCeiling.dispose();
      shojiWall.dispose();
      shrineWall.dispose();
      ceilingWood.dispose();
      ofuda.dispose();
      chalkboard.dispose();
      lockerMetal.dispose();
      wallClock.dispose();
      schoolNotice.dispose();
      spiderWeb.dispose();
      exitSign.dispose();
      bloodDecal.dispose();
      wallScratch.dispose();
      particleMote.dispose();
      shizuFace.dispose();
      biwakiFace.dispose();
      megumiFace.dispose();
      oomukadeFace.dispose();
      saigomoFace.dispose();
      keikoFace.dispose();
    },
  };
}

function createMonsterFaceTexture(monsterId: MonsterId, anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);

  if (monsterId === 'shizu') {
    // Pale cracked porcelain face with hollow black eyes & wide jagged smile
    ctx.fillStyle = '#ddd7cf';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#403939';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 20);
    ctx.lineTo(75, 78);
    ctx.lineTo(62, 130);
    ctx.moveTo(205, 35);
    ctx.lineTo(178, 95);
    ctx.stroke();

    ctx.fillStyle = '#070709';
    ctx.beginPath();
    ctx.ellipse(84, 102, 22, 27, -0.1, 0, Math.PI * 2);
    ctx.ellipse(172, 102, 22, 27, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f4f5';
    ctx.fillRect(82, 98, 4, 4);
    ctx.fillRect(170, 98, 4, 4);

    ctx.fillStyle = '#180507';
    ctx.beginPath();
    ctx.moveTo(54, 158);
    ctx.quadraticCurveTo(128, 225, 202, 158);
    ctx.quadraticCurveTo(128, 192, 54, 158);
    ctx.fill();
    ctx.strokeStyle = '#d4d0c8';
    ctx.lineWidth = 3;
    for (let x = 74; x <= 182; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 168);
      ctx.lineTo(x, 192);
      ctx.stroke();
    }
  } else if (monsterId === 'biwaki') {
    // Biwaki: Shadowed indigo-ash face with glowing pale eyes & stitched mouth
    ctx.fillStyle = '#25232e';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(86, 100, 18, 10, -0.2, 0, Math.PI * 2);
    ctx.ellipse(170, 100, 18, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(86, 100, 5, 0, Math.PI * 2);
    ctx.arc(170, 100, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(64, 174);
    ctx.lineTo(192, 174);
    ctx.stroke();
    for (let x = 74; x <= 182; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 158);
      ctx.lineTo(x, 190);
      ctx.stroke();
    }
  } else if (monsterId === 'megumi') {
    // Megumi: Cursed ancestral porcelain doll face with painted cheeks & wide staring eyes
    ctx.fillStyle = '#ebe5dc';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(185, 28, 28, 0.32)';
    ctx.beginPath();
    ctx.arc(64, 142, 22, 0, Math.PI * 2);
    ctx.arc(192, 142, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(88, 102, 22, 0, Math.PI * 2);
    ctx.arc(168, 102, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(88, 102, 6, 0, Math.PI * 2);
    ctx.arc(168, 102, 6, 0, Math.PI * 2);
    ctx.fill();
    // Doll cracks + small red mouth
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(132, 18);
    ctx.lineTo(122, 82);
    ctx.lineTo(136, 128);
    ctx.stroke();
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(128, 178, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (monsterId === 'oomukade') {
    // Oomukade (Centipede Kintoru): Armored crimson-black carapace face with glowing eyes & mandibles
    ctx.fillStyle = '#1b0910';
    ctx.fillRect(0, 0, 256, 256);
    [
      [84, 96, 15],
      [172, 96, 15],
      [62, 68, 9],
      [194, 68, 9],
    ].forEach(([ex, ey, er]) => {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(ex, ey, er * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#090406';
    ctx.beginPath();
    ctx.ellipse(128, 176, 56, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e4e4e7';
    for (let i = 0; i < 6; i++) {
      const fx = 80 + i * 18;
      ctx.beginPath();
      ctx.moveTo(fx, 146);
      ctx.lineTo(fx + 7, 178);
      ctx.lineTo(fx + 14, 146);
      ctx.fill();
    }
  } else if (monsterId === 'keiko') {
    // Cursed Mother Keiko: Pale grieving face with crimson tears & dark hollow eyes
    ctx.fillStyle = '#d6d0c8';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(78, 114, 12, 95);
    ctx.fillRect(166, 114, 12, 95);
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(84, 102, 18, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(172, 102, 18, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(84, 102, 4, 0, Math.PI * 2);
    ctx.arc(172, 102, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#180407';
    ctx.beginPath();
    ctx.ellipse(128, 178, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Saigomo (Spider Kintoru): Chalk-white Noh mask, hollow black eye wells, crimson lips
    ctx.fillStyle = '#ede8e1';
    ctx.fillRect(0, 0, 256, 256);
    const cGrad = ctx.createRadialGradient(128, 128, 40, 128, 128, 140);
    cGrad.addColorStop(0, 'rgba(255,255,255,0)');
    cGrad.addColorStop(1, 'rgba(90, 20, 25, 0.38)');
    ctx.fillStyle = cGrad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(88, 62, 18, 7, -0.15, 0, Math.PI * 2);
    ctx.ellipse(168, 62, 18, 7, 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#050507';
    ctx.beginPath();
    ctx.ellipse(86, 108, 22, 18, 0.08, 0, Math.PI * 2);
    ctx.ellipse(170, 108, 22, 18, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(86, 108, 4, 0, Math.PI * 2);
    ctx.arc(170, 108, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(64, 166);
    ctx.quadraticCurveTo(128, 212, 192, 166);
    ctx.quadraticCurveTo(128, 180, 64, 166);
    ctx.fill();
    ctx.fillStyle = '#180406';
    ctx.beginPath();
    ctx.ellipse(128, 178, 32, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(canvas, anisotropy, 1, 1);
}
