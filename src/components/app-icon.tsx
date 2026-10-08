import type { Icon } from '@phosphor-icons/react';

/** Glossy 2010s app icon: colored tile, curved highlight, embossed glyph. */
export function AppIcon({
  Icon,
  from,
  to,
  size = 'md',
}: {
  Icon: Icon;
  from: string;
  to: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  return (
    <span
      className={`appicon appicon--${size}`}
      style={{ '--from': from, '--to': to } as React.CSSProperties}
      aria-hidden
    >
      <Icon className="appicon__glyph" weight="fill" />
      <span className="appicon__gloss" />
    </span>
  );
}
