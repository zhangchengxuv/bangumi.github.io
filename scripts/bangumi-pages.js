'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pinyin } = require('pinyin-pro');

const STATUS_LABELS = {
  anime: ['想看', '在看', '已看'],
  book: ['想读', '在读', '读过'],
  game: ['想玩', '在玩', '玩过'],
};

function readDataFile(name) {
  const file = path.join(hexo.source_dir, '_data', name);
  if (!fs.existsSync(file)) return { wantWatch: [], watching: [], watched: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function flattenCollection(data, media) {
  const groups = [data.wantWatch || [], data.watching || [], data.watched || []];
  const unique = new Map();
  groups.forEach((items, index) => {
    items.forEach(item => unique.set(String(item.id), {
      ...item,
      media,
      status: STATUS_LABELS[media][index],
    }));
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

function withInitials(data, media) {
  return Object.fromEntries(Object.entries(data).map(([key, items]) => [
    key,
    (items || []).map(item => ({ ...item, media, initial: getInitial(item.title) })),
  ]));
}

hexo.extend.generator.register('bangumi-subject-pages', function () {
  const animeData = readDataFile('bangumis.json');
  const bookData = readDataFile('books.json');
  const gameData = readDataFile('games.json');
  const animeItems = flattenCollection(animeData, 'anime');
  const bookItems = flattenCollection(bookData, 'book');
  const gameItems = flattenCollection(gameData, 'game');
  const items = [...animeItems, ...bookItems, ...gameItems];

  const pages = items.map(item => ({
    path: `subject/${item.id}/index.html`,
    layout: 'bangumi-detail',
    data: {
      title: item.title,
      bangumi: item,
    },
  }));

  pages.push({
    path: 'initials.json',
    data: JSON.stringify(Object.fromEntries(items.map(item => [String(item.id), getInitial(item.title)]))),
  });

  pages.push({
    path: 'books.json',
    data: JSON.stringify(withInitials(bookData, 'book')),
  });

  pages.push({
    path: 'games.json',
    data: JSON.stringify(withInitials(gameData, 'game')),
  });

  return pages;
});
