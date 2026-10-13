// 難しい単語(.w)をクリックすると、意味のふきだしを出す。もう一度押すか、ほかの場所を押すと閉じる。
(function () {
  var pop = document.createElement('div');
  pop.className = 'w-pop';
  pop.hidden = true;
  document.body.appendChild(pop);
  var cur = null;

  function close() {
    pop.hidden = true;
    if (cur) cur.classList.remove('open');
    cur = null;
  }

  function open(el) {
    if (cur) cur.classList.remove('open');
    cur = el;
    el.classList.add('open');
    var word = el.getAttribute('data-w') || el.textContent;
    pop.innerHTML = '<b></b><span></span>';
    pop.firstChild.textContent = word;
    pop.lastChild.textContent = el.getAttribute('data-m');
    pop.hidden = false;
    var r = el.getBoundingClientRect();
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
    var top = r.bottom + 8;
    if (top + ph > window.innerHeight - 8 && r.top - ph - 8 > 8) top = r.top - ph - 8;
    pop.style.left = (left + window.scrollX) + 'px';
    pop.style.top = (top + window.scrollY) + 'px';
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.w') : null;
    if (el) {
      if (el === cur) close(); else open(el);
      e.stopPropagation();
    } else if (!pop.contains(e.target)) {
      close();
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', close);

  // 「訳を隠す/表示」ボタン(.tr-toggle)と「単語の印を隠す」ボタン
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-toggle]') : null;
    if (!b) return;
    var key = b.getAttribute('data-toggle');
    var on = document.body.classList.toggle('hide-' + key);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    close();
  });
})();
