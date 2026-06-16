import './SkeletonCard.css';

/** Loading placeholder shaped like a ProjectCard — keeps layout stable
 *  while the feed loads, instead of a bare spinner. */
export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden>
      <div className="skeleton-card__art shimmer" />
      <div className="skeleton-card__body">
        <div className="skeleton-line shimmer" style={{ width: '55%', height: 18 }} />
        <div className="skeleton-line shimmer" style={{ width: '90%' }} />
        <div className="skeleton-line shimmer" style={{ width: '80%' }} />
        <div className="skeleton-card__tags">
          <span className="skeleton-pill shimmer" />
          <span className="skeleton-pill shimmer" />
          <span className="skeleton-pill shimmer" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return <>{Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}</>;
}
