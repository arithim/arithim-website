// Products page explainers: one short looping scene per product, on the same timeline engine as tsg-motion.js.
// Mount points are <div data-pm-scene="tsg|sf|fmaj|unrj">. All names and figures on screen are samples.
import { SCENES as TSG, mountScenes } from './tsg-motion.js';

const mk = (s) => s.replace(/\n\s*/g, '');
const row = (t, n, nm, pr, w, kv) => `<div class="m-res" data-in="${t}"><div class="m-res-h"><span class="m-rk">${n}</span><span class="m-nm">${nm}</span><span class="m-pr">${pr}</span></div><div class="m-fit"><i data-grow="${t + 0.2},1" style="--w:${w}%"></i></div><div class="m-kv">${kv.map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('')}</div></div>`;
const src = (t, txt) => `<div class="m-src" data-in="${t}"><svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path d="M2 1h5l3 3v7H2z" fill="none" stroke="currentColor" stroke-width="1"/></svg>${txt}</div>`;

const SCENES = {
  tsg: TSG.a,

  sf: { dur: 10, key: 8.6, label: 'Site Finder · Great Britain', html: mk(`
    <div class="m-q"><span data-type="0.2,36" data-text="50 MW solar farm, grid by 2030, England and Wales"></span><b class="m-caret"></b></div>
    <div class="m-chips" data-in="1.5"><span class="m-chip a">50 MWac</span><span class="m-chip a">Grid by 2030</span><span class="m-chip a">England, Wales</span></div>
    ${row(1.9, 1, 'Site 14 · Lincolnshire', 'Score 82', 88, [['Substation', '3.1 km'], ['Headroom', 'published'], ['Nearby schemes', '6 of 7 approved']])}
    ${row(2.5, 2, 'Site 31 · Shropshire', 'Score 79', 84, [['Substation', '5.4 km'], ['Headroom', 'published'], ['Nearby schemes', '4 of 4 approved']])}
    ${row(3.1, 3, 'Site 08 · Powys', 'Score 74', 76, [['Substation', '2.2 km'], ['Headroom', 'unknown'], ['Nearby schemes', '2 of 5 approved']])}
    ${src(3.8, 'Every input listed with its source')}
    <div class="m-slot"><div class="m-note" data-in="4.6,6.6"><span class="m-dot amber"></span>Substation near Site 14 marked full<em>Your override</em></div>
    <div class="m-swap" data-in="6.6"><span>What changed</span><b>Site 31</b><i>→</i><b>now #1</b><em>Site 14 to #3</em></div></div>`) },

  fmaj: { dur: 9.5, key: 8.4, label: 'Find Me A Job · shortlist', html: mk(`
    <div class="m-q"><span data-type="0.2,46" data-text="Data analyst, 4 years, SQL and Python, Manchester or remote"></span><b class="m-caret"></b></div>
    <div class="m-tiles" data-in="1.6">
      <div><small>Listings read</small><b data-count="1.7,1.2,1240">1240</b></div>
      <div><small>Duplicates</small><b class="r" data-count="2,1.2,312">312</b></div>
      <div><small>Worth a look</small><b class="g" data-count="2.3,1.2,3">3</b></div>
    </div>
    <div class="m-lbl" data-in="3">SHORTLIST</div>
    ${row(3.3, 1, 'Data Analyst', 'Manchester', 91, [['Fit', '91%'], ['Chance', 'good'], ['Posted', '2 days ago']])}
    ${row(3.9, 2, 'Analytics Engineer', 'Remote', 86, [['Fit', '86%'], ['Chance', 'good'], ['Posted', 'today']])}
    ${row(4.5, 3, 'BI Analyst', 'Salford', 80, [['Fit', '80%'], ['Chance', 'fair'], ['Posted', '4 days ago']])}
    ${src(5.4, 'Live listings, checked today')}`) },

  unrj: { dur: 11, key: 9.6, label: 'Unrejectable · check', html: mk(`
    <div class="m-upl"><span class="m-file">PDF</span><span>cv-sample.pdf</span><span class="m-ok">Added</span></div>
    <div class="m-q"><span data-type="0.3,30" data-text="Role: product manager, payments"></span><b class="m-caret"></b></div>
    <div class="m-lbl" data-in="1.7">WHAT A SCREENER WOULD SEE</div>
    <div class="m-task" data-in="1.9">
      <div class="m-ck" data-in="2"><i class="n"></i>No results stated for the last role</div>
      <div class="m-ck" data-in="2.6"><i class="n"></i>Stakeholder work asked for, not shown</div>
      <div class="m-ck" data-in="3.2"><i class="y"></i>Dates and job titles are consistent</div>
    </div>
    <div class="m-lbl" data-in="4.1">SUGGESTED REWRITE</div>
    <div class="m-ans" data-in="4.3"><span data-type="4.5,42" data-text="Led the roadmap for a card payments app with six engineers, and agreed each release with risk and finance."></span></div>
    ${src(7.6, 'Checked against the role you entered')}`) },
};

export function initProductsMotion(root) {
  return mountScenes(root, SCENES, 'data-pm-scene');
}
