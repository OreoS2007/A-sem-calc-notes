// スマホ確認用:同じWi-Fi内に、english/ と assets/ だけを配る(reference/ などは配らない)。
// 使い方: node tools/lan-serve.js [ポート]   止めるときは Ctrl+C
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const allowed = ['english', 'assets'];
const port = Number(process.argv[2]) || 8766;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = url === '/' ? 'english/_local.html' : url.replace(/^\/+/, '');
  const file = path.resolve(root, rel);
  const top = path.relative(root, file).split(path.sep)[0];
  if (!file.startsWith(root) || !allowed.includes(top) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '0.0.0.0', () => console.log('listening on ' + port));
