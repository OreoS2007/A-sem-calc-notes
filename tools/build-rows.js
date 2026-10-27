// english/_local.html の本文(.en)と日本語訳(.ja)を、数文ずつの「行ブロック」に分け、
// 左右(本文|訳)で対応する位置が隣り合うようにする。1文ずつは分けない(長さ約380字で1ブロック)。
// 使い方: node tools/build-rows.js   (english/_local.html を書き換える。作り直すと元に戻る)
const fs = require('fs');
const file = require('path').resolve(__dirname, '..', 'english', '_local.html');
const CHUNK = 380;

const plain = s => s.replace(/<[^>]*>/g, '');

function nextVisible(s, i) {
  let inTag = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '<') { inTag = true; continue; }
    if (c === '>') { inTag = false; continue; }
    if (inTag || /\s/.test(c)) continue;
    return c;
  }
  return '';
}

function splitEn(s) {
  const out = []; let start = 0, inTag = false, vis = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '<') { inTag = true; continue; }
    if (c === '>') { inTag = false; continue; }
    if (inTag) continue;
    if (/\s/.test(c) && /[.!?”]$/.test(vis)) {
      const nx = nextVisible(s, i);
      const abbr = /(^|\s)[A-Z]\.$/.test(vis) || /\. \. \.$/.test(vis);
      if (nx && /[A-Z“‘]/.test(nx) && !abbr) { out.push(s.slice(start, i)); start = i + 1; }
    }
    vis += c;
  }
  out.push(s.slice(start));
  return out.filter(x => plain(x).trim());
}

function splitJa(s) {
  const out = []; let start = 0, inTag = false, depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '<') { inTag = true; continue; }
    if (c === '>') { inTag = false; continue; }
    if (inTag) continue;
    if ('「『('.includes(c)) depth++;
    else if ('」』)'.includes(c)) depth = Math.max(0, depth - 1);
    else if (c === '。' && depth === 0) { out.push(s.slice(start, i + 1)); start = i + 1; }
  }
  if (plain(s.slice(start)).trim()) out.push(s.slice(start));
  return out;
}

function cumFrac(parts) {
  const L = parts.map(p => plain(p).length), T = L.reduce((a, b) => a + b, 0);
  let acc = 0; return L.map(l => (acc += l) / T);
}

// 境界(各ブロックの最後の文の番号)を、累積の割合が目標に近いところに置く
function pickBreaks(cum, R, targets) {
  const n = cum.length, ks = []; let prev = -1;
  for (let r = 1; r < R; r++) {
    const lo = prev + 1, hi = n - 1 - (R - r);
    let best = lo;
    for (let k = lo; k <= hi; k++) if (Math.abs(cum[k] - targets[r - 1]) < Math.abs(cum[best] - targets[r - 1])) best = k;
    ks.push(best); prev = best;
  }
  return ks;
}

function group(parts, ks, join) {
  const rows = []; let a = 0;
  for (const k of ks) { rows.push(parts.slice(a, k + 1).join(join)); a = k + 1; }
  rows.push(parts.slice(a).join(join));
  return rows;
}

function rowsFor(en, ja) {
  const E = splitEn(en), J = splitJa(ja);
  let R = Math.max(1, Math.round(plain(en).length / CHUNK));
  R = Math.min(R, E.length, J.length);
  if (R <= 1) return [[en, ja]];
  const ec = cumFrac(E), jc = cumFrac(J);
  const ks = pickBreaks(ec, R, Array.from({ length: R - 1 }, (_, i) => (i + 1) / R));
  const js = pickBreaks(jc, R, ks.map(k => ec[k]));
  const er = group(E, ks, ' '), jr = group(J, js, '');
  return er.map((e, i) => [e, jr[i]]);
}

let html = fs.readFileSync(file, 'utf8');
const re = /<div class="para">\s*<p class="(en[^"]*)">([\s\S]*?)<\/p>\s*<p class="ja">([\s\S]*?)<\/p>\s*(<p class="vocab">[\s\S]*?<\/p>\s*)?<\/div>/g;
let n = 0, rowsTotal = 0;
html = html.replace(re, (m, cls, en, ja, vocab) => {
  n++;
  const rows = rowsFor(en, ja);
  rowsTotal += rows.length;
  if (process.argv.includes('-v')) console.log(n, rows.length, rows.map(([e, j]) => plain(e).slice(0, 18) + ' | ' + plain(j).slice(0, 10)).join('  //  '));
  return '<div class="para">\n' + rows.map(([e, j]) =>
    '        <div class="row">\n          <p class="' + cls + '">' + e + '</p>\n          <p class="ja">' + j + '</p>\n        </div>\n').join('') +
    (vocab ? '        ' + vocab.trim() + '\n' : '') + '      </div>';
});
fs.writeFileSync(file, html);
console.log('paragraphs', n, 'rows', rowsTotal);
