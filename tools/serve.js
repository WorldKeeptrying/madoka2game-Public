#!/usr/bin/env node
'use strict';

// 零依赖静态服务器：npm run web
// 直接双击 web/index.html 也能玩，但用这个可以避开个别浏览器对 file:// 的限制。

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  // 首页重定向到 /web/，否则 index.html 里的相对路径（styles.css 等）会解析到项目根目录
  if (urlPath === '/' || urlPath === '/web') {
    res.writeHead(302, { Location: '/web/' });
    res.end();
    return;
  }
  if (urlPath === '/web/') urlPath = '/web/index.html';

  const target = path.join(ROOT, path.normalize(urlPath).replace(/^([/\\.]+)/, ''));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(target, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const type = MIME[path.extname(target).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  process.stdout.write(`《银之庭院》网页版已启动： http://localhost:${PORT}/\n`);
  process.stdout.write('按 Ctrl + C 停止。\n');
});
