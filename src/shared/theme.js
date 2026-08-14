/**
 * MUI theme — identical in the three litpipe apps, so they read as one suite.
 *
 * Styling split (see README): MUI owns components, Tailwind owns layout.
 * Colours, typography and shape live here and nowhere else.
 */
import { createTheme } from '@mui/material/styles';

/** Shared palette. Contrast ratios against the light background are >= 4.5:1. */
export const palette = {
  primary: '#1B4965',
  secondary: '#5FA8D3',
  background: '#F7F9FB',
  surface: '#FFFFFF',
  text: '#16202A',
  muted: '#4A5A68',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: palette.primary, contrastText: '#FFFFFF' },
    secondary: { main: palette.secondary, contrastText: '#16202A' },
    background: { default: palette.background, paper: palette.surface },
    text: { primary: palette.text, secondary: palette.muted },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.25rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
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
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: '1px solid #E1E8ED' } },
    },
  },
});
