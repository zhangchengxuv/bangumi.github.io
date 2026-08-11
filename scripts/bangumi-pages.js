'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pinyin } = require('pinyin-pro');

function readCollection() {
  const file = path.join(hexo.source_dir, '_data', 'bangumis.json');
  if (!fs.existsSync(file)) return [];

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const groups = [
    ['想看', data.wantWatch || []],
    ['在看', data.watching || []],
    ['已看', data.watched || []]
  ];

  const unique = new Map();
  groups.forEach(([status, items]) => {
    items.forEach(item => unique.set(String(item.id), { ...item, status }));
  });
  return [...unique.values()];
}

function getInitial(title = '') {
  const first = title.trim().charAt(0);
  if (!first || /\d/.test(first)) return '#';
  if (/[a-z]/i.test(first)) return first.toUpperCase();

  const result = pinyin(first, { pattern: 'first', toneType: 'none', type: 'array' });
  const initial = String(result[0] || '').charAt(0).toUpperCase();
  return /[A-Z]/.test(initial) ? initial : '#';
}

hexo.extend.generator.register('bangumi-subject-pages', function () {
  const items = readCollection();
  const pages = items.map(item => ({
    path: `bangumis/subject/${item.id}/index.html`,
    layout: 'bangumi-detail',
    data: {
      title: item.title,
      bangumi: item
    }
  }));

  pages.push({
    path: 'bangumis/initials.json',
    data: JSON.stringify(Object.fromEntries(items.map(item => [String(item.id), getInitial(item.title)])))
  });

  return pages;
});
