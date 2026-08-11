(() => {
  const BATCH_SIZE = 20;
  const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  const collator = new Intl.Collator('zh-CN-u-co-pinyin', {
    usage: 'sort',
    sensitivity: 'base',
    numeric: true
  });

  let activePanel = null;
  let visibleCount = 0;
  let sentinel = null;
  let alphaNav = null;

  const titleOf = item => item.querySelector('.bangumi-title')?.textContent.trim() || '';
  const itemsOf = panel => [...panel.querySelectorAll(':scope > .bangumi-item')];
  const subjectIdOf = item => item.querySelector('.bangumi-title a')?.href.match(/\/subject\/(\d+)/)?.[1] || '';

  function decorateItem(item, initialMap, detailBase) {
    const id = subjectIdOf(item);
    const titleLink = item.querySelector('.bangumi-title a');
    const initial = initialMap[id] || (/^[a-z]/i.test(titleOf(item)) ? titleOf(item)[0].toUpperCase() : '#');
    const detailUrl = `${detailBase}${id}/`;
    item.dataset.initial = LETTERS.includes(initial) ? initial : '#';

    if (titleLink && id) {
      titleLink.dataset.bangumiUrl = titleLink.href;
      titleLink.href = detailUrl;
      titleLink.target = '_self';
      titleLink.removeAttribute('rel');
    }

    const picture = item.querySelector('.bangumi-picture');
    const image = picture?.querySelector('img');
    if (picture && image && image.parentElement === picture && id) {
      const coverLink = document.createElement('a');
      coverLink.className = 'bangumi-cover-link';
      coverLink.href = detailUrl;
      coverLink.setAttribute('aria-label', `查看《${titleOf(item)}》资料`);
      picture.insertBefore(coverLink, image);
      coverLink.appendChild(image);
    }
  }

  function sortPanel(panel) {
    const items = itemsOf(panel).sort((a, b) => {
      const initialDifference = LETTERS.indexOf(a.dataset.initial) - LETTERS.indexOf(b.dataset.initial);
      return initialDifference || collator.compare(titleOf(a), titleOf(b));
    });
    items.forEach(item => panel.appendChild(item));
  }

  function updateNav() {
    if (!alphaNav || !activePanel) return;
    const available = new Set(itemsOf(activePanel).map(item => item.dataset.initial));
    alphaNav.querySelectorAll('button').forEach(button => {
      button.disabled = !available.has(button.dataset.letter);
    });
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
    updateNav();
  }

  function jumpToLetter(letter) {
    if (!activePanel) return;
    const items = itemsOf(activePanel);
    const index = items.findIndex(item => item.dataset.initial === letter);
    if (index < 0) return;

    const requiredCount = Math.min(items.length, Math.ceil((index + 1) / BATCH_SIZE) * BATCH_SIZE);
    items.slice(0, requiredCount).forEach(item => item.classList.remove('bangumi-hide'));
    visibleCount = Math.max(visibleCount, requiredCount);
    sentinel?.classList.toggle('finished', visibleCount >= items.length);

    const target = items[index];
    requestAnimationFrame(() => {
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 108, behavior: 'smooth' });
    });
  }

  function createAlphaNav() {
    alphaNav = document.createElement('nav');
    alphaNav.className = 'alpha-nav';
    alphaNav.setAttribute('aria-label', '按首字母跳转');
    LETTERS.forEach(letter => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.letter = letter;
      button.textContent = letter;
      button.addEventListener('click', () => jumpToLetter(letter));
      alphaNav.appendChild(button);
    });
    document.body.appendChild(alphaNav);
  }

  async function init() {
    const page = document.querySelector('.bangumi-page');
    const container = page?.querySelector('.bangumi-container');
    if (!container || container.dataset.infiniteReady) return;
    container.dataset.infiniteReady = 'true';

    let initialMap = {};
    try {
      const response = await fetch(new URL('initials.json', window.location.href));
      if (response.ok) initialMap = await response.json();
    } catch (_) {
      // The list still works; non-Latin titles fall back to the # group.
    }

    const detailBase = page.dataset.detailBase || './subject/';
    const panels = [...container.querySelectorAll('[id^="bangumi-item"]')];
    panels.forEach(panel => {
      itemsOf(panel).forEach(item => decorateItem(item, initialMap, detailBase));
      sortPanel(panel);
    });

    // Remove the plugin pager from the DOM so its old click handlers cannot freeze the page.
    container.querySelectorAll('.bangumi-pagination').forEach(pager => pager.remove());
    createAlphaNav();

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
    activate(selectedTab
      ? document.getElementById(selectedTab.id.replace('tab', 'item'))
      : container.querySelector('.bangumi-show'));

    new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadNextBatch();
    }, { rootMargin: '900px 0px' }).observe(sentinel);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', () => setTimeout(init, 0), { once: true });
})();
