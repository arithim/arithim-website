/* Worked-out figures. Each is a calculation over the files the refresh script attaches. */
dash.calc('uk_summary', {
  title: 'GB solar headline figures',
  description: 'Latest reading, last 24 hours and 60-day record from the GB national series.',
  inputs: ['uk_national'],
  fn: (uk_national) => {
    const round = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
    const r = uk_national.map((d) => ({ t: Date.parse(d.time), mw: +d.mw, cap: +d.capacity_mwp }));
    const last = r[r.length - 1];
    const H = 3600e3;
    const inWin = (from, to) => r.filter((d) => d.t > last.t - from * H && d.t <= last.t - to * H);
    const gwh = (rows) => rows.reduce((s, d) => s + d.mw * 0.5, 0) / 1000;
    const w24 = inWin(24, 0);
    const rec = r.reduce((a, b) => (b.mw > a.mw ? b : a));
    const days = {};
    r.forEach((d) => { const k = new Date(d.t - 15 * 60e3).toISOString().slice(0, 10); days[k] = (days[k] || 0) + d.mw * 0.5 / 1000; });
    const full = Object.keys(days).sort().slice(0, -1).slice(-30);
    return [{
      latest_time: new Date(last.t).toISOString(),
      now_gw: round(last.mw / 1000, 2),
      capacity_gw: round(last.cap / 1000, 2),
      now_cf_pct: round((last.mw / last.cap) * 100, 1),
      last24_gwh: round(gwh(w24), 1),
      prev24_gwh: round(gwh(inWin(48, 24)), 1),
      peak24_gw: round(Math.max(...w24.map((d) => d.mw)) / 1000, 2),
      record_gw_60d: round(rec.mw / 1000, 2),
      record_day: new Date(rec.t).toISOString().slice(0, 10),
      avg30_gwh: round(full.reduce((s, k) => s + days[k], 0) / full.length, 1),
    }];
  },
});

dash.calc('gb_fc_days', {
  title: 'GB solar forecast by day',
  description: "NESO's embedded solar forecast added up per UK calendar day: GWh and the highest half-hour. Today counts only the half-hours still to come.",
  inputs: ['gb_forecast'],
  fn: (gb_forecast) => {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
    const by = new Map();
    gb_forecast.forEach((d) => {
      const k = key.format(new Date(d.time));
      const r = by.get(k) || { day: k, mwh: 0, peak: 0, n: 0, cap: +d.capacity_mw };
      r.mwh += +d.mw * 0.5; r.peak = Math.max(r.peak, +d.mw); r.n += 1;
      by.set(k, r);
    });
    return [...by.values()].sort((a, b) => (a.day < b.day ? -1 : 1)).map((r, i) => ({
      day: r.day, gwh: Math.round(r.mwh / 100) / 10, peak_gw: Math.round(r.peak / 10) / 100,
      partial: r.n < 46, capacity_gw: Math.round(r.cap / 100) / 10,
    }));
  },
});

dash.calc('gb_fc_summary', {
  title: 'GB solar forecast headline',
  description: "Tomorrow's forecast energy and peak, the forecast for the next seven full days, and how tomorrow compares with the average day of the last 30 days (PV_Live).",
  inputs: ['gb_fc_days', 'uk_summary'],
  fn: (gb_fc_days, uk_summary) => {
    const full = gb_fc_days.filter((d) => !d.partial);
    const tm = full[0] || { gwh: null, peak_gw: null, day: null };
    const wk = full.slice(0, 7);
    const avg = uk_summary[0].avg30_gwh;
    return [{
      tomorrow_day: tm.day, tomorrow_gwh: tm.gwh, tomorrow_peak_gw: tm.peak_gw,
      week_gwh: Math.round(wk.reduce((s, d) => s + d.gwh, 0) * 10) / 10, week_days: wk.length,
      tomorrow_vs_avg_pct: avg && tm.gwh != null ? Math.round((tm.gwh / avg - 1) * 1000) / 10 : null,
    }];
  },
});

dash.calc('uk_daily', {
  title: 'GB solar per day',
  description: 'Half-hourly output summed into GWh per day (GMT), latest part-day left out, with a 7-day average.',
  inputs: ['uk_national'],
  fn: (uk_national) => {
    const round = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
    const days = new Map();
    uk_national.forEach((d) => {
      const k = new Date(Date.parse(d.time) - 15 * 60e3).toISOString().slice(0, 10);
      const o = days.get(k) || { day: k, mwh: 0, peak: 0 };
      o.mwh += d.mw * 0.5;
      o.peak = Math.max(o.peak, d.mw);
      days.set(k, o);
    });
    const list = [...days.values()].sort((a, b) => (a.day < b.day ? -1 : 1)).slice(1, -1);
    return list.map((o, i) => {
      const win = list.slice(Math.max(0, i - 6), i + 1);
      return {
        day: o.day,
        gwh: round(o.mwh / 1000, 1),
        peak_gw: round(o.peak / 1000, 2),
        avg7_gwh: win.length === 7 ? round(win.reduce((s, w) => s + w.mwh, 0) / 7000, 1) : null,
      };
    });
  },
});

dash.calc('uk_region_stats', {
  title: 'GB solar by region',
  description: 'Latest output, capacity and last-24-hour energy and capacity factor per DNO licence area.',
  inputs: ['uk_regions'],
  fn: (uk_regions) => {
    const round = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
    const by = {};
    uk_regions.forEach((d) => { (by[d.region] = by[d.region] || []).push({ t: Date.parse(d.time), mw: +d.mw, cap: +d.capacity_mwp }); });
    return Object.entries(by).map(([region, rows]) => {
      rows.sort((a, b) => a.t - b.t);
      const last = rows[rows.length - 1];
      const w = rows.filter((d) => d.t > last.t - 24 * 3600e3);
      const mwh = w.reduce((s, d) => s + d.mw * 0.5, 0);
      return {
        region,
        now_mw: round(last.mw, 0),
        capacity_mw: round(last.cap, 0),
        last24_mwh: round(mwh, 0),
        peak24_mw: round(Math.max(...w.map((d) => d.mw)), 0),
        cf24_pct: round((mwh / (last.cap * 24)) * 100, 1),
      };
    }).sort((a, b) => b.capacity_mw - a.capacity_mw);
  },
});

dash.calc('eu_stats', {
  title: 'Europe solar by country',
  description: 'Latest reading, 24-hour peak and 24-hour energy per country; each reading counts for the gap since the one before. A feed more than 6 hours behind the newest has no reading now.',
  inputs: ['europe_live'],
  fn: (europe_live) => {
    const round = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
    const by = {};
    europe_live.forEach((d) => { (by[d.country] = by[d.country] || { iso3: d.iso3, rows: [] }).rows.push({ t: Date.parse(d.time), mw: +d.mw }); });
    const newest = Math.max(...europe_live.map((d) => Date.parse(d.time)));
    return Object.entries(by).map(([country, { iso3, rows }]) => {
      rows.sort((a, b) => a.t - b.t);
      const last = rows[rows.length - 1];
      let mwh = 0;
      let peak = 0;
      rows.forEach((d, i) => {
        if (d.t <= last.t - 24 * 3600e3) return;
        const gap = i > 0 ? d.t - rows[i - 1].t : (rows[1] ? rows[1].t - d.t : 3600e3);
        mwh += d.mw * Math.min(1, gap / 3600e3);
        peak = Math.max(peak, d.mw);
      });
      const stale = last.t < newest - 6 * 3600e3;
      return { country, iso3, now_mw: stale ? null : round(last.mw, 0), stale, latest_time: new Date(last.t).toISOString(), peak24_mw: round(peak, 0), last24_gwh: round(mwh / 1000, 1) };
    }).sort((a, b) => b.last24_gwh - a.last24_gwh);
  },
});

dash.calc('eu_cf', {
  title: 'Europe capacity factor, 24 h',
  description: "Last-24-hour energy over Ember's latest year-end solar capacity times 24 hours. Capacity added since then makes this read a little high.",
  inputs: ['eu_stats', 'world_latest'],
  fn: (eu_stats, world_latest) => {
    const cap = new Map(world_latest.map((d) => [d.iso3, d.capacity_gw]));
    return eu_stats.map((d) => {
      const gw = cap.get(d.iso3);
      return { country: d.country, capacity_gw: gw ?? null, cf24_pct: gw ? Math.round((d.last24_gwh / (gw * 24)) * 1000) / 10 : null };
    });
  },
});

dash.calc('eu_total', {
  title: 'Europe solar total',
  description: 'Sum of the latest readings (current feeds only) and of last-24-hour energy across the European countries tracked.',
  inputs: ['eu_stats'],
  fn: (eu_stats) => [{
    now_gw: Math.round(eu_stats.reduce((s, d) => s + (d.now_mw || 0), 0) / 10) / 100,
    last24_gwh: Math.round(eu_stats.reduce((s, d) => s + d.last24_gwh, 0) * 10) / 10,
    countries: eu_stats.filter((d) => !d.stale).length,
  }],
});

dash.calc('caiso_summary', {
  title: 'California solar headline',
  description: 'Latest 5-minute reading, 24-hour peak and 24-hour energy for CAISO solar.',
  inputs: ['caiso_live'],
  fn: (caiso_live) => {
    const round = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
    const r = caiso_live.map((d) => ({ t: Date.parse(d.time), mw: +d.mw })).sort((a, b) => a.t - b.t);
    const last = r[r.length - 1];
    const w = r.filter((d) => d.t > last.t - 24 * 3600e3);
    return [{
      latest_time: new Date(last.t).toISOString(),
      now_gw: round(last.mw / 1000, 2),
      peak24_gw: round(Math.max(...w.map((d) => d.mw)) / 1000, 2),
      last24_gwh: round(w.reduce((s, d) => s + d.mw * (5 / 60), 0) / 1000, 1),
    }];
  },
});

dash.calc('canada_summary', {
  title: 'Canada solar headline',
  description: 'Ontario: latest hour and 24-hour peak of transmission-connected solar (IESO). Alberta: the latest snapshot of total solar output and its maximum capability (AESO).',
  inputs: ['canada_live'],
  fn: (canada_live) => {
    const of = (p) => canada_live.filter((d) => d.province === p).map((d) => ({ t: Date.parse(d.time), mw: +d.mw, cap: +d.capability_mw })).sort((a, b) => a.t - b.t);
    const on = of('Ontario');
    const ab = of('Alberta');
    const lo = on[on.length - 1] || { t: 0, mw: 0 };
    const la = ab[ab.length - 1] || { t: 0, mw: 0, cap: 0 };
    const peak = (rows, last) => Math.round(Math.max(0, ...rows.filter((d) => d.t > last.t - 24 * 3600e3).map((d) => d.mw)));
    return [{
      now_gw: Math.round((lo.mw + la.mw) / 10) / 100,
      ontario_now_mw: Math.round(lo.mw), ontario_time: lo.t ? new Date(lo.t).toISOString() : null, ontario_peak24_mw: peak(on, lo),
      alberta_now_mw: Math.round(la.mw), alberta_time: la.t ? new Date(la.t).toISOString() : null, alberta_cap_mw: Math.round(la.cap), alberta_peak24_mw: peak(ab, la),
    }];
  },
});

dash.calc('isone_summary', {
  title: 'New England solar headline',
  description: 'Latest reading and 24-hour peak for ISO New England grid-connected solar.',
  inputs: ['us_isone'],
  fn: (us_isone) => {
    const r = us_isone.map((d) => ({ t: Date.parse(d.time), mw: +d.mw })).sort((a, b) => a.t - b.t);
    const last = r[r.length - 1];
    const w = r.filter((d) => d.t > last.t - 24 * 3600e3);
    return [{ latest_time: new Date(last.t).toISOString(), now_mw: Math.round(last.mw), peak24_mw: Math.round(Math.max(...w.map((d) => d.mw))) }];
  },
});

dash.calc('brazil_summary', {
  title: 'Brazil solar headline',
  description: 'Latest 1-minute reading, peak and energy so far today for centralised solar on the national grid.',
  inputs: ['brazil_live'],
  fn: (brazil_live) => {
    const round = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
    const r = brazil_live.map((d) => ({ t: Date.parse(d.time), mw: +d.mw })).sort((a, b) => a.t - b.t);
    const last = r[r.length - 1];
    let mwh = 0;
    r.forEach((d, i) => { if (i > 0) mwh += d.mw * Math.min(5, (d.t - r[i - 1].t) / 60e3) / 60; });
    return [{ latest_time: new Date(last.t).toISOString(), now_gw: round(last.mw / 1000, 2), peak_gw: round(Math.max(...r.map((d) => d.mw)) / 1000, 2), today_gwh: round(mwh / 1000, 1) }];
  },
});

dash.calc('eia_stats', {
  title: 'US solar by balancing authority',
  description: 'For each operator, energy and peak over the 24 hours up to its latest published hour (EIA-930).',
  inputs: ['us_eia930'],
  fn: (us_eia930) => {
    const by = {};
    us_eia930.forEach((d) => { (by[d.ba] = by[d.ba] || { name: d.name, rows: [] }).rows.push({ t: Date.parse(d.time), mw: +d.mw }); });
    return Object.entries(by).map(([ba, { name, rows }]) => {
      const last = Math.max(...rows.map((d) => d.t));
      const w = rows.filter((d) => d.t > last - 24 * 3600e3);
      return { ba, name, latest_time: new Date(last).toISOString(), peak24_mw: Math.round(Math.max(...w.map((d) => d.mw))), last24_gwh: Math.round(w.reduce((s, d) => s + d.mw, 0) / 100) / 10 };
    }).sort((a, b) => b.last24_gwh - a.last24_gwh);
  },
});

dash.calc('eia_total', {
  title: 'US EIA-930 total',
  description: 'Sum of the operators above and the newest hour any of them has published.',
  inputs: ['eia_stats'],
  fn: (eia_stats) => [{
    last24_gwh: Math.round(eia_stats.reduce((s, d) => s + d.last24_gwh, 0) * 10) / 10,
    latest_time: eia_stats.map((d) => d.latest_time).sort().slice(-1)[0],
  }],
});

dash.calc('japan_stats', {
  title: 'Japan solar by area',
  description: 'Latest half-hour, 24-hour peak and 24-hour energy for each transmission area.',
  inputs: ['japan_live'],
  fn: (japan_live) => {
    const by = {};
    japan_live.forEach((d) => { (by[d.area] = by[d.area] || []).push({ t: Date.parse(d.time), mw: +d.mw }); });
    return Object.entries(by).map(([area, rows]) => {
      rows.sort((a, b) => a.t - b.t);
      const last = rows[rows.length - 1];
      const w = rows.filter((d) => d.t > last.t - 24 * 3600e3);
      return { area, latest_time: new Date(last.t).toISOString(), now_mw: Math.round(last.mw), peak24_mw: Math.round(Math.max(...w.map((d) => d.mw))), last24_gwh: Math.round(w.reduce((s, d) => s + d.mw * 0.5, 0) / 100) / 10 };
    }).sort((a, b) => b.last24_gwh - a.last24_gwh);
  },
});

dash.calc('japan_total', {
  title: 'Japan solar total',
  description: 'The nine areas added together, each at its latest half-hour.',
  inputs: ['japan_stats'],
  fn: (japan_stats) => [{
    now_gw: Math.round(japan_stats.reduce((s, d) => s + d.now_mw, 0) / 10) / 100,
    last24_gwh: Math.round(japan_stats.reduce((s, d) => s + d.last24_gwh, 0) * 10) / 10,
    latest_time: japan_stats.map((d) => d.latest_time).sort().slice(-1)[0],
  }],
});

dash.calc('aus_stats', {
  title: 'Australia solar by region',
  description: 'Latest rooftop and utility readings and 24-hour energy per NEM region; both series are half-hourly.',
  inputs: ['australia_live'],
  fn: (australia_live) => {
    const names = { NSW1: 'New South Wales', QLD1: 'Queensland', VIC1: 'Victoria', SA1: 'South Australia', TAS1: 'Tasmania' };
    const by = {};
    australia_live.forEach((d) => {
      const k = (by[d.region] = by[d.region] || { Rooftop: [], Utility: [] });
      k[d.kind].push({ t: Date.parse(d.time), mw: +d.mw });
    });
    return Object.entries(by).map(([code, k]) => {
      const lastOf = (rows) => rows.sort((a, b) => a.t - b.t)[rows.length - 1] || { t: 0, mw: 0 };
      const roof = lastOf(k.Rooftop);
      const util = lastOf(k.Utility);
      const e = (rows, last) => rows.filter((d) => d.t > last.t - 24 * 3600e3).reduce((s, d) => s + d.mw * 0.5, 0);
      const roofE = e(k.Rooftop, roof);
      const utilE = e(k.Utility, util);
      return {
        region: names[code] || code, rooftop_now_mw: Math.round(roof.mw), utility_now_mw: Math.round(util.mw),
        total_now_mw: Math.round(roof.mw + util.mw), last24_gwh: Math.round((roofE + utilE) / 100) / 10,
        rooftop_share_pct: roofE + utilE > 0 ? Math.round((roofE / (roofE + utilE)) * 1000) / 10 : null,
      };
    }).sort((a, b) => b.last24_gwh - a.last24_gwh);
  },
});

dash.calc('aus_total', {
  title: 'Australia NEM solar total',
  description: 'The five NEM regions added together; rooftop share is of the last 24 hours of energy.',
  inputs: ['aus_stats'],
  fn: (aus_stats) => {
    const sum = (k) => aus_stats.reduce((s, d) => s + (d[k] || 0), 0);
    const roof24 = aus_stats.reduce((s, d) => s + d.last24_gwh * (d.rooftop_share_pct || 0) / 100, 0);
    return [{
      now_gw: Math.round(sum('total_now_mw') / 10) / 100,
      rooftop_now_gw: Math.round(sum('rooftop_now_mw') / 10) / 100,
      utility_now_gw: Math.round(sum('utility_now_mw') / 10) / 100,
      last24_gwh: Math.round(sum('last24_gwh') * 10) / 10,
      rooftop_share_pct: Math.round((roof24 / sum('last24_gwh')) * 1000) / 10,
    }];
  },
});

dash.calc('aus_series', {
  title: 'Australia NEM solar over time',
  description: 'Rooftop and utility solar summed across the five regions for each half-hour that every region reports.',
  inputs: ['australia_live'],
  fn: (australia_live) => {
    const by = {};
    australia_live.forEach((d) => {
      const k = `${d.kind}|${d.time}`;
      (by[k] = by[k] || { kind: d.kind, time: d.time, mw: 0, n: 0 });
      by[k].mw += +d.mw;
      by[k].n += 1;
    });
    return Object.values(by).filter((d) => d.n === 5).map((d) => ({ kind: d.kind, time: d.time, gw: Math.round(d.mw / 10) / 100 }))
      .sort((a, b) => (a.time < b.time ? -1 : 1));
  },
});

dash.calc('korea_summary', {
  title: 'South Korea solar headline',
  description: 'Latest 5-minute reading of rooftop (estimate), PPA (estimate) and market solar, and energy so far today.',
  inputs: ['korea_live'],
  fn: (korea_live) => {
    const r = [...korea_live].sort((a, b) => (a.time < b.time ? -1 : 1));
    const last = r[r.length - 1];
    const tot = (d) => d.rooftop_mw + d.ppa_mw + d.market_mw;
    return [{
      latest_time: last.time,
      now_gw: Math.round(tot(last) / 10) / 100,
      rooftop_now_gw: Math.round(last.rooftop_mw / 10) / 100,
      ppa_now_gw: Math.round(last.ppa_mw / 10) / 100,
      market_now_gw: Math.round(last.market_mw / 10) / 100,
      today_gwh: Math.round(r.reduce((s, d) => s + tot(d) * (5 / 60), 0) / 100) / 10,
    }];
  },
});

dash.calc('market_now', {
  title: 'Solar right now, by grid',
  description: 'Each live feed’s latest reading in GW, side by side; a feed with no reading is left out.',
  inputs: ['uk_summary', 'eu_total', 'caiso_summary', 'isone_summary', 'brazil_summary', 'japan_total', 'korea_summary', 'aus_total', 'canada_summary'],
  fn: (uk_summary, eu_total, caiso_summary, isone_summary, brazil_summary, japan_total, korea_summary, aus_total, canada_summary) => {
    const v = (rows, k, div) => (rows && rows[0] && rows[0][k] != null ? rows[0][k] / (div || 1) : null);
    return [
      { market: 'Great Britain', group: 'Europe', now_gw: v(uk_summary, 'now_gw') },
      { market: v(eu_total, 'countries') ? `Europe, ${v(eu_total, 'countries')} countries` : 'Europe', group: 'Europe', now_gw: v(eu_total, 'now_gw') },
      { market: 'California', group: 'Americas', now_gw: v(caiso_summary, 'now_gw') },
      { market: 'New England', group: 'Americas', now_gw: v(isone_summary, 'now_mw') == null ? null : Math.round(v(isone_summary, 'now_mw') / 10) / 100 },
      { market: 'Brazil', group: 'Americas', now_gw: v(brazil_summary, 'now_gw') },
      { market: 'Canada', group: 'Americas', now_gw: v(canada_summary, 'now_gw') },
      { market: 'Japan, 9 areas', group: 'Asia-Pacific', now_gw: v(japan_total, 'now_gw') },
      { market: 'South Korea', group: 'Asia-Pacific', now_gw: v(korea_summary, 'now_gw') },
      { market: 'Australia (NEM)', group: 'Asia-Pacific', now_gw: v(aus_total, 'now_gw') },
    ].filter((r) => r.now_gw != null && Number.isFinite(r.now_gw)).sort((a, b) => b.now_gw - a.now_gw);
  },
});

dash.calc('live_total', {
  title: 'Live solar tracked now',
  description: 'All live grids’ latest readings added together.',
  inputs: ['market_now'],
  fn: (market_now) => [{
    now_gw: Math.round(market_now.reduce((s, d) => s + d.now_gw, 0) * 100) / 100,
    markets: market_now.length,
  }],
});

dash.calc('live_points', {
  title: 'Live solar by place',
  description: 'Each live feed’s latest reading placed on the map: countries for Europe, areas for Japan, regions for Australia, provinces for Canada. Coordinates are fixed points near where each grid’s solar sits.',
  inputs: ['uk_summary', 'eu_stats', 'caiso_summary', 'isone_summary', 'brazil_summary', 'japan_stats', 'korea_summary', 'aus_stats', 'canada_summary'],
  fn: (uk_summary, eu_stats, caiso_summary, isone_summary, brazil_summary, japan_stats, korea_summary, aus_stats, canada_summary) => {
    const EU = { DEU: [10.4, 51.1], FRA: [2.4, 46.6], ESP: [-3.7, 40.2], ITA: [12.6, 42.8], NLD: [5.3, 52.2], BEL: [4.5, 50.6], AUT: [14.1, 47.6], CHE: [8.2, 46.8], POL: [19.4, 52.1], PRT: [-8.0, 39.6], CZE: [15.3, 49.8], SWE: [14.5, 57.5], GRC: [22.6, 39.3], HUN: [19.4, 47.2], ROU: [25.0, 45.9], BGR: [25.3, 42.7], SVN: [14.8, 46.1], SVK: [19.5, 48.7], HRV: [16.0, 45.4], DNK: [9.6, 56.0], IRL: [-7.6, 53.4] };
    const JP = { Tokyo: [139.7, 35.9], Kansai: [135.5, 34.8], Kyushu: [130.7, 32.6], Chugoku: [132.6, 34.6], Shikoku: [133.5, 33.7], Hokuriku: [136.9, 36.6], Hokkaido: [142.8, 43.3], Tohoku: [140.6, 39.3], Chubu: [137.3, 35.2], Okinawa: [127.8, 26.4] };
    const AU = { 'New South Wales': [147.0, -32.5], Queensland: [148.5, -23.0], Victoria: [144.5, -37.0], 'South Australia': [138.6, -33.5], Tasmania: [146.8, -42.0] };
    const out = [];
    const one = (rows) => (rows && rows[0]) || {};
    [uk_summary, caiso_summary, isone_summary, brazil_summary, korea_summary, canada_summary] = [uk_summary, caiso_summary, isone_summary, brazil_summary, korea_summary, canada_summary].map((r) => [one(r)]);
    const add = (name, group, ll, mw) => { if (ll && mw != null && Number.isFinite(mw)) out.push({ name, group, lon: ll[0], lat: ll[1], now_mw: Math.max(0, Math.round(mw)) }); };
    add('Great Britain', 'Europe', [-1.5, 52.8], uk_summary[0].now_gw * 1000);
    eu_stats.forEach((d) => { if (!d.stale) add(d.country, 'Europe', EU[d.iso3], d.now_mw); });
    add('California', 'Americas', [-119.5, 36.5], caiso_summary[0].now_gw * 1000);
    add('New England', 'Americas', [-71.8, 42.6], isone_summary[0].now_mw);
    add('Brazil', 'Americas', [-45.0, -15.0], brazil_summary[0].now_gw * 1000);
    add('Ontario', 'Americas', [-81.0, 43.2], canada_summary[0].ontario_now_mw);
    add('Alberta', 'Americas', [-112.5, 50.5], canada_summary[0].alberta_now_mw);
    japan_stats.forEach((d) => add(`Japan: ${d.area}`, 'Asia-Pacific', JP[d.area.split(' ')[0]], d.now_mw));
    add('South Korea', 'Asia-Pacific', [127.8, 36.4], korea_summary[0].now_gw * 1000);
    aus_stats.forEach((d) => add(`Australia: ${d.region}`, 'Asia-Pacific', AU[d.region], d.total_now_mw));
    return out.sort((a, b) => b.now_mw - a.now_mw);
  },
});

dash.calc('gb_solar_today', {
  title: 'GB solar generated today',
  description: 'Energy from PV_Live’s half-hourly estimates since midnight UK time, the latest output, and when that reading was taken.',
  inputs: ['uk_national'],
  fn: (uk_national) => {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
    const rows = [...uk_national].sort((a, b) => (a.time < b.time ? -1 : 1));
    const last = rows[rows.length - 1];
    const today = day.format(new Date(last.time));
    const mwh = rows.filter((r) => day.format(new Date(r.time)) === today).reduce((s, r) => s + r.mw * 0.5, 0);
    return [{ day: today, today_mwh: Math.round(mwh), rate_mw: Math.round(last.mw), rate_gw: Math.round(last.mw / 10) / 100, latest_time: last.time }];
  },
});

dash.calc('live_points_hourly', {
  title: 'Live solar by place, hour by hour',
  description: 'Hourly average output for every live grid over the last two days, placed at a fixed point near its solar: countries for Europe, areas for Japan, regions for Australia, provinces for Canada.',
  inputs: ['uk_national', 'europe_live', 'caiso_live', 'us_isone', 'brazil_live', 'japan_live', 'korea_live', 'australia_live', 'canada_live'],
  fn: (uk_national, europe_live, caiso_live, us_isone, brazil_live, japan_live, korea_live, australia_live, canada_live) => {
    const EU = { DEU: [10.4, 51.1], FRA: [2.4, 46.6], ESP: [-3.7, 40.2], ITA: [12.6, 42.8], NLD: [5.3, 52.2], BEL: [4.5, 50.6], AUT: [14.1, 47.6], CHE: [8.2, 46.8], POL: [19.4, 52.1], PRT: [-8.0, 39.6], CZE: [15.3, 49.8], SWE: [14.5, 57.5], GRC: [22.6, 39.3], HUN: [19.4, 47.2], ROU: [25.0, 45.9], BGR: [25.3, 42.7], SVN: [14.8, 46.1], SVK: [19.5, 48.7], HRV: [16.0, 45.4], DNK: [9.6, 56.0], IRL: [-7.6, 53.4] };
    const JP = { Tokyo: [139.7, 35.9], Kansai: [135.5, 34.8], Kyushu: [130.7, 32.6], Chugoku: [132.6, 34.6], Shikoku: [133.5, 33.7], Hokuriku: [136.9, 36.6], Hokkaido: [142.8, 43.3], Tohoku: [140.6, 39.3], Chubu: [137.3, 35.2] };
    const AU = { NSW1: ['New South Wales', 147.0, -32.5], QLD1: ['Queensland', 148.5, -23.0], VIC1: ['Victoria', 144.5, -37.0], SA1: ['South Australia', 138.6, -33.5], TAS1: ['Tasmania', 146.8, -42.0] };
    const CA = { Ontario: [-81.0, 43.2], Alberta: [-112.5, 50.5] };
    // sums[place][part][hour] = [total, count]; parts (rooftop and utility, Korea's three columns) are averaged then added
    const sums = {};
    const meta = {};
    const add = (place, group, ll, part, time, mw) => {
      if (!ll || mw == null || !Number.isFinite(+mw)) return;
      const h = time.slice(0, 13) + ':00:00Z';
      meta[place] = meta[place] || { group, lon: ll[0], lat: ll[1] };
      const a = (((sums[place] = sums[place] || {})[part] = sums[place][part] || {})[h] = sums[place][part][h] || [0, 0]);
      a[0] += +mw; a[1] += 1;
    };
    uk_national.forEach((r) => add('Great Britain', 'Europe', [-1.5, 52.8], 'all', r.time, r.mw));
    europe_live.forEach((r) => add(r.country, 'Europe', EU[r.iso3], 'all', r.time, r.mw));
    caiso_live.forEach((r) => add('California', 'Americas', [-119.5, 36.5], 'all', r.time, r.mw));
    us_isone.forEach((r) => add('New England', 'Americas', [-71.8, 42.6], 'all', r.time, r.mw));
    brazil_live.forEach((r) => add('Brazil', 'Americas', [-45.0, -15.0], 'all', r.time, r.mw));
    canada_live.forEach((r) => add(r.province, 'Americas', CA[r.province], 'all', r.time, r.mw));
    japan_live.forEach((r) => add(`Japan: ${r.area}`, 'Asia-Pacific', JP[r.area.split(' ')[0]], 'all', r.time, r.mw));
    korea_live.forEach((r) => add('South Korea', 'Asia-Pacific', [127.8, 36.4], 'all', r.time, (+r.rooftop_mw) + (+r.ppa_mw) + (+r.market_mw)));
    australia_live.forEach((r) => { const a = AU[r.region]; if (a) add(`Australia: ${a[0]}`, 'Asia-Pacific', [a[1], a[2]], r.kind, r.time, r.mw); });
    const out = [];
    let newest = '';
    Object.entries(sums).forEach(([place, parts]) => {
      const hours = {};
      Object.values(parts).forEach((byHour) => Object.entries(byHour).forEach(([h, [t, n]]) => { hours[h] = (hours[h] || 0) + t / n; }));
      Object.entries(hours).forEach(([h, mw]) => { out.push({ name: place, ...meta[place], hour: h, mw: Math.max(0, Math.round(mw)) }); if (h > newest) newest = h; });
    });
    const from = new Date(Date.parse(newest) - 47 * 3600e3).toISOString().slice(0, 13) + ':00:00Z';
    return out.filter((r) => r.hour >= from).sort((a, b) => (a.hour < b.hour ? -1 : a.hour > b.hour ? 1 : b.mw - a.mw));
  },
});

dash.calc('world_latest', {
  title: 'Solar by country, latest year',
  description: "Each country's most recent year in Ember's data, with growth on the year before.",
  inputs: ['world_annual'],
  fn: (world_annual) => {
    const round = (v, n) => (v == null ? null : Math.round(v * 10 ** n) / 10 ** n);
    const by = {};
    world_annual.forEach((d) => { if (d.iso3 && d.twh != null) (by[d.iso3] = by[d.iso3] || []).push(d); });
    return Object.values(by).map((rows) => {
      rows.sort((a, b) => a.year - b.year);
      const l = rows[rows.length - 1];
      const p = rows.find((d) => d.year === l.year - 1);
      return {
        iso3: l.iso3, country: l.country, continent: l.continent, year: l.year,
        twh: round(l.twh, 2), share_pct: round(l.share_pct, 1), capacity_gw: round(l.capacity_gw, 2),
        yoy_pct: p && p.twh > 0.01 ? round((l.twh / p.twh - 1) * 100, 1) : null,
      };
    }).sort((a, b) => b.twh - a.twh);
  },
});

dash.calc('world_total', {
  title: 'World solar by year',
  description: "Ember's World total for each year from 2015.",
  inputs: ['world_annual'],
  fn: (world_annual) => world_annual.filter((d) => d.country === 'World').sort((a, b) => a.year - b.year)
    .map((d) => ({ year: d.year, twh: Math.round(d.twh), share_pct: Math.round(d.share_pct * 10) / 10, capacity_gw: Math.round(d.capacity_gw) })),
});

dash.calc('world_headline', {
  title: 'World solar, latest year',
  description: 'The most recent year of the World total.',
  inputs: ['world_total'],
  fn: (world_total) => world_total.slice(-1),
});

dash.calc('coverage_summary', {
  title: 'Coverage summary',
  description: 'Countries with a live feed against annual-only, and the share of world solar the live ones make.',
  inputs: ['coverage', 'world_latest'],
  fn: (coverage, world_latest) => {
    const live = new Set(coverage.filter((c) => c.tier.startsWith('Live')).map((c) => c.iso3));
    const total = world_latest.reduce((s, d) => s + d.twh, 0);
    const liveTwh = world_latest.filter((d) => live.has(d.iso3)).reduce((s, d) => s + d.twh, 0);
    return [{
      live_countries: live.size,
      annual_countries: world_latest.filter((d) => !live.has(d.iso3)).length,
      live_share_pct: Math.round((liveTwh / total) * 1000) / 10,
    }];
  },
});
;
/* Tabs and the map's metric buttons: they listen and set state only. */
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

  document.querySelectorAll('.gsl-seg[data-metric]').forEach((b) => {
    b.addEventListener('click', () => dash.setParams({ metric: b.dataset.metric }));
  });
  document.querySelectorAll('.gsl-seg[data-gbmetric]').forEach((b) => {
    b.addEventListener('click', () => dash.setParams({ gbmetric: b.dataset.gbmetric }));
  });
  dash.onData(() => {
    const m = dash.params().metric || 'share_pct';
    document.querySelectorAll('.gsl-seg[data-metric]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.metric === m)));
    const g = dash.params().gbmetric || 'cf24_pct';
    document.querySelectorAll('.gsl-seg[data-gbmetric]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gbmetric === g)));
  });

  window.GSL.worldSort = { key: 'twh', dir: -1 };
  document.querySelectorAll('.gsl-sort').forEach((b) => b.addEventListener('click', () => {
    const s = window.GSL.worldSort;
    const k = b.dataset.sort;
    s.dir = s.key === k ? -s.dir : (k === 'country' || k === 'continent' ? 1 : -1);
    s.key = k;
    document.querySelectorAll('.gsl-sort').forEach((o) => {
      const th = o.closest('th');
      if (th) {
        if (o.dataset.sort === k) th.setAttribute('aria-sort', s.dir > 0 ? 'ascending' : 'descending');
        else th.removeAttribute('aria-sort');
      }
    });
    dash.draw('world-tbody');
  }));
  document.querySelectorAll('.gsl-search').forEach((i) => i.addEventListener('input', () => dash.draw('world-tbody')));
})();
;
/* Headline numbers */
(() => {
  const G = window.GSL;
  const v = (name, id, field, f) => dash.draw(name, (el) => G.value(el, id, field, f));
  v('live-total', 'live_total', 'now_gw', G.fmt.gw);
  v('world-share', 'world_headline', 'share_pct', G.fmt.pct1);
  v('world-year', 'world_headline', 'year', String);
  v('t-uk-now', 'uk_summary', 'now_gw', G.fmt.gw);
  v('gb-solar-rate', 'gb_solar_today', 'rate_gw', G.fmt.gw);
  v('t-uk-cf', 'uk_summary', 'now_cf_pct', G.fmt.pct1);
  v('t-uk-cap', 'uk_summary', 'capacity_gw', G.fmt.gw);
  v('t-eu-now', 'eu_total', 'now_gw', G.fmt.gw);
  v('t-eu-24', 'eu_total', 'last24_gwh', G.fmt.one);
  v('t-eu-n', 'eu_total', 'countries', String);
  v('t-ca-now', 'caiso_summary', 'now_gw', G.fmt.gw);
  v('live-n', 'live_total', 'markets', String);
  v('t-jp-now', 'japan_total', 'now_gw', G.fmt.gw);
  v('t-jp-24', 'japan_total', 'last24_gwh', G.fmt.one);
  v('t-au-now', 'aus_total', 'now_gw', G.fmt.gw);
  v('t-au-roof', 'aus_total', 'rooftop_share_pct', G.fmt.pct1);
  v('t-ne-now', 'isone_summary', 'now_mw', G.fmt.int);
  v('t-ne-peak', 'isone_summary', 'peak24_mw', G.fmt.int);
  v('t-br-now', 'brazil_summary', 'now_gw', G.fmt.gw);
  v('t-cn-now', 'canada_summary', 'now_gw', G.fmt.gw);
  v('t-cn-cap', 'canada_summary', 'alberta_cap_mw', G.fmt.int);
  v('t-br-day', 'brazil_summary', 'today_gwh', G.fmt.one);
  v('a-jp-now', 'japan_total', 'now_gw', G.fmt.gw);
  v('a-jp-time', 'japan_total', 'latest_time', (t) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(new Date(t)));
  v('a-au-now', 'aus_total', 'now_gw', G.fmt.gw);
  v('a-au-roof', 'aus_total', 'rooftop_now_gw', G.fmt.gw);
  v('a-au-util', 'aus_total', 'utility_now_gw', G.fmt.gw);
  v('a-kr-now', 'korea_summary', 'now_gw', G.fmt.gw);
  v('a-kr-roof', 'korea_summary', 'rooftop_now_gw', G.fmt.gw);
  v('eia-latest', 'eia_total', 'latest_time', (t) => d3.utcFormat('%-d %b, %H:00 UTC')(new Date(t)));
  v('t-ca-peak', 'caiso_summary', 'peak24_gw', G.fmt.gw);
  v('t-w-twh', 'world_headline', 'twh', G.fmt.int);
  v('t-w-cap', 'world_headline', 'capacity_gw', G.fmt.int);
  v('uk-24', 'uk_summary', 'last24_gwh', G.fmt.one);
  v('uk-prev24', 'uk_summary', 'prev24_gwh', G.fmt.one);
  v('uk-peak', 'uk_summary', 'peak24_gw', G.fmt.gw);
  v('uk-rec', 'uk_summary', 'record_gw_60d', G.fmt.gw);
  v('uk-rec-day', 'uk_summary', 'record_day', (d) => d3.utcFormat('%-d %b %Y')(new Date(d)));
  v('uk-avg30', 'uk_summary', 'avg30_gwh', G.fmt.one);
  v('uk-fc-tm', 'gb_fc_summary', 'tomorrow_gwh', G.fmt.one);
  v('uk-fc-pk', 'gb_fc_summary', 'tomorrow_peak_gw', G.fmt.gw);
  v('uk-fc-vs', 'gb_fc_summary', 'tomorrow_vs_avg_pct', (x) => `${x > 0 ? '+' : ''}${G.fmt.pct1(x)}%`);
  v('cov-live', 'coverage_summary', 'live_countries', String);
  v('cov-annual', 'coverage_summary', 'annual_countries', String);
  v('cov-share', 'coverage_summary', 'live_share_pct', G.fmt.pct1);

  const usa = (name, field, f) => dash.draw(name, (el) => {
    const d = dash.data('world_latest');
    const r = d.status === 'ok' ? d.data.find((x) => x.iso3 === 'USA') : null;
    el.textContent = r && r[field] != null ? f(r[field]) : '—';
  });
  usa('us-twh', 'twh', G.fmt.one);
  usa('us-share', 'share_pct', G.fmt.pct1);
})();
;
/* Great Britain */
(() => {
  const G = window.GSL;
  const hm = d3.utcFormat('%H:%M');

  dash.draw('uk-intraday', (el) => {
    const d = dash.data('uk_national');
    if (d.status !== 'ok') return G.fail(el, d);
    const rows = d.data.map((r) => ({ t: new Date(r.time), mw: +r.mw }));
    const lastDay = d3.utcDay.floor(new Date(rows[rows.length - 1].t - 15 * 60e3));
    const base = Date.UTC(2000, 0, 1);
    const pick = (offset) => {
      const start = d3.utcDay.offset(lastDay, -offset);
      const end = d3.utcDay.offset(start, 1);
      return rows.filter((r) => r.t > start && r.t <= end).map((r) => ({ x: new Date(base + (r.t - start)), y: r.mw / 1000 }));
    };
    const c = dash.colors;
    const muted = 'var(--cds-chart-muted)';
    const series = [
      { name: 'A week ago', color: muted, width: 1.5, dash: '4 3', points: pick(7), z: 0, label: true },
      { name: 'Yesterday', color: c[1], points: pick(1), z: 1, label: true },
      { name: 'Today', color: c[0], width: 2.5, points: pick(0), z: 2, label: true },
    ];
    G.lineChart(el, {
      series, unit: 'GW', yFmt: d3.format(',.1f'), xFmt: (x) => hm(x),
      xDomain: [new Date(base), new Date(base + 864e5)],
      tipTitle: (x) => `${hm(x)} GMT`, tolerance: 20 * 60e3,
    });
  });

  dash.draw('uk-fc-lines', (el) => {
    const a = dash.data('uk_national');
    const f = dash.data('gb_forecast');
    if (a.status !== 'ok') return G.fail(el, a);
    if (f.status !== 'ok') return G.fail(el, f);
    const now = Date.now();
    const lo = now - 3 * 864e5;
    const hi = now + 4 * 864e5;
    const act = a.data.filter((r) => Date.parse(r.time) >= lo).map((r) => ({ x: new Date(r.time), y: r.mw / 1000 }));
    const fc = f.data.filter((r) => Date.parse(r.time) <= hi).map((r) => ({ x: new Date(r.time), y: r.mw / 1000 }));
    const fx = d3.utcFormat('%a %-d %b %H:%M');
    G.lineChart(el, {
      series: [
        { name: 'Actual (PV_Live)', color: dash.colors[0], label: false, points: act },
        { name: 'Forecast (NESO)', color: dash.colors[0], dash: '4 3', width: 1.5, label: false, points: fc },
      ],
      unit: 'GW', yFmt: d3.format(',.1f'), xFmt: d3.utcFormat('%a %-d'), xDomain: [new Date(lo), new Date(hi)],
      tolerance: 20 * 60e3, tipTitle: (x) => `${fx(x)} GMT`,
    });
  });

  dash.draw('uk-fc-days', (el) => {
    const d = dash.data('gb_fc_days');
    const u = dash.data('uk_summary');
    if (d.status !== 'ok') return G.fail(el, d);
    const avg = u.status === 'ok' ? u.data[0].avg30_gwh : null;
    const fd = (k) => d3.utcFormat('%-d %b')(new Date(`${k}T12:00:00Z`));
    G.barChart(el, {
      rows: d.data.map((r) => ({ key: r.day, y: r.gwh, line: avg, r })),
      color: dash.colors[1], lineColor: 'var(--cds-chart-reference)',
      yFmt: d3.format(',.0f'), xFmt: fd,
      tipTitle: (x) => d3.utcFormat('%a %-d %b %Y')(new Date(`${x.key}T12:00:00Z`)),
      tipLines: (x) => [
        { name: x.r.partial ? 'Forecast, rest of today' : 'Forecast', value: `${G.fmt.one(x.r.gwh)} GWh` },
        { name: 'Forecast peak', value: `${G.fmt.gw(x.r.peak_gw)} GW` },
        ...(avg != null ? [{ name: '30-day average', value: `${G.fmt.one(avg)} GWh` }] : []),
      ],
    });
  });

  dash.draw('uk-heatmap', (el) => {
    const d = dash.data('uk_national');
    if (d.status !== 'ok' || !d.data.length) return G.fail(el, d);
    el.replaceChildren();
    const cells = new Map();
    const days = new Map();
    d.data.forEach((r) => {
      const t = new Date(r.time);
      const day = r.time.slice(0, 10);
      const slot = t.getUTCHours() * 2 + (t.getUTCMinutes() >= 30 ? 1 : 0);
      const cf = r.capacity_mwp ? r.mw / r.capacity_mwp : 0;
      cells.set(`${day}|${slot}`, { cf, mw: r.mw, t });
      days.set(day, (days.get(day) || 0) + r.mw * 0.5);
    });
    const dayList = [...days.keys()].sort().reverse().slice(0, 60);
    const W = Math.max(300, el.clientWidth || 800);
    const ml = 46, mr = Math.min(90, W * 0.16), mt = 18, mb = 4;
    const cw = (W - ml - mr - 8) / 48;
    const ch = Math.max(3, Math.min(9, cw * 0.8));
    const H = mt + mb + dayList.length * ch;
    const max = d3.quantile([...cells.values()].map((c) => c.cf).sort(d3.ascending), 0.995) || 0.5;
    const color = d3.scaleSequentialSqrt([0, max], d3.interpolateYlOrBr).clamp(true);
    const svg = d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('class', 'gsl-draw-in');
    dayList.forEach((day, i) => {
      for (let s2 = 0; s2 < 48; s2 += 1) {
        const c = cells.get(`${day}|${s2}`);
        if (!c || c.cf <= 0.002) continue;
        g.append('rect').attr('x', ml + s2 * cw).attr('y', mt + i * ch).attr('width', cw + 0.4).attr('height', ch + 0.4).style('fill', color(c.cf));
      }
    });
    [0, 6, 12, 18, 24].forEach((h) => svg.append('text').attr('class', 'gsl-tick').attr('x', ml + h * 2 * cw).attr('y', 12).attr('text-anchor', h === 0 ? 'start' : h === 24 ? 'end' : 'middle').text(`${String(h).padStart(2, '0')}:00`));
    const fd = d3.utcFormat('%-d %b');
    dayList.forEach((day, i) => { if (i % 7 === 0) svg.append('text').attr('class', 'gsl-tick').attr('x', ml - 6).attr('y', mt + i * ch + ch / 2).attr('dy', '0.32em').attr('text-anchor', 'end').text(fd(new Date(day))); });
    const maxDay = d3.max(dayList, (dd) => days.get(dd)) || 1;
    const bx = d3.scaleLinear([0, maxDay], [0, mr - 6]);
    svg.append('g').selectAll('rect').data(dayList).join('rect').attr('x', W - mr).attr('y', (dd, i) => mt + i * ch + 0.5).attr('height', Math.max(1, ch - 1))
      .attr('width', (dd) => bx(days.get(dd))).attr('rx', 1).style('fill', dash.colors[0]).attr('fill-opacity', 0.7);
    const tt = G.tip(el);
    svg.append('rect').attr('x', ml).attr('y', mt).attr('width', W - ml - 4).attr('height', dayList.length * ch).style('fill', 'transparent')
      .on('pointermove', (ev) => {
        const [px, py] = d3.pointer(ev);
        const i = Math.floor((py - mt) / ch);
        const day = dayList[i];
        if (!day) return tt.hide();
        const [ex, ey] = d3.pointer(ev, el);
        const total = { name: 'Whole day', value: `${G.fmt.one(days.get(day) / 1000)} GWh` };
        if (px > W - mr) return tt.show(ex, ey, d3.utcFormat('%a %-d %b %Y')(new Date(day)), [total]);
        const s2 = Math.min(47, Math.max(0, Math.floor((px - ml) / cw)));
        const c = cells.get(`${day}|${s2}`);
        tt.show(ex, ey, `${d3.utcFormat('%a %-d %b')(new Date(day))}, ${String(Math.floor(s2 / 2)).padStart(2, '0')}:${s2 % 2 ? '30' : '00'} GMT`, [
          { name: 'Output', value: c ? `${G.fmt.gw(c.mw / 1000)} GW` : '–' },
          { name: 'Of capacity', value: c ? `${G.fmt.pct1(c.cf * 100)}%` : '–' },
          total,
        ]);
      })
      .on('pointerleave', () => tt.hide());
  });

  const gbInfo = {
    cf24_pct: { label: 'Capacity factor, last 24 h', f: (v) => `${G.fmt.pct1(v)}%` },
    now_mw: { label: 'Output now', f: (v) => `${G.fmt.int(v)} MW` },
    capacity_mw: { label: 'Installed capacity', f: (v) => `${G.fmt.int(v)} MWp` },
  };
  dash.draw('uk-region-map', (el) => {
    const geo = dash.data('gb_regions_geo');
    const st = dash.data('uk_region_stats');
    if (geo.status !== 'ok') return G.fail(el, geo);
    if (st.status !== 'ok') return G.fail(el, st);
    el.replaceChildren();
    const metric = dash.params().gbmetric || 'cf24_pct';
    const info = gbInfo[metric] || gbInfo.cf24_pct;
    const by = new Map(st.data.map((r) => [r.region, r]));
    const features = geo.data.features.map((f) => {
      if (d3.geoArea(f) > 2 * Math.PI) {
        const rev = (c) => (typeof c[0][0] === 'number' ? [...c].reverse() : c.map(rev));
        return { ...f, geometry: { ...f.geometry, coordinates: rev(f.geometry.coordinates) } };
      }
      return f;
    });
    const fc = { type: 'FeatureCollection', features };
    const W = Math.max(280, el.clientWidth || 500);
    const H = Math.round(Math.min(560, Math.max(340, W * 1.15)));
    const proj = d3.geoMercator().fitExtent([[4, 4], [W - 4, H - 40]], fc);
    const path = d3.geoPath(proj);
    const vals = st.data.map((r) => r[metric]);
    const max = Math.max(d3.max(vals) || 0, metric === 'cf24_pct' ? 1 : 1);
    const color = d3.scaleSequential([0, max], d3.interpolateYlOrBr);
    const svg = d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const tt = G.tip(el);
    svg.append('g').selectAll('path').data(features).join('path').attr('d', path)
      .style('fill', (f) => { const r = by.get(f.properties.region); return r ? color(r[metric]) : 'var(--color-border-line)'; })
      .style('stroke', 'var(--color-panel)').attr('stroke-width', 0.8)
      .on('pointermove', (ev, f) => {
        const r = by.get(f.properties.region);
        const [ex, ey] = d3.pointer(ev, el);
        tt.show(ex, ey, `${f.properties.region} · ${f.properties.area || ''}`.replace(/ · $/, ''), r ? [
          { name: 'Now', value: `${G.fmt.int(r.now_mw)} MW` },
          { name: 'Capacity', value: `${G.fmt.int(r.capacity_mw)} MWp` },
          { name: 'Last 24 h', value: `${G.fmt.int(r.last24_mwh)} MWh` },
          { name: 'Capacity factor', value: `${G.fmt.pct1(r.cf24_pct)}%` },
        ] : [{ name: '', value: 'No PV_Live data' }]);
      })
      .on('pointerleave', () => tt.hide());
    const lw = Math.min(200, W - 20);
    const lg = svg.append('g').attr('transform', `translate(10,${H - 30})`);
    const id = `gsl-gbgrad-${metric}`;
    const grad = svg.append('defs').append('linearGradient').attr('id', id);
    d3.range(0, 1.01, 0.1).forEach((t) => grad.append('stop').attr('offset', t).style('stop-color', color(t * max)));
    lg.append('rect').attr('width', lw).attr('height', 8).attr('rx', 2).style('fill', `url(#${id})`);
    lg.append('text').attr('class', 'gsl-tick').attr('y', 22).text(info.f(0));
    lg.append('text').attr('class', 'gsl-tick').attr('x', lw).attr('y', 22).attr('text-anchor', 'end').text(info.f(max));
  });

  dash.draw('uk-region-tbody', (tb) => {
    const d = dash.data('uk_region_stats');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    d.data.forEach((r) => {
      const tr = document.createElement('tr');
      G.cell(tr, r.region);
      G.cell(tr, G.fmt.int(r.now_mw), 'num');
      G.cell(tr, G.fmt.int(r.capacity_mw), 'num');
      G.cell(tr, G.fmt.int(r.last24_mwh), 'num');
      G.cell(tr, G.fmt.pct1(r.cf24_pct), 'num');
      tb.appendChild(tr);
    });
  });

  dash.draw('uk-yield-tbody', (tb) => {
    const d = dash.data('gb_yield_check');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    [...d.data].sort((a, b) => b.measured_kwh_kwp - a.measured_kwh_kwp).forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.region;
      G.cell(tr, r.region);
      G.cell(tr, G.fmt.int(r.measured_kwh_kwp), 'num');
      G.cell(tr, r.modelled_kwh_kwp == null ? '–' : G.fmt.int(r.modelled_kwh_kwp), 'num');
      G.cell(tr, r.fleet_ratio_pct == null ? '–' : G.fmt.pct1(r.fleet_ratio_pct), 'num');
      G.cell(tr, r.relative_to_gb_pct == null ? '–' : `${r.relative_to_gb_pct > 0 ? '+' : ''}${G.fmt.pct1(r.relative_to_gb_pct)}`, 'num');
      tb.appendChild(tr);
    });
  });

  dash.draw('uk-yield-dots', (el) => {
    const d = dash.data('gb_yield_check');
    if (d.status !== 'ok') return G.fail(el, d);
    el.replaceChildren();
    const rows = [...d.data].sort((a, b) => b.measured_kwh_kwp - a.measured_kwh_kwp);
    const W = Math.max(300, el.clientWidth || 600);
    const rowH = 22;
    const ml = 170, mr = 16, mt = 6, mb = 26;
    const H = mt + mb + rows.length * rowH;
    const lo = d3.min(rows, (r) => Math.min(r.measured_kwh_kwp, r.modelled_p10 ?? r.modelled_kwh_kwp ?? 1e9));
    const hi = d3.max(rows, (r) => Math.max(r.measured_kwh_kwp, r.modelled_p90 ?? r.modelled_kwh_kwp ?? 0));
    const x = d3.scaleLinear([Math.floor((lo - 20) / 50) * 50, Math.ceil((hi + 20) / 50) * 50], [ml, W - mr]);
    const y = (i) => mt + i * rowH + rowH / 2;
    const svg = d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const ticks = x.ticks(Math.max(3, Math.floor((W - ml - mr) / 80)));
    svg.append('g').selectAll('line').data(ticks).join('line').attr('class', 'gsl-grid-line')
      .attr('x1', (t) => x(t)).attr('x2', (t) => x(t)).attr('y1', mt).attr('y2', H - mb);
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'gsl-tick')
      .attr('x', (t) => x(t)).attr('y', H - 8).attr('text-anchor', 'middle').text((t) => d3.format(',')(t));
    const tt = G.tip(el);
    const g = svg.append('g').selectAll('g').data(rows).join('g').attr('class', 'gsl-draw-in');
    g.append('text').attr('class', 'gsl-tick').attr('x', ml - 8).attr('y', (r, i) => y(i) + 4).attr('text-anchor', 'end').text((r) => r.region);
    g.filter((r) => r.modelled_p10 != null).append('line')
      .attr('x1', (r) => x(r.modelled_p10)).attr('x2', (r) => x(r.modelled_p90)).attr('y1', (r, i) => y(i)).attr('y2', (r, i) => y(i))
      .style('stroke', 'var(--cds-chart-muted)').attr('stroke-width', 4).attr('stroke-linecap', 'round').attr('stroke-opacity', 0.5);
    g.filter((r) => r.modelled_kwh_kwp != null).append('line')
      .attr('x1', (r) => x(r.measured_kwh_kwp)).attr('x2', (r) => x(r.modelled_kwh_kwp)).attr('y1', (r, i) => y(i)).attr('y2', (r, i) => y(i))
      .style('stroke', dash.colors[0]).attr('stroke-width', 1.5);
    g.filter((r) => r.modelled_kwh_kwp != null).append('circle').attr('cx', (r) => x(r.modelled_kwh_kwp)).attr('cy', (r, i) => y(i)).attr('r', 5)
      .style('fill', 'var(--color-panel)').style('stroke', dash.colors[0]).attr('stroke-width', 2);
    g.append('circle').attr('cx', (r) => x(r.measured_kwh_kwp)).attr('cy', (r, i) => y(i)).attr('r', 5).style('fill', dash.colors[0]);
    g.append('rect').attr('x', 0).attr('width', W).attr('y', (r, i) => y(i) - rowH / 2).attr('height', rowH).style('fill', 'transparent')
      .on('pointermove', (ev, r) => {
        const [ex, ey] = d3.pointer(ev, el);
        tt.show(ex, ey, r.region, [
          { color: dash.colors[0], name: `Measured (${r.period || '12 months'})`, value: `${G.fmt.int(r.measured_kwh_kwp)} kWh/kWp` },
          { name: 'Modelled, mean', value: r.modelled_kwh_kwp == null ? '–' : `${G.fmt.int(r.modelled_kwh_kwp)} kWh/kWp` },
          { name: 'Modelled, 10th to 90th', value: r.modelled_p10 == null ? '–' : `${G.fmt.int(r.modelled_p10)} to ${G.fmt.int(r.modelled_p90)}` },
          { name: 'Fleet against model', value: r.fleet_ratio_pct == null ? '–' : `${G.fmt.pct1(r.fleet_ratio_pct)}%` },
        ]);
      })
      .on('pointerleave', () => tt.hide());
  });

  dash.draw('uk-pipe-stage', (el) => {
    const d = dash.data('uk_pipeline');
    if (d.status !== 'ok') return G.fail(el, d);
    const c = dash.colors;
    G.hbar(el, {
      rows: d.data.map((r, i) => ({ label: r.stage, value: r.mw, r, color: i === 0 ? c[0] : c[2] })),
      fmt: (v) => `${G.fmt.int(v)} MW`,
      tipTitle: (r) => r.label,
      tipLines: (r) => [{ name: 'Capacity', value: `${G.fmt.int(r.r.mw)} MW` }, { name: 'Projects', value: G.fmt.int(r.r.projects) }],
    });
  });

  dash.draw('uk-pipe-region', (el) => {
    const d = dash.data('uk_pipeline_region');
    if (d.status !== 'ok') return G.fail(el, d);
    const rows = [...d.data].sort((a, b) => (b.operational_mw + b.pipeline_mw) - (a.operational_mw + a.pipeline_mw));
    el.replaceChildren();
    const rowH = 24, mt = 22, mb = 4;
    const H = mt + mb + rows.length * rowH;
    const W = Math.max(280, el.clientWidth || 500);
    const svg = d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const meas = (arr, cls) => { const g = svg.append('g'); let w = 0; arr.forEach((s) => { w = Math.max(w, g.append('text').attr('class', cls).text(s).node().getComputedTextLength()); }); g.remove(); return w; };
    const ml = meas(rows.map((r) => r.region), 'gsl-tick') + 10;
    const mr = meas(rows.map((r) => G.fmt.int(r.operational_mw + r.pipeline_mw)), 'gsl-tick') + 10;
    const x = d3.scaleLinear([0, d3.max(rows, (r) => r.operational_mw + r.pipeline_mw) || 1], [ml, W - mr]);
    const c = dash.colors;
    const lg = svg.append('g').attr('transform', `translate(${ml},10)`);
    [['Operational', c[0]], ['Consented or building', c[2]]].forEach(([t, col], i) => {
      const g = lg.append('g').attr('transform', `translate(${i * 110},0)`);
      g.append('rect').attr('width', 8).attr('height', 8).attr('y', -6).attr('rx', 2).style('fill', col);
      g.append('text').attr('class', 'gsl-tick').attr('x', 12).attr('dy', '0.1em').text(t);
    });
    const g = svg.append('g').selectAll('g').data(rows).join('g').attr('transform', (_, i) => `translate(0,${mt + i * rowH})`);
    g.append('text').attr('class', 'gsl-tick').attr('x', ml - 8).attr('y', rowH / 2).attr('dy', '0.32em').attr('text-anchor', 'end').text((r) => r.region);
    g.append('rect').attr('x', ml).attr('y', 4).attr('height', rowH - 8).attr('width', (r) => x(r.operational_mw) - ml).style('fill', c[0]);
    g.append('rect').attr('x', (r) => x(r.operational_mw)).attr('y', 4).attr('height', rowH - 8).attr('width', (r) => x(r.operational_mw + r.pipeline_mw) - x(r.operational_mw)).style('fill', c[2]);
    g.append('text').attr('class', 'gsl-tick').attr('x', (r) => x(r.operational_mw + r.pipeline_mw) + 6).attr('y', rowH / 2).attr('dy', '0.32em').text((r) => G.fmt.int(r.operational_mw + r.pipeline_mw));
    const tt = G.tip(el);
    g.append('rect').attr('width', W).attr('height', rowH).style('fill', 'transparent')
      .on('pointermove', (ev, r) => {
        const [ex, ey] = d3.pointer(ev, el);
        tt.show(ex, ey, r.region, [
          { color: c[0], name: 'Operational', value: `${G.fmt.int(r.operational_mw)} MW` },
          { color: c[2], name: 'Consented or building', value: `${G.fmt.int(r.pipeline_mw)} MW` },
        ]);
      })
      .on('pointerleave', () => tt.hide());
    el.style.minHeight = H + 'px';
  });
})();
;
/* Europe and the United States */
(() => {
  const G = window.GSL;

  dash.draw('eu-lines', (el) => {
    const d = dash.data('europe_live');
    const s = dash.data('eu_stats');
    if (d.status !== 'ok') return G.fail(el, d);
    if (s.status !== 'ok') return G.fail(el, s);
    const top = s.data.slice(0, 6).map((r) => r.country);
    const by = d3.group(d.data, (r) => r.country);
    const series = [...by].map(([name, rows]) => {
      const i = top.indexOf(name);
      return {
        name, z: i < 0 ? 0 : 10 - i, label: i >= 0,
        color: i >= 0 ? dash.colors[i] : 'var(--cds-chart-muted)', width: i >= 0 ? 2 : 1,
        points: rows.map((r) => ({ x: new Date(r.time), y: r.mw / 1000 })).sort((a, b) => a.x - b.x),
      };
    });
    G.lineChart(el, {
      series, unit: 'GW', yFmt: d3.format(',.1f'), xFmt: d3.utcFormat('%a %H:%M'),
      tipTitle: (x) => d3.utcFormat('%a %-d %b, %H:%M UTC')(x),
    });
  });

  dash.draw('eu-bars', (el) => {
    const d = dash.data('eu_stats');
    if (d.status !== 'ok') return G.fail(el, d);
    G.hbar(el, {
      rows: d.data.map((r) => ({ label: r.country, value: r.last24_gwh, r })),
      color: dash.colors[0], fmt: (v) => G.fmt.one(v),
      tipTitle: (r) => r.label,
      tipLines: (r) => [
        { name: 'Last 24 h', value: `${G.fmt.one(r.r.last24_gwh)} GWh` },
        { name: 'Peak', value: `${G.fmt.int(r.r.peak24_mw)} MW` },
        { name: 'Latest reading', value: d3.utcFormat('%H:%M UTC')(new Date(r.r.latest_time)) },
      ],
    });
  });

  dash.draw('eu-tbody', (tb) => {
    const d = dash.data('eu_stats');
    const cf = dash.data('eu_cf');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    const cfBy = new Map((cf.status === 'ok' ? cf.data : []).map((r) => [r.country, r.cf24_pct]));
    d.data.forEach((r) => {
      const tr = document.createElement('tr');
      G.cell(tr, r.country);
      G.cell(tr, r.now_mw == null ? '–' : G.fmt.int(r.now_mw), 'num');
      G.cell(tr, G.fmt.int(r.peak24_mw), 'num');
      G.cell(tr, G.fmt.one(r.last24_gwh), 'num');
      G.cell(tr, cfBy.get(r.country) == null ? '–' : G.fmt.pct1(cfBy.get(r.country)), 'num');
      tb.appendChild(tr);
    });
  });

  dash.draw('ca-lines', (el) => {
    const d = dash.data('caiso_live');
    if (d.status !== 'ok') return G.fail(el, d);
    const pt = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    G.lineChart(el, {
      series: [{ name: 'CAISO solar', color: dash.colors[0], label: true, points: d.data.map((r) => ({ x: new Date(r.time), y: r.mw / 1000 })) }],
      unit: 'GW', yFmt: d3.format(',.1f'), xFmt: (x) => pt.format(x), tolerance: 6 * 60e3,
      tipTitle: (x) => `${pt.format(x)} Pacific`,
    });
  });
})();
;
/* World */
(() => {
  const G = window.GSL;
  const metricInfo = {
    share_pct: { label: 'Share of electricity', f: (v) => `${G.fmt.pct1(v)}%` },
    twh: { label: 'Generation', f: (v) => `${G.fmt.one(v)} TWh` },
    capacity_gw: { label: 'Capacity', f: (v) => `${G.fmt.one(v)} GW` },
  };

  function subsolar(date) {
    const day = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 864e5;
    const g = (2 * Math.PI / 365) * (day - 1 + (date.getUTCHours() - 12) / 24);
    const decl = (0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)) * 180 / Math.PI;
    const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const mins = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
    const lon = -(mins + eot - 720) / 4;
    return [((lon + 540) % 360) - 180, decl];
  }

  dash.draw('world-map', {
    mount(el) {
      const timer = setInterval(() => dash.draw('world-map'), 5 * 60e3);
      return { timer };
    },
    update(el) {
      const geo = dash.data('world_geo');
      const w = dash.data('world_latest');
      const cov = dash.data('coverage');
      if (geo.status !== 'ok') return G.fail(el, geo);
      if (w.status !== 'ok') return G.fail(el, w);
      el.replaceChildren();
      const metric = dash.params().metric || 'share_pct';
      const info = metricInfo[metric] || metricInfo.share_pct;
      const byIso = new Map(w.data.map((r) => [r.iso3, r]));
      const live = new Map((cov.status === 'ok' ? cov.data : []).filter((c) => c.tier.startsWith('Live')).map((c) => [c.iso3, c]));
      const W = Math.max(300, el.clientWidth || 800);
      const H = Math.round(W * 0.5);
      const features = geo.data.features.map((f) => {
        if (d3.geoArea(f) > 2 * Math.PI) {
          const rev = (c) => (typeof c[0][0] === 'number' ? [...c].reverse() : c.map(rev));
          return { ...f, geometry: { ...f.geometry, coordinates: rev(f.geometry.coordinates) } };
        }
        return f;
      });
      const fc = { type: 'FeatureCollection', features };
      const proj = d3.geoNaturalEarth1().fitSize([W, H - 30], fc);
      const path = d3.geoPath(proj);
      const vals = w.data.map((r) => r[metric]).filter((v) => v != null && v > 0);
      const max = metric === 'share_pct' ? Math.min(35, d3.max(vals)) : d3.quantile(vals.sort(d3.ascending), 0.98);
      const color = (metric === 'share_pct' ? d3.scaleSequential([0, max], d3.interpolateYlOrBr) : d3.scaleSequentialSqrt([0, max], d3.interpolateYlOrBr)).clamp(true);
      const svg = d3.select(el).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
      svg.append('path').datum({ type: 'Sphere' }).attr('d', path).style('fill', 'none').style('stroke', 'var(--color-border-line)');
      const tt = G.tip(el);
      svg.append('g').selectAll('path').data(features).join('path')
        .attr('d', path)
        .style('fill', (f) => { const r = byIso.get(f.properties.iso3); return r && r[metric] != null ? color(r[metric]) : 'var(--color-border-line)'; })
        .style('stroke', (f) => (live.has(f.properties.iso3) ? 'var(--color-fg)' : 'var(--color-panel)'))
        .attr('stroke-width', (f) => (live.has(f.properties.iso3) ? 1.2 : 0.5))
        .on('pointermove', (ev, f) => {
          const r = byIso.get(f.properties.iso3);
          const c = live.get(f.properties.iso3);
          const [ex, ey] = d3.pointer(ev, el);
          const lines = r ? [
            { name: `Share (${r.year})`, value: r.share_pct != null ? `${G.fmt.pct1(r.share_pct)}%` : '–' },
            { name: 'Generation', value: `${G.fmt.one(r.twh)} TWh` },
            { name: 'Capacity', value: r.capacity_gw != null ? `${G.fmt.one(r.capacity_gw)} GW` : '–' },
          ] : [{ name: '', value: 'No Ember data' }];
          lines.push({ name: 'Detail', value: c ? c.tier : 'Annual only' });
          tt.show(ex, ey, f.properties.name, lines);
        })
        .on('pointerleave', () => tt.hide());
      // night now
      const now = new Date();
      const [slon, slat] = subsolar(now);
      const night = d3.geoCircle().center([slon + 180, -slat]).radius(90)();
      svg.append('path').datum(night).attr('d', path).style('fill', 'var(--color-fg)').attr('fill-opacity', 0.13).attr('pointer-events', 'none');
      const sp = proj([slon, slat]);
      if (sp) svg.append('circle').attr('cx', sp[0]).attr('cy', sp[1]).attr('r', 6).style('fill', '#f5b301').style('stroke', 'var(--color-panel)').attr('stroke-width', 1.5).attr('pointer-events', 'none');
      // legend
      const lw = Math.min(220, W * 0.4);
      const lg = svg.append('g').attr('transform', `translate(10,${H - 22})`);
      const id = `gsl-grad-${metric}`;
      const grad = svg.append('defs').append('linearGradient').attr('id', id);
      d3.range(0, 1.01, 0.1).forEach((t) => grad.append('stop').attr('offset', t).style('stop-color', color(t * max)));
      lg.append('rect').attr('width', lw).attr('height', 8).attr('rx', 2).style('fill', `url(#${id})`);
      lg.append('text').attr('class', 'gsl-tick').attr('y', 20).text(info.f(0));
      lg.append('text').attr('class', 'gsl-tick').attr('x', lw).attr('y', 20).attr('text-anchor', 'end').text(`${info.f(max)}+`);
      lg.append('text').attr('class', 'gsl-tick').attr('x', lw + 10).attr('y', 8).text(`${info.label} · night at ${d3.utcFormat('%H:%M UTC')(now)}`);
    },
    unmount(el, made) { if (made) clearInterval(made.timer); },
  });

  dash.draw('live-map', {
    mount(el) {
      const bar = document.createElement('div');
      bar.className = 'gsl-replay-bar';
      const play = document.createElement('button');
      play.type = 'button';
      play.textContent = 'Play two days';
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.setAttribute('aria-label', 'Hour shown on the map');
      const label = document.createElement('output');
      bar.append(play, range, label);
      const stage = document.createElement('div');
      el.replaceChildren(bar, stage);
      const made = { bar, play, range, label, stage, timer: null, frame: null, frames: [], render: null };
      const stop = () => { clearInterval(made.timer); made.timer = null; play.textContent = 'Play two days'; };
      made.stop = stop;
      play.addEventListener('click', () => {
        if (made.timer) return stop();
        if (!made.frames.length) return;
        if (made.frame >= made.frames.length - 1) made.frame = 0;
        play.textContent = 'Pause';
        made.timer = setInterval(() => {
          made.frame += 1;
          if (made.frame >= made.frames.length) { made.frame = made.frames.length - 1; stop(); }
          made.render && made.render();
        }, 380);
      });
      range.addEventListener('input', () => { stop(); made.frame = +range.value; made.render && made.render(); });
      return made;
    },
    update(el, made) {
      const geo = dash.data('world_geo');
      const pts = dash.data('live_points_hourly');
      if (geo.status !== 'ok' || pts.status !== 'ok' || !pts.data.length) {
        made.stage.replaceChildren();
        made.bar.hidden = true;
        el.dataset.empty = 'true';
        return;
      }
      made.bar.hidden = false;
      const frames = [...new Set(pts.data.map((r) => r.hour))].sort();
      const byHour = d3.group(pts.data, (r) => r.hour);
      const atEnd = made.frame == null || made.frame >= made.frames.length - 1;
      made.frames = frames;
      if (atEnd) made.frame = frames.length - 1;
      made.range.max = String(frames.length - 1);
      made.stage.replaceChildren();
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
      const svg = d3.select(made.stage).append('svg').attr('class', 'gsl-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
      svg.append('path').datum({ type: 'Sphere' }).attr('d', path).style('fill', 'none').style('stroke', 'var(--color-border-line)');
      svg.append('g').selectAll('path').data(features).join('path').attr('d', path)
        .style('fill', 'var(--color-border-line)').style('stroke', 'var(--color-panel)').attr('stroke-width', 0.5);
      const night = svg.append('path').style('fill', 'var(--color-fg)').attr('fill-opacity', 0.16).attr('pointer-events', 'none');
      const sun = svg.append('circle').attr('r', 7).style('fill', '#f5b301').style('stroke', 'var(--color-panel)').attr('stroke-width', 1.5).attr('pointer-events', 'none');
      const dots = svg.append('g');
      const gc = (g) => ({ Europe: dash.colors[0], Americas: dash.colors[1], 'Asia-Pacific': dash.colors[2] }[g]);
      const maxMw = Math.max(1000, d3.max(pts.data, (d) => d.mw) || 0);
      const r = d3.scaleSqrt([0, maxMw], [0, Math.max(16, W / 28)]);
      const tt = G.tip(made.stage);
      const fmt = (mw) => (mw >= 1000 ? `${G.fmt.gw(mw / 1000)} GW` : `${G.fmt.int(mw)} MW`);
      const when = d3.utcFormat('%a %-d %b, %H:00 UTC');
      const total = svg.append('text').attr('class', 'gsl-tick').attr('x', 10).attr('y', H - 10);
      made.render = () => {
        const h = frames[made.frame];
        const t = new Date(h);
        const [slon, slat] = subsolar(new Date(+t + 30 * 60e3));
        night.datum(d3.geoCircle().center([slon + 180, -slat]).radius(90)()).attr('d', path);
        const sp = proj([slon, slat]);
        sun.attr('cx', sp ? sp[0] : -20).attr('cy', sp ? sp[1] : -20);
        const rows = (byHour.get(h) || []).filter((d) => proj([d.lon, d.lat]));
        dots.selectAll('circle').data(rows, (d) => d.name).join('circle')
          .attr('cx', (d) => proj([d.lon, d.lat])[0]).attr('cy', (d) => proj([d.lon, d.lat])[1])
          .attr('r', (d) => Math.max(2, r(d.mw)))
          .style('fill', (d) => gc(d.group)).attr('fill-opacity', (d) => (d.mw > 0 ? 0.6 : 0.2)).style('stroke', (d) => gc(d.group)).attr('stroke-width', 1)
          .on('pointermove', (ev, d) => { const [ex, ey] = d3.pointer(ev, made.stage); tt.show(ex, ey, d.name, [{ color: gc(d.group), name: when(t), value: fmt(d.mw) }]); })
          .on('pointerleave', () => tt.hide());
        const sum = d3.sum(rows, (d) => d.mw);
        total.text(`All live grids together: ${fmt(sum)}`);
        made.range.value = String(made.frame);
        made.label.value = made.frame === frames.length - 1 ? `${when(t)} (latest)` : when(t);
        made.label.textContent = made.label.value;
      };
      made.render();
    },
    unmount(el, made) { if (made && made.stop) made.stop(); },
  });

  G.counter('gb-solar-counter', 'gb_solar_today');

  dash.draw('world-top', (el) => {
    const d = dash.data('world_latest');
    if (d.status !== 'ok') return G.fail(el, d);
    G.hbar(el, {
      rows: d.data.slice(0, 15).map((r) => ({ label: r.country, value: r.twh, r, color: r.iso3 === 'GBR' ? dash.colors[1] : dash.colors[0] })),
      fmt: (v) => G.fmt.int(v),
      tipTitle: (r) => `${r.label}, ${r.r.year}`,
      tipLines: (r) => [
        { name: 'Generation', value: `${G.fmt.one(r.r.twh)} TWh` },
        { name: 'Share', value: `${G.fmt.pct1(r.r.share_pct)}%` },
        ...(r.r.yoy_pct != null ? [{ name: 'Growth on year', value: `${r.r.yoy_pct > 0 ? '+' : ''}${G.fmt.pct1(r.r.yoy_pct)}%` }] : []),
      ],
    });
  });

  dash.draw('world-trend', (el) => {
    const d = dash.data('world_total');
    if (d.status !== 'ok') return G.fail(el, d);
    G.barChart(el, {
      rows: d.data.map((r) => ({ key: String(r.year), y: r.twh, r })),
      color: dash.colors[0], yFmt: d3.format(',.0f'), xFmt: (k) => k,
      topLabels: (d) => `${G.fmt.pct1(d.r.share_pct)}%`,
      tipTitle: (d) => d.key,
      tipLines: (d) => [
        { name: 'Generation', value: `${G.fmt.int(d.r.twh)} TWh` },
        { name: 'Share of electricity', value: `${G.fmt.pct1(d.r.share_pct)}%` },
        { name: 'Capacity', value: `${G.fmt.int(d.r.capacity_gw)} GW` },
      ],
    });
  });

  dash.draw('world-tbody', (tb) => {
    const d = dash.data('world_latest');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    const q = ([...document.querySelectorAll('.gsl-search')].map((i) => i.value).join('') || '').trim().toLowerCase();
    const s = window.GSL.worldSort || { key: 'twh', dir: -1 };
    const rows = d.data.filter((r) => !q || r.country.toLowerCase().includes(q) || (r.continent || '').toLowerCase().includes(q));
    rows.sort((a, b) => {
      const x = a[s.key], y = b[s.key];
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * s.dir;
    });
    const n = (v, f) => (v == null ? '–' : f(v));
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.iso3;
      G.cell(tr, r.country);
      G.cell(tr, r.continent || '–');
      G.cell(tr, String(r.year), 'num');
      G.cell(tr, n(r.twh, d3.format(',.2f')), 'num');
      G.cell(tr, n(r.share_pct, G.fmt.pct1), 'num');
      G.cell(tr, n(r.capacity_gw, d3.format(',.2f')), 'num');
      G.cell(tr, n(r.yoy_pct, (v) => `${v > 0 ? '+' : ''}${G.fmt.pct1(v)}`), 'num');
      tb.appendChild(tr);
    });
  });

  dash.draw('cov-tbody', (tb) => {
    const d = dash.data('coverage');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    d.data.forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.iso3;
      G.cell(tr, r.country);
      G.cell(tr, r.tier);
      G.cell(tr, r.source, 'wrap');
      G.cell(tr, r.cadence);
      G.cell(tr, r.next_step, 'wrap');
      tb.appendChild(tr);
    });
  });
})();
;
/* Live now panel, Americas and Asia-Pacific */
(() => {
  const G = window.GSL;
  const groupColor = (g) => ({ Europe: dash.colors[0], Americas: dash.colors[1], 'Asia-Pacific': dash.colors[2] }[g]);

  dash.draw('live-now', (el) => {
    const d = dash.data('market_now');
    if (d.status !== 'ok') return G.fail(el, d);
    G.hbar(el, {
      rows: d.data.map((r) => ({ label: r.market, value: r.now_gw, r, color: groupColor(r.group) })),
      fmt: (v) => `${G.fmt.gw(v)} GW`,
      tipTitle: (r) => r.label,
      tipLines: (r) => [{ color: groupColor(r.r.group), name: r.r.group, value: `${G.fmt.gw(r.r.now_gw)} GW` }],
    });
  });

  const multi = (el, rows, keyOf, order, opts) => {
    const by = d3.group(rows, keyOf);
    const series = [...by].map(([name, rs]) => {
      const i = order.indexOf(name);
      return {
        name, z: i < 0 ? 0 : 10 - i, label: i >= 0 && i < 6,
        color: i >= 0 && i < 6 ? dash.colors[i] : 'var(--cds-chart-muted)', width: i >= 0 && i < 6 ? 2 : 1,
        points: rs.map((r) => ({ x: new Date(r.time), y: r.mw / 1000 })).sort((a, b) => a.x - b.x),
      };
    });
    G.lineChart(el, { series, unit: 'GW', yFmt: d3.format(',.1f'), ...opts });
  };

  dash.draw('br-lines', (el) => {
    const d = dash.data('brazil_live');
    if (d.status !== 'ok') return G.fail(el, d);
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    G.lineChart(el, {
      series: [{ name: 'Brazil', color: dash.colors[0], label: true, points: d.data.map((r) => ({ x: new Date(r.time), y: r.mw / 1000 })) }],
      unit: 'GW', yFmt: d3.format(',.1f'), xFmt: (x) => f.format(x), tolerance: 3 * 60e3, tipTitle: (x) => `${f.format(x)} Brasília`,
    });
  });

  dash.draw('eia-lines', (el) => {
    const d = dash.data('us_eia930');
    const s = dash.data('eia_stats');
    if (d.status !== 'ok') return G.fail(el, d);
    if (s.status !== 'ok') return G.fail(el, s);
    const names = new Map(s.data.map((r) => [r.ba, r.name]));
    multi(el, d.data.map((r) => ({ ...r, key: names.get(r.ba) || r.ba })), (r) => r.key, s.data.map((r) => r.name), {
      xFmt: d3.utcFormat('%a %H:%M'), tipTitle: (x) => d3.utcFormat('%a %-d %b, %H:00 UTC')(x), tolerance: 31 * 60e3,
    });
  });

  dash.draw('eia-tbody', (tb) => {
    const d = dash.data('eia_stats');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    d.data.forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.ba;
      G.cell(tr, r.name);
      G.cell(tr, r.ba);
      G.cell(tr, G.fmt.int(r.peak24_mw), 'num');
      G.cell(tr, G.fmt.one(r.last24_gwh), 'num');
      tb.appendChild(tr);
    });
  });

  dash.draw('ne-lines', (el) => {
    const d = dash.data('us_isone');
    if (d.status !== 'ok') return G.fail(el, d);
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    G.lineChart(el, {
      height: 220, series: [{ name: 'New England', color: dash.colors[0], label: true, points: d.data.map((r) => ({ x: new Date(r.time), y: +r.mw })) }],
      unit: 'MW', yFmt: d3.format(',.0f'), xFmt: (x) => f.format(x), tolerance: 15 * 60e3, tipTitle: (x) => `${f.format(x)} Eastern`,
    });
  });

  dash.draw('cn-lines', (el) => {
    const d = dash.data('canada_live');
    if (d.status !== 'ok') return G.fail(el, d);
    const f = d3.utcFormat('%a %H:%M');
    const series = ['Ontario', 'Alberta'].map((p, i) => ({
      name: p, color: dash.colors[i], label: true,
      points: d.data.filter((r) => r.province === p).map((r) => ({ x: new Date(r.time), y: +r.mw })).sort((a, b) => a.x - b.x),
    })).filter((x) => x.points.length);
    G.lineChart(el, { height: 220, series, unit: 'MW', yFmt: d3.format(',.0f'), xFmt: (x) => f(x), tolerance: 90 * 60e3, tipTitle: (x) => `${f(x)} UTC` });
  });

  dash.draw('jp-lines', (el) => {
    const d = dash.data('japan_live');
    if (d.status !== 'ok') return G.fail(el, d);
    const order = [...d3.rollup(d.data, (v) => d3.sum(v, (r) => r.mw), (r) => r.area)].sort((a, b) => b[1] - a[1]).map((x) => x[0]);
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    multi(el, d.data, (r) => r.area, order, { xFmt: (x) => f.format(x), tipTitle: (x) => `${f.format(x)} JST`, tolerance: 16 * 60e3 });
  });

  dash.draw('au-lines', (el) => {
    const d = dash.data('aus_series');
    if (d.status !== 'ok') return G.fail(el, d);
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Australia/Brisbane', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    const mk = (kind, i) => ({ name: kind, color: dash.colors[i], label: true, points: d.data.filter((r) => r.kind === kind).map((r) => ({ x: new Date(r.time), y: +r.gw })) });
    G.lineChart(el, { series: [mk('Rooftop', 0), mk('Utility', 1)], unit: 'GW', yFmt: d3.format(',.1f'), xFmt: (x) => f.format(x), tolerance: 16 * 60e3, tipTitle: (x) => `${f.format(x)} AEST` });
  });

  dash.draw('kr-lines', (el) => {
    const d = dash.data('korea_live');
    if (d.status !== 'ok') return G.fail(el, d);
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
    const mk = (name, key, i) => ({ name, color: dash.colors[i], label: true, points: d.data.map((r) => ({ x: new Date(r.time), y: r[key] / 1000 })) });
    G.lineChart(el, {
      series: [mk('Rooftop (est.)', 'rooftop_mw', 0), mk('PPA (est.)', 'ppa_mw', 1), mk('Market', 'market_mw', 2)],
      unit: 'GW', yFmt: d3.format(',.1f'), xFmt: (x) => f.format(x), tolerance: 3 * 60e3, tipTitle: (x) => `${f.format(x)} KST`,
    });
  });

  dash.draw('au-tbody', (tb) => {
    const d = dash.data('aus_stats');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    d.data.forEach((r) => {
      const tr = document.createElement('tr');
      G.cell(tr, r.region);
      G.cell(tr, G.fmt.int(r.rooftop_now_mw), 'num');
      G.cell(tr, G.fmt.int(r.utility_now_mw), 'num');
      G.cell(tr, G.fmt.one(r.last24_gwh), 'num');
      G.cell(tr, r.rooftop_share_pct == null ? '–' : G.fmt.pct1(r.rooftop_share_pct), 'num');
      tb.appendChild(tr);
    });
  });
})();
