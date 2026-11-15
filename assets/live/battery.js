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
dash.calc('bat_stats', {
  title: 'Batteries by grid',
  description: 'Latest net reading (regions added at their own latest), highest discharge and charge, and energy out and in over the last 24 hours, per grid; a grid more than six hours behind the newest has no figure now.',
  inputs: ['battery_live'],
  fn: (battery_live) => {
    const by = {};
    battery_live.forEach((d) => {
      const g = (by[d.grid] = by[d.grid] || { group: d.group, regions: {} });
      (g.regions[d.region || ''] = g.regions[d.region || ''] || []).push({ t: Date.parse(d.time), mw: +d.mw });
    });
    const newest = Math.max(...battery_live.map((d) => Date.parse(d.time)));
    return Object.entries(by).map(([grid, g]) => {
      let now = 0, latest = 0, dis = 0, chg = 0;
      const at = {};
      Object.values(g.regions).forEach((rows) => {
        rows.sort((a, b) => a.t - b.t);
        const last = rows[rows.length - 1];
        now += last.mw;
        latest = Math.max(latest, last.t);
        rows.forEach((d, i) => {
          if (d.t <= last.t - 24 * 3600e3) return;
          const gap = i > 0 ? Math.min(3600e3, d.t - rows[i - 1].t) : 3600e3;
          if (d.mw > 0) dis += d.mw * gap / 3600e3; else chg -= d.mw * gap / 3600e3;
          at[d.t] = (at[d.t] || 0) + d.mw;
        });
      });
      const stale = latest < newest - 6 * 3600e3;
      const vals = Object.values(at);
      return {
        grid, group: g.group, latest_time: new Date(latest).toISOString(), stale,
        now_mw: stale ? null : Math.round(now), now_gw: stale ? null : Math.round(now / 10) / 100,
        peak_dis_mw: Math.round(Math.max(0, ...vals)), peak_dis_gw: Math.round(Math.max(0, ...vals) / 10) / 100, peak_chg_mw: Math.round(Math.min(0, ...vals)),
        dis24_gwh: Math.round(dis / 100) / 10, chg24_gwh: Math.round(chg / 100) / 10,
      };
    }).sort((a, b) => (b.dis24_gwh + b.chg24_gwh) - (a.dis24_gwh + a.chg24_gwh));
  },
});

dash.calc('bat_total', {
  title: 'Batteries now, by region of the world',
  description: 'Discharging and charging at the latest readings, and 24-hour energy out and in, added up per group of grids and for all of them.',
  inputs: ['bat_stats'],
  fn: (bat_stats) => ['All', 'Europe', 'Americas', 'Asia-Pacific'].map((group) => {
    const rows = bat_stats.filter((d) => (group === 'All' || d.group === group) && d.now_mw != null);
    const r2 = (x) => Math.round(x / 10) / 100;
    if (!rows.length) return { group, grids: null, discharging_gw: null, charging_gw: null, dis24_gwh: null, chg24_gwh: null };
    return {
      group, grids: rows.length,
      discharging_gw: r2(rows.reduce((s, d) => s + Math.max(0, d.now_mw), 0)), charging_gw: r2(rows.reduce((s, d) => s + Math.min(0, d.now_mw), 0)),
      dis24_gwh: Math.round(rows.reduce((s, d) => s + d.dis24_gwh, 0) * 10) / 10, chg24_gwh: Math.round(rows.reduce((s, d) => s + d.chg24_gwh, 0) * 10) / 10,
    };
  }),
});

dash.calc('bat_clock', {
  title: 'Batteries by hour of day',
  description: 'For each grid, average discharging and charging MW in each local hour of the day over the last two days.',
  inputs: ['gb_battery', 'battery_live'],
  fn: (gb_battery, battery_live) => {
    const TZ = { 'Great Britain': 'Europe/London', California: 'America/Los_Angeles', 'Australia (NEM)': 'Australia/Brisbane' };
    const hourOf = {};
    Object.entries(TZ).forEach(([g, tz]) => { hourOf[g] = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }); });
    const acc = {};
    const add = (grid, time, dis, chg, w) => {
      const h = +hourOf[grid].format(new Date(time));
      const a = ((acc[grid] = acc[grid] || {})[h] = acc[grid][h] || { dis: 0, chg: 0, n: 0 });
      a.dis += dis * w; a.chg += chg * w; a.n += w;
    };
    gb_battery.forEach((r) => add('Great Britain', r.time, +r.discharge_mw, +r.charge_mw, 1));
    // other grids: net readings, split into the discharging and charging parts; regions added at each time first
    const net = {};
    battery_live.filter((r) => TZ[r.grid] && r.grid !== 'Great Britain').forEach((r) => { const k = `${r.grid}|${r.time}`; net[k] = (net[k] || 0) + (+r.mw); });
    Object.entries(net).forEach(([k, mw]) => { const [grid, time] = k.split('|'); add(grid, time, Math.max(0, mw), Math.min(0, mw), 1); });
    const out = [];
    Object.entries(acc).forEach(([grid, hours]) => {
      if (Object.keys(hours).length < 20) return;
      for (let h = 0; h < 24; h += 1) {
        const a = hours[h];
        out.push({ grid, hour: h, dis_mw: a ? Math.round(a.dis / a.n) : null, chg_mw: a ? Math.round(a.chg / a.n) : null });
      }
    });
    return out;
  },
});

dash.calc('gb_bat_summary', {
  title: 'GB batteries headline',
  description: 'Latest half hour of the GB battery estimate, the 24-hour peak discharge and energy, and the number and capacity of units counted.',
  inputs: ['gb_battery'],
  fn: (gb_battery) => {
    const r = [...gb_battery].sort((a, b) => (a.time < b.time ? -1 : 1));
    const last = r[r.length - 1];
    const day = r.filter((d) => Date.parse(d.time) > Date.parse(last.time) - 24 * 3600e3);
    const pk = day.reduce((m, d) => (d.discharge_mw > m.discharge_mw ? d : m), day[0]);
    const g = (x) => Math.round(x / 10) / 100;
    return [{
      latest_time: last.time, net_now_gw: g(last.net_mw), discharge_now_gw: g(last.discharge_mw), charge_now_gw: g(last.charge_mw),
      peak_dis_gw: g(pk.discharge_mw), peak_dis_time: pk.time,
      dis24_gwh: Math.round(day.reduce((s, d) => s + d.discharge_mw * 0.5, 0) / 100) / 10, chg24_gwh: Math.round(day.reduce((s, d) => s - d.charge_mw * 0.5, 0) / 100) / 10,
      fleet_units: last.fleet_units, fleet_gw: Math.round(last.fleet_mw / 100) / 10,
    }];
  },
});

dash.calc('aus_bat_store', {
  title: 'NEM battery energy stored',
  description: 'Energy held in NEM batteries at the latest dispatch half hour, added over regions.',
  inputs: ['battery_live'],
  fn: (battery_live) => {
    const rows = battery_live.filter((d) => d.grid === 'Australia (NEM)' && d.energy_mwh != null);
    const last = rows.map((d) => d.time).sort().slice(-1)[0];
    return [{ latest_time: last || null, stored_gwh: last ? Math.round(rows.filter((d) => d.time === last).reduce((s, d) => s + d.energy_mwh, 0) / 100) / 10 : null }];
  },
});
;
/* Drawings */
(() => {
  const G = window.GSL;
  const gc = (g) => ({ Europe: dash.colors[0], Americas: dash.colors[1], 'Asia-Pacific': dash.colors[2] }[g] || dash.colors[3]);
  const signed = (x) => `${x > 0 ? '+' : ''}${G.fmt.gw(x)}`;
  const v = (name, id, field, f, where) => dash.draw(name, (el) => {
    if (!where) return G.value(el, id, field, f);
    const d = dash.data(id);
    const r = d.status === 'ok' ? d.data.find((x) => x[where[0]] === where[1]) : null;
    el.textContent = r && r[field] != null ? f(r[field]) : '—';
  });
  v('b-dis', 'bat_total', 'discharging_gw', G.fmt.gw, ['group', 'All']);
  v('b-chg', 'bat_total', 'charging_gw', (x) => G.fmt.gw(Math.abs(x)), ['group', 'All']);
  v('b-n', 'bat_total', 'grids', String, ['group', 'All']);
  v('t-24', 'bat_total', 'dis24_gwh', G.fmt.one, ['group', 'All']);
  v('t-24c', 'bat_total', 'chg24_gwh', G.fmt.one, ['group', 'All']);
  v('t-gb', 'gb_bat_summary', 'net_now_gw', signed);
  v('t-gb-units', 'gb_bat_summary', 'fleet_units', String);
  v('t-gb-fleet', 'gb_bat_summary', 'fleet_gw', G.fmt.one);
  v('t-ca', 'bat_stats', 'now_gw', signed, ['grid', 'California']);
  v('t-ca-pk', 'bat_stats', 'peak_dis_gw', G.fmt.gw, ['grid', 'California']);
  v('t-au', 'bat_stats', 'now_gw', signed, ['grid', 'Australia (NEM)']);
  v('t-au-st', 'aus_bat_store', 'stored_gwh', G.fmt.one);
  v('gb-dis', 'gb_bat_summary', 'discharge_now_gw', G.fmt.gw);
  v('gb-chg', 'gb_bat_summary', 'charge_now_gw', (x) => G.fmt.gw(Math.abs(x)));
  v('gb-pk', 'gb_bat_summary', 'peak_dis_gw', G.fmt.gw);
  v('gb-pk-t', 'gb_bat_summary', 'peak_dis_time', (t) => d3.utcFormat('%a %H:%M UTC')(new Date(t)));
  v('gb-24', 'gb_bat_summary', 'dis24_gwh', G.fmt.one);
  v('gb-24c', 'gb_bat_summary', 'chg24_gwh', G.fmt.one);

  dash.draw('b-now-bars', (el) => {
    const d = dash.data('bat_stats');
    if (d.status !== 'ok') return G.fail(el, d);
    G.divBar(el, {
      rows: d.data.filter((r) => r.now_mw != null).sort((a, b) => b.now_mw - a.now_mw).map((r) => ({ label: r.grid, value: r.now_mw / 1000, r })),
      pos: 'var(--color-ok)', neg: 'var(--color-warn)', fmt: (x) => `${signed(x)} GW`,
      tipTitle: (r) => r.label, tipLines: (r) => [{ name: r.r.now_mw >= 0 ? 'Discharging' : 'Charging', value: `${G.fmt.int(Math.abs(r.r.now_mw))} MW` }, { name: 'At', value: d3.utcFormat('%-d %b %H:%M UTC')(new Date(r.r.latest_time)) }],
    });
  });
  dash.draw('bat-clock', (el) => {
    const d = dash.data('bat_clock');
    if (d.status !== 'ok' || !d.data.length) return G.fail(el, d);
    el.replaceChildren();
    const grids = [...new Set(d.data.map((r) => r.grid))];
    const W = Math.max(300, el.clientWidth || 800);
    const per = Math.min(340, Math.max(220, W / grids.length));
    const cols = Math.max(1, Math.min(grids.length, Math.floor(W / per)));
    const size = W / cols;
    const rowsN = Math.ceil(grids.length / cols);
    const H = rowsN * (size + 24);
    const svg = d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const tt = G.tip(el);
    const fmt = (mw) => (Math.abs(mw) >= 1000 ? `${G.fmt.gw(mw / 1000)} GW` : `${G.fmt.int(mw)} MW`);
    grids.forEach((grid, gi) => {
      const rows = d.data.filter((r) => r.grid === grid);
      const cx = (gi % cols) * size + size / 2;
      const cy = Math.floor(gi / cols) * (size + 24) + size / 2 + 4;
      const R = size / 2 - 22;
      const r0 = R * 0.5;
      const max = Math.max(1, d3.max(rows, (r) => Math.max(r.dis_mw || 0, -(r.chg_mw || 0))));
      const out = d3.scaleLinear([0, max], [r0, R]);
      const inn = d3.scaleLinear([0, max], [r0, r0 * 0.25]);
      const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
      const step = (2 * Math.PI) / 24;
      g.append('circle').attr('r', r0).style('fill', 'none').style('stroke', 'var(--color-border-line)');
      [0, 6, 12, 18].forEach((h) => {
        const ang = h * step;
        g.append('text').attr('class', 'gsl-tick').attr('x', Math.sin(ang) * (R + 12)).attr('y', -Math.cos(ang) * (R + 12)).attr('dy', '0.32em').attr('text-anchor', 'middle').text(`${String(h).padStart(2, '0')}:00`);
      });
      const arc = d3.arc().padAngle(0.02);
      rows.forEach((r) => {
        const a0 = r.hour * step, a1 = (r.hour + 1) * step;
        if (r.dis_mw > 0) g.append('path').attr('class', 'gsl-draw-in').attr('d', arc({ innerRadius: r0, outerRadius: out(r.dis_mw), startAngle: a0, endAngle: a1 })).style('fill', 'var(--color-ok)');
        if (r.chg_mw < 0) g.append('path').attr('class', 'gsl-draw-in').attr('d', arc({ innerRadius: inn(-r.chg_mw), outerRadius: r0, startAngle: a0, endAngle: a1 })).style('fill', 'var(--color-warn)');
        g.append('path').attr('d', arc({ innerRadius: r0 * 0.2, outerRadius: R, startAngle: a0, endAngle: a1 })).style('fill', 'transparent')
          .on('pointermove', (ev) => {
            const [ex, ey] = d3.pointer(ev, el);
            tt.show(ex, ey, `${grid}, ${String(r.hour).padStart(2, '0')}:00 to ${String((r.hour + 1) % 24).padStart(2, '0')}:00 local`, [
              { color: 'var(--color-ok)', name: 'Discharging', value: r.dis_mw == null ? '–' : fmt(r.dis_mw) },
              { color: 'var(--color-warn)', name: 'Charging', value: r.chg_mw == null ? '–' : fmt(-r.chg_mw) },
            ]);
          })
          .on('pointerleave', () => tt.hide());
      });
      const peak = rows.reduce((m, r) => ((r.dis_mw || 0) > (m.dis_mw || 0) ? r : m), rows[0]);
      g.append('text').attr('text-anchor', 'middle').attr('y', -4).style('fill', 'var(--color-fg)').style('font-weight', 600).text(grid);
      g.append('text').attr('class', 'gsl-tick').attr('text-anchor', 'middle').attr('y', 12).text(`peak ${fmt(peak.dis_mw || 0)} at ${String(peak.hour).padStart(2, '0')}:00`);
    });
  });

  const lines = (el, rows, keyOf, unitDiv, unit) => {
    const by = d3.group(rows, keyOf);
    const order = [...by].map(([k, rs]) => [k, d3.sum(rs, (r) => Math.abs(+r.mw))]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
    const series = [...by].map(([name, rs]) => {
      const i = order.indexOf(name);
      return { name, z: 10 - i, label: i < 6, color: i < 6 ? dash.colors[i] : 'var(--cds-chart-muted)', width: i < 6 ? 2 : 1,
        points: rs.map((r) => ({ x: new Date(r.time), y: r.mw / unitDiv })).sort((a, b) => a.x - b.x) };
    });
    G.lineChart(el, { series, unit, yFmt: d3.format(unitDiv > 1 ? ',.1f' : ',.0f'), xFmt: d3.utcFormat('%a %H:%M'), tolerance: 90 * 60e3, tipTitle: (x) => d3.utcFormat('%a %-d %b %H:%M UTC')(x) });
  };
  const grid = (name, g, byRegion, unitDiv, unit) => dash.draw(name, (el) => {
    const d = dash.data('battery_live');
    if (d.status !== 'ok') return G.fail(el, d);
    lines(el, d.data.filter((r) => r.grid === g), (r) => (byRegion ? r.region || g : g), unitDiv, unit);
  });
  grid('ca-lines', 'California', false, 1000, 'GW');
  grid('ne-lines', 'New England', false, 1, 'MW');
  grid('ab-lines', 'Alberta', false, 1, 'MW');
  grid('au-lines', 'Australia (NEM)', true, 1000, 'GW');
  grid('jp-lines', 'Japan', true, 1, 'MW');
  grid('kr-lines', 'South Korea', false, 1, 'MW');
  dash.draw('eu-lines', (el) => {
    const d = dash.data('battery_live');
    if (d.status !== 'ok') return G.fail(el, d);
    lines(el, d.data.filter((r) => r.group === 'Europe' && r.grid !== 'Great Britain'), (r) => r.grid, 1000, 'GW');
  });

  dash.draw('gb-lines', (el) => {
    const d = dash.data('gb_battery');
    if (d.status !== 'ok') return G.fail(el, d);
    const pts = (k) => d.data.map((r) => ({ x: new Date(r.time), y: r[k] / 1000 })).sort((a, b) => a.x - b.x);
    G.lineChart(el, {
      series: [
        { name: 'Discharging', color: 'var(--color-ok)', width: 1.5, points: pts('discharge_mw') },
        { name: 'Charging', color: 'var(--color-warn)', width: 1.5, points: pts('charge_mw') },
        { name: 'Net', color: 'var(--color-fg)', width: 2, z: 5, points: pts('net_mw') },
      ],
      unit: 'GW', yFmt: d3.format(',.1f'), xFmt: d3.utcFormat('%a %H:%M'), tolerance: 20 * 60e3, tipTitle: (x) => d3.utcFormat('%a %-d %b %H:%M UTC')(x),
    });
  });

  dash.draw('b-tbody', (tb) => {
    const d = dash.data('bat_stats');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    d.data.forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.grid;
      G.cell(tr, r.grid);
      G.cell(tr, r.now_mw == null ? 'stale' : G.fmt.int(r.now_mw), 'num');
      G.cell(tr, G.fmt.int(r.peak_dis_mw), 'num'); G.cell(tr, G.fmt.int(r.peak_chg_mw), 'num');
      G.cell(tr, G.fmt.one(r.dis24_gwh), 'num'); G.cell(tr, G.fmt.one(r.chg24_gwh), 'num');
      tb.appendChild(tr);
    });
  });
})();
