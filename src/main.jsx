import React from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';

import App from './ui/pages/App.jsx';
import { theme } from './shared/theme.js';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      {/* The single CSS reset in this app; Tailwind's preflight is disabled. */}
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
