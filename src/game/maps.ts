export const TILE_SIZE = 3.2;
export const WALL_HEIGHT = 3.6;

export interface ChapterMapData {
  id: number;
  width: number;
  height: number;
  grid: string[];
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

  // Chapter 4: Twisted House, Blood Swamp & Saigomo's Spider Lair (Kintoru Finale)
  4: [
    '#######################',
    '#S.T.T.T.T.L...#..K..D#',
    '#.#####.###.###.#.....#',
    '#T#...#...#...#.#..J..#',
    '#.#.K.#...#...#.#.....#',
    '#T#...L.B.#.D.L.#.....#',
    '#.###.#####.#####.###.#',
    '#T#...~~~~~~~~~~~...#.#',
    '#.#.J.~~~~~~~~~~~.J.#.#',
    '#T#...~~~~J~J~~~~...#.#',
    '#.#.P.~~~~~~~P~~~.K.#.#',
    '#L....~~~~JGJ~~~~....L#',
    '#.#.W.~~~~~~~~~~~.W.#.#',
    '#.#.K.~~~~J~J~~~~...#.#',
    '#.#...~~~~~~~~~~~.J.#.#',
    '#.###.#####.#####.###.#',
    '#W.B..#...L.....#..W..#',
    '#.###.#.#######.#.###.#',
    '#.#K..#...#B..#.#..K#.#',
    '#.#.W.L...#...L.#.W.#.#',
    '#.#####.###.###.###.#.#',
    '#....T..T..K..T..T...X#',
    '#######################',
  ],
};

const SOLID_CHARS = new Set(['#', 'F', 'O', 'G', 'J']);

export function parseChapterMap(chapterId: number): ChapterMapData {
  const rows = RAW_MAPS[chapterId] || RAW_MAPS[1];
  const height = rows.length;
  const width = rows[0].length;

  let playerStart = { gx: 1, gz: 1 };
  let exitTile = { gx: width - 2, gz: height - 2 };
  const items: ChapterMapData['items'] = [];
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
      const ch = rows[gz][gx];

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

      if (ch === 'S') playerStart = { gx, gz };
      else if (ch === 'X') exitTile = { gx, gz };
      else if (ch === 'K') items.push({ gx, gz, kind: mainItemKind });
      else if (ch === 'B') items.push({ gx, gz, kind: 'battery' });
      else if (ch === 'D') items.push({ gx, gz, kind: 'diary' });
      else if (ch === 'L') lanterns.push({ gx, gz });
      else if (ch === 'P') monsterSpawns.push({ gx, gz });
      else if (ch === 'C') chalkboards.push({ gx, gz });
      else if (ch === 'E') exitSigns.push({ gx, gz });
      else if (ch === 'T') toriiArches.push({ gx, gz });
      else if (ch === 'W') spiderWebs.push({ gx, gz });
      else if (ch === '~') waterTiles.push({ gx, gz });
    }
  }

  return {
    id: chapterId,
    width,
    height,
    grid: rows,
    playerStart,
    exitTile,
    items,
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
  return SOLID_CHARS.has(map.grid[gz][gx]);
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
