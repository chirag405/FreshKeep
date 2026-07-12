export const colors = {
  canvasBg: '#E9E6DE',
  screenBg: '#F4F2EC',
  card: '#FFFFFF',
  textPrimary: '#12211B',
  textSecondary: '#4B514C',
  textMuted: '#8A908B',
  textFaint: '#9AA09B',
  textFaint2: '#7A807B',
  divider: '#EFEDE5',
  chipTrackBg: '#E4E1D7',
  chipActiveBg: '#FFFFFF',
  searchBg: '#E7E4DB',
  dashedBorder: '#CFCCC2',
  primary: '#157A5B',
  primaryDark: '#0F5A44',
  primaryShadow: 'rgba(21,122,91,0.4)',

  danger: '#E0483D',
  dangerBg: '#FBEAE8',
  dangerText: '#C43F35',
  dangerTextAlt: '#C05348',
  dangerLabel: '#B84B41',

  warning: '#E8A23D',
  warningBg: '#FBF3E4',
  warningText: '#C9871F',
  warningLabel: '#B98428',

  success: '#2E9E6B',
  successBg: '#EAF4EE',
  successText: '#3E8E64',

  toggleOn: '#2E9E6B',
  gold: '#E8C15A',
  goldText: '#3A2B00',

  iconTileBlue: '#EEF3F6',
  iconTileTan: '#F3EEE6',
  iconTilePurple: '#F1EEFA',

  dark: {
    gradientTop: '#123328',
    gradientMid: '#07120E',
    gradientBottom: '#05100C',
    text: '#FFFFFF',
    textDim: 'rgba(255,255,255,0.55)',
    textFaint: 'rgba(255,255,255,0.45)',
    fieldBg: 'rgba(255,255,255,0.1)',
    fieldBorder: 'rgba(255,255,255,0.14)',
    accentMint: '#2FBB84',
    accentMintSoft: '#7FDCB6',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 15,
  xl: 18,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#14281E',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryButton: {
    shadowColor: '#157A5B',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
} as const;
