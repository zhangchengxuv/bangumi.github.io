'use strict';

const fs = require('node:fs');
const path = require('node:path');

function readManifest() {
  const file = path.join(hexo.source_dir, 'covers', 'manifest.json');
  if (!fs.existsSync(file)) return { covers: {} };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return { covers: {} };
  }
}

function localUrl(relativePath) {
  const root = String(hexo.config.root || '/').replace(/\/?$/, '/');
  return `${root}${String(relativePath).replace(/^\//, '')}`;
}

hexo.extend.helper.register('local_bangumi_cover', function (item, media) {
  const entry = readManifest().covers?.[`${media || item.media || 'anime'}:${item.id}`];
  return entry?.path ? localUrl(entry.path) : item.cover;
});

hexo.extend.filter.register('after_render:html', function (html) {
  const entries = Object.values(readManifest().covers || {});
  if (!entries.length || !html.includes('lain.bgm.tv')) return html;
  return entries.reduce((result, entry) => (
    entry.source && entry.path ? result.split(entry.source).join(localUrl(entry.path)) : result
  ), html);
});
