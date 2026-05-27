import './CrowLogo.css';

export function CrowLogo() {
  return (
    <a href="/" className="crow-logo" aria-label="Crow — Digital Darwinism">
      <div className="crow-logo__img-wrap">
        <img
          src="/logo.png"
          alt=""
          className="crow-logo__img"
          aria-hidden
        />
      </div>
      <div className="crow-logo__text">
        <span className="crow-logo__name">crow.gg</span>
        <span className="crow-logo__tagline">Digital Darwinism</span>
      </div>
    </a>
  );
}
