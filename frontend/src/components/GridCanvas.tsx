import { useEffect } from 'react';
import type { GridCell, GridSnapshot } from '../types/api';
import './GridCanvas.css';

// Canvas geometry constants (exported for tests and parent components)
export const CELL_SIZE = 12;
export const GAP = 1;
export const STEP = CELL_SIZE + GAP; // 13
export const CANVAS_SIZE = 60 * STEP; // 780

export function cellToPixel(x: number, y: number): { px: number; py: number } {
  return { px: x * STEP, py: y * STEP };
}

export function pixelToCell(
  px: number,
  py: number
): { x: number; y: number } | null {
  if (px < 0 || py < 0) return null;
  const cx = Math.floor(px / STEP);
  const cy = Math.floor(py / STEP);
  if (cx >= 60 || cy >= 60) return null;
  if (px % STEP >= CELL_SIZE || py % STEP >= CELL_SIZE) return null;
  return { x: cx, y: cy };
}

export function getCellColor(cell: GridCell): string {
  if (cell.state === 'empty') return '#241a17';   // arena void
  if (cell.state === 'fossil') return '#3a2c26';  // etched stone
  return cell.color ?? '#888888';
}

function drawGrid(ctx: CanvasRenderingContext2D, cells: GridCell[]): void {
  ctx.fillStyle = '#120c0a'; // arena gap lines — cells read as lit territory
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  for (const cell of cells) {
    const { px, py } = cellToPixel(cell.x, cell.y);
    const live = cell.state === 'alive' || cell.state === 'dying';
    ctx.globalAlpha = cell.state === 'dying' ? 0.5 : 1;
    ctx.fillStyle = getCellColor(cell);
    // Claimed, living cells glow by their owner's color.
    if (live) {
      ctx.shadowColor = getCellColor(cell);
      ctx.shadowBlur = cell.state === 'dying' ? 2 : 5;
    }
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

interface Props {
  snapshot: GridSnapshot | undefined;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function GridCanvas({ snapshot, canvasRef }: Props) {
  const hasDying = snapshot?.cells.some(c => c.state === 'dying') ?? false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    drawGrid(ctx, snapshot.cells);
  }, [snapshot, canvasRef]);

  return (
    <div className={`grid-canvas-wrap${hasDying ? ' grid-canvas-wrap--dying' : ''}`}>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="grid-canvas"
      />
      {hasDying && <div className="dying-overlay" aria-hidden />}
    </div>
  );
}
