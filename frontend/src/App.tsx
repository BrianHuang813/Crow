import { useState, useCallback, useMemo, useRef } from 'react';
import { GridCanvas, pixelToCell } from './components/GridCanvas';
import { HoverCard } from './components/HoverCard';
import { LoginButton } from './components/LoginButton';
import { AuthCallback } from './components/AuthCallback';
import { useGridPoll } from './hooks/useGridPoll';
import { useAuth } from './hooks/useAuth';
import type { GridCell } from './types/api';

export default function App() {
  const { isLoggedIn, credits } = useAuth();
  const { data: snapshot, isLoading, isError } = useGridPoll();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<GridCell | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const isCallbackPage = window.location.pathname === '/auth/callback';
  if (isCallbackPage) return <AuthCallback />;

  const cellMap = useMemo(() => {
    const m = new Map<string, GridCell>();
    for (const c of snapshot?.cells ?? []) m.set(`${c.x},${c.y}`, c);
    return m;
  }, [snapshot]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const wrapperRect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - canvasRect.left;
      const py = e.clientY - canvasRect.top;
      const cell = pixelToCell(px, py);
      if (cell) {
        const cellData = cellMap.get(`${cell.x},${cell.y}`);
        if (cellData) {
          setHoveredCell(cellData);
          setHoverPos({ x: e.clientX - wrapperRect.left, y: e.clientY - wrapperRect.top });
        }
      }
    },
    [cellMap]
  );

  const handleMouseLeave = useCallback(() => setHoveredCell(null), []);

  return (
    <div className="app">
      <header className="header">
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 24 }}>🐦 crow.gg</span>
        <nav className="header-nav">
          {isLoggedIn && <span className="credits-display">₵ {credits}</span>}
          <LoginButton />
        </nav>
      </header>
      <main className="main">
        {isLoading && <p className="grid-status">LOADING GRID...</p>}
        {isError && <p className="grid-status grid-status--error">GRID OFFLINE — retrying...</p>}
        {!isLoading && !isError && (
          <div className="grid-outer" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            <GridCanvas canvasRef={canvasRef} snapshot={snapshot} />
            {hoveredCell && (
              <HoverCard cell={hoveredCell} canvasX={hoverPos.x} canvasY={hoverPos.y} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
