// Professional SVG crypto icons — no emoji, no external deps
// Each icon is an inline SVG with correct brand colors

interface Props {
  currency: string;
  size?: number;
  /** Override the background color (default: brand color bg) */
  bg?: boolean;
}

const META: Record<string, { bg: string; fg?: string }> = {
  btc:         { bg: '#f7931a' },
  eth:         { bg: '#627eea' },
  ltc:         { bg: '#bfbbbb' },
  trx:         { bg: '#ef0027' },
  bnb:         { bg: '#f3ba2f' },
  doge:        { bg: '#c2a633' },
  gram:        { bg: '#0088cc' },
  'usdt@trx':  { bg: '#26a17b' },
  'usdt@eth':  { bg: '#26a17b' },
  'usdt@bnb':  { bg: '#26a17b' },
  'usdt@ton':  { bg: '#26a17b' },
  'usdc@trx':  { bg: '#2775ca' },
  'usdc@eth':  { bg: '#2775ca' },
};

export function getCryptoBg(currency: string): string {
  return META[currency]?.bg ?? '#6366f1';
}

export default function CryptoIcon({ currency, size = 36, bg = true }: Props) {
  const color = META[currency]?.bg ?? '#6366f1';
  const inner = getInnerSvg(currency);
  const s = size;

  if (bg) {
    return (
      <div
        style={{
          width: s, height: s, borderRadius: s * 0.28,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width={s * 0.6} height={s * 0.6} viewBox="0 0 32 32">
          {inner}
        </svg>
      </div>
    );
  }

  return (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill={color} />
      {inner}
    </svg>
  );
}

function getInnerSvg(currency: string): JSX.Element {
  const c = currency.toLowerCase();

  if (c === 'btc') return (
    <>
      <circle cx="16" cy="16" r="16" fill="#F7931A"/>
      <path d="M22.5 14.2c.3-2-1.2-3-3.3-3.7l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.2l-2.2-.6-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8.9l-.8 3.3c0 .1.1.1.1.1-.1 0-.1 0-.2-.1l-1.2 4.6c-.1.2-.3.5-.7.4-0 .1-1.2-.3-1.2-.3L10 21.5l2.1.5c.4.1.8.2 1.2.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.2 1.3.3l-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.0-3.1-1.5-3.9 1-.3 1.8-1 2-2.6zm-3.6 5.1c-.5 2-3.9.9-5 .7l.9-3.5c1.1.3 4.6.8 4.1 2.8zm.5-5.1c-.5 1.8-3.4.9-4.3.7l.8-3.2c.9.2 3.9.7 3.5 2.5z" fill="white"/>
    </>
  );

  if (c === 'eth') return (
    <>
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="white" fillOpacity=".6"/>
      <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="white"/>
      <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="white" fillOpacity=".6"/>
      <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.379z" fill="white"/>
      <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="white" fillOpacity=".2"/>
      <path d="M9 16.22l7.498 4.353v-7.7L9 16.22z" fill="white" fillOpacity=".6"/>
    </>
  );

  if (c === 'ltc') return (
    <>
      <circle cx="16" cy="16" r="16" fill="#BFBBBB"/>
      <text x="9" y="22" fontSize="14" fontWeight="800" fill="white" fontFamily="Arial">Ł</text>
    </>
  );

  if (c === 'trx') return (
    <>
      <circle cx="16" cy="16" r="16" fill="#EF0027"/>
      <path d="M23.8 12.3L21 9.8l-11.8 2.1 8.4 13.4 6.2-13zm-7.4 10.1L11.2 14l9-1.6-4.8 10z" fill="white"/>
    </>
  );

  if (c === 'bnb') return (
    <>
      <circle cx="16" cy="16" r="16" fill="#F3BA2F"/>
      <path d="M12.2 13.9L16 10.1l3.8 3.8 2.2-2.2L16 6l-6 5.7 2.2 2.2zM6 16l2.2-2.2L10.4 16l-2.2 2.2L6 16zm6.2 2.1L16 21.9l3.8-3.8 2.2 2.2-6 5.7-6-5.7 2.2-2.2zm9.6-2.1l2.2-2.2 2.2 2.2-2.2 2.2-2.2-2.2zm-3.4 0L16 17.8l-2.4-1.8 2.4-2.4 2.4 2.4z" fill="white"/>
    </>
  );

  if (c === 'doge') return (
    <>
      <circle cx="16" cy="16" r="16" fill="#C2A633"/>
      <path d="M16 5C10 5 5.2 9.5 5 15h3.8c.7-3.9 4-6.8 7.8-6.8 2.3 0 4.4.9 5.9 2.4H18v3.3h6.9c0 .4.1.7.1 1.1 0 4.8-3.9 8.8-8.7 8.8-4.3 0-7.8-3-8.6-7H4.9C5.7 22.8 10.4 27 16 27c6 0 11-4.9 11-11S22 5 16 5z" fill="white"/>
    </>
  );

  if (c === 'gram') return (
    <>
      <circle cx="16" cy="16" r="16" fill="#0088CC"/>
      <path d="M8 13l8-5 8 5v6l-8 5-8-5v-6zm8 8l6-3.7V13l-6-3.7L10 13v4.3L16 21z" fill="white" fillOpacity=".9"/>
    </>
  );

  // USDT / USDC — show T or U depending on stablecoin
  if (c.startsWith('usdt')) {
    const networkColor = c.includes('@trx') ? '#ef0027' : c.includes('@eth') ? '#627eea' : c.includes('@bnb') ? '#f3ba2f' : '#0088cc';
    return (
      <>
        <circle cx="16" cy="16" r="16" fill="#26A17B"/>
        <path d="M17.5 15.7v0c-.1 0-.8.1-1.6.1s-1.5 0-1.6-.1c-3-.2-5.3-.9-5.3-1.7s2.3-1.5 5.3-1.7v1c.1 0 .7.1 1.6.1s1.5-.1 1.6-.1v-1c3 .2 5.3.9 5.3 1.7s-2.3 1.5-5.3 1.7zM9.4 10.1v2.1c0-.8 2.9-1.5 6.5-1.5s6.5.7 6.5 1.5v-2.1c0-.8-2.9-1.5-6.5-1.5s-6.5.7-6.5 1.5zM9.4 14.2v5.8c0 .8 2.9 1.5 6.5 1.5s6.5-.7 6.5-1.5v-5.8c0 .8-2.9 1.5-6.5 1.5s-6.5-.7-6.5-1.5z" fill="white"/>
        {/* Network indicator dot */}
        <circle cx="24" cy="8" r="5" fill={networkColor} stroke="white" strokeWidth="1"/>
      </>
    );
  }

  if (c.startsWith('usdc')) {
    return (
      <>
        <circle cx="16" cy="16" r="16" fill="#2775CA"/>
        <path d="M16 6C10.5 6 6 10.5 6 16s4.5 10 10 10 10-4.5 10-10S21.5 6 16 6zm3.3 13.7c-.7.4-1.5.6-2.3.7v1.3h-1.7v-1.3c-2.5-.3-4.1-1.9-4.2-4.2h2.2c.2 1.3 1 2.1 2 2.3v-4.1c-1.7-.4-3.4-1-3.4-3.1 0-1.8 1.3-3 3.4-3.3V6.3h1.7v1.4c2.2.3 3.5 1.7 3.6 3.8h-2.1c-.1-1.1-.7-1.8-1.5-2v3.7c1.8.4 3.6 1.1 3.6 3.3 0 1.3-.8 2.6-1.3 2.9v.3zm-2.3-3.8V12c.8.3 1.3.9 1.3 1.8 0 .9-.5 1.6-1.3 2.1zm-3.7-5.4c0-.9.5-1.5 1.3-1.9v3.5c-.7-.3-1.3-.9-1.3-1.6z" fill="white"/>
      </>
    );
  }

  // Fallback
  return (
    <>
      <circle cx="16" cy="16" r="16" fill="#6366f1"/>
      <text x="9" y="22" fontSize="13" fontWeight="700" fill="white" fontFamily="Arial">
        {currency.slice(0, 2).toUpperCase()}
      </text>
    </>
  );
}
