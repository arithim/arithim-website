// Products page explainers: one short looping scene per product, on the same timeline engine as tsg-motion.js.
// Mount points are <div data-pm-scene="tsg|sf|fmaj|unrj">. All names and figures on screen are samples.
import { SCENES as TSG, mountScenes } from './tsg-motion.js?v=3';

const mk = (s) => s.replace(/\n\s*/g, '');
const row = (t, n, nm, pr, w, kv) => `<div class="m-res" data-in="${t}"><div class="m-res-h"><span class="m-rk">${n}</span><span class="m-nm">${nm}</span><span class="m-pr">${pr}</span></div><div class="m-fit"><i data-grow="${t + 0.2},1" style="--w:${w}%"></i></div><div class="m-kv">${kv.map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('')}</div></div>`;
const src = (t, txt) => `<div class="m-src" data-in="${t}"><svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path d="M2 1h5l3 3v7H2z" fill="none" stroke="currentColor" stroke-width="1"/></svg>${txt}</div>`;

const SF2 = { dur: 10, key: 8.6, label: 'Site Finder · Scotland', html: mk(`
    <div class="m-q"><span data-type="0.2,36" data-text="30 MW solar, 33 kV connection, central Scotland"></span><b class="m-caret"></b></div>
    <div class="m-chips" data-in="1.5"><span class="m-chip a">30 MWac</span><span class="m-chip a">33 kV</span><span class="m-chip a">Scotland</span></div>
    ${row(1.9, 1, 'Site 52 · Fife', 'Score 77', 82, [['Substation', '1.8 km'], ['Headroom', 'published'], ['Nearby schemes', '3 of 3 approved']])}
    ${row(2.5, 2, 'Site 47 · Perth and Kinross', 'Score 73', 78, [['Substation', '4.0 km'], ['Headroom', 'unknown'], ['Nearby schemes', '2 of 2 approved']])}
    ${row(3.1, 3, 'Site 61 · Stirling', 'Score 70', 74, [['Substation', '6.3 km'], ['Headroom', 'published'], ['Nearby schemes', '1 of 3 approved']])}
    ${src(3.8, 'Every input listed with its source')}
    <div class="m-slot"><div class="m-note" data-in="4.6,6.6"><span class="m-dot amber"></span>Hurdle rate raised to 8%<em>Your assumption</em></div>
    <div class="m-swap" data-in="6.6"><span>What changed</span><b>Site 61</b><i>→</i><b>leaves the list</b><em>2 sites still clear</em></div></div>`) };

const SF3 = { dur: 10, key: 8.6, label: 'Site Finder · East of England', html: mk(`
    <div class="m-q"><span data-type="0.2,36" data-text="80 MW solar, avoid best farmland, East of England"></span><b class="m-caret"></b></div>
    <div class="m-chips" data-in="1.5"><span class="m-chip a">80 MWac</span><span class="m-chip a">No Grade 1 or 2</span><span class="m-chip a">East of England</span></div>
    ${row(1.9, 1, 'Site 09 · Suffolk', 'Score 80', 86, [['Substation', '2.6 km'], ['Land grade', '3b'], ['Nearby schemes', '5 of 6 approved']])}
    ${row(2.5, 2, 'Site 22 · Essex', 'Score 76', 80, [['Substation', '3.9 km'], ['Land grade', '3b'], ['Nearby schemes', '4 of 5 approved']])}
    ${row(3.1, 3, 'Site 17 · Cambridgeshire', 'Score 72', 75, [['Substation', '1.4 km'], ['Land grade', '3a'], ['Nearby schemes', '2 of 4 approved']])}
    ${src(3.8, 'Every input listed with its source')}
    <div class="m-slot"><div class="m-note" data-in="4.6,6.6"><span class="m-dot amber"></span>Refused scheme 1.2 km from Site 22<em>Planning record</em></div>
    <div class="m-swap" data-in="6.6"><span>What changed</span><b>Site 17</b><i>→</i><b>now #2</b><em>Site 22 to #3</em></div></div>`) };

const FMAJ2 = { dur: 9.5, key: 8.4, label: 'Find Me A Job · shortlist', html: mk(`
    <div class="m-q"><span data-type="0.2,46" data-text="Staff nurse, 6 years, A&E, Leeds or Bradford"></span><b class="m-caret"></b></div>
    <div class="m-tiles" data-in="1.6">
      <div><small>Listings read</small><b data-count="1.7,1.2,860">860</b></div>
      <div><small>Duplicates</small><b class="r" data-count="2,1.2,204">204</b></div>
      <div><small>Worth a look</small><b class="g" data-count="2.3,1.2,4">4</b></div>
    </div>
    <div class="m-lbl" data-in="3">SHORTLIST</div>
    ${row(3.3, 1, 'Senior Staff Nurse, A&E', 'Leeds', 93, [['Fit', '93%'], ['Chance', 'good'], ['Posted', 'today']])}
    ${row(3.9, 2, 'Urgent Care Nurse', 'Bradford', 88, [['Fit', '88%'], ['Chance', 'good'], ['Posted', '3 days ago']])}
    ${row(4.5, 3, 'Emergency Nurse Practitioner', 'Leeds', 79, [['Fit', '79%'], ['Chance', 'fair'], ['Posted', '1 day ago']])}
    ${src(5.4, 'Live listings, checked today')}`) };

const FMAJ3 = { dur: 9.5, key: 8.4, label: 'Find Me A Job · shortlist', html: mk(`
    <div class="m-q"><span data-type="0.2,46" data-text="Graduate, economics, first job, London or hybrid"></span><b class="m-caret"></b></div>
    <div class="m-tiles" data-in="1.6">
      <div><small>Listings read</small><b data-count="1.7,1.2,2310">2310</b></div>
      <div><small>Duplicates</small><b class="r" data-count="2,1.2,655">655</b></div>
      <div><small>Worth a look</small><b class="g" data-count="2.3,1.2,5">5</b></div>
    </div>
    <div class="m-lbl" data-in="3">SHORTLIST</div>
    ${row(3.3, 1, 'Graduate Analyst', 'London', 89, [['Fit', '89%'], ['Chance', 'good'], ['Posted', '2 days ago']])}
    ${row(3.9, 2, 'Junior Economist', 'Hybrid', 84, [['Fit', '84%'], ['Chance', 'fair'], ['Posted', 'today']])}
    ${row(4.5, 3, 'Research Assistant', 'London', 81, [['Fit', '81%'], ['Chance', 'good'], ['Posted', '5 days ago']])}
    ${src(5.4, 'Live listings, checked today')}`) };

const UNRJ2 = { dur: 11, key: 9.6, label: 'Unrejectable · check', html: mk(`
    <div class="m-upl"><span class="m-file">PDF</span><span>cv-sample.pdf</span><span class="m-ok">Added</span></div>
    <div class="m-q"><span data-type="0.3,30" data-text="Role: graduate accountant, ACA"></span><b class="m-caret"></b></div>
    <div class="m-lbl" data-in="1.7">WHAT A SCREENER WOULD SEE</div>
    <div class="m-task" data-in="1.9">
      <div class="m-ck" data-in="2"><i class="n"></i>Degree grade missing</div>
      <div class="m-ck" data-in="2.6"><i class="n"></i>Excel skills listed, not shown in use</div>
      <div class="m-ck" data-in="3.2"><i class="y"></i>Right to work in the UK stated</div>
    </div>
    <div class="m-lbl" data-in="4.1">SUGGESTED REWRITE</div>
    <div class="m-ans" data-in="4.3"><span data-type="4.5,42" data-text="Built the monthly stock reconciliation in Excel for a 12-branch retailer during a summer placement."></span></div>
    ${src(7.6, 'Checked against the role you entered')}`) };

const UNRJ3 = { dur: 11, key: 9.6, label: 'Unrejectable · check', html: mk(`
    <div class="m-upl"><span class="m-file">PDF</span><span>cv-sample.pdf</span><span class="m-ok">Added</span></div>
    <div class="m-q"><span data-type="0.3,30" data-text="Role: warehouse team leader"></span><b class="m-caret"></b></div>
    <div class="m-lbl" data-in="1.7">WHAT A SCREENER WOULD SEE</div>
    <div class="m-task" data-in="1.9">
      <div class="m-ck" data-in="2"><i class="n"></i>No team size given</div>
      <div class="m-ck" data-in="2.6"><i class="n"></i>Forklift licence asked for, not mentioned</div>
      <div class="m-ck" data-in="3.2"><i class="y"></i>Shift work experience is clear</div>
    </div>
    <div class="m-lbl" data-in="4.1">SUGGESTED REWRITE</div>
    <div class="m-ans" data-in="4.3"><span data-type="4.5,42" data-text="Led a night shift of eight pickers and held a counterbalance forklift licence throughout."></span></div>
    ${src(7.6, 'Checked against the role you entered')}`) };

// Grid pre-screen: a request lands on the network map, the nearest substations light up and headroom is weighed against it.
const GRID = { dur: 10, key: 8.6, label: 'Grid pre-screen · sample', html: mk(`
    <div class="m-q"><span data-type="0.2,34" data-text="20 MW battery, near Didcot"></span><b class="m-caret"></b></div>
    <svg class="gp-map" viewBox="0 0 488 214" aria-hidden="true">
      <ellipse class="gp-cloud" cx="86" cy="34" rx="34" ry="10"/><ellipse class="gp-cloud c2" cx="402" cy="26" rx="28" ry="8"/>
      <path class="gp-line" data-in="0.9" d="M96 150 C140 96 176 82 214 72"/>
      <path class="gp-line" data-in="1.2" d="M214 72 C256 80 300 120 336 158"/>
      <path class="gp-line" data-in="1.5" d="M214 72 C290 40 360 44 424 60"/>
      <g class="gp-sub" data-in="0.6"><circle cx="96" cy="150" r="10"/><text x="96" y="178" text-anchor="middle">Sub A</text></g>
      <g class="gp-sub" data-in="0.8"><circle cx="214" cy="72" r="10"/><text x="214" y="54" text-anchor="middle">Sub B</text></g>
      <g class="gp-sub" data-in="1.0"><circle cx="336" cy="158" r="10"/><text x="336" y="186" text-anchor="middle">Sub C</text></g>
      <g class="gp-sub" data-in="1.2"><circle cx="424" cy="60" r="10"/><text x="424" y="42" text-anchor="middle">Sub D</text></g>
      <circle class="gp-dot" data-in="2.2" r="3.5"/><circle class="gp-dot d2" data-in="2.6" r="3.5"/>
      <g class="gp-site" data-in="2.0"><path class="gp-tether" d="M148 160 L108 152"/><circle class="gp-ring" cx="148" cy="164" r="14"/><path class="gp-pin" d="M148 172 C140 162 138 158 138 154 a10 10 0 0 1 20 0 c0 4 -2 8 -10 18z"/><circle class="gp-pinc" cx="148" cy="154" r="3.6"/></g>
      <g class="gp-km" data-in="3.0"><rect x="112" y="122" width="62" height="20" rx="10"/><text x="143" y="136" text-anchor="middle">2.1 km</text></g>
    </svg>
    <div class="m-lbl" data-in="3.6">HEADROOM AT THE NEAREST SUBSTATION</div>
    <div class="gp-bar" data-in="3.8"><span>Available</span><div class="m-fit"><i class="s" data-grow="3.9,1.1" style="--w:100%"></i></div><b>38 MW</b></div>
    <div class="gp-bar" data-in="4.4"><span>Your request</span><div class="m-fit"><i class="a" data-grow="4.5,1.1" style="--w:53%"></i></div><b>20 MW</b></div>
    <div class="gp-verdict" data-in="5.9"><span class="gp-spark">&#10022;</span>Room to spare: 18 MW<em>Looks promising</em></div>
    <div class="m-chips" data-in="6.9"><span class="m-chip g">Holder: Network operator</span><span class="m-chip a">Queue: 2 nearby</span></div>
    <div class="m-src" data-in="7.6"><svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path d="M2 1h5l3 3v7H2z" fill="none" stroke="currentColor" stroke-width="1"/></svg>Published headroom, dated</div>`) };

const SCENES = {
  tsg: TSG.hero,

  sf1: { dur: 10, key: 8.6, label: 'Site Finder · Great Britain', html: mk(`
    <div class="m-q"><span data-type="0.2,36" data-text="50 MW solar farm, grid by 2030, England and Wales"></span><b class="m-caret"></b></div>
    <div class="m-chips" data-in="1.5"><span class="m-chip a">50 MWac</span><span class="m-chip a">Grid by 2030</span><span class="m-chip a">England, Wales</span></div>
    ${row(1.9, 1, 'Site 14 · Lincolnshire', 'Score 82', 88, [['Substation', '3.1 km'], ['Headroom', 'published'], ['Nearby schemes', '6 of 7 approved']])}
    ${row(2.5, 2, 'Site 31 · Shropshire', 'Score 79', 84, [['Substation', '5.4 km'], ['Headroom', 'published'], ['Nearby schemes', '4 of 4 approved']])}
    ${row(3.1, 3, 'Site 08 · Powys', 'Score 74', 76, [['Substation', '2.2 km'], ['Headroom', 'unknown'], ['Nearby schemes', '2 of 5 approved']])}
    ${src(3.8, 'Every input listed with its source')}
    <div class="m-slot"><div class="m-note" data-in="4.6,6.6"><span class="m-dot amber"></span>Substation near Site 14 marked full<em>Your override</em></div>
    <div class="m-swap" data-in="6.6"><span>What changed</span><b>Site 31</b><i>→</i><b>now #1</b><em>Site 14 to #3</em></div></div>`) },

  fmaj1: { dur: 9.5, key: 8.4, label: 'Find Me A Job · shortlist', html: mk(`
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

  unrj1: { dur: 11, key: 9.6, label: 'Unrejectable · check', html: mk(`
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

SCENES.grid = GRID;
SCENES.sf = { variants: [SCENES.sf1, SF2, SF3] };
SCENES.fmaj = { variants: [SCENES.fmaj1, FMAJ2, FMAJ3] };
SCENES.unrj = { variants: [SCENES.unrj1, UNRJ2, UNRJ3] };

export function initProductsMotion(root) {
  return mountScenes(root, SCENES, 'data-pm-scene');
}
