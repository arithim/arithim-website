/*
 * live-dash.js: runs the live energy dashboard pages on arithim.com.
 *
 * The pages are written for a Claude dashboard artifact, which gives them a `dash` object for data,
 * calculations and drawing. This file is a small stand-in for that object, reading the public data
 * files at /live/data/<id>.json (see functions/live/data/[name].js). Only the parts the pages use are
 * here: data, calc, draw, onData, params, setParams, setLink and colors.
 *
 * Two things are added for the public site, where some sources are not yet licensed for display:
 * a dataset missing from /live/data/credits.json reads as "missing", and any card, tile, section or
 * tab left with nothing to show is hidden. The credit lines for every source a page uses are written
 * into [data-live-credits].
 */
(() => {
  'use strict';
  const BASE = '/live/data/';
  const calcs = new Map();      // id -> {inputs, fn}
  const store = new Map();      // dataset id -> {status, data}
  const draws = new Map();      // name -> {mount?, update, unmount?}
  const mounted = new Map();    // element -> what mount returned
  const listeners = [];
  let credits = null;
  let creditsStatus = 'loading';
  let params = {};
  let gen = 0;
  let sawLoading = false;       // set when a draw asked for data still loading; the page is not settled yet                  // bumps whenever data or params change; calc results are kept per generation
  const memo = new Map();       // calc id -> {gen, value}
  const ok = (data) => ({ status: 'ok', data, refreshing: false, meta: [] });
  const not = (status) => ({ status, data: [], refreshing: false, meta: [] });

  function load(id) {
    if (store.has(id)) return;
    if (creditsStatus !== 'ok') return;                       // wait for the list of what is published
    if (!credits.datasets || !credits.datasets[id]) { store.set(id, not('missing')); return; }
    store.set(id, not('loading'));
    fetch(BASE + encodeURIComponent(id) + '.json', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((d) => { store.set(id, ok(d)); changed(); })
      .catch(() => { store.set(id, not('error')); changed(); });
  }

  function roots(id, seen = new Set()) {
    if (!calcs.has(id)) return [id];
    if (seen.has(id)) return [];
    seen.add(id);
    return calcs.get(id).inputs.flatMap((i) => roots(i, seen));
  }

  function data(id) {
    const v = dataOf(id);
    if (v.status === 'loading') sawLoading = true;
    return v;
  }

  function dataOf(id) {
    if (calcs.has(id)) {
      const m = memo.get(id);
      if (m && m.gen === gen) return m.value;
      const r = roots(id).map((x) => dataOf(x).status);
      let value;
      if (creditsStatus === 'loading' || r.includes('loading')) value = not('loading');
      else if (r.length && r.every((s) => s !== 'ok')) value = not(r.includes('error') ? 'error' : 'missing');
      else {
        const c = calcs.get(id);
        try {
          // an input with no data (a source not shown on this site) reaches the calculation as an empty list
          value = ok(c.fn(...c.inputs.map((i) => { const d = dataOf(i); return d.status === 'ok' ? d.data : []; })));
        } catch (e) {
          value = not('error');
        }
      }
      memo.set(id, { gen, value });
      return value;
    }
    if (creditsStatus === 'loading') return not('loading');
    if (creditsStatus === 'error') return not('error');
    load(id);
    return store.get(id) || not('loading');
  }

  let queued = false;
  function changed() {
    gen += 1;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; redraw(); });
  }

  function redraw() {
    sawLoading = false;
    draws.forEach((def, name) => {
      document.querySelectorAll('[data-draw="' + CSS.escape(name) + '"]').forEach((el) => {
        try {
          delete el.dataset.empty;   // the chart helpers mark it again when they draw nothing; a custom drawing counts as content
          if (def.mount && !mounted.has(el)) mounted.set(el, def.mount(el));
          def.update(el, mounted.get(el));
        } catch (e) {
          el.textContent = '—';
          el.dataset.empty = 'true';
        }
      });
    });
    listeners.forEach((fn) => { try { fn(); } catch (e) { /* a page's own listener */ } });
    tidy();
    writeCredits();
  }

  function settled() {
    if (creditsStatus === 'loading' || sawLoading) return false;
    for (const v of store.values()) if (v.status === 'loading') return false;
    return true;
  }

  function isEmpty(el) {
    if (el.dataset.empty === 'true') return true;
    if (el.tagName === 'TBODY') return el.rows.length === 0;
    if (el.children.length === 0) return /^[\s—–-]*$/.test(el.textContent);
    return false;
  }

  let relaid = false;
  // any card hidden or shown changes the widths around it, so the charts are drawn again afterwards
  const setHidden = (el, v) => { if (el.hidden !== v) { el.hidden = v; relaid = true; } };

  // Hide whatever has nothing to show once every dataset has loaded or been found missing.
  function tidy() {
    if (!settled()) return;
    const root = document.querySelector('.gsl');
    if (!root) return;
    root.querySelectorAll('.gsl-tile, .gsl-card').forEach((box) => {
      const marks = [...box.querySelectorAll('[data-draw]')];
      if (!marks.length) return;
      setHidden(box, marks.every(isEmpty));
    });
    root.querySelectorAll('.gsl-tiles, .gsl-grid').forEach((g) => {
      const kids = [...g.children].filter((c) => c.matches('.gsl-tile, .gsl-card'));
      if (kids.length) setHidden(g, kids.every((c) => c.hidden));
      const h = g.previousElementSibling;
      if (h && h.matches('.gsl-h2')) setHidden(h, g.hidden);
    });
    const tabs = [...root.querySelectorAll('.gsl-tab')];
    tabs.forEach((t) => {
      const page = root.querySelector('.gsl-page[data-page="' + CSS.escape(t.dataset.tab) + '"]');
      if (!page) return;
      const boxes = [...page.querySelectorAll('.gsl-tile, .gsl-card')];
      setHidden(t, boxes.length > 0 && boxes.every((b) => b.hidden));
    });
    if (relaid) { relaid = false; changed(); }
    const current = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    if (current && current.hidden) {
      const next = tabs.find((t) => !t.hidden);
      if (next) next.click();
    }
  }

  function writeCredits() {
    const box = document.querySelector('[data-live-credits]');
    if (!box || !credits || !settled()) return;
    const used = new Set();
    let newest = '';
    store.forEach((v, id) => {
      const info = credits.datasets[id];
      if (v.status !== 'ok' || !info) return;
      (info.sources || []).forEach((s) => used.add(s));
      if (info.fetched && info.fetched > newest) newest = info.fetched;
    });
    const list = credits.sources.filter((s) => used.has(s.id) && s.credit);
    const key = list.map((s) => s.id).join(',') + newest;
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    box.replaceChildren();
    if (newest) {
      const p = document.createElement('p');
      p.className = 'live-updated';
      p.textContent = 'Data last fetched ' + new Date(newest).toUTCString().replace(':00 GMT', ' UTC').replace(/^\w+, /, '') + '. Refreshed every hour.';
      box.appendChild(p);
    }
    const ul = document.createElement('ul');
    list.forEach((s) => {
      const li = document.createElement('li');
      const b = document.createElement('b');
      b.textContent = s.name + '. ';
      li.appendChild(b);
      li.appendChild(document.createTextNode(s.credit + ' '));
      if (s.terms) {
        const a = document.createElement('a');
        a.href = s.terms;
        a.rel = 'noopener';
        a.textContent = 'Terms';
        li.appendChild(a);
      }
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  window.dash = {
    data,
    calc(id, o) { calcs.set(id, { inputs: o.inputs || [], fn: o.fn }); },
    loader() { /* not used on the public pages */ },
    draw(name, def) {
      const d = typeof def === 'function' ? { update: def } : def;
      draws.set(name, d);
      changed();
    },
    onData(fn) { listeners.push(fn); try { fn(); } catch (e) { /* ignore */ } },
    params: () => ({ ...params }),
    setParams(p) { params = { ...params, ...p }; changed(); },
    resetParams() { params = {}; changed(); },
    setLink(name) { if (name) history.replaceState(null, '', '#' + name); },
    refresh() {},
    colors: ['#E8A13C', '#3B6FD4', '#7E9B87', '#B07CD8', '#E07A5F', '#5BA4B4', '#C9A227', '#8C98AB'],
  };

  fetch(BASE + 'credits.json', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((c) => { credits = c; creditsStatus = 'ok'; changed(); })
    .catch(() => { creditsStatus = 'error'; changed(); });

  // Redraw at the right width when the page resizes or a tab is shown.
  window.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('.gsl');
    if (!root) return;
    let w = root.clientWidth;
    new ResizeObserver(() => { if (Math.abs(root.clientWidth - w) > 4) { w = root.clientWidth; changed(); } }).observe(root);
    // only a tab page being shown needs a redraw; cards this file hides do not
    new MutationObserver((ms) => { if (ms.some((m) => m.target.matches && m.target.matches('.gsl-page') && !m.target.hidden)) changed(); })
      .observe(root, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  });
})();
