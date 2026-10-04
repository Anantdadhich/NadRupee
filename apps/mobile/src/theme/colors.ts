// NadRupee Design Tokens directly derived from web globals.css
export const Colors = {
  // Web: var(--night) = oklch(0.115 0.012 185) -> #0f1819
  night: '#0f1819',
  // Web: var(--night-soft) = oklch(0.17 0.025 188) -> #182628
  nightSoft: '#182628',
  // Web: .portal-card background -> color-mix(in oklab, var(--night-soft) 94%, transparent)
  nightCard: '#162224',
  nightCardBorder: 'rgba(255, 255, 255, 0.08)',
  nightCardBorderHover: 'rgba(255, 255, 255, 0.14)',
  nightSurface: '#111b1d',

  // Web: var(--paper) = oklch(0.985 0.003 165) -> #f8fafc
  paper: '#f8fafc',
  paperMuted: 'rgba(248, 250, 252, 0.65)',
  paperDim: 'rgba(248, 250, 252, 0.40)',
  paperFaint: 'rgba(248, 250, 252, 0.12)',

  // Web: var(--mint) = oklch(0.73 0.105 169) -> #38d9a9
  mint: '#38d9a9',
  // Web: var(--mint-bright) = oklch(0.88 0.105 170) -> #5eead4
  mintBright: '#5eead4',
  mintSoft: 'rgba(56, 217, 169, 0.12)',
  mintBorder: 'rgba(56, 217, 169, 0.25)',

  // Web: var(--muted-foreground) = oklch(0.51 0.018 190) -> #86999b
  mutedForeground: '#86999b',

  // Alerts & status badges
  danger: '#f43f5e',
  dangerSoft: 'rgba(244, 63, 94, 0.12)',
  dangerBorder: 'rgba(244, 63, 94, 0.25)',
  amber: '#fbbf24',
  amberSoft: 'rgba(251, 191, 36, 0.12)',
  amberBorder: 'rgba(251, 191, 36, 0.25)',
  blue: '#38bdf8',
  blueSoft: 'rgba(56, 189, 248, 0.12)',
};
