import { describe, it, expect } from 'vitest';
import { cellToPixel, pixelToCell, getCellColor, CELL_SIZE, STEP } from '../GridCanvas';
import type { GridCell } from '../../types/api';

describe('cellToPixel', () => {
  it('maps (0,0) to pixel origin', () => {
    expect(cellToPixel(0, 0)).toEqual({ px: 0, py: 0 });
  });
  it('maps (1,0) one STEP right', () => {
    expect(cellToPixel(1, 0)).toEqual({ px: STEP, py: 0 });
  });
  it('maps (0,1) one STEP down', () => {
    expect(cellToPixel(0, 1)).toEqual({ px: 0, py: STEP });
  });
  it('maps (59,59) to last cell', () => {
    expect(cellToPixel(59, 59)).toEqual({ px: 59 * STEP, py: 59 * STEP });
  });
});

describe('pixelToCell', () => {
  it('maps pixel (0,0) to cell (0,0)', () => {
    expect(pixelToCell(0, 0)).toEqual({ x: 0, y: 0 });
  });
  it('maps pixel (STEP, 0) to cell (1,0)', () => {
    expect(pixelToCell(STEP, 0)).toEqual({ x: 1, y: 0 });
  });
  it('returns null for gap pixels (px % STEP === CELL_SIZE)', () => {
    expect(pixelToCell(CELL_SIZE, 0)).toBeNull();
  });
  it('returns null for negative coordinates', () => {
    expect(pixelToCell(-1, 0)).toBeNull();
  });
  it('returns null beyond grid boundary', () => {
    expect(pixelToCell(60 * STEP, 0)).toBeNull();
  });
});

describe('getCellColor', () => {
  const cell = (state: GridCell['state'], color: string | null): GridCell => ({
    x: 0, y: 0, state, project_id: color ? 'id' : null, color,
  });

  it('returns arena void color for empty cells', () => {
    expect(getCellColor(cell('empty', null))).toBe('#241a17');
  });
  it('returns etched stone for fossil cells regardless of project color', () => {
    expect(getCellColor(cell('fossil', '#ac3509'))).toBe('#3a2c26');
  });
  it('returns project color for alive cells', () => {
    expect(getCellColor(cell('alive', '#ac3509'))).toBe('#ac3509');
  });
  it('returns project color for dying cells', () => {
    expect(getCellColor(cell('dying', '#006a63'))).toBe('#006a63');
  });
  it('returns fallback color when alive cell has no color', () => {
    expect(getCellColor(cell('alive', null))).toBe('#888888');
  });
});
