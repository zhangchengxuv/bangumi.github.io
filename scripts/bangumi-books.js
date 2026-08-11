'use strict';

const fs = require('node:fs');
const path = require('node:path');

const API_BASE = 'https://api.bgm.tv/v0';
const PAGE_SIZE = 30;
const USER_AGENT = 'zhangchengxuv/bangumi.github.io (https://github.com/zhangchengxuv/bangumi.github.io)';

function formatCollection(collection, media) {
  const subject = collection.subject || {};
  const images = subject.images || {};
  const progressCount = collection.vol_status || collection.ep_status || 0;
  const totalCount = subject.volumes || subject.eps || 0;

  return {
    title: subject.name_cn || subject.name || (media === 'book' ? '未命名书籍' : '未命名游戏'),
    type: media === 'book' ? '书籍' : '游戏',
    media,
    cover: images.common || images.large || images.medium || images.small || '',
    totalCount,
    id: collection.subject_id || subject.id,
    score: subject.score ?? '-',
    des: subject.short_summary ? `${subject.short_summary.trim()}...` : '-',
    collect: subject.collection_total ?? '-',
    myStars: collection.rate || null,
    myComment: collection.comment || null,
    progress: totalCount ? Math.round((progressCount / totalCount) * 100) : 0,
    progressCount,
    ep_status: progressCount,
    tags: subject.tags?.[0]?.name || '-',
  };
}

async function fetchStatus(vmid, status, subjectType, media) {
  const items = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const url = new URL(`${API_BASE}/users/${vmid}/collections`);
    url.searchParams.set('subject_type', String(subjectType));
    url.searchParams.set('type', String(status));
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(offset));

    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Bangumi ${media === 'book' ? '书籍' : '游戏'}同步失败：HTTP ${response.status}`);

    const result = await response.json();
    total = Number(result.total || 0);
    const page = Array.isArray(result.data) ? result.data : [];
    items.push(...page.map(item => formatCollection(item, media)));
    if (!page.length) break;
    offset += page.length;
  }

  return items;
}

async function syncCollection(hexoInstance, { media, subjectType, fileName, label }) {
  const vmid = String(hexoInstance.config.bangumi?.vmid || '');
  if (!vmid) throw new Error('未配置 bangumi.vmid');

  hexoInstance.log.info(`正在同步 Bangumi 我的${label}…`);
  const [wantWatch, watching, watched] = await Promise.all([
    fetchStatus(vmid, 1, subjectType, media),
    fetchStatus(vmid, 3, subjectType, media),
    fetchStatus(vmid, 2, subjectType, media),
  ]);
  const data = { wantWatch, watching, watched };
  const dataDir = path.join(hexoInstance.source_dir, '_data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, fileName), JSON.stringify(data), 'utf8');
  hexoInstance.log.info(`${wantWatch.length + watching.length + watched.length} 个${label}条目已同步。`);
}

hexo.extend.console.register('books', '同步 Bangumi 我的书籍', {
  options: [{ name: '-u, --update', desc: '更新书籍收藏数据' }],
}, async function booksCommand(args) {
  if (!args.u && !args.update) {
    this.log.info('请使用 hexo books -u 同步书籍收藏。');
    return;
  }

  await syncCollection(this, {
    media: 'book', subjectType: 1, fileName: 'books.json', label: '书籍',
  });
});

hexo.extend.console.register('games', '同步 Bangumi 我的游戏', {
  options: [{ name: '-u, --update', desc: '更新游戏收藏数据' }],
}, async function gamesCommand(args) {
  if (!args.u && !args.update) {
    this.log.info('请使用 hexo games -u 同步游戏收藏。');
    return;
  }

  await syncCollection(this, {
    media: 'game', subjectType: 4, fileName: 'games.json', label: '游戏',
  });
});
