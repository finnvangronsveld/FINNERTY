'use client';
import { FileText, Globe, HardDrives, Image as ImageIcon, TwitchLogo, YoutubeLogo } from '@phosphor-icons/react';
import { AppIcon } from '@/components/app-icon';
import { APPS, AppId } from './apps';
import { useOS } from './store';

type Kind = 'folder' | 'text' | 'image' | 'link' | 'drive' | 'app';

/** Glossy file-system icons: blue folders, paper documents, a drive, web links. */
export function FileIcon({ kind, name, size = 48, content }: { kind: Kind; name: string; size?: number; content?: string }) {
  const avatar = useOS((s) => s.avatar);
  const style = { '--s': `${size}px` } as React.CSSProperties;

  if (kind === 'folder') {
    const special = name === 'Trash' ? 'trash' : undefined;
    return (
      <span className="ficon ficon--folder" data-special={special} style={style} aria-hidden>
        <span className="ficon__tab" />
        <span className="ficon__body" />
      </span>
    );
  }
  if (kind === 'app' && content && content in APPS) {
    const a = APPS[content as AppId];
    return (
      <span className="ficon ficon--app" style={style} aria-hidden>
        <AppIcon Icon={a.Icon} from={a.from} to={a.to} />
      </span>
    );
  }
  if (kind === 'drive') {
    return (
      <span className="ficon ficon--drive" style={style} aria-hidden>
        <HardDrives weight="duotone" />
      </span>
    );
  }
  if (kind === 'image') {
    const src = content === 'avatar' ? avatar : content;
    return (
      <span className="ficon ficon--image" style={style} aria-hidden>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" />
        ) : (
          <ImageIcon weight="duotone" />
        )}
      </span>
    );
  }
  if (kind === 'link') {
    const Glyph = /twitch/i.test(name) ? TwitchLogo : /youtube/i.test(name) ? YoutubeLogo : Globe;
    return (
      <span className="ficon ficon--link" style={style} aria-hidden>
        <Glyph weight="fill" />
      </span>
    );
  }
  return (
    <span className="ficon ficon--doc" style={style} aria-hidden>
      <FileText weight="light" />
    </span>
  );
}
