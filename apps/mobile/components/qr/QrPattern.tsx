import { useMemo } from 'react';
import { View } from 'react-native';

/**
 * Decorative QR pattern (NOT scannable). 21×21 grid with the three corner
 * finder squares + pseudo-random fill, seeded so the pattern stays stable
 * within a single render but changes on refresh.
 */
const SIZE = 21;
const FINDER_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, SIZE - 7],
  [SIZE - 7, 0],
];

function inFinderZone(r: number, c: number): boolean {
  for (const [fr, fc] of FINDER_CORNERS) {
    if (r >= fr && r < fr + 8 && c >= fc && c < fc + 8) return true;
  }
  return false;
}

function buildFinder(matrix: boolean[][], anchorR: number, anchorC: number): void {
  for (let dr = 0; dr < 7; dr++) {
    for (let dc = 0; dc < 7; dc++) {
      const isEdge = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const isCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      matrix[anchorR + dr]![anchorC + dc] = isEdge || isCore;
    }
  }
}

function generateMatrix(seed: number): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  for (const [fr, fc] of FINDER_CORNERS) buildFinder(matrix, fr, fc);

  // Seeded LCG
  let s = (seed * 2654435761) >>> 0 || 1;
  const rng = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (inFinderZone(r, c)) continue;
      matrix[r]![c] = rng() > 0.5;
    }
  }
  // Timing patterns along row 6 / col 6 between the finders
  for (let i = 7; i < SIZE - 7; i++) {
    matrix[6]![i] = i % 2 === 0;
    matrix[i]![6] = i % 2 === 0;
  }
  return matrix;
}

interface Props {
  seed: number;
  /** Total side length of the rendered QR in pts. */
  size: number;
  brightness?: boolean;
}

export function QrPattern({ seed, size, brightness = false }: Props) {
  const matrix = useMemo(() => generateMatrix(seed), [seed]);
  const cell = size / SIZE;
  const dark = brightness ? '#000' : '#0F172A';
  const light = brightness ? '#FFFFFF' : '#FFFFFF';

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: light,
        padding: cell,
        borderRadius: 12,
      }}
    >
      {matrix.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', height: cell }}>
          {row.map((on, c) => (
            <View
              key={c}
              style={{
                width: cell,
                height: cell,
                backgroundColor: on ? dark : light,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
