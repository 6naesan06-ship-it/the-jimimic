export const TILE_SIZE = 3.2;
export const WALL_HEIGHT = 3.6;

export interface ChapterMapData {
  id: number;
  width: number;
  height: number;
  grid: string[];
  cells: string[][];
  playerStart: { gx: number; gz: number };
  exitTile: { gx: number; gz: number };
  items: Array<{ gx: number; gz: number; kind: 'key' | 'ofuda' | 'butterfly' | 'seal' | 'battery' | 'diary' }>;
  lanterns: Array<{ gx: number; gz: number }>;
  monsterSpawns: Array<{ gx: number; gz: number }>;
  desks: Array<{ gx: number; gz: number }>;
  lockers: Array<{ gx: number; gz: number }>;
  chalkboards: Array<{ gx: number; gz: number }>;
  exitSigns: Array<{ gx: number; gz: number }>;
  toriiArches: Array<{ gx: number; gz: number }>;
  spiderWebs: Array<{ gx: number; gz: number }>;
  sacredTrees: Array<{ gx: number; gz: number }>;
  stoneToros: Array<{ gx: number; gz: number }>;
  waterTiles: Array<{ gx: number; gz: number }>;
  walkableTiles: Array<{ gx: number; gz: number }>;
  shiftCandidates: Array<{ gx: number; gz: number }>;
}

const RAW_MAPS: Record<number, string[]> = {
  // Chapter 1: LA Quinta High School Basement -> Arari Village Otherworld (2021.08.07)
  1: [
    '#######################',
    '#S..C.#..K..#..C..#..D#',
    '#.F.F.#.....#..F..#.F.#',
    '#.....L.....#..F..#...#',
    '#..O..#..B..#.....#.O.#',
    '#.....#.....#.....#...#',
    '#..E........L........E#',
    '#.....................#',
    '###.###..###.###..###.#',
    '#K..#......#......#...#',
    '#.O.#..D...#..P...#.K.#',
    '#...#......#......#...#',
    '#...L..B..........L...#',
    '###.###..###.###..###.#',
    '#...#......#......#...#',
    '#.F.#..C...#..F...#.O.#',
    '#...#......#......#...#',
    '#..K........L..P..#..B#',
    '###.###..###.###..###.#',
    '#..B..#.....#.....#...#',
    '#.F...L..K..#..E..#...#',
    '#.....#.....#.....#..X#',
    '#######################',
  ],

  // Chapter 2: Imperial Palace, Realm of the Forgotten & Hospital (Megumi & Biwaki)
  2: [
    '#######################',
    '#S....#...........#..D#',
    '#.L...#..F..K..F..#...#',
    '#.....#...........#.L.#',
    '#..B..#..F.....F..#...#',
    '###.###...........###.#',
    '#.....L.....D.........#',
    '#.###.#####.###.#####.#',
    '#.#...#...#.#...#...#.#',
    '#.#.K.#...L.L...#...#.#',
    '#.#...#..J...J..#..P#.#',
    '#.....#....G....#.....#',
    '#.###.#..J...J..#.###.#',
    '#.....#...L.L...#.....#',
    '#...K.#####.###.#..K..#',
    '#..P.......B....#.....#',
    '#.###.###.###.###.###.#',
    '#.....#.....#.....#...#',
    '#..B..L..K..#..L..#...#',
    '#.###.#.....#.....#...#',
    '#.....#..F..#..K..#...#',
    '#.....L.....#.....#..X#',
    '#######################',
  ],

  // Chapter 3: Cherry Blossom Swamp & Kusunoki Manor (Oomukade & Butterfly Souls)
  3: [
    '#######################',
    '#S..T...L...#...K....D#',
    '#.#####.###.#.#######.#',
    '#.#...#.....#.......#.#',
    '#.#.K.#.~~G~~..J....#.#',
    '#.#...L.~~~~~..B..P.#.#',
    '#.###.#.~~~~~.###.###.#',
    '#.....#.~~J~~.#.......#',
    '#.###.#####.###.#####.#',
    '#.#...#...K...#.....#.#',
    '#.#.D.#.~~G~~.#.L...#.#',
    '#.#...L.~~~~~.#..K..#.#',
    '#.###.#.~~~~~.#.....#.#',
    '#..B..#.~~J~~.#####.###',
    '###.###.............#.#',
    '#...~~~~..G..~~~~.P.#.#',
    '#.K.~~~~.....~~~~...#.#',
    '#...~~~~J...J~~~~.B.#.#',
    '#.#####.#####.#####.#.#',
    '#.....#...K...#.....#.#',
    '#.L...###...###.T...L.#',
    '#.......T...T........X#',
    '#######################',
  ],

  // Chapter 4: Giant Underground Cavern Arena — Sword Boss Duel vs. Saigomo
  4: [
    '#######################',
    '###..~...........~..###',
    '##..J....W...W....J..##',
    '#..~~~...........~~~..#',
    '#..~~~..#.....#..~~~..#',
    '#.......#.....#.......#',
    '#.D..W...........W..B.#',
    '#.....J...~~~...J.....#',
    '#........~~P~~........#',
    '#....#...~~~~~...#....#',
    '#....#....~~~....#P...#',
    '#..W...............W..#',
    '#.......J.....J.......#',
    '#....#...........#....#',
    '#....#...........#....#',
    '#.B...............D...#',
    '#.......#.....#.......#',
    '#..~~~..#.....#..~~~..#',
    '#..~~~...........~~~..#',
    '#...J.....S.......J...#',
    '##....~.........~....##',
    '###.......X.........###',
    '#######################',
  ],
};

const SOLID_CHARS = new Set(['#', 'F', 'O', 'G', 'J']);

const FIXED_PROP_SPOTS: Record<number, Array<{ gx: number; gz: number }>> = {
  1: [
    { gx: 5, gz: 7 },
    { gx: 13, gz: 7 },
  ],
  2: [
    { gx: 9, gz: 8 },
    { gx: 13, gz: 8 },
    { gx: 9, gz: 13 },
    { gx: 13, gz: 13 },
    { gx: 19, gz: 8 },
    { gx: 19, gz: 19 },
  ],
  3: [
    { gx: 7, gz: 5 },
    { gx: 15, gz: 5 },
    { gx: 7, gz: 16 },
    { gx: 15, gz: 16 },
  ],
  4: [
    { gx: 7, gz: 5 },
    { gx: 15, gz: 5 },
    { gx: 7, gz: 16 },
    { gx: 15, gz: 16 },
  ],
};

function keyOf(gx: number, gz: number): string {
  return `${gx},${gz}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function computeBfsDistances(
  sx: number,
  sz: number,
  cells: string[][],
  width: number,
  height: number
): Int16Array {
  const total = width * height;
  const dist = new Int16Array(total).fill(-1);
  const queue = new Int16Array(total);
  let head = 0;
  let tail = 0;
  const startIdx = sz * width + sx;
  dist[startIdx] = 0;
  queue[tail++] = startIdx;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const cz = (curr - cx) / width;
    const nextD = dist[curr] + 1;

    for (let i = 0; i < 4; i++) {
      const nx = cx + dirs[i][0];
      const nz = cz + dirs[i][1];
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      if (SOLID_CHARS.has(cells[nz][nx])) continue;
      const nIdx = nz * width + nx;
      if (dist[nIdx] !== -1) continue;
      dist[nIdx] = nextD;
      queue[tail++] = nIdx;
    }
  }

  return dist;
}

export function parseChapterMap(chapterId: number): ChapterMapData {
  const rows = RAW_MAPS[chapterId] || RAW_MAPS[1];
  const height = rows.length;
  const width = rows[0].length;
  const cells: string[][] = rows.map((r) => r.split(''));

  let playerStart = { gx: 1, gz: 1 };
  let exitTile = { gx: width - 2, gz: height - 2 };
  let mainCount = 0;
  let batteryCount = 0;
  let diaryCount = 0;

  const lanterns: ChapterMapData['lanterns'] = [];
  const monsterSpawns: ChapterMapData['monsterSpawns'] = [];
  const desks: ChapterMapData['desks'] = [];
  const lockers: ChapterMapData['lockers'] = [];
  const chalkboards: ChapterMapData['chalkboards'] = [];
  const exitSigns: ChapterMapData['exitSigns'] = [];
  const toriiArches: ChapterMapData['toriiArches'] = [];
  const spiderWebs: ChapterMapData['spiderWebs'] = [];
  const sacredTrees: ChapterMapData['sacredTrees'] = [];
  const stoneToros: ChapterMapData['stoneToros'] = [];
  const waterTiles: ChapterMapData['waterTiles'] = [];
  const walkableTiles: ChapterMapData['walkableTiles'] = [];
  const reservedSet = new Set<string>();

  (FIXED_PROP_SPOTS[chapterId] || []).forEach((sp) => {
    reservedSet.add(keyOf(sp.gx, sp.gz));
  });

  const mainItemKind: 'key' | 'ofuda' | 'butterfly' | 'seal' =
    chapterId === 1
      ? 'key'
      : chapterId === 2
        ? 'ofuda'
        : chapterId === 3
          ? 'butterfly'
          : 'seal';

  for (let gz = 0; gz < height; gz++) {
    for (let gx = 0; gx < width; gx++) {
      const ch = cells[gz][gx];

      if (ch === 'F') {
        desks.push({ gx, gz });
        continue;
      }
      if (ch === 'O') {
        lockers.push({ gx, gz });
        continue;
      }
      if (ch === 'G') {
        sacredTrees.push({ gx, gz });
        continue;
      }
      if (ch === 'J') {
        stoneToros.push({ gx, gz });
        continue;
      }
      if (ch === '#') continue;

      walkableTiles.push({ gx, gz });

      if (ch === 'S') {
        playerStart = { gx, gz };
        reservedSet.add(keyOf(gx, gz));
      } else if (ch === 'X') {
        exitTile = { gx, gz };
        reservedSet.add(keyOf(gx, gz));
      } else if (ch === 'K') {
        mainCount++;
        cells[gz][gx] = '.';
      } else if (ch === 'B') {
        batteryCount++;
        cells[gz][gx] = '.';
      } else if (ch === 'D') {
        diaryCount++;
        cells[gz][gx] = '.';
      } else if (ch === 'L') {
        lanterns.push({ gx, gz });
        reservedSet.add(keyOf(gx, gz));
      } else if (ch === 'P') {
        monsterSpawns.push({ gx, gz });
        reservedSet.add(keyOf(gx, gz));
      } else if (ch === 'C') {
        chalkboards.push({ gx, gz });
        reservedSet.add(keyOf(gx, gz));
      } else if (ch === 'E') {
        exitSigns.push({ gx, gz });
        reservedSet.add(keyOf(gx, gz));
      } else if (ch === 'T') {
        toriiArches.push({ gx, gz });
        reservedSet.add(keyOf(gx, gz));
      } else if (ch === 'W') {
        spiderWebs.push({ gx, gz });
        reservedSet.add(keyOf(gx, gz));
      } else if (ch === '~') {
        waterTiles.push({ gx, gz });
        reservedSet.add(keyOf(gx, gz));
      }
    }
  }

  // Protect buffer tiles around start and exit
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      reservedSet.add(keyOf(playerStart.gx + dx, playerStart.gz + dz));
      reservedSet.add(keyOf(exitTile.gx + dx, exitTile.gz + dz));
    }
  }

  // Randomize all collectible item placements on every game start / restart
  const distFromStart = computeBfsDistances(playerStart.gx, playerStart.gz, cells, width, height);
  const eligibleTiles = walkableTiles.filter((t) => {
    const d = distFromStart[t.gz * width + t.gx];
    if (d < 3) return false;
    if (t.gx === playerStart.gx && t.gz === playerStart.gz) return false;
    if (t.gx === exitTile.gx && t.gz === exitTile.gz) return false;
    if (Math.abs(t.gx - exitTile.gx) <= 1 && Math.abs(t.gz - exitTile.gz) <= 1) return false;
    if (monsterSpawns.some((m) => m.gx === t.gx && m.gz === t.gz)) return false;
    if ((FIXED_PROP_SPOTS[chapterId] || []).some((p) => p.gx === t.gx && p.gz === t.gz)) return false;
    return true;
  });

  const usedItemKeys = new Set<string>();
  const pickedItems: ChapterMapData['items'] = [];

  const pickRandomSlots = (
    count: number,
    kind: 'key' | 'ofuda' | 'butterfly' | 'seal' | 'battery' | 'diary',
    minStartDist: number,
    minSpacing: number
  ) => {
    let placed = 0;
    let spacing = minSpacing;
    let startDist = minStartDist;

    while (placed < count && spacing >= 0) {
      const pool = shuffleArray(
        eligibleTiles.filter(
          (t) =>
            !usedItemKeys.has(keyOf(t.gx, t.gz)) &&
            distFromStart[t.gz * width + t.gx] >= startDist
        )
      );

      for (const candidate of pool) {
        if (placed >= count) break;
        const tooClose = pickedItems.some(
          (existing) => Math.hypot(existing.gx - candidate.gx, existing.gz - candidate.gz) < spacing
        );
        if (!tooClose) {
          usedItemKeys.add(keyOf(candidate.gx, candidate.gz));
          pickedItems.push({ gx: candidate.gx, gz: candidate.gz, kind });
          placed++;
        }
      }
      spacing -= 1.2;
      startDist = Math.max(3, startDist - 2);
    }
  };

  pickRandomSlots(mainCount, mainItemKind, 7, 4.2);
  pickRandomSlots(batteryCount, 'battery', 4, 3.0);
  pickRandomSlots(diaryCount, 'diary', 4, 3.0);

  // Protect randomized item tiles so silent maze walls never cover collectibles
  pickedItems.forEach((it) => {
    reservedSet.add(keyOf(it.gx, it.gz));
  });

  // Collect interior corridor/wall tiles eligible for silent 5-second maze shifts (Ch.1-3 mazes only; Ch.4 is an open cave boss arena)
  const shiftCandidates: Array<{ gx: number; gz: number }> = [];
  if (chapterId !== 4) {
    for (let gz = 1; gz < height - 1; gz++) {
      for (let gx = 1; gx < width - 1; gx++) {
        const ch = cells[gz][gx];
        if ((ch === '#' || ch === '.') && !reservedSet.has(keyOf(gx, gz))) {
          shiftCandidates.push({ gx, gz });
        }
      }
    }
  }

  return {
    id: chapterId,
    width,
    height,
    grid: rows,
    cells,
    playerStart,
    exitTile,
    items: pickedItems,
    lanterns,
    monsterSpawns,
    desks,
    lockers,
    chalkboards,
    exitSigns,
    toriiArches,
    spiderWebs,
    sacredTrees,
    stoneToros,
    waterTiles,
    walkableTiles,
    shiftCandidates,
  };
}

export function gridToWorld(gx: number, gz: number, map: ChapterMapData): { x: number; z: number } {
  const offsetX = -(map.width * TILE_SIZE) / 2 + TILE_SIZE / 2;
  const offsetZ = -(map.height * TILE_SIZE) / 2 + TILE_SIZE / 2;
  return {
    x: gx * TILE_SIZE + offsetX,
    z: gz * TILE_SIZE + offsetZ,
  };
}

export function worldToGrid(x: number, z: number, map: ChapterMapData): { gx: number; gz: number } {
  const offsetX = -(map.width * TILE_SIZE) / 2 + TILE_SIZE / 2;
  const offsetZ = -(map.height * TILE_SIZE) / 2 + TILE_SIZE / 2;
  return {
    gx: Math.round((x - offsetX) / TILE_SIZE),
    gz: Math.round((z - offsetZ) / TILE_SIZE),
  };
}

export function isWall(gx: number, gz: number, map: ChapterMapData): boolean {
  if (gx < 0 || gz < 0 || gx >= map.width || gz >= map.height) return true;
  return SOLID_CHARS.has(map.cells[gz][gx]);
}

export function canReachAllTargets(
  sx: number,
  sz: number,
  targets: Array<{ gx: number; gz: number }>,
  map: ChapterMapData
): boolean {
  if (isWall(sx, sz, map)) return false;
  const total = map.width * map.height;
  const visited = new Uint8Array(total);
  const queue = new Int16Array(total);
  let head = 0;
  let tail = 0;
  const startIdx = sz * map.width + sx;
  visited[startIdx] = 1;
  queue[tail++] = startIdx;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % map.width;
    const cz = (curr - cx) / map.width;

    for (let i = 0; i < 4; i++) {
      const nx = cx + dirs[i][0];
      const nz = cz + dirs[i][1];
      if (isWall(nx, nz, map)) continue;
      const nIdx = nz * map.width + nx;
      if (visited[nIdx]) continue;
      visited[nIdx] = 1;
      queue[tail++] = nIdx;
    }
  }

  for (const t of targets) {
    if (isWall(t.gx, t.gz, map)) return false;
    if (!visited[t.gz * map.width + t.gx]) return false;
  }
  return true;
}

// Fast grid BFS returning the next grid coordinate from (sx, sz) toward (tx, tz)
export function findNextStepBFS(
  sx: number,
  sz: number,
  tx: number,
  tz: number,
  map: ChapterMapData
): { gx: number; gz: number } {
  if (sx === tx && sz === tz) return { gx: tx, gz: tz };

  const total = map.width * map.height;
  const visited = new Uint8Array(total);
  const parent = new Int16Array(total).fill(-1);
  const queue = new Int16Array(total);

  const startIdx = sz * map.width + sx;
  const targetIdx = tz * map.width + tx;
  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;
  visited[startIdx] = 1;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let found = false;
  while (head < tail) {
    const curr = queue[head++];
    if (curr === targetIdx) {
      found = true;
      break;
    }
    const cx = curr % map.width;
    const cz = (curr - cx) / map.width;

    for (let i = 0; i < 4; i++) {
      const nx = cx + dirs[i][0];
      const nz = cz + dirs[i][1];
      if (isWall(nx, nz, map)) continue;
      const nIdx = nz * map.width + nx;
      if (visited[nIdx]) continue;
      visited[nIdx] = 1;
      parent[nIdx] = curr;
      queue[tail++] = nIdx;
    }
  }

  if (!found) return { gx: sx, gz: sz };

  let step = targetIdx;
  while (parent[step] !== -1 && parent[step] !== startIdx) {
    step = parent[step];
  }
  const rx = step % map.width;
  const rz = (step - rx) / map.width;
  return { gx: rx, gz: rz };
}

export function hasLineOfSight(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  map: ChapterMapData
): boolean {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const dist = Math.hypot(dx, dz);
  const steps = Math.ceil(dist / 0.65);
  if (steps <= 1) return true;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const pz = z1 + dz * t;
    const { gx, gz } = worldToGrid(px, pz, map);
    if (isWall(gx, gz, map)) return false;
  }
  return true;
}
