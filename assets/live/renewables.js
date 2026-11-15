/* Tabs: they listen and set state only. */
(() => {
  const tabs = document.querySelectorAll('.gsl-tab');
  const pages = document.querySelectorAll('.gsl-page');
  const show = (id) => {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    pages.forEach((p) => { p.hidden = p.dataset.page !== id; });
  };
  tabs.forEach((t) => t.addEventListener('click', () => { show(t.dataset.tab); dash.setLink(t.dataset.tab); }));
  const named = location.hash.slice(1);
  if ([...pages].some((p) => p.dataset.page === named)) show(named);
  document.querySelectorAll('.gsl-seg[data-param]').forEach((b) => {
    b.addEventListener('click', () => dash.setParams({ [b.dataset.param]: b.dataset.value }));
  });
  dash.onData(() => {
    const p = dash.params();
    document.querySelectorAll('.gsl-seg[data-param]').forEach((b) => {
      const cur = p[b.dataset.param] ?? b.closest('[data-default]')?.dataset.default;
      b.setAttribute('aria-pressed', String(cur === b.dataset.value));
    });
  });
})();
;
/* Source colours shared by every chart on this page */
(() => {
  const root = document.querySelector('.gsl');
  const set = () => {
    // fixed colours per source, readable on light and dark backgrounds
    root.style.setProperty('--src-solar', '#E8B004');
    root.style.setProperty('--src-wind', '#3B82C4');
    root.style.setProperty('--src-hydro', '#2BA3A3');
    root.style.setProperty('--src-bio', '#6E9F4C');
    root.style.setProperty('--src-other', '#9B7BC8');
    root.style.setProperty('--src-nuclear', '#C46BA0');
    root.style.setProperty('--src-fossil', 'var(--cds-chart-muted)');
    root.style.setProperty('--src-misc', 'var(--color-border-line)');
  };
  set();
  dash.onData(set);
})();
;
/* Calculations */
dash.calc('rn_now', {
  title: 'Renewables by grid, latest hour',
  description: 'Each grid’s latest complete hour (for grids that publish the whole mix, the latest hour that has it): MW by source, renewables together, and their share of all generation where the whole mix is published. A grid more than six hours behind the newest is left out.',
  inputs: ['renew_live'],
  fn: (renew_live) => {
    const ren = ['solar', 'wind', 'hydro', 'bioenergy', 'other_renewables'];
    const rest = ['fossil', 'nuclear', 'other'];
    const fullGrids = new Set(renew_live.filter((d) => d.fossil != null || d.nuclear != null).map((d) => d.grid));
    const complete = (d) => (fullGrids.has(d.grid) ? d.fossil != null || d.nuclear != null : d.solar != null || d.wind != null);
    const by = {};
    renew_live.forEach((d) => { if (complete(d)) { const g = by[d.grid]; if (!g || d.time > g.time) by[d.grid] = d; } });
    const newest = Math.max(...Object.values(by).map((d) => Date.parse(d.time)));
    return Object.values(by).filter((d) => Date.parse(d.time) >= newest - 6 * 3600e3).map((d) => {
      const r = Math.round(ren.reduce((s, k) => s + (d[k] || 0), 0));
      const full = rest.some((k) => d[k] != null);
      const total = full ? Math.round(r + rest.reduce((s, k) => s + (d[k] || 0), 0)) : null;
      const mw = (k) => (d[k] == null ? null : Math.round(d[k]));
      return {
        grid: d.grid, group: d.group, time: d.time, full_mix: full,
        solar_mw: mw('solar'), wind_mw: mw('wind'), hydro_mw: mw('hydro'), bioenergy_mw: mw('bioenergy'), other_renewables_mw: mw('other_renewables'),
        renew_mw: r, renew_gw: Math.round(r / 10) / 100, total_mw: total, total_gw: total == null ? null : Math.round(total / 10) / 100,
        share_pct: total ? Math.round((r / total) * 1000) / 10 : null,
      };
    }).sort((a, b) => b.renew_mw - a.renew_mw);
  },
});

dash.calc('gb_renew_today', {
  title: 'GB renewables generated today',
  description: 'Solar, wind, hydro, bioenergy and other renewable energy in Great Britain since midnight UK time, from the hourly rows with the whole mix, with their share of generation and the latest output.',
  inputs: ['renew_live'],
  fn: (renew_live) => {
    const ren = ['solar', 'wind', 'hydro', 'bioenergy', 'other_renewables'];
    const all = [...ren, 'fossil', 'nuclear', 'other'];
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
    const rows = renew_live.filter((r) => r.grid === 'Great Britain' && r.fossil != null).sort((a, b) => (a.time < b.time ? -1 : 1));
    if (!rows.length) return [];
    const last = rows[rows.length - 1];
    const today = rows.filter((r) => day.format(new Date(r.time)) === day.format(new Date(last.time)));
    const sum = (r, ks) => ks.reduce((s, k) => s + (r[k] || 0), 0);
    const renMwh = today.reduce((s, r) => s + sum(r, ren), 0);
    const allMwh = today.reduce((s, r) => s + sum(r, all), 0);
    return [{ day: day.format(new Date(last.time)), today_mwh: Math.round(renMwh), share_pct: allMwh ? Math.round((renMwh / allMwh) * 1000) / 10 : null,
      rate_mw: Math.round(sum(last, ren)), rate_gw: Math.round(sum(last, ren) / 10) / 100, latest_time: new Date(Date.parse(last.time) + 3600e3).toISOString() }];
  },
});

dash.calc('rn_total', {
  title: 'Renewables now, all grids',
  description: 'The latest hour added over grids: renewables, solar and wind, and the share of generation over the grids with the whole mix and over European ones.',
  inputs: ['rn_now'],
  fn: (rn_now) => {
    const sum = (rows, k) => rows.reduce((s, d) => s + (d[k] || 0), 0);
    const full = rn_now.filter((d) => d.full_mix);
    const eu = full.filter((d) => d.group === 'Europe' && d.grid !== 'Great Britain');
    const g = (x) => Math.round(x / 10) / 100;
    return [{
      grids: rn_now.length, renew_gw: g(sum(rn_now, 'renew_mw')), solar_gw: g(sum(rn_now, 'solar_mw')), wind_gw: g(sum(rn_now, 'wind_mw')),
      solar_wind_gw: g(sum(rn_now, 'solar_mw') + sum(rn_now, 'wind_mw')),
      full_mix_share_pct: Math.round((sum(full, 'renew_mw') / sum(full, 'total_mw')) * 1000) / 10,
      europe_share_pct: eu.length ? Math.round((sum(eu, 'renew_mw') / sum(eu, 'total_mw')) * 1000) / 10 : null, europe_full_mix: eu.length || null,
    }];
  },
});

dash.calc('rn_series', {
  title: 'GB renewable share by hour',
  description: 'Renewables over all generation shown for Great Britain, each hour where every source reported.',
  inputs: ['renew_live'],
  fn: (renew_live) => renew_live.filter((d) => d.grid === 'Great Britain' && d.solar != null && d.fossil != null).map((d) => {
    const r = ['solar', 'wind', 'hydro', 'bioenergy', 'other_renewables'].reduce((s, k) => s + (d[k] || 0), 0);
    const t = r + ['fossil', 'nuclear', 'other'].reduce((s, k) => s + (d[k] || 0), 0);
    return { time: d.time, share_pct: Math.round((r / t) * 1000) / 10 };
  }).sort((a, b) => (a.time < b.time ? -1 : 1)),
});

dash.calc('rn_europe', {
  title: 'Europe’s mix by hour',
  description: 'The European countries with the whole mix added together each hour, for hours where all of them reported.',
  inputs: ['renew_live'],
  fn: (renew_live) => {
    const keys = ['solar', 'wind', 'hydro', 'bioenergy', 'other_renewables', 'nuclear', 'fossil', 'other'];
    const rows = renew_live.filter((d) => d.group === 'Europe' && d.grid !== 'Great Britain' && d.fossil != null);
    const n = new Set(rows.map((d) => d.grid)).size;
    const by = {};
    rows.forEach((d) => { const r = (by[d.time] = by[d.time] || { time: d.time, n: 0 }); r.n += 1; keys.forEach((k) => { r[k] = (r[k] || 0) + (d[k] || 0); }); });
    return Object.values(by).filter((r) => r.n === n).map(({ n: _n, ...r }) => r).sort((a, b) => (a.time < b.time ? -1 : 1));
  },
});

dash.calc('rn_rest', {
  title: 'Solar and wind outside Europe by hour',
  description: 'Solar and wind added over the live grids in the Americas and Asia-Pacific (Alberta’s single hourly snapshot left out), for hours where all but at most one grid reported.',
  inputs: ['renew_live'],
  fn: (renew_live) => {
    const rows = renew_live.filter((d) => d.group !== 'Europe' && d.grid !== 'Alberta');
    const by = {};
    rows.forEach((d) => { const r = (by[d.time] = by[d.time] || { time: d.time, solar: 0, wind: 0, n: 0 }); r.solar += d.solar || 0; r.wind += d.wind || 0; r.n += 1; });
    const most = Math.max(...Object.values(by).map((r) => r.n));
    return Object.values(by).filter((r) => r.n >= most - 1).map((r) => ({ time: r.time, solar: Math.round(r.solar), wind: Math.round(r.wind), grids: r.n })).sort((a, b) => (a.time < b.time ? -1 : 1));
  },
});

dash.calc('world_renew_latest', {
  title: 'Renewables by country, latest year',
  description: 'Each country’s latest Ember year: renewable TWh and share, and the share from solar, wind and hydro.',
  inputs: ['world_renew_annual'],
  fn: (world_renew_annual) => {
    const by = {};
    world_renew_annual.filter((d) => d.iso3 !== 'WLD').forEach((d) => {
      const r = (by[d.iso3] = by[d.iso3] || { country: d.country, iso3: d.iso3, year: d.year, renew_twh: 0, share_pct: 0 });
      r.renew_twh += d.twh || 0; r.share_pct += d.share_pct || 0; r[`${d.source}_pct`] = d.share_pct;
    });
    return Object.values(by).map((r) => ({ country: r.country, iso3: r.iso3, year: r.year, renew_twh: Math.round(r.renew_twh * 10) / 10, share_pct: Math.round(r.share_pct * 10) / 10,
      solar_pct: r.solar_pct == null ? null : Math.round(r.solar_pct * 10) / 10, wind_pct: r.wind_pct == null ? null : Math.round(r.wind_pct * 10) / 10, hydro_pct: r.hydro_pct == null ? null : Math.round(r.hydro_pct * 10) / 10 }))
      .sort((a, b) => b.renew_twh - a.renew_twh);
  },
});

dash.calc('world_renew_trend', {
  title: 'World renewables by year',
  description: 'Ember’s World row, TWh by renewable source and their combined share, 2000 onward.',
  inputs: ['world_renew_annual'],
  fn: (world_renew_annual) => {
    const by = {};
    world_renew_annual.filter((d) => d.iso3 === 'WLD').forEach((d) => { const r = (by[d.year] = by[d.year] || { year: d.year, share_pct: 0 }); r[d.source] = Math.round(d.twh || 0); r.share_pct += d.share_pct || 0; });
    return Object.values(by).map((r) => ({ ...r, share_pct: Math.round(r.share_pct * 10) / 10 })).sort((a, b) => a.year - b.year);
  },
});

dash.calc('world_renew_headline', {
  title: 'World renewables, latest year',
  description: 'The most recent complete year in Ember’s World row.',
  inputs: ['world_renew_trend'],
  fn: (world_renew_trend) => {
    const r = world_renew_trend.filter((d) => (d.solar || 0) > 0).slice(-1)[0];
    return [{ year: r.year, share_pct: r.share_pct, twh: (r.solar || 0) + (r.wind || 0) + (r.hydro || 0) + (r.bioenergy || 0) + (r.other_renewables || 0) }];
  },
});
;
/* Drawings */
(() => {
  const G = window.GSL;
  const css = (n) => getComputedStyle(document.querySelector('.gsl')).getPropertyValue(n).trim() || 'gray';
  const SRC = () => [
    { key: 'solar', name: 'Solar', color: css('--src-solar') }, { key: 'wind', name: 'Wind', color: css('--src-wind') },
    { key: 'hydro', name: 'Hydro', color: css('--src-hydro') }, { key: 'bioenergy', name: 'Bioenergy', color: css('--src-bio') },
    { key: 'other_renewables', name: 'Other renewables', color: css('--src-other') },
  ];
  const ALL = () => [...SRC(), { key: 'nuclear', name: 'Nuclear', color: css('--src-nuclear') }, { key: 'fossil', name: 'Fossil', color: css('--src-fossil') }, { key: 'other', name: 'Other', color: css('--src-misc') }];
  const v = (name, id, field, f, where) => dash.draw(name, (el) => {
    if (!where) return G.value(el, id, field, f);
    const d = dash.data(id);
    const r = d.status === 'ok' ? d.data.find((x) => x[where[0]] === where[1]) : null;
    el.textContent = r && r[field] != null ? f(r[field]) : '—';
  });
  v('r-n', 'rn_total', 'grids', String);
  v('gb-renew-share', 'gb_renew_today', 'share_pct', G.fmt.pct1);
  v('gb-renew-rate', 'gb_renew_today', 'rate_gw', G.fmt.gw);
  G.counter('gb-renew-counter', 'gb_renew_today');
  v('r-gw', 'rn_total', 'renew_gw', G.fmt.gw);
  v('r-share', 'rn_total', 'full_mix_share_pct', G.fmt.pct1);
  v('r-wshare', 'world_renew_headline', 'share_pct', G.fmt.pct1);
  v('r-wyear', 'world_renew_headline', 'year', String);
  v('t-gb', 'rn_now', 'share_pct', G.fmt.pct1, ['grid', 'Great Britain']);
  v('t-gb-gw', 'rn_now', 'renew_gw', G.fmt.gw, ['grid', 'Great Britain']);
  v('t-gb-tot', 'rn_now', 'total_gw', G.fmt.gw, ['grid', 'Great Britain']);
  v('t-eu', 'rn_total', 'europe_share_pct', G.fmt.pct1);
  v('t-eu-n', 'rn_total', 'europe_full_mix', String);
  v('t-sw', 'rn_total', 'solar_wind_gw', G.fmt.gw);
  v('t-s', 'rn_total', 'solar_gw', G.fmt.gw);
  v('t-w', 'rn_total', 'wind_gw', G.fmt.gw);
  v('t-wt', 'world_renew_headline', 'twh', G.fmt.int);
  v('t-wt-y', 'world_renew_headline', 'year', String);

  dash.draw('r-now-bars', (el) => {
    const d = dash.data('rn_now');
    if (d.status !== 'ok') return G.fail(el, d);
    el.replaceChildren();
    const rows = d.data.slice(0, 30);
    const keys = SRC();
    const rowH = 22, W = Math.max(300, el.clientWidth || 700), H = rows.length * rowH + 8;
    const svg = d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const ml = Math.min(190, W * 0.35), mr = 110;
    const x = d3.scaleLinear([0, d3.max(rows, (r) => r.renew_mw / 1000) || 1], [ml, W - mr]);
    const tt = G.tip(el);
    rows.forEach((r, i) => {
      const g = svg.append('g').attr('transform', `translate(0,${4 + i * rowH})`);
      g.append('text').attr('class', 'gsl-tick').attr('x', ml - 8).attr('y', rowH / 2).attr('dy', '0.32em').attr('text-anchor', 'end').text(r.grid);
      let acc = 0;
      keys.forEach((k) => {
        const val = (r[`${k.key}_mw`] || 0) / 1000;
        if (val <= 0) return;
        g.append('rect').attr('class', 'gsl-draw-in').attr('x', x(acc)).attr('y', 3).attr('height', rowH - 6).attr('width', Math.max(0, x(acc + val) - x(acc))).style('fill', k.color);
        acc += val;
      });
      g.append('text').attr('class', 'gsl-tick').attr('x', x(acc) + 6).attr('y', rowH / 2).attr('dy', '0.32em')
        .text(`${G.fmt.gw(r.renew_mw / 1000)} GW${r.share_pct != null ? ` · ${G.fmt.pct1(r.share_pct)}%` : ''}`);
      g.append('rect').attr('width', W).attr('height', rowH).style('fill', 'transparent')
        .on('pointermove', (ev) => {
          const [ex, ey] = d3.pointer(ev, el);
          tt.show(ex, ey, `${r.grid}, ${d3.utcFormat('%H:00 UTC')(new Date(r.time))}`, [
            ...keys.filter((k) => r[`${k.key}_mw`] != null).map((k) => ({ color: k.color, name: k.name, value: `${G.fmt.int(r[`${k.key}_mw`])} MW` })),
            ...(r.share_pct != null ? [{ name: 'Renewable share', value: `${G.fmt.pct1(r.share_pct)}%` }] : [{ name: 'Whole mix', value: 'not published live' }]),
          ]);
        })
        .on('pointerleave', () => tt.hide());
    });
    el.style.minHeight = `${H}px`;
  });

  const stack = (el, rows, keys) => G.stackChart(el, {
    keys, rows: rows.map((r) => ({ x: new Date(r.time), ...Object.fromEntries(keys.map((k) => [k.key, (r[k.key] || 0) / 1000])) })),
    unit: 'GW', yFmt: d3.format(',.1f'), xFmt: d3.utcFormat('%a %H:%M'), tipTitle: (x) => d3.utcFormat('%a %-d %b %H:00 UTC')(x),
  });
  dash.draw('gb-mix', (el) => {
    const d = dash.data('renew_live');
    if (d.status !== 'ok') return G.fail(el, d);
    stack(el, d.data.filter((r) => r.grid === 'Great Britain' && r.fossil != null && r.solar != null), ALL());
  });
  dash.draw('gb-share', (el) => {
    const d = dash.data('rn_series');
    if (d.status !== 'ok') return G.fail(el, d);
    G.lineChart(el, { height: 220, series: [{ name: 'Renewable share', color: css('--src-wind'), label: true, points: d.data.map((r) => ({ x: new Date(r.time), y: r.share_pct })) }],
      unit: '%', yFmt: d3.format('.0f'), xFmt: d3.utcFormat('%a %H:%M'), tolerance: 40 * 60e3, tipTitle: (x) => d3.utcFormat('%a %-d %b %H:00 UTC')(x) });
  });
  dash.draw('eu-mix', (el) => {
    const d = dash.data('rn_europe');
    if (d.status !== 'ok') return G.fail(el, d);
    stack(el, d.data, ALL());
  });
  dash.draw('rest-mix', (el) => {
    const d = dash.data('rn_rest');
    if (d.status !== 'ok') return G.fail(el, d);
    stack(el, d.data, SRC().slice(0, 2));
  });
  dash.draw('eu-share', (el) => {
    const d = dash.data('rn_now');
    if (d.status !== 'ok') return G.fail(el, d);
    G.hbar(el, { rows: d.data.filter((r) => r.share_pct != null).sort((a, b) => b.share_pct - a.share_pct).map((r) => ({ label: r.grid, value: r.share_pct, r })),
      color: css('--src-wind'), fmt: (x) => `${G.fmt.pct1(x)}%`, tipTitle: (r) => r.label,
      tipLines: (r) => [{ name: 'Renewables', value: `${G.fmt.int(r.r.renew_mw)} MW` }, { name: 'All generation', value: `${G.fmt.int(r.r.total_mw)} MW` }] });
  });
  const n0 = (x) => (x == null ? '–' : G.fmt.int(x));
  dash.draw('eu-tbody', (tb) => {
    const d = dash.data('rn_now');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    d.data.filter((r) => r.group === 'Europe').forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.grid;
      G.cell(tr, r.grid); G.cell(tr, n0(r.solar_mw), 'num'); G.cell(tr, n0(r.wind_mw), 'num'); G.cell(tr, n0(r.hydro_mw), 'num'); G.cell(tr, n0(r.bioenergy_mw), 'num');
      G.cell(tr, n0(r.total_mw), 'num'); G.cell(tr, r.share_pct == null ? '–' : G.fmt.pct1(r.share_pct), 'num');
      tb.appendChild(tr);
    });
  });
  dash.draw('rest-tbody', (tb) => {
    const d = dash.data('rn_now');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    d.data.filter((r) => r.group !== 'Europe').forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.grid;
      G.cell(tr, r.grid); G.cell(tr, r.group); G.cell(tr, n0(r.solar_mw), 'num'); G.cell(tr, n0(r.wind_mw), 'num'); G.cell(tr, n0(r.renew_mw), 'num');
      tb.appendChild(tr);
    });
  });

  dash.draw('world-map', (el) => {
    const geo = dash.data('world_geo');
    const w = dash.data('world_renew_latest');
    if (geo.status !== 'ok') return G.fail(el, geo);
    if (w.status !== 'ok') return G.fail(el, w);
    el.replaceChildren();
    const byIso = new Map(w.data.map((r) => [r.iso3, r]));
    const W = Math.max(300, el.clientWidth || 800), H = Math.round(W * 0.5);
    const features = geo.data.features.map((f) => {
      if (d3.geoArea(f) > 2 * Math.PI) {
        const rev = (c) => (typeof c[0][0] === 'number' ? [...c].reverse() : c.map(rev));
        return { ...f, geometry: { ...f.geometry, coordinates: rev(f.geometry.coordinates) } };
      }
      return f;
    });
    const proj = d3.geoNaturalEarth1().fitSize([W, H - 30], { type: 'FeatureCollection', features });
    const path = d3.geoPath(proj);
    const color = d3.scaleSequential([0, 100], d3.interpolateYlGn).clamp(true);
    const svg = d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    svg.append('path').datum({ type: 'Sphere' }).attr('d', path).style('fill', 'none').style('stroke', 'var(--color-border-line)');
    const tt = G.tip(el);
    svg.append('g').selectAll('path').data(features).join('path').attr('d', path)
      .style('fill', (f) => { const r = byIso.get(f.properties.iso3); return r ? color(r.share_pct) : 'var(--color-border-line)'; })
      .style('stroke', 'var(--color-panel)').attr('stroke-width', 0.5)
      .on('pointermove', (ev, f) => {
        const r = byIso.get(f.properties.iso3);
        const [ex, ey] = d3.pointer(ev, el);
        tt.show(ex, ey, f.properties.name, r ? [
          { name: `Renewables (${r.year})`, value: `${G.fmt.pct1(r.share_pct)}%` }, { name: 'Solar', value: r.solar_pct == null ? '–' : `${G.fmt.pct1(r.solar_pct)}%` },
          { name: 'Wind', value: r.wind_pct == null ? '–' : `${G.fmt.pct1(r.wind_pct)}%` }, { name: 'Hydro', value: r.hydro_pct == null ? '–' : `${G.fmt.pct1(r.hydro_pct)}%` },
        ] : [{ name: '', value: 'No Ember data' }]);
      })
      .on('pointerleave', () => tt.hide());
    const lw = Math.min(220, W * 0.4);
    const id = 'rn-grad';
    const grad = svg.append('defs').append('linearGradient').attr('id', id);
    d3.range(0, 1.01, 0.1).forEach((t) => grad.append('stop').attr('offset', t).style('stop-color', color(t * 100)));
    const lg = svg.append('g').attr('transform', `translate(10,${H - 22})`);
    lg.append('rect').attr('width', lw).attr('height', 8).attr('rx', 2).style('fill', `url(#${id})`);
    lg.append('text').attr('class', 'gsl-tick').attr('y', 20).text('0%');
    lg.append('text').attr('class', 'gsl-tick').attr('x', lw).attr('y', 20).attr('text-anchor', 'end').text('100%');
  });
  dash.draw('world-trend', (el) => {
    const d = dash.data('world_renew_trend');
    if (d.status !== 'ok') return G.fail(el, d);
    G.stackChart(el, { keys: SRC(), rows: d.data.filter((r) => (r.hydro || 0) > 0).map((r) => ({ x: new Date(Date.UTC(r.year, 6, 1)), ...r })),
      unit: 'TWh', yFmt: d3.format(',.0f'), xFmt: d3.utcFormat('%Y'), tipTitle: (x) => String(x.getUTCFullYear()) });
  });
  dash.draw('world-top', (el) => {
    const d = dash.data('world_renew_latest');
    if (d.status !== 'ok') return G.fail(el, d);
    G.hbar(el, { rows: d.data.slice(0, 15).map((r) => ({ label: r.country, value: r.renew_twh, r })), color: css('--src-wind'), fmt: (x) => `${G.fmt.int(x)} TWh`,
      tipTitle: (r) => `${r.label}, ${r.r.year}`, tipLines: (r) => [{ name: 'Renewables', value: `${G.fmt.one(r.r.renew_twh)} TWh` }, { name: 'Share', value: `${G.fmt.pct1(r.r.share_pct)}%` }] });
  });
  dash.draw('world-tbody', (tb) => {
    const d = dash.data('world_renew_latest');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    const p = (x) => (x == null ? '–' : G.fmt.pct1(x));
    d.data.forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.iso3;
      G.cell(tr, r.country); G.cell(tr, String(r.year), 'num'); G.cell(tr, G.fmt.one(r.renew_twh), 'num'); G.cell(tr, p(r.share_pct), 'num');
      G.cell(tr, p(r.solar_pct), 'num'); G.cell(tr, p(r.wind_pct), 'num'); G.cell(tr, p(r.hydro_pct), 'num');
      tb.appendChild(tr);
    });
  });
})();
