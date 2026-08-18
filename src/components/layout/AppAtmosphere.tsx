export function AppAtmosphere() {
  return (
    <div className="app-atmosphere" aria-hidden="true">
      <picture>
        <source
          media="(min-width: 768px)"
          srcSet="/backgrounds/poker-salon-desktop.webp"
          type="image/webp"
        />
        <img
          src="/backgrounds/poker-salon-mobile.webp"
          alt=""
          className="app-atmosphere__image"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <div className="app-atmosphere__overlay" />
      <div className="app-atmosphere__grain" />
    </div>
  );
}
