/**
 * MUI theme — identical in the three litpipe apps, so they read as one suite.
 *
 * Styling split (see README): MUI owns components, Tailwind owns layout.
 * Colours, typography and shape live here and nowhere else.
 */
import { createTheme } from '@mui/material/styles';
import '@fontsource-variable/inter';

/**
 * Shared palette. Text colours keep a contrast ratio >= 4.5:1 against both the
 * page background and the white cards. `accent` is the amber of the impulses in
 * the header drawing; it marks "this is the thing to look at", never body text.
 */
export const palette = {
  primary: '#1B4965',
  primaryDark: '#0F2F44',
  secondary: '#5FA8D3',
  accent: '#E8A33D',
  accentSoft: '#FDF3E1',
  background: '#F3F6F9',
  surface: '#FFFFFF',
  border: '#DFE7EE',
  text: '#16202A',
  muted: '#4A5A68',
};

const shadow = '0 1px 2px rgba(16, 32, 48, 0.04), 0 4px 16px rgba(16, 32, 48, 0.05)';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: palette.primary, dark: palette.primaryDark, contrastText: '#FFFFFF' },
    secondary: { main: palette.secondary, contrastText: '#16202A' },
    warning: { main: palette.accent },
    background: { default: palette.background, paper: palette.surface },
    text: { primary: palette.text, secondary: palette.muted },
    divider: palette.border,
  },
  typography: {
    fontFamily:
      '"Inter Variable", "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '1.875rem', fontWeight: 750, letterSpacing: '-0.02em', lineHeight: 1.15 },
    h2: { fontSize: '1.125rem', fontWeight: 650, letterSpacing: '-0.01em' },
    h3: { fontSize: '1rem', fontWeight: 650 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    overline: { fontWeight: 700, letterSpacing: '0.14em' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
  },
  shape: { borderRadius: 10 },
  components: {
    // Visible focus ring everywhere: keyboard navigation is a requirement.
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&:focus-visible': { outline: `3px solid ${palette.secondary}`, outlineOffset: 2 },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 16, minHeight: 40 },
        sizeSmall: { minHeight: 32, paddingInline: 10 },
        outlined: { borderColor: palette.border, backgroundColor: palette.surface },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1px solid ${palette.border}`, backgroundImage: 'none' },
        rounded: { borderRadius: 14, boxShadow: shadow },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: palette.surface,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD6E0' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
        outlined: { borderColor: palette.border, backgroundColor: palette.surface },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 12, alignItems: 'flex-start' } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 6, borderRadius: 3, backgroundColor: '#E6EDF3' },
        bar: { borderRadius: 3 },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: '0.8125rem', lineHeight: 1.45, padding: '8px 10px' } },
    },
  },
});
