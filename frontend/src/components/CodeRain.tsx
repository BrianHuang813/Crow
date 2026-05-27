import './CodeRain.css';

const SYMBOLS = ['</>', '{}', '//', '=>', '[]', '&&', '()', '||', '~~', '##'];
const COUNT = 22;

const drops = Array.from({ length: COUNT }, (_, i) => ({
  symbol: SYMBOLS[i % SYMBOLS.length],
  left: ((i / COUNT) * 98 + 1).toFixed(1),
  delay: -((i / COUNT) * 14).toFixed(2),
  duration: (7 + (i % 5)).toFixed(1),
  fontSize: 10 + (i % 7) * 2,
  opacity: 0.12 + (i % 4) * 0.05,
}));

export function CodeRain() {
  return (
    <div className="code-rain" aria-hidden>
      {drops.map((drop, i) => (
        <span
          key={i}
          className="code-rain__drop"
          style={{
            left: `${drop.left}vw`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
            fontSize: drop.fontSize,
            opacity: drop.opacity,
          }}
        >
          {drop.symbol}
        </span>
      ))}
    </div>
  );
}
