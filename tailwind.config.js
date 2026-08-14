/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Tailwind's reset is disabled on purpose: MUI's CssBaseline is the single
  // reset in this app. Two resets fighting over the same elements is exactly
  // the "two solutions for one problem" we are avoiding.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
