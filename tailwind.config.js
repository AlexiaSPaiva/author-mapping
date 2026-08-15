/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Tailwind's reset is disabled on purpose: MUI's CssBaseline is the single
  // reset in this app. Two resets fighting over the same elements is exactly
  // the "two solutions for one problem" we are avoiding.
  corePlugins: { preflight: false },
  // Scope every utility under #root. Emotion injects MUI's styles at runtime,
  // after this stylesheet, so a bare `.mb-4` loses to MUI's own class and the
  // spacing silently disappears — that is what made the cards overlap. The id
  // selector settles the cascade once, instead of `!` on every utility.
  important: '#root',
  theme: { extend: {} },
  plugins: [],
};
