/* Shared drawing helpers */
window.GSL = (() => {
  const fmt = {
    gw: d3.format(',.2f'), one: d3.format(',.1f'), int: d3.format(',.0f'),
    pct1: d3.format('.1f'),
  };
  const nice = (v) => (v == null || Number.isNaN(v) ? '–' : v);

  function fail(el, d) {
    el.replaceChildren();
    el.dataset.empty = 'true';
    if (d.status === 'error') {
      const p = document.createElement('div');
      p.className = 'gsl-fail';
      p.textContent = 'Failed to load';
      el.appendChild(p);
    } else {
      el.textContent = '—';
    }
  }

  function tip(el) {
    const t = document.createElement('div');
    t.className = 'gsl-tip';
    t.hidden = true;
    el.appendChild(t);
    return {
      show(x, y, title, lines) {
        t.replaceChildren();
        const h = document.createElement('div');
        h.className = 'gsl-tip-h';
        h.textContent = title;
        t.appendChild(h);
        for (const l of lines) {
          const row = document.createElement('div');
          row.className = 'gsl-tip-r';
          if (l.color) {
            const s = document.createElement('span');
            s.className = 'gsl-sw';
            s.style.background = l.color;
            row.appendChild(s);
          }
          if (l.name) {
            const n = document.createElement('span');
            n.className = 'gsl-tip-n';
            n.textContent = l.name;
            row.appendChild(n);
          }
          const v = document.createElement('b');
          v.textContent = l.value;
          row.appendChild(v);
          t.appendChild(row);
        }
        t.hidden = false;
        const W = el.clientWidth, tw = t.offsetWidth, th = t.offsetHeight;
        let left = x + 14;
        if (left + tw > W) left = x - tw - 14;
        if (left < 0) left = Math.max(0, W - tw);
        let top = y - th - 10;
        if (top < 0) top = y + 16;
        t.style.left = left + 'px';
        t.style.top = top + 'px';
      },
      hide() { t.hidden = true; },
    };
  }

  function measure(svg, strings, cls) {
    const g = svg.append('g').attr('class', cls).style('visibility', 'hidden');
    let w = 0;
    for (const s of strings) w = Math.max(w, g.append('text').attr('class', cls).text(s).node().getComputedTextLength());
    g.remove();
    return w;
  }

  function svgFor(el, W, H) {
    return d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
  }

  function yAxis(svg, y, ticks, x1, x2, f) {
    svg.append('g').selectAll('line').data(ticks).join('line').attr('class', 'gsl-grid-line')
      .attr('x1', x1).attr('x2', x2).attr('y1', (d) => y(d)).attr('y2', (d) => y(d));
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'gsl-tick')
      .attr('x', x1 - 8).attr('y', (d) => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').text(f);
  }

  function xAxis(svg, x, H, mb, count, f, tickValues) {
    const ax = d3.axisBottom(x).tickSizeOuter(0).tickFormat(f);
    if (tickValues) ax.tickValues(tickValues); else ax.ticks(count);
    svg.append('g').attr('transform', `translate(0,${H - mb})`).call(ax)
      .attr('font-size', null).attr('font-family', null)
      .call((g) => {
        g.select('.domain').attr('class', 'gsl-axis');
        g.selectAll('.tick line').attr('class', 'gsl-axis');
        g.selectAll('.tick text').attr('class', 'gsl-tick');
      });
  }

  /* series: [{name, color, width, dash, points:[{x:Date, y}], label:boolean}] */
  function lineChart(el, o) {
    el.replaceChildren();
    el.dataset.empty = String(!o.series.some((s) => s.points.length));
    const H = o.height || 260;
    const W = Math.max(280, el.clientWidth || 600);
    const svg = svgFor(el, W, H);
    const all = o.series.flatMap((s) => s.points);
    const yMin = Math.min(0, d3.min(all, (d) => d.y) ?? 0);
    const yMax = Math.max(0, d3.max(all, (d) => d.y) ?? 0) || (yMin < 0 ? 0 : 1);
    const yd = d3.scaleLinear([yMin * 1.05, yMax * 1.05], [0, 1]).nice();
    const ticks = yd.ticks(5);
    const ml = measure(svg, ticks.map(o.yFmt), 'gsl-tick') + 12;
    const labelled = o.series.filter((s) => s.label && s.points.length);
    const texts = labelled.map((s) => `${s.name} ${o.yFmt(s.points[s.points.length - 1].y)}`);
    const mr = labelled.length ? measure(svg, texts, 'gsl-endlabel') + 14 : 14;
    const mt = 10, mb = 26;
    const x = d3.scaleUtc(o.xDomain || d3.extent(all, (d) => d.x), [ml, W - mr]);
    const y = d3.scaleLinear(yd.domain(), [H - mb, mt]);
    yAxis(svg, y, ticks, ml, W - mr, o.yFmt);
    xAxis(svg, x, H, mb, Math.max(2, Math.floor((W - ml - mr) / 90)), o.xFmt);
    if (yMin < 0) svg.append('line').attr('class', 'gsl-axis').attr('x1', ml).attr('x2', W - mr).attr('y1', y(0)).attr('y2', y(0));
    const line = d3.line().defined((d) => d.y != null).x((d) => x(d.x)).y((d) => y(d.y));
    const order = [...o.series].sort((a, b) => (a.z || 0) - (b.z || 0));
    svg.append('g').attr('class', 'gsl-draw-in').selectAll('path').data(order).join('path')
      .style('fill', 'none').style('stroke', (s) => s.color).attr('stroke-width', (s) => s.width || 2)
      .attr('stroke-dasharray', (s) => s.dash || null)
      .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('d', (s) => line(s.points));
    // end labels, pushed apart
    const ls = labelled.map((s, i) => {
      const p = s.points[s.points.length - 1];
      return { s, p, text: texts[i], yy: y(p.y) };
    }).sort((a, b) => a.yy - b.yy);
    for (let i = 1; i < ls.length; i++) if (ls[i].yy - ls[i - 1].yy < 14) ls[i].yy = ls[i - 1].yy + 14;
    const over = ls.length ? ls[ls.length - 1].yy - (H - mb - 4) : 0;
    if (over > 0) ls.forEach((l) => { l.yy -= over; });
    svg.append('g').selectAll('text').data(ls).join('text').attr('class', 'gsl-endlabel')
      .attr('x', W - mr + 6).attr('y', (l) => l.yy).attr('dy', '0.32em')
      .style('fill', (l) => l.s.color).text((l) => l.text);
    // hover
    const idx = o.series.map((s) => s.points.map((p) => +p.x));
    const xsAll = Array.from(new Set(all.map((d) => +d.x))).sort((a, b) => a - b);
    const tt = tip(el);
    const rule = svg.append('line').attr('class', 'gsl-rule').attr('y1', mt).attr('y2', H - mb).style('opacity', 0);
    const dots = svg.append('g');
    svg.append('rect').attr('x', ml).attr('y', mt).attr('width', Math.max(0, W - ml - mr)).attr('height', H - mt - mb)
      .style('fill', 'transparent')
      .on('pointermove', (ev) => {
        const [px] = d3.pointer(ev);
        const xt = xsAll[d3.bisectCenter(xsAll, +x.invert(px))];
        const hits = [];
        o.series.forEach((s, si) => {
          if (o.tipOnly && !o.tipOnly(s)) return;
          const i = d3.bisectCenter(idx[si], xt);
          const p = s.points[i];
          if (p && p.y != null && Math.abs(+p.x - xt) <= (o.tolerance || 40 * 60e3)) hits.push({ s, p });
        });
        hits.sort((a, b) => b.p.y - a.p.y);
        rule.attr('x1', x(xt)).attr('x2', x(xt)).style('opacity', 1);
        dots.selectAll('circle').data(hits).join('circle').attr('r', 3.5)
          .attr('cx', (h) => x(h.p.x)).attr('cy', (h) => y(h.p.y)).style('fill', (h) => h.s.color);
        const [ex, ey] = d3.pointer(ev, el);
        const multi = o.series.length > 1;
        tt.show(ex, ey, o.tipTitle(new Date(xt)), hits.slice(0, 10).map((h) => ({
          color: multi ? h.s.color : null, name: multi ? h.s.name : '', value: `${o.yFmt(h.p.y)} ${o.unit || ''}`.trim(),
        })));
      })
      .on('pointerleave', () => { rule.style('opacity', 0); dots.selectAll('*').remove(); tt.hide(); });
  }

  /* vertical bars: rows [{x:Date, y, tip:[...] , line}] */
  function barChart(el, o) {
    el.replaceChildren();
    el.dataset.empty = String(!o.rows.length);
    const H = o.height || 260;
    const W = Math.max(280, el.clientWidth || 600);
    const svg = svgFor(el, W, H);
    const yMax = d3.max(o.rows, (d) => Math.max(d.y, d.line || 0)) || 1;
    const yd = d3.scaleLinear([0, yMax * 1.05], [0, 1]).nice();
    const ticks = yd.ticks(5);
    const ml = measure(svg, ticks.map(o.yFmt), 'gsl-tick') + 12;
    const mt = o.topLabels ? 22 : 10, mb = 26, mr = 8;
    const x = d3.scaleBand(o.rows.map((d) => d.key), [ml, W - mr]).paddingInner(0.2).paddingOuter(0.1);
    const y = d3.scaleLinear(yd.domain(), [H - mb, mt]);
    yAxis(svg, y, ticks, ml, W - mr, o.yFmt);
    const every = Math.max(1, Math.ceil(o.rows.length / Math.max(2, Math.floor((W - ml) / 70))));
    const tv = o.rows.map((d) => d.key).filter((_, i) => i % every === 0);
    xAxis(svg, x, H, mb, null, o.xFmt, tv);
    const bw = Math.min(32, x.bandwidth());
    const off = (x.bandwidth() - bw) / 2;
    svg.append('g').attr('class', 'gsl-draw-in').selectAll('rect').data(o.rows).join('rect')
      .attr('x', (d) => x(d.key) + off).attr('width', bw)
      .attr('y', (d) => y(d.y)).attr('height', (d) => Math.max(0, y(0) - y(d.y)))
      .attr('rx', Math.min(3, bw / 2)).style('fill', o.color);
    if (o.rows.some((d) => d.line != null)) {
      const ln = d3.line().defined((d) => d.line != null).x((d) => x(d.key) + x.bandwidth() / 2).y((d) => y(d.line));
      svg.append('path').style('fill', 'none').style('stroke', o.lineColor).attr('stroke-width', 2)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('d', ln(o.rows));
    }
    if (o.topLabels) {
      const lbl = o.rows.map((d) => o.topLabels(d));
      const lw = measure(svg, lbl, 'gsl-tick');
      if (lw < x.bandwidth() + 6) {
        svg.append('g').selectAll('text').data(o.rows).join('text').attr('class', 'gsl-tick')
          .attr('text-anchor', 'middle').attr('x', (d) => x(d.key) + x.bandwidth() / 2)
          .attr('y', (d) => y(d.y) - 5).text((d) => o.topLabels(d));
      }
    }
    const tt = tip(el);
    svg.append('g').selectAll('rect').data(o.rows).join('rect')
      .attr('x', (d) => x(d.key)).attr('width', x.step()).attr('y', mt).attr('height', H - mt - mb)
      .style('fill', 'transparent')
      .on('pointermove', (ev, d) => {
        const [ex, ey] = d3.pointer(ev, el);
        tt.show(ex, ey, o.tipTitle(d), o.tipLines(d));
      })
      .on('pointerleave', () => tt.hide());
  }

  /* horizontal bars: rows [{label, value, color?}] */
  function hbar(el, o) {
    el.replaceChildren();
    el.dataset.empty = String(!o.rows.length);
    const rowH = 22, mt = 4, mb = 4;
    const H = mt + mb + o.rows.length * rowH;
    const W = Math.max(280, el.clientWidth || 500);
    const svg = svgFor(el, W, H);
    const ml = measure(svg, o.rows.map((r) => r.label), 'gsl-tick') + 10;
    const mr = measure(svg, o.rows.map((r) => o.fmt(r.value)), 'gsl-tick') + 10;
    const x = d3.scaleLinear([0, d3.max(o.rows, (r) => r.value) || 1], [ml, W - mr]);
    const g = svg.append('g').selectAll('g').data(o.rows).join('g')
      .attr('transform', (_, i) => `translate(0,${mt + i * rowH})`);
    g.append('text').attr('class', 'gsl-tick').attr('x', ml - 8).attr('y', rowH / 2).attr('dy', '0.32em')
      .attr('text-anchor', 'end').text((r) => r.label);
    g.append('rect').attr('class', 'gsl-draw-in').attr('x', ml).attr('y', 3).attr('height', rowH - 6)
      .attr('width', (r) => Math.max(0, x(r.value) - ml)).attr('rx', 3).style('fill', (r) => r.color || o.color);
    g.append('text').attr('class', 'gsl-tick').attr('x', (r) => x(r.value) + 6).attr('y', rowH / 2)
      .attr('dy', '0.32em').text((r) => o.fmt(r.value));
    if (o.tipTitle) {
      const tt = tip(el);
      g.append('rect').attr('x', 0).attr('width', W).attr('height', rowH).style('fill', 'transparent')
        .on('pointermove', (ev, r) => { const [ex, ey] = d3.pointer(ev, el); tt.show(ex, ey, o.tipTitle(r), o.tipLines(r)); })
        .on('pointerleave', () => tt.hide());
    }
    el.style.minHeight = H + 'px';
  }

  function cell(tr, text, cls) {
    const td = document.createElement('td');
    if (cls) td.className = cls;
    td.textContent = text;
    tr.appendChild(td);
  }

  function value(el, id, field, f) {
    const d = dash.data(id);
    if (d.status !== 'ok' || !d.data.length || d.data[0][field] == null) { el.textContent = '—'; return; }
    el.textContent = f ? f(d.data[0][field]) : d.data[0][field];
  }

  /* stacked areas: keys [{key, name, color}], rows [{x:Date, <key>: value}] (missing = 0) */
  function stackChart(el, o) {
    el.replaceChildren();
    el.dataset.empty = String(!o.rows.length);
    const H = o.height || 260;
    const W = Math.max(280, el.clientWidth || 600);
    const svg = svgFor(el, W, H);
    const rows = o.rows;
    const st = d3.stack().keys(o.keys.map((k) => k.key)).value((r, k) => Math.max(0, r[k] || 0))(rows);
    const yMax = d3.max(st, (l) => d3.max(l, (p) => p[1])) || 1;
    const yd = d3.scaleLinear([0, yMax * 1.05], [0, 1]).nice();
    const ticks = yd.ticks(5);
    const ml = measure(svg, ticks.map(o.yFmt), 'gsl-tick') + 12;
    const mt = 10, mb = 26, mr = 12;
    const x = d3.scaleUtc(d3.extent(rows, (r) => r.x), [ml, W - mr]);
    const y = d3.scaleLinear(yd.domain(), [H - mb, mt]);
    yAxis(svg, y, ticks, ml, W - mr, o.yFmt);
    xAxis(svg, x, H, mb, Math.max(2, Math.floor((W - ml - mr) / 90)), o.xFmt);
    const area = d3.area().x((p) => x(p.data.x)).y0((p) => y(p[0])).y1((p) => y(p[1]));
    svg.append('g').attr('class', 'gsl-draw-in').selectAll('path').data(st).join('path')
      .attr('d', area).style('fill', (l) => o.keys[l.index].color).attr('fill-opacity', 0.85)
      .style('stroke', 'var(--color-panel)').attr('stroke-width', 0.5);
    const xs = rows.map((r) => +r.x);
    const tt = tip(el);
    const rule = svg.append('line').attr('class', 'gsl-rule').attr('y1', mt).attr('y2', H - mb).style('opacity', 0);
    svg.append('rect').attr('x', ml).attr('y', mt).attr('width', Math.max(0, W - ml - mr)).attr('height', H - mt - mb)
      .style('fill', 'transparent')
      .on('pointermove', (ev) => {
        const [px] = d3.pointer(ev);
        const i = d3.bisectCenter(xs, +x.invert(px));
        const r = rows[i];
        if (!r) return;
        rule.attr('x1', x(r.x)).attr('x2', x(r.x)).style('opacity', 1);
        const total = o.keys.reduce((a, k) => a + Math.max(0, r[k.key] || 0), 0);
        const [ex, ey] = d3.pointer(ev, el);
        const lines = [...o.keys].reverse().filter((k) => (r[k.key] || 0) > 0)
          .map((k) => ({ color: k.color, name: k.name, value: `${o.yFmt(r[k.key])} ${o.unit || ''}`.trim() }));
        lines.push({ name: 'Total', value: `${o.yFmt(total)} ${o.unit || ''}`.trim() });
        tt.show(ex, ey, o.tipTitle(r.x), lines);
      })
      .on('pointerleave', () => { rule.style('opacity', 0); tt.hide(); });
  }

  /* signed horizontal bars around zero: rows [{label, value, color?}] */
  function divBar(el, o) {
    el.replaceChildren();
    el.dataset.empty = String(!o.rows.length);
    const rowH = 22, mt = 4, mb = 4;
    const H = mt + mb + o.rows.length * rowH;
    const W = Math.max(280, el.clientWidth || 500);
    const svg = svgFor(el, W, H);
    const ml = measure(svg, o.rows.map((r) => r.label), 'gsl-tick') + 10;
    const lw = measure(svg, o.rows.map((r) => o.fmt(r.value)), 'gsl-tick') + 10;
    const lo = Math.min(0, d3.min(o.rows, (r) => r.value) || 0), hi = Math.max(0, d3.max(o.rows, (r) => r.value) || 0);
    const x = d3.scaleLinear([lo, hi || 1], [ml + (lo < 0 ? lw : 0), W - lw]);
    svg.append('line').attr('class', 'gsl-axis').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', H);
    const g = svg.append('g').selectAll('g').data(o.rows).join('g').attr('transform', (_, i) => `translate(0,${mt + i * rowH})`);
    g.append('text').attr('class', 'gsl-tick').attr('x', ml - 8).attr('y', rowH / 2).attr('dy', '0.32em').attr('text-anchor', 'end').text((r) => r.label);
    g.append('rect').attr('class', 'gsl-draw-in').attr('x', (r) => Math.min(x(0), x(r.value))).attr('y', 3).attr('height', rowH - 6)
      .attr('width', (r) => Math.abs(x(r.value) - x(0))).attr('rx', 3).style('fill', (r) => r.color || (r.value >= 0 ? o.pos : o.neg));
    g.append('text').attr('class', 'gsl-tick').attr('x', (r) => (r.value >= 0 ? x(r.value) + 6 : x(r.value) - 6)).attr('y', rowH / 2)
      .attr('dy', '0.32em').attr('text-anchor', (r) => (r.value >= 0 ? 'start' : 'end')).text((r) => o.fmt(r.value));
    if (o.tipTitle) {
      const tt = tip(el);
      g.append('rect').attr('x', 0).attr('width', W).attr('height', rowH).style('fill', 'transparent')
        .on('pointermove', (ev, r) => { const [ex, ey] = d3.pointer(ev, el); tt.show(ex, ey, o.tipTitle(r), o.tipLines(r)); })
        .on('pointerleave', () => tt.hide());
    }
    el.style.minHeight = H + 'px';
  }

  /* a number that keeps counting: rows of id need today_mwh, rate_mw and latest_time; it adds energy at the
     latest rate since that reading (for at most 90 minutes) so the figure moves between readings */
  function counter(name, id) {
    dash.draw(name, {
      mount() { const made = {}; made.timer = setInterval(() => made.tick && made.tick(), 250); return made; },
      update(el, made) {
        const d = dash.data(id);
        const r = d.status === 'ok' ? d.data[0] : null;
        if (!r || r.today_mwh == null) { made.tick = null; el.textContent = '—'; return; }
        made.tick = () => {
          const since = Math.min(90 * 60e3, Math.max(0, Date.now() - Date.parse(r.latest_time)));
          const mwh = r.today_mwh + (Math.max(0, r.rate_mw) * since) / 3600e3;
          const big = mwh >= 100000;
          el.textContent = d3.format(big ? ',.2f' : ',.1f')(big ? mwh / 1000 : mwh);
          const small = document.createElement('small');
          small.textContent = big ? 'GWh' : 'MWh';
          el.append(small);
        };
        made.tick();
      },
      unmount(el, made) { if (made) clearInterval(made.timer); },
    });
  }

  return { fmt, nice, fail, tip, lineChart, barChart, hbar, cell, value, stackChart, divBar, counter };
})();
