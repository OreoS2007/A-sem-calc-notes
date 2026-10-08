/* ページ間の移動でスクロール位置を失わないためのスクリプト
 *
 * 1. どのページでも、読んでいる位置を localStorage に保存し、次に開いたとき(戻る・再訪問)に復元する。
 *    位置は「ページ内のどのブロックの、何px下か」で保存するので、画面幅が変わってもずれにくい。
 * 2. data-xref を付けたリンク(本文 ⇄ 春学期のまとめ)を押すと、元の位置を記録しておき、
 *    移動先に「元の位置にもどる」ボタンを出す。押すと、元のページの元の位置に戻る。
 * 3. #見出し 付きのリンクで開いたときは、その見出しを優先する(位置の復元はしない)。
 */
(function () {
  'use strict';

  var POS_KEY = 'mathnotes:pos:' + location.pathname;
  var STACK_KEY = 'mathnotes:stack';
  var userScrolled = false;
  var saving = false;                 // 復元が終わるまでは自動保存しない(復元中のスクロールで上書きしないため)

  function safe(fn) { try { return fn(); } catch (e) { return null; } }
  function blocks() { return Array.prototype.slice.call(document.querySelectorAll('main > *')); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function samePath(a, b) { return a.replace(/index\.html$/, '') === b.replace(/index\.html$/, ''); }

  /* ---------- 位置の保存と復元 ---------- */
  function snapshot() {
    var bs = blocks(), i, r;
    for (i = 0; i < bs.length; i++) {
      r = bs[i].getBoundingClientRect();
      if (r.bottom > 8) return { i: i, off: -r.top, y: window.scrollY };
    }
    return { i: 0, off: 0, y: window.scrollY };
  }
  function save(force) {
    if (!force && !saving) return;
    safe(function () { localStorage.setItem(POS_KEY, JSON.stringify(snapshot())); });
  }
  function restore() {
    if (userScrolled) return;
    if (location.hash) {
      var el = safe(function () { return document.getElementById(decodeURIComponent(location.hash.slice(1))); });
      if (el) el.scrollIntoView();
      return;
    }
    var s = safe(function () { return JSON.parse(localStorage.getItem(POS_KEY)); });
    if (!s) return;
    var b = blocks()[s.i];
    var y = b ? b.getBoundingClientRect().top + window.scrollY + s.off : s.y;
    window.scrollTo(0, Math.max(0, y));
  }

  /* ---------- 「元の位置にもどる」のスタック ---------- */
  function getStack() { return safe(function () { return JSON.parse(sessionStorage.getItem(STACK_KEY)); }) || []; }
  function setStack(s) { safe(function () { sessionStorage.setItem(STACK_KEY, JSON.stringify(s)); }); }

  function pageName() {
    var h = document.querySelector('main h1');
    return (h ? h.textContent : document.title).replace(/\s+/g, ' ').trim();
  }
  function cleanText(node) {
    var c = node.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.katex-mathml, .page-tag, .xref-link'), function (n) { n.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function currentLabel() {
    var hs = document.querySelectorAll('main h2, main h3'), best = null, i;
    for (i = 0; i < hs.length; i++) {
      if (hs[i].getBoundingClientRect().top <= 90) best = hs[i]; else break;
    }
    return best ? cleanText(best) : '';
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-xref]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    save(true);
    var target = new URL(a.href, location.href);
    var st = getStack(), top = st[st.length - 1];
    var entry = { path: location.pathname, url: location.pathname + location.search, page: pageName(), label: currentLabel() };
    if (top && samePath(top.path, target.pathname)) {
      st.pop();                       // 元のページへ行く移動 = 戻ったことにする
    } else if (top && samePath(top.path, location.pathname)) {
      st[st.length - 1] = entry;      // 同じページからの移動は、位置を最新にするだけ
    } else {
      st.push(entry);
    }
    setStack(st);
  }, true);

  function mountReturnButton() {
    var st = getStack();
    if (!st.length) return;
    var top = st[st.length - 1];
    if (samePath(top.path, location.pathname)) return;
    var b = document.createElement('a');
    b.className = 'nav-return';
    b.href = top.url;
    b.innerHTML = '<span class="nr-arrow">←</span><span class="nr-text">元の位置にもどる<small>' +
      esc(top.page) + (top.label ? ' › ' + esc(top.label) : '') + '</small></span>';
    b.addEventListener('click', function () { var s = getStack(); s.pop(); setStack(s); });
    document.body.appendChild(b);
  }

  /* ---------- 起動 ---------- */
  safe(function () { history.scrollRestoration = 'manual'; });

  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
    window.addEventListener(ev, function () { userScrolled = true; saving = true; }, { passive: true, once: true });
  });

  var timer = null;
  window.addEventListener('scroll', function () {
    if (timer) return;
    timer = setTimeout(function () { timer = null; save(); }, 200);
  }, { passive: true });
  window.addEventListener('pagehide', function () { save(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });

  window.__navReady = restore;          // 数式の描画が終わったら呼ばれる(レイアウトが確定してから復元)
  document.addEventListener('DOMContentLoaded', function () {
    mountReturnButton();
    restore();
  });
  window.addEventListener('load', function () {
    restore();
    setTimeout(restore, 1500);
    setTimeout(function () { saving = true; }, 2000);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) userScrolled = true; });
})();

