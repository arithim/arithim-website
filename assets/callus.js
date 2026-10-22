/* Arithim "Call us" widget. Progressive enhancement: without this script the .callus-link is a plain link to the
   contact page. Loads the vendored ElevenLabs client lazily, only when a call starts. No third-party CDNs
   except Cloudflare Turnstile (already used by the contact form). See tools/call-agent/docs/frontend.md. */
(function () {
  'use strict';
  if (window.__callus) return;
  window.__callus = true;

  var SDK_FILE = 'vendor/elevenlabs-client-1.29.0.js';
  var LIBSAMPLERATE_FILE = 'vendor/libsamplerate.worklet-2.1.2.js';
  var TURNSTILE_SITEKEY = '0x4AAAAAAFddwijZvXOLiEH1';
  var TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var CONNECT_TIMEOUT_MS = 8000;
  var SUMMARY_POLL_MS = 1500;
  var SUMMARY_POLL_MAX = 24;
  var CONTACT_URL = '/contact.html';

  var script = document.currentScript;
  var scriptSrc = script && script.src ? script.src : new URL('/assets/callus.js', location.href).href;
  var bookUrl = cleanUrl((script && script.getAttribute('data-book-url')) || (window.ARITHIM_CALLUS && window.ARITHIM_CALLUS.bookUrl) || '');
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(location.hostname) || /\.localhost$/.test(location.hostname);
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cleanUrl(u) {
    try { var x = new URL(u, location.href); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; }
  }

  /* ---------- tiny DOM helper ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  /* ---------- state ---------- */
  var S = {
    open: false, view: 'intro', mode: 'voice', opener: null,
    token: '', tsReady: false, tsFailed: false, tsId: null, tsPending: false, unlockCtx: null, micProbe: null,
    callId: null, conv: null, mock: false, mockTimers: [], agentName: 'Hannah', roster: {},
    muted: false, started: 0, tick: null, wake: null, connectTimer: null, ended: false, confirmClose: false,
    hadCall: false, helpfulSent: false, summaryText: '', waitingReply: false
  };

  /* ---------- diagnostics trail (no transcript text, no personal data beyond the user agent) ---------- */
  var DIAG_MAX_BYTES = 3800, DIAG_MAX_SENDS = 3, DIAG_QUICK_MS = 5000;
  var T = { t0: 0, ev: [], dbg: {}, sends: 0, env: null, sdkAt: 0, agentMsgs: 0, dropped: false };
  function tr(code, d) {
    if (T.ev.length >= 80) return;
    var e = [Date.now() - T.t0, code];
    if (d != null && d !== '') e.push(typeof d === 'string' ? d.slice(0, 200) : d);
    T.ev.push(e);
  }
  function trReset() {
    T.t0 = Date.now(); T.ev = []; T.dbg = {}; T.sends = 0; T.sdkAt = 0; T.agentMsgs = 0; T.dropped = false;
    T.env = {
      ua: String(navigator.userAgent || '').slice(0, 220),
      rtc: !!window.RTCPeerConnection,
      worklet: typeof window.AudioWorkletNode !== 'undefined',
      ac: typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined' ? 'unprobed' : 'none'
    };
    tr('open', S.mode);
  }
  function probeAudioContext() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var c = new AC();
      T.env.ac = c.state;
      var p = c.close && c.close(); if (p && p.catch) p.catch(function () {});
    } catch (e) { T.env.ac = 'error:' + (e && e.name); }
  }
  function errInfo(e) { return e ? String(e.name || 'Error') + ': ' + String(e.message || '').slice(0, 120) : ''; }
  function diagBody(reason) {
    var obj = { v: 1, reason: reason, env: T.env, ev: T.ev.slice(), dbg: T.dbg };
    var str = JSON.stringify(obj);
    while (str.length > DIAG_MAX_BYTES && obj.ev.length > 8) { obj.ev.splice(4, 1); obj.trimmed = true; str = JSON.stringify(obj); }
    if (str.length > DIAG_MAX_BYTES) { obj.dbg = {}; obj.env.ua = obj.env.ua.slice(0, 80); str = JSON.stringify(obj); }
    return obj;
  }
  function sendDiag(reason) {
    try {
      if (S.mock || !S.callId || /^mock-/.test(S.callId) || T.sends >= DIAG_MAX_SENDS) return;
      T.sends++;
      tr('send', reason);
      var payload = JSON.stringify({ callId: S.callId, trail: diagBody(reason) });
      var ok = false;
      if (navigator.sendBeacon) { try { ok = navigator.sendBeacon('/api/call/diag', new Blob([payload], { type: 'text/plain' })); } catch (e) {} }
      if (!ok) fetch('/api/call/diag', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: payload, keepalive: true, credentials: 'same-origin' }).catch(function () {});
    } catch (e) {}
  }

  var panel, titleEl, bodyEl, liveEl, tsEl, statusEl, whoEl, capEl, timeEl, chatBox, muteBtn;

  /* ---------- build panel (once) ---------- */
  function buildPanel() {
    liveEl = h('div', { class: 'callus-sr', role: 'status', 'aria-live': 'polite' });
    titleEl = h('h2', { class: 'callus-title', id: 'callus-title', text: 'Call Arithim' });
    var close = h('button', { class: 'callus-x', type: 'button', 'aria-label': 'Close', onclick: requestClose, text: '×' });
    bodyEl = h('div', { class: 'callus-body' });
    panel = h('div', { class: 'callus-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'callus-title', hidden: true, tabindex: '-1' },
      h('div', { class: 'callus-head' }, h('div', null, h('div', { class: 'callus-kicker', text: 'CALL US' }), titleEl), close),
      bodyEl, liveEl);
    panel.addEventListener('keydown', onKey);
    document.body.appendChild(panel);
    tsEl = h('div', { class: 'callus-ts' });
  }

  function announce(msg) { if (liveEl) { liveEl.textContent = ''; setTimeout(function () { liveEl.textContent = msg; }, 30); } }

  function setView(v) {
    S.view = v;
    bodyEl.textContent = '';
    if (v !== 'intro' && tsEl.parentNode) tsEl.parentNode.removeChild(tsEl);
    return bodyEl;
  }

  /* ---------- open / close / focus trap ---------- */
  function focusables() {
    return Array.prototype.filter.call(panel.querySelectorAll('button, a[href], textarea, input, select, iframe, [tabindex="0"]'), function (e) {
      return !e.disabled && e.offsetParent !== null && e.tabIndex !== -1;
    });
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); requestClose(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (!f.length) { e.preventDefault(); panel.focus(); return; }
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (e.shiftKey && (a === first || a === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  function openPanel(opener) {
    if (!panel) buildPanel();
    S.opener = opener || document.querySelector('.callus-link');
    if (S.open) { panel.focus(); return; }
    S.open = true;
    panel.hidden = false;
    if (!T.t0) trReset();
    tr('panel_open');
    document.querySelectorAll('.callus-link').forEach(function (l) { l.setAttribute('aria-expanded', 'true'); });
    var fl = document.querySelector('.callus-link:not(.callus-cta)'); if (fl) fl.hidden = true;
    if (S.view === 'intro' || !S.hadCall) showIntro();
    document.addEventListener('focusin', keepFocus);
  }
  function keepFocus(e) { if (S.open && !panel.contains(e.target)) { var f = focusables(); (f[0] || panel).focus(); } }
  function requestClose() {
    if (S.conv || S.mock && S.mockTimers.length && S.view === 'call') {
      S.confirmClose = !S.confirmClose; renderConfirm(); return;
    }
    closePanel();
  }
  function closePanel() {
    if (!S.open) return;
    S.open = false; panel.hidden = true; S.confirmClose = false;
    document.removeEventListener('focusin', keepFocus);
    var fl = document.querySelector('.callus-link:not(.callus-cta)'); if (fl) fl.hidden = false;
    document.querySelectorAll('.callus-link').forEach(function (l) { l.setAttribute('aria-expanded', 'false'); });
    if (S.view === 'connecting') { S.ended = true; cleanupCall(); S.view = 'closed'; }
    if (S.view !== 'call') { S.hadCall = false; }
    var o = S.opener && document.contains(S.opener) && !S.opener.hidden ? S.opener : document.querySelector('.callus-link');
    if (o) o.focus();
  }

  /* ---------- Turnstile ---------- */
  function loadTurnstile() {
    return new Promise(function (res, rej) {
      if (window.turnstile) return res();
      if (!document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/"]')) {
        var s = document.createElement('script'); s.src = TURNSTILE_SRC; s.async = true; s.defer = true; document.head.appendChild(s);
      }
      var n = 0, t = setInterval(function () {
        if (window.turnstile) { clearInterval(t); res(); }
        else if (++n > 100) { clearInterval(t); rej(new Error('turnstile')); }
      }, 100);
    });
  }
  // A Turnstile token is single use. Every consumer takes it through obtainToken(), which clears it; the next attempt resets the widget (on screen) and waits up to 20 s for a new one, so no attempt (retry, switch to text, try again) ever posts a token that was already spent.
  function renderTurnstile() {
    if (S.tsId != null) { S.tsPending = true; try { window.turnstile.reset(S.tsId); } catch (e) {} return; }
    S.tsPending = true;
    loadTurnstile().then(function () {
      if (S.tsId != null) return;
      S.tsId = window.turnstile.render(tsEl, {
        sitekey: TURNSTILE_SITEKEY, action: 'call-start', theme: 'dark',
        callback: function (t) { S.token = t; S.tsReady = true; S.tsFailed = false; S.tsPending = false; updateStart(); },
        'expired-callback': function () { S.token = ''; S.tsReady = false; S.tsPending = false; updateStart(); },
        'error-callback': function () { S.token = ''; S.tsReady = false; S.tsFailed = true; S.tsPending = false; updateStart(); return true; }
      });
    }).catch(function () { S.tsFailed = true; S.tsPending = false; updateStart(); });
  }
  // Resolves with a fresh token (or '' on a local preview where the check cannot run). The widget is moved into the connecting
  // view while we wait, because a Turnstile widget that is detached from the page never finishes a new challenge.
  function obtainToken() {
    return new Promise(function (res, rej) {
      function take() { var t = S.token; S.token = ''; S.tsReady = false; S.tsPending = false; updateStart(); res(t); }
      if (S.tsReady && S.token) return take();
      if (isLocal && S.tsFailed) return res('');
      var shown = false, n = 0;
      (function wait() {
        if (!S.open || S.view !== 'connecting') { var ea = new Error('abort'); ea.kind = 'abort'; return rej(ea); }
        if (S.tsReady && S.token) return take();
        if (isLocal && (S.tsFailed || n * 200 > 2500)) return res('');
        if (!shown) {
          shown = true;
          bodyEl.appendChild(h('p', { class: 'callus-note', role: 'status', text: 'Checking you are human…' }));
          bodyEl.appendChild(tsEl);
          if (S.tsId == null) renderTurnstile();
          else if (!S.tsPending) { S.tsReady = false; renderTurnstile(); }
        }
        // Still nothing after 8 s: ask for a new challenge once more now that the widget is on screen.
        if (n === 40) { S.tsReady = false; renderTurnstile(); }
        if (++n > 100) { var et = new Error('tscheck'); et.kind = 'tscheck'; return rej(et); }
        setTimeout(wait, 200);
      })();
    });
  }

  var startBtn, textBtn, tsHint;
  function updateStart() {
    if (!startBtn) return;
    var ok = S.tsReady || (isLocal && S.tsFailed);
    startBtn.disabled = !ok; textBtn.disabled = !ok;
    tsHint.textContent = ok ? (S.tsReady ? '' : 'Local preview: human check skipped.') : (S.tsFailed ? 'The human check could not load. Please use the contact form instead.' : 'Checking you are human…');
  }

  /* ---------- views ---------- */
  function showIntro(errMsg) {
    titleEl.textContent = 'Call Arithim';
    var b = setView('intro');
    if (errMsg) b.appendChild(h('p', { class: 'callus-err', role: 'alert', text: errMsg }));
    b.appendChild(h('p', null, 'Talk to Arithim’s AI assistants about what you are trying to run better. They can answer questions about our work and pass your enquiry to Tarun.'));
    b.appendChild(h('p', { class: 'callus-disclosure' },
      'You will speak to AI assistants, not people. The conversation is transcribed. This is for over-18s and business enquiries. See our ',
      h('a', { href: '/privacy.html', target: '_blank', rel: 'noopener' }, 'privacy notice'), '.'));
    b.appendChild(tsEl);
    tsHint = h('p', { class: 'callus-note', role: 'status', 'aria-live': 'polite' });
    b.appendChild(tsHint);
    startBtn = h('button', { class: 'callus-btn primary', type: 'button', disabled: true, onclick: function () { startFlow('voice'); } }, phoneIcon(), 'Start call');
    textBtn = h('button', { class: 'callus-btn', type: 'button', disabled: true, onclick: function () { startFlow('text'); } }, 'Chat by text instead');
    b.appendChild(h('div', { class: 'callus-row' }, startBtn, textBtn));
    b.appendChild(h('p', { class: 'callus-note' }, 'Prefer email? ', h('a', { href: 'mailto:hello@arithim.com' }, 'hello@arithim.com'), ' or the ', h('a', { href: CONTACT_URL }, 'contact form'), '.'));
    updateStart();
    renderTurnstile();
    if (isLocal) setTimeout(function () { if (!S.tsReady) { S.tsFailed = true; updateStart(); } }, 2500);
    setTimeout(function () { if (S.view === 'intro') (startBtn.disabled ? panel : startBtn).focus(); }, 0);
  }

  function showFallback(msg, opts) {
    opts = opts || {};
    cleanupCall();
    titleEl.textContent = 'Let’s use another route';
    var b = setView('fallback');
    b.appendChild(h('p', { class: 'callus-err', role: 'alert', text: msg }));
    var row = h('div', { class: 'callus-row' });
    if (opts.retry) row.appendChild(h('button', { class: 'callus-btn primary', type: 'button', onclick: function () { startFlow(S.mode); } }, 'Try again'));
    if (opts.text) row.appendChild(h('button', { class: 'callus-btn' + (opts.retry ? '' : ' primary'), type: 'button', onclick: chatByText }, 'Chat by text instead'));
    row.appendChild(h('a', { class: 'callus-btn' + (opts.text ? '' : ' primary'), href: CONTACT_URL }, 'Use the contact form'));
    b.appendChild(row);
    b.appendChild(h('p', { class: 'callus-note' }, 'Or email ', h('a', { href: 'mailto:hello@arithim.com' }, 'hello@arithim.com'), '.'));
    announce(msg);
    var f = focusables(); (f[0] || panel).focus();
  }

  // "Chat by text instead" from the fallback screen: startFlow fetches a fresh human-check token itself (waits up to 20 s).
  function chatByText() { startFlow('text'); }

  function showConnecting() {
    titleEl.textContent = S.mode === 'voice' ? 'Connecting…' : 'Opening chat…';
    var b = setView('connecting');
    b.appendChild(h('div', { class: 'callus-status' }, h('span', { class: 'callus-dot live' }), h('span', { text: 'Connecting' })));
    b.appendChild(h('p', { text: S.mode === 'voice' ? 'Setting up your call. You may be asked to allow the microphone.' : 'Opening the chat.' }));
    announce('Connecting');
    panel.focus();
  }

  function showCall() {
    titleEl.textContent = S.mode === 'voice' ? 'On a call' : 'Text chat';
    var b = setView('call');
    if (S.mock) b.appendChild(h('p', { class: 'callus-note', text: 'Preview mode: a scripted demo. No real call is made and nothing is recorded.' }));
    statusEl = h('span', { text: 'Connecting' });
    whoEl = h('span', { class: 'callus-who', text: S.agentName });
    timeEl = h('span', { 'aria-hidden': 'true', text: '0:00' });
    S.dot = h('span', { class: 'callus-dot live' });
    b.appendChild(h('div', { class: 'callus-status' }, S.dot, statusEl, whoEl, timeEl));
    capEl = h('ul', { class: 'callus-captions' + (S.mode === 'text' ? '' : ''), role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation', tabindex: '0' });
    b.appendChild(capEl);
    var actions = h('div', { class: 'callus-row', id: 'callus-actions' });
    b.appendChild(actions);
    if (S.mode === 'text') {
      chatBox = h('textarea', { rows: '1', 'aria-label': 'Your message', placeholder: 'Type your message', maxlength: '1000',
        onkeydown: function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } } });
      b.insertBefore(h('div', { class: 'callus-chat' }, chatBox, h('button', { class: 'callus-btn primary', type: 'button', onclick: sendText }, 'Send')), actions);
    }
    renderActions();
    S.started = Date.now();
    clearInterval(S.tick);
    S.tick = setInterval(function () {
      var s = Math.floor((Date.now() - S.started) / 1000);
      if (timeEl) timeEl.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
    }, 1000);
    setStatus('Listening', 'live');
    if (S.mode === 'text') chatBox.focus(); else if (muteBtn) muteBtn.focus();
  }

  function renderActions() { renderConfirm(); }
  function renderConfirm() {
    var a = document.getElementById('callus-actions');
    if (!a) return;
    a.textContent = '';
    if (S.confirmClose && S.view === 'call') {
      a.appendChild(h('p', { class: 'callus-note', style: 'width:100%;margin:0', text: 'End the ' + (S.mode === 'voice' ? 'call' : 'chat') + ' and close?' }));
      a.appendChild(h('button', { class: 'callus-btn danger', type: 'button', onclick: endCall }, 'End and close'));
      a.appendChild(h('button', { class: 'callus-btn', type: 'button', onclick: function () { S.confirmClose = false; renderConfirm(); } }, 'Keep going'));
      a.firstChild.nextSibling.focus();
      return;
    }
    if (S.mode === 'voice') {
      muteBtn = h('button', { class: 'callus-btn', type: 'button', 'aria-pressed': S.muted ? 'true' : 'false', onclick: toggleMute }, S.muted ? 'Unmute' : 'Mute');
      a.appendChild(muteBtn);
    }
    a.appendChild(h('button', { class: 'callus-btn danger', type: 'button', onclick: endCall }, S.mode === 'voice' ? 'End call' : 'End chat'));
  }

  function setStatus(text, kind) {
    if (!statusEl) return;
    statusEl.textContent = text;
    S.dot.className = 'callus-dot' + (kind ? ' ' + kind : '');
    announce(text);
  }
  function setWho(name) { S.agentName = name; if (whoEl) whoEl.textContent = name; }

  function addLine(role, text, who) {
    if (!capEl || !text) return;
    var li = h('li', { class: role },
      role === 'sys' ? null : h('span', { class: 'who', text: role === 'user' ? 'You' : (who || S.agentName) }), text);
    capEl.appendChild(li);
    capEl.scrollTo ? capEl.scrollTo({ top: capEl.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' }) : (capEl.scrollTop = capEl.scrollHeight);
  }

  /* ---------- actions ---------- */
  function toggleMute() {
    S.muted = !S.muted;
    try { if (S.conv && S.conv.setMicMuted) S.conv.setMicMuted(S.muted); } catch (e) {}
    muteBtn.setAttribute('aria-pressed', S.muted ? 'true' : 'false');
    muteBtn.textContent = S.muted ? 'Unmute' : 'Mute';
    announce(S.muted ? 'Microphone muted' : 'Microphone on');
  }
  function sendText() {
    var t = (chatBox.value || '').trim();
    if (!t) return;
    chatBox.value = '';
    addLine('user', t);
    S.waitingReply = true;
    setStatus('Waiting for a reply', 'live');
    if (S.mock) return mockReply(t);
    try { S.conv.sendUserMessage(t); } catch (e) { addLine('sys', 'Message could not be sent.'); }
  }

  /* ---------- start flow ---------- */
  function startFlow(mode) {
    S.mode = mode; S.ended = false; S.muted = false; S.helpfulSent = false; S.mock = false;
    S.agentName = 'Hannah'; S.callId = null; S.hadCall = true;
    trReset();
    showConnecting();
    var micStep = Promise.resolve();
    var forceMock = isLocal && /callus-mock/.test(location.hash); // local review only: skips mic and API
    if (forceMock) { S.mock = true; S.callId = 'mock-' + Date.now().toString(36); return setTimeout(function () { if (S.view === 'connecting') runMock(); }, 600); }
    if (mode === 'voice') {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.RTCPeerConnection) {
        return showFallback('Your browser cannot take voice calls here. You can chat by text, or use the contact form.', { text: true });
      }
      tr('mic_request');
      // Safari only lets audio start inside a user gesture, and the SDK builds its AudioContext after the network round trip.
      // Unlock one here, synchronously in the click, and keep the mic probe stream open until the session is up.
      unlockAudio();
      micStep = navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        tr('mic_granted');
        stopMicProbe(); S.micProbe = stream;
        probeAudioContext();
      });
    }
    var tokenStep = obtainToken();
    tokenStep.catch(function () {});
    micStep.then(function () {
      return tokenStep;
    }, function (err) {
      tr('mic_denied', String(err && err.name || 'unknown'));
      var e = new Error('mic'); e.mic = true; e.name = err && err.name; throw e;
    }).then(function (token) {
      return fetch('/api/call/start', {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ turnstileToken: token, mode: mode })
      });
    }).then(function (res) {
      tr('start_post', res.status);
      // Local review only: a static server has no /api/call/start (404), or answers POST with 405 / 501 (python http.server).
      if ((res.status === 404 || res.status === 405 || res.status === 501) && isLocal) return { mock: true };
      if (res.status === 503) { var e = new Error('off'); e.kind = 'off'; throw e; }
      if (res.status === 429) { var e2 = new Error('budget'); e2.kind = 'budget'; throw e2; }
      if (res.status === 403) {
        // Only a failed Turnstile check is the human check. A refused origin ("forbidden") is not.
        return res.json().then(function (j) { return j; }, function () { return {}; }).then(function (j) {
          var e3 = new Error('http 403'); e3.kind = j && j.error === 'challenge verification failed' ? 'verify' : 'http'; throw e3;
        });
      }
      if (!res.ok) { var e4 = new Error('http ' + res.status); e4.kind = 'http'; throw e4; }
      return res.json();
    }).then(function (data) {
      if (S.view !== 'connecting') return;
      if (data.agents) S.roster = data.agents;
      if (data.agent && data.agent.name) S.agentName = data.agent.name;
      if (data.mock) { S.mock = true; S.callId = data.callId || 'mock-' + Date.now().toString(36); return runMock(); }
      if (!data.callId || !data.signedUrl) { var e = new Error('bad'); e.kind = 'http'; throw e; }
      S.callId = data.callId;
      tr('call_id');
      return runSdk(data);
    }).catch(function (err) {
      handleStartError(err);
    });
  }

  function handleStartError(err) {
    tr('start_error', err && err.kind ? err.kind + (err.message ? ':' + err.message : '') : errInfo(err));
    if (S.callId) sendDiag('start_error');
    if (S.ended || S.view !== 'connecting') return;
    var voice = S.mode === 'voice';
    if (err && err.mic) {
      return showFallback(err.name === 'NotFoundError'
        ? 'No microphone was found. You can chat by text instead.'
        : 'The microphone is blocked. Allow it in your browser’s site settings to call, or chat by text instead.', { text: true });
    }
    switch (err && err.kind) {
      case 'off': return showFallback('Calls are switched off at the moment. Please use the contact form and we will reply within one working day.');
      case 'budget': return showFallback(voice ? 'We have reached our voice call limit for now. You can chat by text instead, or use the contact form and we will reply within one working day.' : 'We have reached our chat limit for now. Please use the contact form and we will reply within one working day.', { text: voice });
      case 'verify': return showIntro('The human check did not pass. Please try again.');
      case 'tscheck': return showFallback('The human check did not complete.' + (voice ? ' You can try again, chat by text, or use the contact form.' : ' Please try again or use the contact form.'), { text: voice, retry: true });
      case 'abort': return;
      case 'timeout': return showFallback('The call did not connect in time.' + (voice ? ' You can chat by text instead.' : ''), { text: voice });
      default: return showFallback('Something went wrong connecting.' + (voice ? ' You can chat by text instead.' : ''), { text: voice });
    }
  }

  /* ---------- real session (ElevenLabs SDK) ---------- */
  function runSdk(data) {
    var timedOut = false, conv = null;
    var timeout = new Promise(function (_, rej) {
      S.connectTimer = setTimeout(function () { timedOut = true; var e = new Error('timeout'); e.kind = 'timeout'; rej(e); }, CONNECT_TIMEOUT_MS);
    });
    tr('sdk_import');
    var go = import(new URL(SDK_FILE, scriptSrc).href).then(function (m) {
      tr('sdk_import_ok');
      var opts = {
        dynamicVariables: { call_id: S.callId },
        textOnly: S.mode === 'text',
        useWakeLock: false,
        onConnect: function () { tr('on_connect'); if (!timedOut) { clearTimeout(S.connectTimer); } },
        onStatusChange: function (st) { tr('status', st && (st.status || st)); },
        onDebug: function (d) { var k = d && typeof d.type === 'string' ? d.type.slice(0, 40) : 'other'; if (T.dbg[k] || Object.keys(T.dbg).length < 20) T.dbg[k] = (T.dbg[k] || 0) + 1; },
        onDisconnect: function (d) { noteDisconnect(d); if (S.conv || conv || S.view === 'connecting') onSessionEnd(d); },
        onError: function (msg, ctx) {
          var c = ''; try { c = ctx == null ? '' : (typeof ctx === 'string' ? ctx : JSON.stringify(ctx)); } catch (e) {}
          tr('on_error', String(msg && msg.message || msg || '').slice(0, 160) + (c ? ' | ' + c.slice(0, 160) : ''));
          if (S.view === 'call') addLine('sys', 'Connection problem.');
        },
        onMessage: onSdkMessage,
        onModeChange: function (m2) {
          if (S.mode !== 'voice') return;
          if (m2.mode === 'speaking') setStatus(S.agentName + ' is speaking', 'speaking'); else setStatus('Listening', 'live');
        },
        onAgentToolRequest: function (t) { if (/transfer/i.test(t.tool_name)) { setStatus('Transferring you', 'live'); addLine('sys', 'Transferring you to a colleague…'); } },
        onAgentToolResponse: onToolResponse
      };
      opts.signedUrl = data.signedUrl; opts.connectionType = 'websocket';
      // The WebSocket audio path may load a libsamplerate worklet (when the browser cannot make a 16 kHz AudioContext, e.g. Safari).
      // The SDK would fetch it from jsdelivr; serve our vendored copy instead.
      opts.libsampleratePath = new URL(LIBSAMPLERATE_FILE, scriptSrc).href;
      T.sdkAt = Date.now();
      tr('start_session');
      return m.Conversation.startSession(opts);
    }).then(function (c) {
      tr('session_started');
      conv = c;
      if (timedOut) { try { c.endSession(); } catch (e) {} return null; }
      return c;
    });
    go.catch(function (e) { tr('sdk_error', errInfo(e)); });
    return Promise.race([go, timeout]).then(function (c) {
      clearTimeout(S.connectTimer);
      if (S.view !== 'connecting') { try { if (c) c.endSession(); } catch (e) {} return; }
      if (T.dropped) { try { if (c) c.endSession(); } catch (e) {} return couldntConnect('dropped_while_connecting'); }
      S.conv = c; S.ended = false;
      stopMicProbe();
      showCall();
      if (S.mode === 'voice') { acquireWake(); setStatus('Listening', 'live'); }
      else setStatus('Connected. Say hello', 'live');
    }).catch(function (e) {
      clearTimeout(S.connectTimer);
      if (e && e.kind === 'timeout') { tr('timeout'); throw e; }
      var e2 = new Error('sdk'); e2.kind = 'http'; throw e2;
    });
  }

  function onSdkMessage(m) {
    if (m && (m.role === 'agent' || m.source === 'ai')) T.agentMsgs++;
    var role = m.role || (m.source === 'user' ? 'user' : 'agent');
    if (role === 'user') { if (S.mode === 'text') return; addLine('user', m.message); return; }
    S.waitingReply = false;
    addLine('agent', m.message);
    if (S.mode === 'text') setStatus('Connected', 'live');
  }
  function onToolResponse(t) {
    if (!/transfer/i.test(t.tool_name || '') || t.is_error) return;
    var name = '';
    if (t.full_tool_result) {
      try {
        var r = JSON.parse(t.full_tool_result);
        var id = r.agent_id || r.to_agent_id || r.target_agent_id;
        name = r.agent_name || r.to_agent_name || (S.roster[id] && (S.roster[id].name || S.roster[id])) || '';
      } catch (e) {}
    }
    setWho(name || 'Colleague');
    setStatus('Listening', 'live');
  }

  function noteDisconnect(d) {
    var o = {};
    if (d && typeof d === 'object') {
      ['reason', 'closeCode', 'closeReason', 'message'].forEach(function (k) { if (d[k] != null) o[k] = String(d[k]).slice(0, 120); });
    }
    tr('disconnect', o);
  }
  function couldntConnect(why) {
    sendDiag(why);
    S.ended = true;
    var c = S.conv; S.conv = null;
    try { if (c && c.isOpen && c.isOpen()) c.endSession(); } catch (e) {}
    showFallback('The call couldn’t connect. You can chat by text instead.', { text: S.mode === 'voice' });
  }
  function onSessionEnd(d) {
    if (S.ended) return;
    var reason = d && d.reason;
    if (S.view === 'connecting') { T.dropped = true; return; } // handled by the connect path
    var quick = T.sdkAt && Date.now() - T.sdkAt < DIAG_QUICK_MS && !T.agentMsgs;
    if (quick) { tr('quick_disconnect'); return couldntConnect('quick_disconnect'); }
    sendDiag('disconnect');
    finishCall(reason === 'error' ? 'The connection dropped.' : '');
  }

  function endCall() {
    S.confirmClose = false;
    if (S.mock) return finishCall('');
    finishCall('');
  }

  function unlockAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var c = S.unlockCtx && S.unlockCtx.state !== 'closed' ? S.unlockCtx : (S.unlockCtx = new AC());
      var p = c.resume && c.resume(); if (p && p.catch) p.catch(function () {});
      var src = c.createBufferSource(); src.buffer = c.createBuffer(1, 1, 22050); src.connect(c.destination); src.start(0);
    } catch (e) {}
  }
  function stopMicProbe() {
    try { if (S.micProbe) S.micProbe.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    S.micProbe = null;
  }
  function closeUnlock() { try { if (S.unlockCtx && S.unlockCtx.close) S.unlockCtx.close().catch(function () {}); } catch (e) {} S.unlockCtx = null; }

  function cleanupCall() {
    stopMicProbe(); closeUnlock();
    clearTimeout(S.connectTimer);
    clearInterval(S.tick);
    S.mockTimers.forEach(clearTimeout); S.mockTimers = [];
    releaseWake();
    S.conv = null;
  }

  function finishCall(note) {
    if (S.ended) return;
    S.ended = true;
    var c = S.conv; S.conv = null;
    tr('finish', note ? 'note' : '');
    try { if (c && c.isOpen && c.isOpen()) c.endSession(); } catch (e) {}
    cleanupCall();
    sendDiag('end');
    showSummary(note);
  }

  /* ---------- wake lock (voice calls) ---------- */
  function acquireWake() {
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen').then(function (l) { S.wake = l; l.addEventListener('release', function () { S.wake = null; }); }).catch(function () {});
  }
  function releaseWake() { try { if (S.wake) S.wake.release(); } catch (e) {} S.wake = null; }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && S.conv && S.mode === 'voice' && !S.wake) acquireWake();
  });

  /* ---------- summary ---------- */
  function showSummary(note) {
    titleEl.textContent = 'Your summary';
    var b = setView('summary');
    if (note) b.appendChild(h('p', { class: 'callus-note', text: note }));
    var holder = h('div');
    b.appendChild(holder);
    holder.appendChild(h('p', { role: 'status', text: 'Preparing your summary…' }));
    announce('The call has ended. Preparing your summary.');
    panel.focus();
    var id = S.callId;
    fetchSummary(id).then(function (txt) {
      if (S.view !== 'summary') return;
      // The server's stock reply for a call with no recorded turns: offer another route instead of an empty summary.
      if (/^There is no written summary for this call/.test(txt) && S.mode === 'voice') {
        return showFallback('No conversation was recorded for this call. You can chat by text instead.', { text: true });
      }
      S.summaryText = txt;
      renderSummary(holder, txt);
    }).catch(function () {
      if (S.view !== 'summary') return;
      holder.textContent = '';
      holder.appendChild(h('p', { text: 'We could not load a summary this time.' }));
      holder.appendChild(h('div', { class: 'callus-row' }, h('a', { class: 'callus-btn primary', href: CONTACT_URL }, 'Send us a message'), h('button', { class: 'callus-btn', type: 'button', onclick: closePanel }, 'Close')));
    });
  }

  function fetchSummary(id) {
    if (S.mock) return new Promise(function (r) { setTimeout(function () { r(MOCK_SUMMARY); }, 900); });
    var n = 0;
    function once() {
      return fetch('/api/call/summary?callId=' + encodeURIComponent(id), { credentials: 'same-origin', headers: { accept: 'application/json' } })
        .then(function (res) {
          if (res.status === 202 || res.status === 404 && n < 3) return retry();
          if (!res.ok) throw new Error('summary');
          return res.json();
        }).then(function (j) {
          if (j && typeof j.summary === 'string' && j.summary) return j.summary;
          if (j && (j.status === 'pending' || j.pending)) return retry();
          throw new Error('summary');
        });
    }
    function retry() {
      if (++n > SUMMARY_POLL_MAX) throw new Error('summary');
      return new Promise(function (r) { setTimeout(r, SUMMARY_POLL_MS); }).then(once);
    }
    return once();
  }

  function renderSummary(holder, txt) {
    holder.textContent = '';
    holder.appendChild(h('div', { class: 'callus-summary', tabindex: '0', role: 'region', 'aria-label': 'Call summary' }, txt));
    var copy = h('button', { class: 'callus-btn', type: 'button', onclick: function () { copyText(txt, copy); } }, 'Copy');
    var row = h('div', { class: 'callus-row' }, copy, h('button', { class: 'callus-btn', type: 'button', onclick: function () { printText(txt); } }, 'Print'));
    holder.appendChild(row);
    if (bookUrl) holder.appendChild(h('div', { class: 'callus-row' }, h('a', { class: 'callus-btn primary', href: bookUrl, target: '_blank', rel: 'noopener' }, 'Book a time with Tarun')));
    var up = h('button', { class: 'callus-btn', type: 'button', 'aria-pressed': 'false', onclick: function () { vote(true, up, down, help); } }, 'Helpful');
    var down = h('button', { class: 'callus-btn', type: 'button', 'aria-pressed': 'false', onclick: function () { vote(false, up, down, help); } }, 'Not helpful');
    var help = h('div', { class: 'callus-helpful', role: 'group', 'aria-label': 'Was this summary helpful?' }, h('span', { text: 'Was this helpful?' }), up, down);
    holder.appendChild(help);
    holder.appendChild(h('p', { class: 'callus-note', text: 'This summary is shown here only and is not emailed to you. Copy or print it to keep it.' }));
    holder.appendChild(h('div', { class: 'callus-row' }, h('button', { class: 'callus-btn', type: 'button', onclick: closePanel }, 'Close')));
    announce('Your summary is ready.');
    var s = holder.querySelector('.callus-summary'); if (s) s.focus();
  }

  function vote(val, up, down, group) {
    if (S.helpfulSent) return;
    S.helpfulSent = true;
    (val ? up : down).setAttribute('aria-pressed', 'true');
    up.disabled = true; down.disabled = true;
    group.appendChild(h('span', { text: 'Thank you.' }));
    announce('Thank you for the feedback.');
    if (S.mock) return;
    try {
      fetch('/api/call/summary', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ callId: S.callId, helpful: val }) }).catch(function () {});
    } catch (e) {}
  }

  function copyText(txt, btn) {
    function ok() { btn.textContent = 'Copied'; announce('Summary copied'); setTimeout(function () { btn.textContent = 'Copy'; }, 2000); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback); else fallback();
    function fallback() {
      var t = h('textarea', { style: 'position:fixed;left:-9999px', 'aria-hidden': 'true' }); t.value = txt; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); ok(); } catch (e) { btn.textContent = 'Copy failed'; }
      document.body.removeChild(t);
    }
  }
  function printText(txt) {
    var root = h('div', { class: 'callus-print-root' }, 'Arithim call summary\n\n' + txt);
    document.body.appendChild(root); document.body.classList.add('callus-printing');
    function done() { document.body.classList.remove('callus-printing'); if (root.parentNode) root.parentNode.removeChild(root); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    window.print();
  }

  /* ---------- mock mode (previews, local review) ---------- */
  var MOCK_SUMMARY = 'Example summary (preview mode, not a real call)\n\nWhat you told us\n- Supplier approvals take too long and are tracked in spreadsheets.\n- Roughly 40 suppliers a month, three people involved.\n\nWhat we discussed\n- Where AI helps and where plain workflow automation is enough.\n- A short discovery conversation to look at the current process.\n\nAgreed next step\n- Tarun will contact you within one working day to arrange a discovery call.';
  var MOCK_VOICE = [
    [900, 'agent', 'Hannah', 'Hello, you have reached Arithim. I am an AI assistant. How can I help?'],
    [3200, 'user', '', 'We want to understand whether AI could speed up our supplier approvals.'],
    [5400, 'agent', 'Hannah', 'That is a question for our consulting team. Let me put you through.'],
    [6800, 'sys', '', 'Transferring you to a colleague…'],
    [7600, 'who', 'Oliver'],
    [8200, 'agent', 'Oliver', 'Hello, I am Oliver, the consulting assistant. How many suppliers do you onboard each month, and who signs them off today?'],
    [11500, 'user', '', 'About forty a month, and three people sign off.'],
    [13800, 'agent', 'Oliver', 'Thank you. Tarun can look at your process in a short discovery call. I will write up what we covered now.'],
    [16500, 'end']
  ];
  function runMock() {
    showCall();
    setStatus('Listening', 'live');
    if (S.mode === 'text') { setStatus('Connected', 'live'); S.mockTimers.push(setTimeout(function () { addLine('agent', 'Hello, you have reached Arithim. I am an AI assistant. How can I help?', 'Hannah'); }, 600)); return; }
    MOCK_VOICE.forEach(function (st) {
      S.mockTimers.push(setTimeout(function () {
        if (st[1] === 'agent') { setStatus(st[2] + ' is speaking', 'speaking'); addLine('agent', st[3], st[2]); S.mockTimers.push(setTimeout(function () { setStatus('Listening', 'live'); }, 2200)); }
        else if (st[1] === 'user') addLine('user', st[3]);
        else if (st[1] === 'sys') { setStatus('Transferring you', 'live'); addLine('sys', st[3]); }
        else if (st[1] === 'who') { setWho(st[2]); }
        else if (st[1] === 'end') finishCall('');
      }, st[0]));
    });
  }
  function mockReply(t) {
    S.mockTimers.push(setTimeout(function () {
      S.waitingReply = false; setStatus('Connected', 'live');
      addLine('agent', 'Thanks. That sounds like a question for our consulting team. In the live version I would pass you across and write up the next step.', S.agentName);
    }, 900));
  }

  /* ---------- icon + wiring ---------- */
  function phoneIcon() {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.setAttribute('width', '18'); s.setAttribute('height', '18');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z');
    p.setAttribute('fill', 'currentColor'); s.appendChild(p); return s;
  }

  function upgrade(el) {
    if (el.__callus) return; el.__callus = true;
    el.setAttribute('role', 'button'); el.setAttribute('aria-haspopup', 'dialog'); el.setAttribute('aria-expanded', 'false');
    el.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); openPanel(el); } });
  }
  function upgradeAll() { document.querySelectorAll('.callus-link').forEach(upgrade); }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var path = e.composedPath ? e.composedPath() : [e.target];
    for (var i = 0; i < path.length; i++) {
      var n = path[i];
      if (n && n.classList && n.classList.contains('callus-link')) { e.preventDefault(); upgrade(n); openPanel(n); return; }
    }
  });

  function init() { upgradeAll(); window.addEventListener('load', upgradeAll); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.arithimCallUs = { open: function () { openPanel(); } };
})();
