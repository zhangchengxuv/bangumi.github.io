(() => {
  const BATCH_SIZE = 20;
  const collator = new Intl.Collator('zh-CN-u-co-pinyin', {
    usage: 'sort',
    sensitivity: 'base',
    numeric: true
  });

  let activePanel = null;
  let visibleCount = 0;
  let sentinel = null;

  const titleOf = item => item.querySelector('.bangumi-title')?.textContent.trim() || '';
  const itemsOf = panel => [...panel.querySelectorAll(':scope > .bangumi-item')];

  function sortPanel(panel) {
    const pager = panel.querySelector(':scope > .bangumi-pagination');
    const items = itemsOf(panel).sort((a, b) => collator.compare(titleOf(a), titleOf(b)));
    items.forEach(item => panel.insertBefore(item, pager || null));
  }

  function loadNextBatch() {
    if (!activePanel) return;
    const items = itemsOf(activePanel);
    const nextItems = items.slice(visibleCount, visibleCount + BATCH_SIZE);

    nextItems.forEach(item => {
      item.classList.remove('bangumi-hide');
      const image = item.querySelector('img[data-bangumi-src]');
      if (image && !image.getAttribute('src')) image.src = image.dataset.bangumiSrc;
    });

    visibleCount += nextItems.length;
    sentinel?.classList.toggle('finished', visibleCount >= items.length);
  }

  function activate(panel) {
    if (!panel) return;
    activePanel = panel;
    visibleCount = 0;
    itemsOf(panel).forEach(item => item.classList.add('bangumi-hide'));
    loadNextBatch();
  }

  function init() {
    const container = document.querySelector('.bangumi-page .bangumi-container');
    if (!container || container.dataset.infiniteReady) return;
    container.dataset.infiniteReady = 'true';

    const panels = [...container.querySelectorAll('[id^="bangumi-item"]')];
    panels.forEach(sortPanel);
    container.querySelectorAll('.bangumi-pagination').forEach(pager => pager.hidden = true);

    sentinel = document.createElement('div');
    sentinel.className = 'bangumi-scroll-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    container.appendChild(sentinel);

    container.querySelectorAll('.bangumi-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        setTimeout(() => activate(document.getElementById(tab.id.replace('tab', 'item'))), 0);
      });
    });

    const selectedTab = container.querySelector('.bangumi-tab.bangumi-active');
    const selectedPanel = selectedTab
      ? document.getElementById(selectedTab.id.replace('tab', 'item'))
      : container.querySelector('.bangumi-show');
    activate(selectedPanel);

    new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadNextBatch();
    }, { rootMargin: '900px 0px' }).observe(sentinel);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', () => setTimeout(init, 0), { once: true });
})();
