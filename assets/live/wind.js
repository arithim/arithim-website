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
/* Calculations */
dash.calc('wind_stats', {
  title: 'Wind by grid',
  description: 'Latest reading (regions added at their own latest), 24-hour peak and energy, and offshore share, per grid; a grid more than six hours behind the newest reading has no figure now.',
  inputs: ['wind_live'],
  fn: (wind_live) => {
    const by = {};
    wind_live.forEach((d) => {
      const g = (by[d.grid] = by[d.grid] || { group: d.group, regions: {} });
      (g.regions[d.region || ''] = g.regions[d.region || ''] || []).push({ t: Date.parse(d.time), mw: +d.mw, off: d.offshore_mw == null ? null : +d.offshore_mw });
    });
    const newest = Math.max(...wind_live.map((d) => Date.parse(d.time)));
    return Object.entries(by).map(([grid, g]) => {
      let now = 0, nowOff = 0, hasOff = false, latest = 0, mwh = 0, offMwh = 0;
      const peakBy = {};
      Object.values(g.regions).forEach((rows) => {
        rows.sort((a, b) => a.t - b.t);
        const last = rows[rows.length - 1];
        now += last.mw;
        if (last.off != null) { nowOff += last.off; hasOff = true; }
        latest = Math.max(latest, last.t);
        rows.forEach((d, i) => {
          if (d.t <= last.t - 24 * 3600e3) return;
          const gap = i > 0 ? Math.min(3600e3, d.t - rows[i - 1].t) : 3600e3;
          mwh += d.mw * gap / 3600e3;
          if (d.off != null) offMwh += d.off * gap / 3600e3;
          peakBy[d.t] = (peakBy[d.t] || 0) + d.mw;
        });
      });
      const stale = latest < newest - 6 * 3600e3;
      return {
        grid, group: g.group, latest_time: new Date(latest).toISOString(), stale,
        now_mw: stale ? null : Math.round(now), peak24_mw: Math.round(Math.max(0, ...Object.values(peakBy))),
        last24_gwh: Math.round(mwh / 100) / 10, offshore_pct: hasOff && mwh > 0 ? Math.round((offMwh / mwh) * 1000) / 10 : null,
      };
    }).sort((a, b) => (b.now_mw || 0) - (a.now_mw || 0));
  },
});

dash.calc('wind_total', {
  title: 'Wind now, by region of the world',
  description: 'Latest readings added together for each group of grids and for all of them; stale feeds count as nothing.',
  inputs: ['wind_stats'],
  fn: (wind_stats) => ['All', 'Europe', 'Americas', 'Asia-Pacific'].map((group) => {
    const rows = wind_stats.filter((d) => (group === 'All' || d.group === group) && d.now_mw != null);
    // a group with no live grid has no figure, so its tile can be left out rather than show zero
    return { group, now_gw: rows.length ? Math.round(rows.reduce((s, d) => s + d.now_mw, 0) / 10) / 100 : null, grids: rows.length || null };
  }),
});

dash.calc('wind_points', {
  title: 'Wind now, placed on the map',
  description: 'Each grid’s latest reading at a fixed point near where its wind farms are.',
  inputs: ['wind_stats'],
  fn: (wind_stats) => {
    const LL = { 'Great Britain': [-2.5, 55.0], Germany: [9.5, 53.0], France: [1.5, 48.0], Spain: [-3.5, 41.5], Italy: [15.5, 40.5], Netherlands: [5.0, 52.8], Belgium: [3.5, 51.3], Austria: [16.5, 48.0], Switzerland: [8.2, 46.8], Poland: [17.5, 53.5], Portugal: [-8.0, 40.5], Czechia: [15.3, 49.8], Sweden: [16.0, 60.0], Greece: [22.5, 38.5], Hungary: [18.0, 47.5], Romania: [28.0, 44.8], Bulgaria: [27.5, 43.3], Slovenia: [14.8, 46.1], Slovakia: [19.5, 48.7], Croatia: [16.0, 44.5], Denmark: [8.5, 56.0], 'Ireland (all-island)': [-8.0, 53.8], California: [-118.5, 35.0], 'New England': [-70.0, 44.0], Brazil: [-38.5, -7.0], Ontario: [-81.5, 43.5], Alberta: [-113.0, 49.8], Japan: [140.5, 40.0], 'South Korea': [127.5, 36.8], 'Australia (NEM)': [143.0, -35.0] };
    return wind_stats.filter((d) => d.now_mw != null && LL[d.grid]).map((d) => ({ grid: d.grid, group: d.group, lon: LL[d.grid][0], lat: LL[d.grid][1], now_mw: Math.max(0, d.now_mw) }));
  },
});

dash.calc('gb_wind_summary', {
  title: 'GB wind headline',
  description: 'Latest half hour of transmission-metered wind and its share of all metered generation (interconnector imports and pumped storage left out), plus the last 24 hours.',
  inputs: ['gb_mix'],
  fn: (gb_mix) => {
    const skip = new Set(['INT', 'PS']);
    const by = {};
    gb_mix.forEach((d) => { if (!skip.has(d.fuel)) { const r = (by[d.time] = by[d.time] || { wind: 0, all: 0 }); r.all += +d.mw; if (d.fuel === 'WIND') r.wind += +d.mw; } });
    const ts = Object.keys(by).sort();
    const last = ts[ts.length - 1];
    const day = ts.filter((t) => Date.parse(t) > Date.parse(last) - 24 * 3600e3);
    const w24 = day.reduce((s, t) => s + by[t].wind, 0), a24 = day.reduce((s, t) => s + by[t].all, 0);
    return [{
      latest_time: last, now_gw: Math.round(by[last].wind / 10) / 100, now_share_pct: Math.round((by[last].wind / by[last].all) * 1000) / 10,
      last24_gwh: Math.round(w24 * 0.5 / 100) / 10, share24_pct: Math.round((w24 / a24) * 1000) / 10,
      peak24_gw: Math.round(Math.max(...day.map((t) => by[t].wind)) / 10) / 100,
    }];
  },
});

dash.calc('gb_wind_today', {
  title: 'GB wind generated today',
  description: 'Transmission-metered wind energy since midnight UK time from Elexon’s half-hourly generation by fuel, the latest output, and when it was read.',
  inputs: ['gb_mix'],
  fn: (gb_mix) => {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
    const rows = gb_mix.filter((r) => r.fuel === 'WIND').sort((a, b) => (a.time < b.time ? -1 : 1));
    const last = rows[rows.length - 1];
    const today = day.format(new Date(last.time));
    const mwh = rows.filter((r) => day.format(new Date(r.time)) === today).reduce((s, r) => s + r.mw * 0.5, 0);
    return [{ day: today, today_mwh: Math.round(mwh), rate_mw: Math.round(last.mw), rate_gw: Math.round(last.mw / 10) / 100, latest_time: last.time }];
  },
});

dash.calc('gb_split_summary', {
  title: 'GB onshore and offshore, latest',
  description: 'Offshore share of the latest half hour in Elexon’s actual generation by type.',
  inputs: ['gb_wind_split'],
  fn: (gb_wind_split) => {
    const last = gb_wind_split.map((d) => d.time).sort().slice(-1)[0];
    const at = gb_wind_split.filter((d) => d.time === last);
    const off = at.filter((d) => d.kind === 'Offshore').reduce((s, d) => s + d.mw, 0);
    const all = at.reduce((s, d) => s + d.mw, 0);
    return [{ latest_time: last, offshore_mw: off, onshore_mw: all - off, offshore_pct: all > 0 ? Math.round((off / all) * 1000) / 10 : null }];
  },
});

dash.calc('gb_wind_fc_days', {
  title: 'GB wind forecast by day',
  description: 'NESO transmission and embedded wind forecasts added up per UK calendar day: GWh and the highest half hour. The first row is today, counting only the hours ahead.',
  inputs: ['gb_wind_forecast'],
  fn: (gb_wind_forecast) => {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
    const by = new Map();
    gb_wind_forecast.forEach((d) => {
      const k = key.format(new Date(d.time));
      const mw = (+d.transmission_mw || 0) + (+d.embedded_mw || 0);
      const r = by.get(k) || { day: k, mwh: 0, peak: 0, n: 0 };
      r.mwh += mw * 0.5; r.peak = Math.max(r.peak, mw); r.n += 1;
      by.set(k, r);
    });
    return [...by.values()].sort((a, b) => (a.day < b.day ? -1 : 1)).map((r) => ({ day: r.day, gwh: Math.round(r.mwh / 100) / 10, peak_gw: Math.round(r.peak / 10) / 100, partial: r.n < 46 }));
  },
});

dash.calc('eia_wind_stats', {
  title: 'US wind by grid operator',
  description: 'Latest hour, 24-hour peak and energy for each EIA-930 balancing authority.',
  inputs: ['us_eia930_wind'],
  fn: (us_eia930_wind) => {
    const by = {};
    us_eia930_wind.forEach((d) => { (by[d.ba] = by[d.ba] || { name: d.name, rows: [] }).rows.push({ t: Date.parse(d.time), mw: +d.mw }); });
    return Object.entries(by).map(([ba, { name, rows }]) => {
      rows.sort((a, b) => a.t - b.t);
      const last = rows[rows.length - 1];
      const w = rows.filter((d) => d.t > last.t - 24 * 3600e3);
      return { ba, name, latest_time: new Date(last.t).toISOString(), latest_mw: Math.round(last.mw), peak24_mw: Math.round(Math.max(...w.map((d) => d.mw))), last24_gwh: Math.round(w.reduce((s, d) => s + d.mw, 0) / 100) / 10 };
    }).sort((a, b) => b.last24_gwh - a.last24_gwh);
  },
});

dash.calc('world_wind_latest', {
  title: 'Wind by country, latest year',
  description: 'Each country’s latest Ember year for wind.',
  inputs: ['world_renew_annual'],
  fn: (world_renew_annual) => world_renew_annual.filter((d) => d.source === 'wind' && d.iso3 !== 'WLD' && d.twh != null)
    .map((d) => ({ country: d.country, iso3: d.iso3, year: d.year, twh: Math.round(d.twh * 10) / 10, share_pct: d.share_pct == null ? null : Math.round(d.share_pct * 10) / 10, capacity_gw: d.capacity_gw == null ? null : Math.round(d.capacity_gw * 10) / 10 }))
    .sort((a, b) => b.twh - a.twh),
});

dash.calc('world_wind_trend', {
  title: 'World wind by year',
  description: 'Ember’s World row for wind, 2000 onward.',
  inputs: ['world_renew_annual'],
  fn: (world_renew_annual) => world_renew_annual.filter((d) => d.source === 'wind' && d.iso3 === 'WLD').map((d) => ({ year: d.year, twh: Math.round(d.twh), share_pct: Math.round(d.share_pct * 10) / 10, capacity_gw: d.capacity_gw })).sort((a, b) => a.year - b.year),
});

dash.calc('world_wind_headline', {
  title: 'World wind, latest year',
  description: 'The most recent year in Ember’s World row for wind.',
  inputs: ['world_wind_trend'],
  fn: (world_wind_trend) => { const r = world_wind_trend.filter((d) => d.twh > 0).slice(-1)[0]; return [{ year: r.year, twh: r.twh, share_pct: r.share_pct, capacity_gw: r.capacity_gw == null ? null : Math.round(r.capacity_gw) }]; },
});
;
/* Drawings */
(() => {
  const G = window.GSL;
  const gc = (g) => ({ Europe: dash.colors[0], Americas: dash.colors[1], 'Asia-Pacific': dash.colors[2] }[g] || dash.colors[3]);
  const v = (name, id, field, f, where) => dash.draw(name, (el) => {
    if (!where) return G.value(el, id, field, f);
    const d = dash.data(id);
    const r = d.status === 'ok' ? d.data.find((x) => x[where[0]] === where[1]) : null;
    el.textContent = r && r[field] != null ? f(r[field]) : '—';
  });
  const row = (name, id, field, f, i) => dash.draw(name, (el) => {
    const d = dash.data(id);
    const r = d.status === 'ok' ? d.data[i] : null;
    el.textContent = r && r[field] != null ? f(r[field]) : '—';
  });
  v('w-total', 'wind_total', 'now_gw', G.fmt.gw, ['group', 'All']);
  v('w-n', 'wind_total', 'grids', String, ['group', 'All']);
  v('t-eu', 'wind_total', 'now_gw', G.fmt.gw, ['group', 'Europe']);
  v('t-eu-n', 'wind_total', 'grids', String, ['group', 'Europe']);
  v('t-am', 'wind_total', 'now_gw', G.fmt.gw, ['group', 'Americas']);
  v('t-am-n', 'wind_total', 'grids', String, ['group', 'Americas']);
  v('t-ap', 'wind_total', 'now_gw', G.fmt.gw, ['group', 'Asia-Pacific']);
  v('t-ap-n', 'wind_total', 'grids', String, ['group', 'Asia-Pacific']);
  v('w-share', 'world_wind_headline', 'share_pct', G.fmt.pct1);
  v('w-year', 'world_wind_headline', 'year', String);
  v('t-w', 'world_wind_headline', 'twh', G.fmt.int);
  v('t-w-cap', 'world_wind_headline', 'capacity_gw', G.fmt.int);
  v('t-gb', 'gb_wind_summary', 'now_gw', G.fmt.gw);
  v('gb-wind-rate', 'gb_wind_today', 'rate_gw', G.fmt.gw);
  G.counter('gb-wind-counter', 'gb_wind_today');
  v('t-gb-share', 'gb_wind_summary', 'now_share_pct', G.fmt.pct1);
  v('gb-24', 'gb_wind_summary', 'last24_gwh', G.fmt.one);
  v('gb-24-share', 'gb_wind_summary', 'share24_pct', G.fmt.pct1);
  v('gb-peak', 'gb_wind_summary', 'peak24_gw', G.fmt.gw);
  v('gb-off', 'gb_split_summary', 'offshore_pct', G.fmt.pct1);
  row('gb-fc', 'gb_wind_fc_days', 'gwh', G.fmt.one, 1);
  row('gb-fc-pk', 'gb_wind_fc_days', 'peak_gw', G.fmt.gw, 1);

  dash.draw('w-now-bars', (el) => {
    const d = dash.data('wind_stats');
    if (d.status !== 'ok') return G.fail(el, d);
    G.hbar(el, {
      rows: d.data.filter((r) => r.now_mw != null).slice(0, 18).map((r) => ({ label: r.grid, value: r.now_mw / 1000, r, color: gc(r.group) })),
      fmt: (x) => `${G.fmt.gw(x)} GW`, tipTitle: (r) => r.label,
      tipLines: (r) => [{ color: gc(r.r.group), name: 'Latest', value: `${G.fmt.int(r.r.now_mw)} MW` }, { name: 'At', value: d3.utcFormat('%-d %b %H:%M UTC')(new Date(r.r.latest_time)) }, { name: 'Last 24 h', value: `${G.fmt.one(r.r.last24_gwh)} GWh` }],
    });
  });

  dash.draw('w-map', (el) => {
    const geo = dash.data('world_geo');
    const pts = dash.data('wind_points');
    if (geo.status !== 'ok') return G.fail(el, geo);
    if (pts.status !== 'ok') return G.fail(el, pts);
    el.replaceChildren();
    const W = Math.max(300, el.clientWidth || 800);
    const H = Math.round(W * 0.5);
    const features = geo.data.features.map((f) => {
      if (d3.geoArea(f) > 2 * Math.PI) {
        const rev = (c) => (typeof c[0][0] === 'number' ? [...c].reverse() : c.map(rev));
        return { ...f, geometry: { ...f.geometry, coordinates: rev(f.geometry.coordinates) } };
      }
      return f;
    });
    const proj = d3.geoNaturalEarth1().fitSize([W, H - 10], { type: 'FeatureCollection', features });
    const path = d3.geoPath(proj);
    const svg = d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    svg.append('path').datum({ type: 'Sphere' }).attr('d', path).style('fill', 'none').style('stroke', 'var(--color-border-line)');
    svg.append('g').selectAll('path').data(features).join('path').attr('d', path).style('fill', 'var(--color-border-line)').style('stroke', 'var(--color-panel)').attr('stroke-width', 0.5);
    const r = d3.scaleSqrt([0, Math.max(1000, d3.max(pts.data, (p) => p.now_mw) || 0)], [0, Math.max(14, W / 30)]);
    const tt = G.tip(el);
    svg.append('g').selectAll('circle').data([...pts.data].sort((a, b) => b.now_mw - a.now_mw)).join('circle').attr('class', 'gsl-draw-in')
      .attr('cx', (p) => (proj([p.lon, p.lat]) || [0, 0])[0]).attr('cy', (p) => (proj([p.lon, p.lat]) || [0, 0])[1])
      .attr('r', (p) => Math.max(2.5, r(p.now_mw))).style('fill', (p) => gc(p.group)).attr('fill-opacity', 0.55).style('stroke', (p) => gc(p.group))
      .on('pointermove', (ev, p) => { const [ex, ey] = d3.pointer(ev, el); tt.show(ex, ey, p.grid, [{ color: gc(p.group), name: 'Latest reading', value: p.now_mw >= 1000 ? `${G.fmt.gw(p.now_mw / 1000)} GW` : `${G.fmt.int(p.now_mw)} MW` }]); })
      .on('pointerleave', () => tt.hide());
  });

  const multi = (el, rows, keyOf, opts) => {
    const by = d3.group(rows, keyOf);
    const energy = [...by].map(([k, rs]) => [k, d3.sum(rs, (r) => +r.mw)]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
    const series = [...by].map(([name, rs]) => {
      const i = energy.indexOf(name);
      return { name, z: 10 - i, label: i < 6, color: i < 6 ? dash.colors[i] : 'var(--cds-chart-muted)', width: i < 6 ? 2 : 1,
        points: rs.map((r) => ({ x: new Date(r.time), y: r.mw / 1000 })).sort((a, b) => a.x - b.x) };
    });
    G.lineChart(el, { series, unit: 'GW', yFmt: d3.format(',.1f'), xFmt: d3.utcFormat('%a %H:%M'), tipTitle: (x) => d3.utcFormat('%a %-d %b %H:%M UTC')(x), ...opts });
  };

  dash.draw('eu-lines', (el) => {
    const d = dash.data('wind_live');
    if (d.status !== 'ok') return G.fail(el, d);
    multi(el, d.data.filter((r) => r.group === 'Europe'), (r) => r.grid, { tolerance: 40 * 60e3 });
  });
  dash.draw('eu-tbody', (tb) => {
    const d = dash.data('wind_stats');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    d.data.filter((r) => r.group === 'Europe').sort((a, b) => b.last24_gwh - a.last24_gwh).forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.grid;
      G.cell(tr, r.grid);
      G.cell(tr, r.now_mw == null ? 'stale' : G.fmt.int(r.now_mw), 'num');
      G.cell(tr, G.fmt.int(r.peak24_mw), 'num');
      G.cell(tr, G.fmt.one(r.last24_gwh), 'num');
      G.cell(tr, r.offshore_pct == null ? '–' : G.fmt.pct1(r.offshore_pct), 'num');
      tb.appendChild(tr);
    });
  });

  dash.draw('am-lines', (el) => {
    const d = dash.data('wind_live');
    if (d.status !== 'ok') return G.fail(el, d);
    multi(el, d.data.filter((r) => r.group === 'Americas'), (r) => r.grid, { tolerance: 90 * 60e3 });
  });
  dash.draw('eia-lines', (el) => {
    const d = dash.data('us_eia930_wind');
    if (d.status !== 'ok') return G.fail(el, d);
    multi(el, d.data, (r) => r.name, { tolerance: 40 * 60e3 });
  });
  dash.draw('eia-tbody', (tb) => {
    const d = dash.data('eia_wind_stats');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    d.data.forEach((r) => {
      const tr = document.createElement('tr');
      G.cell(tr, r.ba); G.cell(tr, r.name);
      G.cell(tr, G.fmt.int(r.latest_mw), 'num'); G.cell(tr, G.fmt.int(r.peak24_mw), 'num'); G.cell(tr, G.fmt.one(r.last24_gwh), 'num');
      tb.appendChild(tr);
    });
  });
  const regionLines = (name, grid) => dash.draw(name, (el) => {
    const d = dash.data('wind_live');
    if (d.status !== 'ok') return G.fail(el, d);
    multi(el, d.data.filter((r) => r.grid === grid), (r) => r.region || grid, { tolerance: 40 * 60e3 });
  });
  regionLines('au-lines', 'Australia (NEM)');
  regionLines('jp-lines', 'Japan');
  regionLines('kr-lines', 'South Korea');

  dash.draw('gb-lines', (el) => {
    const m = dash.data('gb_mix');
    const f = dash.data('gb_wind_forecast');
    if (m.status !== 'ok') return G.fail(el, m);
    const act = m.data.filter((r) => r.fuel === 'WIND').map((r) => ({ x: new Date(r.time), y: r.mw / 1000 })).sort((a, b) => a.x - b.x);
    const end = act.length ? +act[act.length - 1].x : Date.now();
    const fc = f.status === 'ok' ? f.data.filter((r) => Date.parse(r.time) <= end + 4 * 864e5) : [];
    G.lineChart(el, {
      series: [
        { name: 'Metered (Elexon)', color: dash.colors[0], label: false, points: act },
        { name: 'Transmission forecast (NESO)', color: dash.colors[0], dash: '4 3', width: 1.5, label: false, points: fc.map((r) => ({ x: new Date(r.time), y: r.transmission_mw / 1000 })) },
        { name: 'Embedded forecast (NESO)', color: dash.colors[1], dash: '4 3', width: 1.5, label: false, points: fc.map((r) => ({ x: new Date(r.time), y: r.embedded_mw / 1000 })) },
      ],
      unit: 'GW', yFmt: d3.format(',.1f'), xFmt: d3.utcFormat('%a %-d'), tolerance: 20 * 60e3, tipTitle: (x) => d3.utcFormat('%a %-d %b %H:%M GMT')(x),
    });
  });
  dash.draw('gb-split', (el) => {
    const d = dash.data('gb_wind_split');
    if (d.status !== 'ok') return G.fail(el, d);
    const by = d3.rollup(d.data, (rs) => Object.fromEntries(rs.map((r) => [r.kind, r.mw / 1000])), (r) => r.time);
    const rows = [...by].map(([t, v]) => ({ x: new Date(t), ...v })).sort((a, b) => a.x - b.x);
    G.stackChart(el, { keys: [{ key: 'Onshore', name: 'Onshore', color: dash.colors[2] }, { key: 'Offshore', name: 'Offshore', color: dash.colors[0] }], rows, unit: 'GW', yFmt: d3.format(',.1f'), xFmt: d3.utcFormat('%a %H:%M'), tipTitle: (x) => d3.utcFormat('%a %-d %b %H:%M GMT')(x) });
  });
  dash.draw('gb-fc-days', (el) => {
    const d = dash.data('gb_wind_fc_days');
    if (d.status !== 'ok') return G.fail(el, d);
    const fd = (k) => d3.utcFormat('%-d %b')(new Date(`${k}T12:00:00Z`));
    G.barChart(el, {
      rows: d.data.map((r) => ({ key: r.day, y: r.gwh, r })), color: dash.colors[0], yFmt: d3.format(',.0f'), xFmt: fd,
      tipTitle: (x) => d3.utcFormat('%a %-d %b %Y')(new Date(`${x.key}T12:00:00Z`)),
      tipLines: (x) => [{ name: x.r.partial ? 'Forecast, rest of today' : 'Forecast', value: `${G.fmt.one(x.r.gwh)} GWh` }, { name: 'Peak half hour', value: `${G.fmt.gw(x.r.peak_gw)} GW` }],
    });
  });

  dash.draw('world-top', (el) => {
    const d = dash.data('world_wind_latest');
    if (d.status !== 'ok') return G.fail(el, d);
    G.hbar(el, { rows: d.data.slice(0, 15).map((r) => ({ label: r.country, value: r.twh, r })), color: dash.colors[0], fmt: (x) => `${G.fmt.int(x)} TWh`,
      tipTitle: (r) => `${r.label}, ${r.r.year}`, tipLines: (r) => [{ name: 'Generation', value: `${G.fmt.one(r.r.twh)} TWh` }, { name: 'Share', value: r.r.share_pct == null ? '–' : `${G.fmt.pct1(r.r.share_pct)}%` }, { name: 'Capacity', value: r.r.capacity_gw == null ? '–' : `${G.fmt.one(r.r.capacity_gw)} GW` }] });
  });
  dash.draw('world-trend', (el) => {
    const d = dash.data('world_wind_trend');
    if (d.status !== 'ok') return G.fail(el, d);
    G.barChart(el, { rows: d.data.filter((r) => r.twh > 0).map((r) => ({ key: String(r.year), y: r.twh, r })), color: dash.colors[0], yFmt: d3.format(',.0f'), xFmt: String,
      topLabels: (x) => `${G.fmt.pct1(x.r.share_pct)}%`, tipTitle: (x) => x.key, tipLines: (x) => [{ name: 'Generation', value: `${G.fmt.int(x.r.twh)} TWh` }, { name: 'Share', value: `${G.fmt.pct1(x.r.share_pct)}%` }] });
  });
  dash.draw('world-tbody', (tb) => {
    const d = dash.data('world_wind_latest');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    d.data.forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.iso3;
      G.cell(tr, r.country); G.cell(tr, String(r.year), 'num'); G.cell(tr, G.fmt.one(r.twh), 'num');
      G.cell(tr, r.share_pct == null ? '–' : G.fmt.pct1(r.share_pct), 'num'); G.cell(tr, r.capacity_gw == null ? '–' : G.fmt.one(r.capacity_gw), 'num');
      tb.appendChild(tr);
    });
  });
})();
