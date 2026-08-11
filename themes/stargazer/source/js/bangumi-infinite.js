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
  let currentMedia = 'anime';

  const titleOf = item => item.querySelector('.bangumi-title')?.textContent.trim() || '';
  const itemsOf = panel => [...panel.querySelectorAll(':scope > .bangumi-item')];
  const subjectIdOf = item => item.querySelector('.bangumi-title a')?.href.match(/\/subject\/(\d+)/)?.[1] || '';
  const safeText = value => String(value ?? '');
  const escapeHTML = value => safeText(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  function setCoverBackdrop(picture, image) {
    const source = image?.currentSrc || image?.getAttribute('src') || image?.dataset.bangumiSrc;
    if (picture && source) picture.style.setProperty('--cover-image', `url(${JSON.stringify(source)})`);
  }

  function decorateItem(item, initialMap, detailBase) {
    const id = subjectIdOf(item);
    const titleLink = item.querySelector('.bangumi-title a');
    const initial = item.dataset.initial || initialMap[id]
      || (/^[a-z]/i.test(titleOf(item)) ? titleOf(item)[0].toUpperCase() : '#');
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
    setCoverBackdrop(picture, image);
    if (picture && image && image.parentElement === picture && id) {
      const coverLink = document.createElement('a');
      coverLink.className = 'bangumi-cover-link';
      coverLink.href = detailUrl;
      coverLink.setAttribute('aria-label', `查看《${titleOf(item)}》资料`);
      picture.insertBefore(coverLink, image);
      coverLink.appendChild(image);
    }
  }

  function sortAndGroup(panel) {
    panel.querySelectorAll(':scope > .bangumi-initial-heading').forEach(heading => heading.remove());
    const items = itemsOf(panel).sort((a, b) => {
      const initialDifference = LETTERS.indexOf(a.dataset.initial) - LETTERS.indexOf(b.dataset.initial);
      return initialDifference || collator.compare(titleOf(a), titleOf(b));
    });

    let lastInitial = null;
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
      if (item.dataset.initial !== lastInitial) {
        lastInitial = item.dataset.initial;
        const heading = document.createElement('h2');
        heading.className = 'bangumi-initial-heading bangumi-hide';
        heading.dataset.initial = lastInitial;
        heading.id = `${panel.id}-initial-${lastInitial === '#' ? 'number' : lastInitial}`;
        heading.innerHTML = `<span>${lastInitial}</span><i></i>`;
        fragment.appendChild(heading);
      }
      fragment.appendChild(item);
    });
    panel.appendChild(fragment);
  }

  function refreshHeadings(panel) {
    panel.querySelectorAll(':scope > .bangumi-initial-heading').forEach(heading => {
      const hasVisibleItem = itemsOf(panel).some(item => (
        item.dataset.initial === heading.dataset.initial && !item.classList.contains('bangumi-hide')
      ));
      heading.classList.toggle('bangumi-hide', !hasVisibleItem);
    });
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
    refreshHeadings(activePanel);
    sentinel?.classList.toggle('finished', visibleCount >= items.length);
  }

  function activate(panel) {
    if (!panel) return;
    activePanel = panel;
    visibleCount = 0;
    itemsOf(panel).forEach(item => item.classList.add('bangumi-hide'));
    panel.querySelectorAll(':scope > .bangumi-initial-heading').forEach(heading => heading.classList.add('bangumi-hide'));
    loadNextBatch();
    updateNav();
  }

  function jumpToLetter(letter) {
    if (!activePanel) return;
    const items = itemsOf(activePanel);
    const index = items.findIndex(item => item.dataset.initial === letter);
    if (index < 0) return;

    const groupEnd = items.findIndex((item, itemIndex) => itemIndex > index && item.dataset.initial !== letter);
    const requiredIndex = groupEnd < 0 ? items.length : groupEnd;
    const requiredCount = Math.min(items.length, Math.ceil(requiredIndex / BATCH_SIZE) * BATCH_SIZE);
    items.slice(0, requiredCount).forEach(item => item.classList.remove('bangumi-hide'));
    visibleCount = Math.max(visibleCount, requiredCount);
    refreshHeadings(activePanel);
    sentinel?.classList.toggle('finished', visibleCount >= items.length);

    const heading = activePanel.querySelector(`:scope > .bangumi-initial-heading[data-initial="${letter}"]`);
    requestAnimationFrame(() => {
      const target = heading || items[index];
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

  function createCollectionItem(item, detailBase) {
    const element = document.createElement('div');
    element.className = 'bangumi-item';
    element.dataset.initial = item.initial || '#';
    const detailUrl = `${detailBase}${safeText(item.id)}/`;
    const progress = Number(item.progressCount ?? item.ep_status ?? 0);
    const total = Number(item.totalCount || 0);
    const percentage = total ? Math.min(100, Math.round((progress / total) * 100)) : 0;
    const image = escapeHTML(safeText(item.cover).replace(/^http:/, 'https:'));
    const title = escapeHTML(item.title);

    element.innerHTML = `
      <div class="bangumi-picture">
        <a class="bangumi-cover-link" href="${detailUrl}" aria-label="查看《${title}》资料">
          <img src="${image}" alt="${title}" referrerpolicy="no-referrer" loading="lazy">
        </a>
      </div>
      <div class="bangumi-info">
        <div class="bangumi-title"><a href="${detailUrl}">${title}</a></div>
        ${total ? `<div class="bangumi-progress"><div class="progress-bar" style="width:${percentage}%"></div></div>` : ''}
      </div>`;
    setCoverBackdrop(element.querySelector('.bangumi-picture'), element.querySelector('.bangumi-picture img'));
    return element;
  }

  function createCollectionContainer(data, detailBase, { media, noun }) {
    const container = document.createElement('div');
    container.className = `bangumi-container ${media}-container`;
    container.dataset.media = media;
    container.hidden = true;

    const items = ['wantWatch', 'watching', 'watched']
      .flatMap(key => Array.isArray(data[key]) ? data[key] : []);
    const panel = document.createElement('div');
    panel.id = `${media}-items`;
    panel.className = 'bangumi-show';
    items.forEach(item => panel.appendChild(createCollectionItem(item, detailBase)));
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'collection-empty';
      empty.textContent = `这里还没有收藏的${noun}`;
      panel.appendChild(empty);
    }
    sortAndGroup(panel);
    container.appendChild(panel);
    return container;
  }

  function createMediaSwitch(page, containers) {
    const nav = document.createElement('div');
    nav.className = 'collection-switch';
    nav.setAttribute('aria-label', '收藏类型');
    const choices = [['anime', '动画'], ['book', '我的书籍'], ['game', '我的游戏']];

    choices.forEach(([media, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.media = media;
      button.className = media === 'anime' ? 'active' : '';
      button.textContent = label;
      button.addEventListener('click', () => {
        currentMedia = media;
        nav.querySelectorAll('button').forEach(choice => choice.classList.toggle('active', choice === button));
        Object.entries(containers).forEach(([key, container]) => {
          container.hidden = key !== media;
        });
        const container = containers[media];
        activate(container.querySelector('.bangumi-show'));
      });
      nav.appendChild(button);
    });

    page.insertBefore(nav, containers.anime);
    containers.anime.insertAdjacentElement('afterend', containers.book);
    containers.book.insertAdjacentElement('afterend', containers.game);
  }

  async function init() {
    const page = document.querySelector('.bangumi-page');
    const animeContainer = page?.querySelector('.bangumi-container');
    if (!animeContainer || animeContainer.dataset.infiniteReady) return;
    const revealFallback = window.setTimeout(() => page.classList.add('collections-ready'), 5000);
    animeContainer.dataset.infiniteReady = 'true';
    animeContainer.dataset.media = 'anime';

    let initialMap = {};
    let bookData = { wantWatch: [], watching: [], watched: [] };
    let gameData = { wantWatch: [], watching: [], watched: [] };
    try {
      const [initialResponse, bookResponse, gameResponse] = await Promise.all([
        fetch(new URL('initials.json', window.location.href)),
        fetch(new URL('books.json', window.location.href)),
        fetch(new URL('games.json', window.location.href))
      ]);
      if (initialResponse.ok) initialMap = await initialResponse.json();
      if (bookResponse.ok) bookData = await bookResponse.json();
      if (gameResponse.ok) gameData = await gameResponse.json();
    } catch (_) {
      // 动画列表仍可使用；同步失败时书籍分类显示为空。
    }

    const detailBase = page.dataset.detailBase || './subject/';
    const originalAnimePanels = [...animeContainer.querySelectorAll('[id^="bangumi-item"]')];
    const animePanel = document.createElement('div');
    animePanel.id = 'anime-items';
    animePanel.className = 'bangumi-show';
    originalAnimePanels.forEach(panel => {
      itemsOf(panel).forEach(item => animePanel.appendChild(item));
      panel.remove();
    });
    animeContainer.querySelector('.bangumi-tabs')?.remove();
    animeContainer.appendChild(animePanel);
    itemsOf(animePanel).forEach(item => decorateItem(item, initialMap, detailBase));
    sortAndGroup(animePanel);

    animeContainer.querySelectorAll('.bangumi-pagination').forEach(pager => pager.remove());
    const bookContainer = createCollectionContainer(bookData, detailBase, {
      media: 'book',
      noun: '书籍'
    });
    const gameContainer = createCollectionContainer(gameData, detailBase, {
      media: 'game',
      noun: '游戏'
    });
    createMediaSwitch(page, { anime: animeContainer, book: bookContainer, game: gameContainer });
    createAlphaNav();

    sentinel = document.createElement('div');
    sentinel.className = 'bangumi-scroll-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    page.appendChild(sentinel);

    activate(animePanel);

    new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadNextBatch();
    }, { rootMargin: '900px 0px' }).observe(sentinel);

    window.clearTimeout(revealFallback);
    page.classList.add('collections-ready');
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', () => setTimeout(init, 0), { once: true });
})();
