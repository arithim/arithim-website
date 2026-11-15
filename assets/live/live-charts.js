/*
 * live-charts.js: chart helpers for the live pages, loaded after the dashboards' own scripts.
 *
 * The dashboards were written with bar charts. This file replaces them in the shared helper object (window.GSL),
 * so every dashboard that calls them gets the new drawing without being edited:
 *   GSL.hbar, GSL.divBar   ranked dot plots, one dot per row on a faint guide line
 *   GSL.barChart           a smooth area over time, with the optional average line
 *   GSL.ranked             ranked small multiples: one row per grid with a 48-hour sparkline, the latest value, and a strip
 *                          that shades today's range against the grid's range over the whole period, sorted by latest value
 * and it re-registers two drawings (eu-bars, r-now-bars) to use GSL.ranked.
 */
(() => {
  'use strict';
  const G = window.GSL;
  if (!G || !window.d3) return;
  const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const width = (el, min) => Math.max(min || 280, el.clientWidth || 600);
  const svgIn = (el, W, H) => d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
  const textWidth = (svg, list, cls) => {
    const t = svg.append('text').attr('class', cls).attr('opacity', 0);
    let w = 0;
    list.forEach((s) => { t.text(s); w = Math.max(w, t.node().getComputedTextLength()); });
    t.remove();
    return w;
  };
  const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

  /* ---- dot plots: rows [{label, value, color?}] ---- */
  function dots(el, o, signed) {
    el.replaceChildren();
    el.dataset.empty = String(!o.rows.length);
    const rowH = 24, pad = 4;
    const H = pad * 2 + o.rows.length * rowH;
    const W = width(el, 280);
    const svg = svgIn(el, W, H);
    const ml = Math.min(W * 0.4, textWidth(svg, o.rows.map((r) => r.label), 'gsl-tick') + 10);
    const lw = textWidth(svg, o.rows.map((r) => o.fmt(r.value)), 'gsl-tick') + 14;
    const lo = signed ? Math.min(0, d3.min(o.rows, (r) => r.value) || 0) : 0;
    const hi = Math.max(0, d3.max(o.rows, (r) => r.value) || 0) || 1;
    const x = d3.scaleLinear([lo, hi], [ml + 8, W - lw - 8]);
    if (signed) svg.append('line').attr('class', 'gsl-axis').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', H);
    const g = svg.append('g').selectAll('g').data(o.rows).join('g').attr('transform', (_, i) => `translate(0,${pad + i * rowH})`);
    g.append('text').attr('class', 'gsl-tick').attr('x', ml).attr('y', rowH / 2).attr('dy', '0.32em').attr('text-anchor', 'end')
      .text((r) => clip(r.label, Math.max(8, Math.floor(ml / 6.5))));
    g.append('line').attr('class', 'gsl-grid-line').attr('x1', ml + 8).attr('x2', W - lw - 8).attr('y1', rowH / 2).attr('y2', rowH / 2);
    const colour = (r) => r.color || (signed ? (r.value >= 0 ? o.pos : o.neg) : o.color);
    g.append('circle').attr('class', 'gsl-draw-in').attr('cx', (r) => x(r.value)).attr('cy', rowH / 2).attr('r', 5.5).style('fill', colour);
    g.append('text').attr('class', 'gsl-tick').attr('x', W - lw + 4).attr('y', rowH / 2).attr('dy', '0.32em').text((r) => o.fmt(r.value));
    if (o.tipTitle) {
      const tt = G.tip(el);
      g.append('rect').attr('x', 0).attr('width', W).attr('height', rowH).style('fill', 'transparent')
        .on('pointermove', (ev, r) => { const [ex, ey] = d3.pointer(ev, el); tt.show(ex, ey, o.tipTitle(r), o.tipLines(r)); })
        .on('pointerleave', () => tt.hide());
    }
    el.style.minHeight = `${H}px`;
  }
  G.hbar = (el, o) => dots(el, o, false);
  G.divBar = (el, o) => dots(el, o, true);

  /* ---- a series over time shown as an area: rows [{key, y, line?}] ---- */
  G.barChart = (el, o) => {
    el.replaceChildren();
    el.dataset.empty = String(!o.rows.length);
    const H = o.height || 260;
    const W = width(el, 280);
    const svg = svgIn(el, W, H);
    const yMax = d3.max(o.rows, (d) => Math.max(d.y, d.line || 0)) || 1;
    const y0 = d3.scaleLinear([0, yMax * 1.05], [0, 1]).nice();
    const ticks = y0.ticks(5);
    const ml = textWidth(svg, ticks.map(o.yFmt), 'gsl-tick') + 12, mt = 10, mb = 26, mr = 12;
    const y = d3.scaleLinear(y0.domain(), [H - mb, mt]);
    const x = d3.scalePoint(o.rows.map((d) => d.key), [ml + 6, W - mr]).padding(0);
    svg.append('g').selectAll('g').data(ticks).join('g').call((g) => {
      g.append('line').attr('class', 'gsl-grid-line').attr('x1', ml).attr('x2', W - mr).attr('y1', y).attr('y2', y);
      g.append('text').attr('class', 'gsl-tick').attr('x', ml - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').text(o.yFmt);
    });
    const every = Math.max(1, Math.ceil(o.rows.length / Math.max(2, Math.floor((W - ml) / 70))));
    svg.append('g').selectAll('text').data(o.rows.filter((_, i) => i % every === 0)).join('text').attr('class', 'gsl-tick')
      .attr('x', (d) => x(d.key)).attr('y', H - 6).attr('text-anchor', 'middle').text((d) => o.xFmt(d.key));
    const g = svg.append('g').attr('class', 'gsl-draw-in');
    if (o.rows.length > 1) {
      g.append('path').attr('d', d3.area().curve(d3.curveMonotoneX).x((d) => x(d.key)).y0(y(0)).y1((d) => y(d.y))(o.rows))
        .style('fill', o.color).attr('fill-opacity', 0.28);
      g.append('path').attr('d', d3.line().curve(d3.curveMonotoneX).x((d) => x(d.key)).y((d) => y(d.y))(o.rows))
        .style('fill', 'none').style('stroke', o.color).attr('stroke-width', 2).attr('stroke-linejoin', 'round');
    }
    g.append('g').selectAll('circle').data(o.rows.length < 40 ? o.rows : []).join('circle').attr('cx', (d) => x(d.key)).attr('cy', (d) => y(d.y)).attr('r', 3).style('fill', o.color);
    if (o.rows.some((d) => d.line != null)) {
      g.append('path').attr('d', d3.line().defined((d) => d.line != null).curve(d3.curveMonotoneX).x((d) => x(d.key)).y((d) => y(d.line))(o.rows))
        .style('fill', 'none').style('stroke', o.lineColor).attr('stroke-width', 2).attr('stroke-dasharray', '5 4').attr('stroke-linecap', 'round');
    }
    const tt = G.tip(el);
    const rule = svg.append('line').attr('class', 'gsl-rule').attr('y1', mt).attr('y2', H - mb).style('opacity', 0);
    svg.append('rect').attr('x', ml).attr('y', mt).attr('width', W - ml - mr).attr('height', H - mt - mb).style('fill', 'transparent')
      .on('pointermove', (ev) => {
        const [px] = d3.pointer(ev);
        const i = Math.max(0, Math.min(o.rows.length - 1, Math.round(((px - x.range()[0]) / Math.max(1, x.range()[1] - x.range()[0])) * (o.rows.length - 1))));
        const d = o.rows[i];
        rule.attr('x1', x(d.key)).attr('x2', x(d.key)).style('opacity', 1);
        const [ex, ey] = d3.pointer(ev, el);
        tt.show(ex, ey, o.tipTitle(d), o.tipLines(d));
      })
      .on('pointerleave', () => { rule.style('opacity', 0); tt.hide(); });
  };

  /* ---- ranked small multiples ----
     rows [{label, series: [{x: Date, y}], tipLines?}]; o.fmt turns a value into text, o.color is the line colour.
     Each row: name, a sparkline of the series with its latest point marked, the latest value, and under the sparkline a strip:
     the grey track is the series' whole range, the shaded part is where the latest UTC day has been, the dot is now. */
  G.ranked = (el, o) => {
    el.replaceChildren();
    const rows = o.rows.filter((r) => r.series.length).map((r) => {
      const s = [...r.series].sort((a, b) => a.x - b.x);
      return { ...r, series: s, now: s[s.length - 1].y, at: s[s.length - 1].x };
    }).sort((a, b) => b.now - a.now);
    el.dataset.empty = String(!rows.length);
    if (!rows.length) return;
    const rowH = 50, pad = 4;
    const H = pad * 2 + rows.length * rowH;
    const W = width(el, 280);
    const svg = svgIn(el, W, H);
    const labelW = Math.min(W * 0.3, 150), valW = Math.min(W * 0.24, 92);
    const x0 = labelW + 10, x1 = W - valW - 6;
    const tEnd = d3.max(rows, (r) => +r.at), tStart = tEnd - 48 * 3600e3;
    const dayStart = new Date(tEnd).setUTCHours(0, 0, 0, 0);
    const tx = d3.scaleLinear([tStart, tEnd], [x0, x1]);
    const tt = G.tip(el);
    const g = svg.append('g').selectAll('g').data(rows).join('g').attr('transform', (_, i) => `translate(0,${pad + i * rowH})`);
    g.each(function (r) {
      const n = d3.select(this);
      const pts = r.series.filter((p) => +p.x >= tStart);
      const ys = pts.map((p) => p.y);
      const lo = Math.min(...ys), hi = Math.max(...ys);
      const sy = d3.scaleLinear([Math.min(0, lo), hi > 0 ? hi : 1], [30, 4]);
      n.append('text').attr('class', 'gsl-tick').attr('x', labelW).attr('y', 18).attr('text-anchor', 'end')
        .text(clip(r.label, Math.max(8, Math.floor(labelW / 6.5))));
      n.append('line').attr('class', 'gsl-grid-line').attr('x1', x0).attr('x2', x1).attr('y1', sy(0)).attr('y2', sy(0));
      if (pts.length > 1) {
        n.append('path').attr('d', d3.area().curve(d3.curveMonotoneX).x((p) => tx(+p.x)).y0(sy(0)).y1((p) => sy(p.y))(pts)).style('fill', o.color).attr('fill-opacity', 0.25);
        n.append('path').attr('d', d3.line().curve(d3.curveMonotoneX).x((p) => tx(+p.x)).y((p) => sy(p.y))(pts))
          .style('fill', 'none').style('stroke', o.color).attr('stroke-width', 1.5).attr('stroke-linejoin', 'round');
      }
      n.append('circle').attr('cx', tx(+r.at)).attr('cy', sy(r.now)).attr('r', 3).style('fill', o.color);
      // the strip: whole range as the track, today's range shaded, now as a dot
      const today = pts.filter((p) => +p.x >= dayStart).map((p) => p.y);
      const tl = today.length ? Math.min(...today) : r.now, th = today.length ? Math.max(...today) : r.now;
      const sx = d3.scaleLinear([lo, hi > lo ? hi : lo + 1], [x0, x1]);
      n.append('rect').attr('x', x0).attr('y', 38).attr('width', x1 - x0).attr('height', 5).attr('rx', 2.5).style('fill', 'var(--color-border-line)');
      n.append('rect').attr('x', sx(tl)).attr('y', 38).attr('width', Math.max(5, sx(th) - sx(tl))).attr('height', 5).attr('rx', 2.5).style('fill', o.color).attr('fill-opacity', 0.55);
      n.append('circle').attr('cx', sx(r.now)).attr('cy', 40.5).attr('r', 4).style('fill', o.color).style('stroke', 'var(--color-panel)').attr('stroke-width', 1.5);
      n.append('text').attr('x', W - valW + 4).attr('y', 22).style('fill', 'var(--color-fg)').attr('font-weight', 600).attr('font-size', 14).text(o.fmt(r.now));
      n.append('rect').attr('width', W).attr('height', rowH).style('fill', 'transparent')
        .on('pointermove', (ev) => {
          const [ex, ey] = d3.pointer(ev, el);
          tt.show(ex, ey, r.label, [
            { name: 'Latest', value: o.fmt(r.now) },
            { name: 'Today, low to high', value: `${o.fmt(tl)} to ${o.fmt(th)}` },
            { name: '48 hours, low to high', value: `${o.fmt(lo)} to ${o.fmt(hi)}` },
            { name: 'At', value: d3.utcFormat('%-d %b %H:%M UTC')(new Date(+r.at)) },
          ]);
        })
        .on('pointerleave', () => tt.hide());
    });
    el.style.minHeight = `${H}px`;
  };

  /* ---- the two drawings that were by-grid bars ---- */
  const GW = (x) => `${G.fmt.gw(x)} GW`;
  dash.draw('eu-bars', (el) => {
    const d = dash.data('europe_live');
    if (d.status !== 'ok') return G.fail(el, d);
    const by = d3.group(d.data, (r) => r.country);
    G.ranked(el, { rows: [...by].map(([label, rs]) => ({ label, series: rs.map((r) => ({ x: new Date(r.time), y: r.mw / 1000 })) })), fmt: GW, color: dash.colors[0] });
  });
  dash.draw('r-now-bars', (el) => {
    const d = dash.data('renew_live');
    if (d.status !== 'ok') return G.fail(el, d);
    const keys = ['solar', 'wind', 'hydro', 'bioenergy', 'other_renewables'];
    const by = d3.group(d.data.filter((r) => keys.some((k) => r[k] != null)), (r) => r.grid);
    G.ranked(el, {
      rows: [...by].map(([label, rs]) => ({ label, series: rs.map((r) => ({ x: new Date(r.time), y: d3.sum(keys, (k) => r[k] || 0) / 1000 })) })),
      fmt: GW, color: css('--src-wind', dash.colors[1]),
    });
  });
})();
