'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'source', '_data');
const coverDir = path.join(projectRoot, 'source', 'covers');
const manifestPath = path.join(coverDir, 'manifest.json');
const groups = ['wantWatch', 'watching', 'watched'];
const sources = [
  { media: 'anime', file: 'bangumis.json' },
  { media: 'book', file: 'books.json' },
  { media: 'game', file: 'games.json' },
];
const concurrency = 8;

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function collectCovers() {
  const covers = new Map();
  sources.forEach(({ media, file }) => {
    const data = readJson(path.join(dataDir, file), {});
    groups.forEach(group => {
      (data[group] || []).forEach(item => {
        const source = String(item.coverOriginal || item.cover || '').replace(/^http:/, 'https:');
        if (!item.id || !/^https:\/\//.test(source)) return;
        covers.set(`${media}:${item.id}`, { media, id: String(item.id), source });
      });
    });
  });
  return [...covers.values()];
}

function extensionFor(response, url) {
  const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim();
  const byType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  if (byType[contentType]) return byType[contentType];
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension) ? extension : '.jpg';
}

async function fetchCover(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'User-Agent': 'zhangchengxuv/bgm GitHub Pages cover sync',
        },
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = String(response.headers.get('content-type') || '');
      if (!contentType.startsWith('image/')) throw new Error(`unexpected content type: ${contentType || 'unknown'}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 256) throw new Error('image response is empty');
      return { bytes, extension: extensionFor(response, url), contentType: contentType.split(';')[0] };
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise(resolve => setTimeout(resolve, attempt * 600));
    }
  }
  throw lastError;
}

async function main() {
  fs.mkdirSync(coverDir, { recursive: true });
  const previous = readJson(manifestPath, { covers: {} });
  const items = collectCovers();
  const next = { generatedAt: new Date().toISOString(), covers: {} };
  let downloaded = 0;
  let reused = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      const key = `${item.media}:${item.id}`;
      const cached = previous.covers?.[key];
      const cachedFile = cached?.path ? path.join(projectRoot, 'source', cached.path) : '';
      if (cached?.source === item.source && cachedFile && fs.existsSync(cachedFile) && fs.statSync(cachedFile).size > 255) {
        next.covers[key] = cached;
        reused += 1;
        continue;
      }

      try {
        const result = await fetchCover(item.source);
        const fileName = `${item.media}-${item.id}${result.extension}`;
        const relativePath = `covers/${fileName}`;
        const destination = path.join(coverDir, fileName);
        const temporary = `${destination}.tmp`;
        fs.writeFileSync(temporary, result.bytes);
        fs.renameSync(temporary, destination);
        next.covers[key] = {
          path: relativePath,
          source: item.source,
          contentType: result.contentType,
          bytes: result.bytes.length,
        };
        downloaded += 1;
      } catch (error) {
        if (cachedFile && fs.existsSync(cachedFile)) {
          next.covers[key] = cached;
          reused += 1;
          console.warn(`Using cached cover for ${key}: ${error.message}`);
        } else {
          failed += 1;
          console.warn(`Could not host cover for ${key}: ${error.message}`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, worker));
  fs.writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`Hosted ${Object.keys(next.covers).length}/${items.length} Bangumi covers (${downloaded} downloaded, ${reused} cached, ${failed} unavailable).`);
  if (items.length && !Object.keys(next.covers).length) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
