import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GridCanvas, pixelToCell } from '../components/GridCanvas';
import { HoverCard } from '../components/HoverCard';
import { ProjectPanel } from '../components/ProjectPanel';
import { useGridPoll } from '../hooks/useGridPoll';
import { useAuth } from '../hooks/useAuth';
import type { GridCell } from '../types/api';
import './GridPage.css';

export default function GridPage() {
  const { isLoggedIn } = useAuth();
  const { data: snapshot, isLoading, isError } = useGridPoll();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<GridCell | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const cellMap = useMemo(() => {
    const map = new Map<string, GridCell>();
    for (const cell of snapshot?.cells ?? []) map.set(`${cell.x},${cell.y}`, cell);
    return map;
  }, [snapshot]);

  const selectCell = useCallback((clientX: number, clientY: number, wrapper: HTMLDivElement) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const scaleX = canvasRef.current.width / canvasRect.width;
    const scaleY = canvasRef.current.height / canvasRect.height;
    const cell = pixelToCell((clientX - canvasRect.left) * scaleX, (clientY - canvasRect.top) * scaleY);
    if (!cell) return setHoveredCell(null);
    const cellData = cellMap.get(`${cell.x},${cell.y}`) ?? null;
    setHoveredCell(cellData);
    setHoverPos({ x: clientX - wrapperRect.left, y: clientY - wrapperRect.top });
  }, [cellMap]);

  return (
    <main className="grid-page page-container">
      <section className="grid-page__intro">
        <div>
          <p className="eyebrow">Live territory</p>
          <h1>The Grid</h1>
          <p>Every cell belongs to a project fighting for momentum and lifespan.</p>
        </div>
        <Link to="/explore" className="btn btn--outline">Explore projects</Link>
      </section>

      <div className="grid-page__layout">
        <section className="grid-page__stage" aria-label="Project grid">
          {isLoading && <div className="page-message">Loading Grid...</div>}
          {isError && <div className="page-message page-message--error">Grid is unavailable. Retrying...</div>}
          {!isLoading && !isError && (
            <div
              className="grid-outer"
              onMouseMove={event => selectCell(event.clientX, event.clientY, event.currentTarget)}
              onMouseLeave={() => setHoveredCell(null)}
              onClick={event => selectCell(event.clientX, event.clientY, event.currentTarget)}
            >
              <GridCanvas canvasRef={canvasRef} snapshot={snapshot} />
              {hoveredCell && <HoverCard cell={hoveredCell} canvasX={hoverPos.x} canvasY={hoverPos.y} />}
            </div>
          )}
        </section>
        {isLoggedIn && <ProjectPanel />}
      </div>
    </main>
  );
}
