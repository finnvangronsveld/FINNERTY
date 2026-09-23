import type { GameId } from '@/lib/vault';

/** Shared decorative vector artwork; the surrounding link names the game. */
export function GameArt({ game }: { game: GameId }) {
  return (
    <svg className={`game-art art-${game}`} viewBox="0 0 240 160" fill="none" aria-hidden="true">
      {game === 'coinflip' && (
        <>
          <ellipse cx="125" cy="139" rx="57" ry="5" fill="currentColor" opacity=".12" />
          <g transform="translate(120 78) rotate(-18)">
            <circle r="58" fill="var(--art-paper)" stroke="currentColor" strokeWidth="3" />
            <circle r="47" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
            <path d="M-18-29H25V-16H-3V-4H19V9H-3V30H-18Z" fill="currentColor" />
          </g>
          <path
            d="m38 30 8 5m-14 9 11 1m145 58 9 5m-12 5 5 9"
            stroke="currentColor"
            strokeWidth="2"
          />
        </>
      )}
      {game === 'dice' && (
        <>
          <g transform="translate(120 80) rotate(16)">
            <rect
              x="-52"
              y="-52"
              width="104"
              height="104"
              rx="15"
              fill="var(--art-paper)"
              stroke="currentColor"
              strokeWidth="3"
            />
            {[
              [-27, -27],
              [27, -27],
              [0, 0],
              [-27, 27],
              [27, 27],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="8" fill="currentColor" />
            ))}
          </g>
          <path
            d="m33 54 12 4m-14 8 11 1m152 42 11 4m-18 7 6 9"
            stroke="currentColor"
            strokeWidth="2"
          />
        </>
      )}
      {game === 'slots' && (
        <>
          <rect
            x="24"
            y="30"
            width="192"
            height="102"
            rx="9"
            fill="var(--art-paper)"
            stroke="currentColor"
            strokeWidth="3"
          />
          {[32, 92, 152].map((x, i) => (
            <g key={x}>
              <rect
                x={x}
                y="38"
                width="56"
                height="86"
                rx="3"
                stroke="currentColor"
                opacity=".25"
              />
              <text
                x={x + 28}
                y="103"
                fill="currentColor"
                textAnchor="middle"
                fontSize="61"
                fontWeight="800"
                fontFamily="var(--display)"
              >
                {i === 1 ? 'F' : '7'}
              </text>
            </g>
          ))}
          <path d="M16 81h208" stroke="var(--accent)" strokeWidth="2" />
        </>
      )}
      {game === 'roulette' && (
        <>
          <circle
            cx="120"
            cy="82"
            r="61"
            fill="var(--art-paper)"
            stroke="currentColor"
            strokeWidth="3"
          />
          {Array.from({ length: 16 }, (_, i) => (
            <path
              key={i}
              d="M120 82 98.6 30.3A56 56 0 0 1 120 26Z"
              fill={i % 2 ? 'currentColor' : 'var(--accent)'}
              transform={`rotate(${i * 22.5} 120 82)`}
            />
          ))}
          <circle
            cx="120"
            cy="82"
            r="35"
            fill="var(--art-paper)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M107 63h29v9h-19v8h15v9h-15v14h-10Z" fill="currentColor" />
          <circle
            cx="141"
            cy="42"
            r="5"
            fill="var(--art-paper)"
            stroke="currentColor"
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  );
}

export function VaultPoster() {
  return (
    <div className="poster-objects" aria-hidden="true">
      <div className="poster-card card-back">
        <span>FINNERTY</span>
        <b>F</b>
        <span>PLAY FOR THE CREW</span>
      </div>
      <div className="poster-card card-front">
        <span>
          F<span>✳</span>
        </span>
        <b>✳</b>
        <span>THE VAULT</span>
      </div>
      <span className="poster-stamp">
        ALLEEN
        <br />
        VOOR DE EER.
      </span>
    </div>
  );
}
