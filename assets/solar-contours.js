// Solar suitability hero: editorial contour map. Draws canvas[data-solar-contours] on a 960 x 540 design grid.
// Colours come from --sc-* custom properties on the canvas (site.css, "Solar contours"), so every theme works.
// The page runtime rebuilds the markup after scripts run, so mounting waits for the canvas and survives a rebuild.
(function () {
  'use strict';
  function mount(canvas) {

    var T = 14;                 // loop length in seconds
    var W = 960, H = 540;       // logical design size
    var MX = 340, MY = 50, MW = 580, MH = 442; // map region
    var CS = 6;                 // grid cell size (logical px)
    var NX = Math.ceil(MW / CS), NY = Math.ceil(MH / CS);
    var S = NX + 1;             // row stride of the field grid
    var V = new Float32Array(S * (NY + 1));
    var PIN = { x: 640, y: 296 };
    var LEVEL_MIN = -0.3, LEVEL_STEP = 0.06, LEVEL_N = 21;
    var SANS = '"Helvetica Neue", Arial, sans-serif';
    var SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", serif';

    var ctx = canvas.getContext('2d');
    var dpr = 1, scale = 1;
    var P = { ink: '#1f2a33', paper: '#f8f6f0', accent: '#b4532c', muted: '#5d6670' };

    var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function seg(a, b, t) { return clamp01((t - a) / (b - a)); }
    function easeIO(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
    function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
    function easeBack(p) {
      var c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    }
    function bounce(p) {
      var n1 = 7.5625, d1 = 2.75;
      if (p < 1 / d1) return n1 * p * p;
      if (p < 2 / d1) { p -= 1.5 / d1; return n1 * p * p + 0.75; }
      if (p < 2.5 / d1) { p -= 2.25 / d1; return n1 * p * p + 0.9375; }
      p -= 2.625 / d1; return n1 * p * p + 0.984375;
    }

    // Irradiance field: a gentle south-facing slope plus slow, periodic waves.
    // ph runs 0 to 2*PI over the loop, and every term uses integer multiples
    // of ph, so the drift closes exactly at the loop point.
    function fillField(ph, bx, by, bA, bS) {
      for (var j = 0; j <= NY; j++) {
        var ny = j / NY, y = MY + ny * MH;
        for (var i = 0; i <= NX; i++) {
          var nx = i / NX, x = MX + nx * MW;
          var v = 0.35 * ny * (1 + 0.08 * Math.sin(ph))
            + 0.16 * Math.sin(5.0 * nx + 1.6 * Math.sin(2.3 * ny + ph) + 0.4)
            + 0.10 * Math.cos(4.2 * ny - 2.0 * nx + 2 * ph)
            + 0.06 * Math.sin(9.0 * nx * ny + ph);
          if (bA > 0) {
            var dx = x - bx, dy = y - by;
            v += bA * Math.exp(-(dx * dx + dy * dy) / (2 * bS * bS));
          }
          V[j * S + i] = v;
        }
      }
    }

    // Marching squares. Corner bits: a (top left) = 8, b (top right) = 4,
    // c (bottom right) = 2, d (bottom left) = 1. Edges: 0 top, 1 right, 2 bottom, 3 left.
    var SEG = [
      [], [[2, 3]], [[1, 2]], [[1, 3]], [[0, 1]], null, [[0, 2]], [[0, 3]],
      [[0, 3]], [[0, 2]], null, [[0, 1]], [[1, 3]], [[1, 2]], [[2, 3]], []
    ];
    var SAD5_HIGH = [[0, 3], [1, 2]], SAD5_LOW = [[0, 1], [2, 3]];
    var SAD10_HIGH = [[0, 1], [2, 3]], SAD10_LOW = [[0, 3], [1, 2]];
    var EX = 0, EY = 0;

    function edge(e, a, b, c, d, L, x0, y0) {
      var t;
      if (e === 0) { t = (L - a) / (b - a); EX = x0 + CS * t; EY = y0; }
      else if (e === 1) { t = (L - b) / (c - b); EX = x0 + CS; EY = y0 + CS * t; }
      else if (e === 2) { t = (L - d) / (c - d); EX = x0 + CS * t; EY = y0 + CS; }
      else { t = (L - a) / (d - a); EX = x0; EY = y0 + CS * t; }
    }

    function drawContours() {
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = P.ink;
      for (var k = 0; k < LEVEL_N; k++) {
        var L = LEVEL_MIN + k * LEVEL_STEP;
        ctx.globalAlpha = 0.26 + 0.22 * (k / LEVEL_N);
        ctx.beginPath();
        for (var j = 0; j < NY; j++) {
          var y0 = MY + j * CS;
          for (var i = 0; i < NX; i++) {
            var a = V[j * S + i], b = V[j * S + i + 1];
            var c = V[(j + 1) * S + i + 1], d = V[(j + 1) * S + i];
            var idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            var segs = SEG[idx];
            if (segs === null) {
              var avg = (a + b + c + d) / 4;
              if (idx === 5) segs = avg > L ? SAD5_HIGH : SAD5_LOW;
              else segs = avg > L ? SAD10_HIGH : SAD10_LOW;
            }
            var x0 = MX + i * CS;
            for (var s = 0; s < segs.length; s++) {
              edge(segs[s][0], a, b, c, d, L, x0, y0);
              var px = EX, py = EY;
              edge(segs[s][1], a, b, c, d, L, x0, y0);
              ctx.moveTo(px, py);
              ctx.lineTo(EX, EY);
            }
          }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function txt(s, x, y, font, color, align, alpha, ls) {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align || 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = alpha;
      ctx.letterSpacing = (ls || 0) + 'px';
      ctx.fillText(s, x, y);
    }

    function wrap(s, x, y, maxW, lh, font, alpha) {
      ctx.font = font;
      ctx.letterSpacing = '0px';
      var words = s.split(' '), line = '';
      for (var n = 0; n < words.length; n++) {
        var test = line ? line + ' ' + words[n] : words[n];
        if (ctx.measureText(test).width > maxW && line) {
          txt(line, x, y, font, P.ink, 'left', alpha, 0);
          y += lh;
          line = words[n];
        } else {
          line = test;
        }
      }
      if (line) txt(line, x, y, font, P.ink, 'left', alpha, 0);
    }

    function hairline(x1, y1, x2, y2, alpha) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = alpha;
      ctx.stroke();
    }

    function draw(tt) {
      var ph = 2 * Math.PI * tt / T;
      var out = 1 - seg(12.2, 13.2, tt);      // overlay fade before the loop resets
      var tg = easeIO(seg(2.3, 4.6, tt));     // tightening progress
      var bA = 0.42 * tg * out;
      var bS = 150 + (56 - 150) * tg;

      var cs = getComputedStyle(canvas);
      P.ink = cs.getPropertyValue('--sc-ink').trim() || P.ink;
      P.paper = cs.getPropertyValue('--sc-paper').trim() || P.paper;
      P.accent = cs.getPropertyValue('--sc-accent').trim() || P.accent;
      P.muted = cs.getPropertyValue('--sc-muted').trim() || P.muted;

      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = P.paper;
      ctx.fillRect(0, 0, W, H);

      fillField(ph, PIN.x, PIN.y, bA, bS);
      ctx.save();
      ctx.beginPath();
      ctx.rect(MX, MY, MW, MH);
      ctx.clip();
      drawContours();
      ctx.restore();

      var fadeIn = seg(0.0, 0.8, tt) * out;
      var labelFont = '600 10.5px ' + SANS;
      var bodyFont = '400 14px ' + SANS;
      var titleFont = '400 31px ' + SERIF;

      // Left column
      txt('SOLAR SUITABILITY CHECK', 48, 52, labelFont, P.muted, 'left', fadeIn, 2);
      txt('Will solar work', 48, 96, titleFont, P.ink, 'left', fadeIn);
      txt('at this address?', 48, 130, titleFont, P.ink, 'left', fadeIn);
      txt('Sample address: 12 Example Road', 48, 160, '400 13px ' + SANS, P.muted, 'left', fadeIn);
      hairline(48, 182, 300, 182, 0.5 * fadeIn);

      txt('WHY', 48, 208, labelFont, P.muted, 'left', fadeIn, 2);
      var reasons = [
        'Roof faces south with light shading (approximate)',
        'Not a listed building, and outside a conservation area',
        'Low flood risk, no blocking designations found'
      ];
      var reasonStart = [5.3, 5.7, 6.1];
      for (var r = 0; r < reasons.length; r++) {
        var ra = seg(reasonStart[r], reasonStart[r] + 0.5, tt) * out;
        var ry = 236 + r * 54;
        ctx.globalAlpha = ra;
        ctx.fillStyle = P.accent;
        ctx.fillRect(48, ry - 9, 6, 6);
        wrap(reasons[r], 64, ry, 236, 19, bodyFont, ra);
      }

      var yc = easeOut(seg(4.8, 6.6, tt));
      var yAlpha = seg(4.6, 5.0, tt) * out;
      var yieldVal = Math.round(3900 * yc).toLocaleString('en-GB');
      txt('ESTIMATED ANNUAL YIELD', 48, 414, labelFont, P.muted, 'left', yAlpha, 2);
      txt(yieldVal, 48, 462, '400 46px ' + SERIF, P.ink, 'left', yAlpha);
      ctx.font = '400 46px ' + SERIF;
      var vw = ctx.measureText(yieldVal).width;
      txt('kWh', 48 + vw + 8, 462, '400 16px ' + SANS, P.muted, 'left', yAlpha);
      txt('Sample figure for a 3.5 kWp system', 48, 486, '400 13px ' + SANS, P.muted, 'left', yAlpha);

      // Map header and legend
      txt('IRRADIANCE CONTOURS, SAMPLE', MX, 36, labelFont, P.muted, 'left', fadeIn, 2);
      var legA = seg(0.4, 1.0, tt) * out;
      txt('Lower', MX, 516, '400 10.5px ' + SANS, P.muted, 'left', legA);
      txt('Higher', MX + MW, 516, '400 10.5px ' + SANS, P.muted, 'right', legA);
      hairline(MX + 54, 511, MX + MW - 54, 511, 0.5 * legA);
      for (var t2 = 0; t2 <= 10; t2++) {
        var tx = MX + 54 + t2 * (MW - 108) / 10;
        hairline(tx, 511, tx, 511 - 3 - t2 * 0.4, 0.6 * legA);
      }

      // Pin drop
      var dropP = seg(1.0, 2.0, tt);
      var pinA = seg(0.9, 1.1, tt) * out;
      var pinY = PIN.y - 220 * (1 - bounce(dropP));
      if (pinA > 0) {
        var sr = 2 + 10 * easeOut(dropP);
        ctx.beginPath();
        ctx.ellipse(PIN.x, PIN.y, sr, sr * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = P.ink;
        ctx.globalAlpha = 0.25 * pinA;
        ctx.fill();
      }

      // Ripples on landing
      for (var i = 0; i < 3; i++) {
        var rp = seg(2.0 + i * 0.22, 3.3 + i * 0.22, tt);
        if (rp > 0 && rp < 1) {
          var rr = 6 + 120 * easeOut(rp);
          ctx.beginPath();
          ctx.ellipse(PIN.x, PIN.y, rr, rr * 0.42, 0, 0, Math.PI * 2);
          ctx.strokeStyle = P.accent;
          ctx.lineWidth = 1;
          ctx.globalAlpha = (1 - rp) * 0.85 * out;
          ctx.stroke();
        }
      }

      // Tightening ring around the pin
      var ringR = 110 + (46 - 110) * tg;
      var ringA = seg(2.3, 2.6, tt) * out;
      if (ringA > 0) {
        ctx.beginPath();
        ctx.arc(PIN.x, PIN.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = P.accent;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = ringA;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(PIN.x, PIN.y, ringR + 6, 0, Math.PI * 2);
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.5 * ringA;
        ctx.stroke();
      }

      // Leader line from ring to stamp, then the stamp
      var SX = PIN.x + 160, SY = PIN.y - 120;
      var lp = seg(4.0, 4.5, tt) * out;
      var lx0 = PIN.x + ringR * Math.cos(-0.9), ly0 = PIN.y + ringR * Math.sin(-0.9);
      var lx1 = SX - 88, ly1 = SY + 22;
      if (lp > 0) {
        ctx.beginPath();
        ctx.moveTo(lx0, ly0);
        ctx.lineTo(lx0 + (lx1 - lx0) * lp, ly0 + (ly1 - ly0) * lp);
        ctx.strokeStyle = P.accent;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.9 * out;
        ctx.stroke();
      }

      var sp = seg(4.4, 5.0, tt);
      if (sp > 0) {
        var sc = 1.35 - 0.35 * easeBack(sp);
        var sa = Math.min(1, sp * 2) * out;
        ctx.save();
        ctx.translate(SX, SY);
        ctx.rotate(-0.1);
        ctx.scale(sc, sc);
        ctx.globalAlpha = sa;
        ctx.fillStyle = P.paper;
        ctx.fillRect(-86, -28, 172, 56);
        ctx.strokeStyle = P.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(-86, -28, 172, 56);
        ctx.lineWidth = 0.7;
        ctx.strokeRect(-80, -22, 160, 44);
        ctx.font = 'italic 400 26px ' + SERIF;
        ctx.fillStyle = P.accent;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '0.5px';
        ctx.fillText('Good fit', 0, 1);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      ctx.letterSpacing = '0px';
    }

    // Pin is drawn last so it sits above the rings and stamp leader.
    function drawPin(tt) {
      var out = 1 - seg(12.2, 13.2, tt);
      var dropP = seg(1.0, 2.0, tt);
      var pinA = seg(0.9, 1.1, tt) * out;
      if (pinA <= 0) return;
      var x = PIN.x, y = PIN.y - 220 * (1 - bounce(dropP));
      ctx.globalAlpha = pinA;
      ctx.fillStyle = P.accent;
      ctx.beginPath();
      ctx.arc(x, y - 20, 8, 0, Math.PI * 2);
      ctx.moveTo(x - 6.5, y - 15);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 6.5, y - 15);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - 20, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = P.paper;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function renderAt(tt) {
      draw(tt);
      drawPin(tt);
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      var w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      scale = rect.width / W;
    }

    var elapsed = 0, lastNow = 0, rafId = 0, running = false, onScreen = true;
    var STATIC_T = 8.4;

    function frame(now) {
      if (!lastNow) lastNow = now;
      var dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      elapsed += dt;
      if (!canvas.isConnected) { running = false; return; }
      renderAt(elapsed % T);
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (running || mqReduce.matches || !onScreen || document.hidden) return;
      running = true;
      lastNow = 0;
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
    }

    function refresh() {
      if (mqReduce.matches) {
        stop();
        renderAt(STATIC_T);
      } else if (!running) {
        renderAt(elapsed % T);
      }
    }

    resize();
    refresh();
    start();

    // The page runtime strips the width and height attributes once after load, which clears the canvas.
  new MutationObserver(function () { if (canvas.isConnected) { resize(); refresh(); } }).observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });

  if ('ResizeObserver' in window) {
      new ResizeObserver(function () { resize(); refresh(); }).observe(canvas);
    } else {
      window.addEventListener('resize', function () { resize(); refresh(); });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) start(); else stop();
      }).observe(canvas);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    function onMotionChange() { refresh(); start(); }
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onMotionChange);
    new MutationObserver(function () { if (canvas.isConnected) refresh(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  }
  function scan() {
    document.querySelectorAll('canvas[data-solar-contours]').forEach(function (cv) {
      if (cv.__sc) return;
      cv.__sc = true;
      mount(cv);
    });
  }
  scan();
  document.addEventListener('DOMContentLoaded', scan);
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
