(() => {
  const key = 'screening-room-theme';
  const root = document.documentElement;
  const saved = localStorage.getItem(key);
  if (saved) root.dataset.theme = saved;

  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'light' : 'dark';
    localStorage.setItem(key, root.dataset.theme);
  });

  const header = document.querySelector('.site-header');
  const updateHeader = () => header?.classList.toggle('scrolled', scrollY > 16);
  updateHeader();
  addEventListener('scroll', updateHeader, { passive: true });
})();
