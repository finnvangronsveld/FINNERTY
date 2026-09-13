export function OrbitArt({ className = '' }: { className?: string }) {
  return (
    <div className={`orbit-art ${className}`} aria-hidden="true">
      <picture>
        <source media="(max-width: 600px)" srcSet="/art/frost-orbit-small.webp" />
        <img src="/art/frost-orbit.webp" alt="" width="1440" height="960" fetchPriority="high" />
      </picture>
    </div>
  );
}
