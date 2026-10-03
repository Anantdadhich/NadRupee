// NadRupee Design Tokens matching globals.css OKLCH palette
export const Colors = {
  night: '#0e1718', // Deep background
  nightElevated: '#142022', // Card background
  nightSoft: '#1a292b', // Secondary card / hover
  nightBorder: '#23383b', // Subtle borders
  nightSurface: '#0b1213', // Deep sunken inputs / bars

  mint: '#38d9a9', // Primary brand mint
  mintBright: '#5eead4', // Vibrant mint accent
  mintSoft: 'rgba(56, 217, 169, 0.12)', // Subtle mint tint
  mintGlow: 'rgba(56, 217, 169, 0.25)', // Card glow
  mintBorder: 'rgba(56, 217, 169, 0.35)',

  paper: '#f8fafc', // Text primary
  paperMuted: '#94a3b8', // Text secondary
  paperDim: '#64748b', // Text tertiary

  amber: '#fbbf24', // Warning / Pending
  amberSoft: 'rgba(251, 191, 36, 0.12)',
  danger: '#f43f5e', // Red / Error
  dangerSoft: 'rgba(244, 63, 94, 0.12)',
  blue: '#38bdf8', // Info
  blueSoft: 'rgba(56, 189, 248, 0.12)',

  gold: '#facc15',
  cardGradientStart: '#142022',
  cardGradientEnd: '#0e1718',
};

export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: {
    shadowColor: Colors.mint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};
