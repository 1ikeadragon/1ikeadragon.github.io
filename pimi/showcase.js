import { mountRealHero, mountRealFeatures } from './real-showcase.js?v=39';

const root = document.documentElement;
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const themeButton = document.querySelector('.theme-toggle');

function storedTheme() {
  try { return localStorage.getItem('pimi-site-theme'); }
  catch { return null; }
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  const dark = theme === 'dark';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  document.querySelector('meta[name="theme-color"]').content =
    getComputedStyle(root).getPropertyValue('--page').trim();
}

const savedTheme = storedTheme();
applyTheme(['dark', 'light'].includes(savedTheme) ? savedTheme : systemTheme.matches ? 'dark' : 'light');
themeButton.hidden = false;
themeButton.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  if (!motion.matches && document.startViewTransition) {
    document.startViewTransition(() => applyTheme(theme));
  } else applyTheme(theme);
  try { localStorage.setItem('pimi-site-theme', theme); }
  catch { /* Private browsing still gets the selected theme. */ }
});
systemTheme.addEventListener('change', () => {
  if (!storedTheme()) applyTheme(systemTheme.matches ? 'dark' : 'light');
});

await mountRealHero(document.querySelector('#overview-window'));
await mountRealFeatures(document.querySelector('#feature-showcases'));

for (const pet of document.querySelectorAll('.pet')) {
  let timeout;
  pet.addEventListener('click', () => {
    pet.setAttribute('data-petted', '');
    clearTimeout(timeout);
    timeout = setTimeout(() => pet.removeAttribute('data-petted'), 1200);
  });
}
