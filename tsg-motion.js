// Technical Sales Guide explainers: short looping stories drawn in HTML and CSS, driven by one timeline.
// Mount points are <div data-tsg-scene="a|b|c|d|e|f">. All figures on screen are sample figures.
const DESK = { w: 520, h: 450 }, MOB = { w: 360, h: 565 };
const mk = (s) => s.replace(/\n\s*/g, '');
const src = (t, txt) => `<div class="m-src" data-in="${t}"><svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path d="M2 1h5l3 3v7H2z" fill="none" stroke="currentColor" stroke-width="1"/></svg>${txt}</div>`;
const res = (t, k, n, nm, pr, w, dose, cost, land) => `<div class="m-res" data-in="${t}"><div class="m-res-h"><span class="m-rk">${n}</span><span class="m-nm">${nm}</span><span class="m-pr">${pr}</span></div><div class="m-fit"><i data-grow="${t + 0.2},1" style="--w:${w}%"></i></div><div class="m-kv"><span>Dose <b>${dose}</b></span><span>Cost in use <b>${cost}</b></span><span>Landed per kg <b>${land}</b></span></div></div>`;

export const SCENES = {
  a: { dur: 9.5, key: 7.6, label: 'Find · Animal nutrition', html: mk(`
    <div class="m-q"><span data-type="0.2,40" data-text="Heat stress in broilers, Saudi Arabia, 38°C house"></span><b class="m-caret"></b></div>
    <div class="m-chips" data-in="1.4"><span class="m-chip a">Broiler</span><span class="m-chip a">Heat stress</span><span class="m-chip a">Saudi Arabia</span></div>
    ${res(1.9, 0, 1, 'Betaine-based additive', 'Principal A', 92, '1,000 g/t', '$2.10/t feed', '$2.10')}
    ${res(2.6, 0, 2, 'Osmolyte and vitamin blend', 'Principal B', 86, '500 g/t', '$1.80/t feed', '$3.60')}
    ${res(3.3, 0, 3, 'Betaine HCl, standard grade', 'Principal C', 74, '2,000 g/t', '$1.70/t feed', '$0.85')}
    ${src(4, 'Sources: trial p.4 · supplier TDS')}
    <div class="m-src" data-in="4.4"><span class="m-dot sage"></span>Saudi registration valid to Mar 2028</div>
    <div class="m-slot"><div class="m-tags" data-in="4.8,6.2"><span class="m-chip g">Competitor equivalent of 1</span><span class="m-chip a">Replace</span></div>
    <div class="m-swap" data-in="6.2"><span>Replace</span><b>Principal A</b><i>→</i><b>Principal C</b><em>−$0.40/t feed</em></div></div>`) },

  b: { dur: 8.5, key: 7.4, label: 'Library', html: mk(`
    <div class="m-upl"><span class="m-file">PDF</span><span>principal-a-tds-v4.pdf</span><span class="m-ok">Added</span></div>
    <div class="m-doc"><div class="m-page"><span class="m-pn">p.<u class="m-sw"><b data-in="0,2.4">1</b><b data-in="2.4">3</b></u></span>
      <i class="m-ln w9"></i><i class="m-ln w6"></i><i class="m-ln w8"></i>
      <i class="m-ln w9 hl" data-hl="2.9"></i><i class="m-ln w7 hl" data-hl="2.9"></i><i class="m-ln w5"></i>
      <span class="m-pgtag" data-in="2.8">Inclusion rates · layers</span></div></div>
    <div class="m-q"><span data-type="0.5,36" data-text="Maximum inclusion rate in layer feed?"></span></div>
    <div class="m-ans" data-in="2.2"><span data-type="2.4,40" data-text="Up to 2,000 g/t of complete feed for layers."></span><span class="m-cite" data-in="3.9">TDS v4 · page 3</span></div>
    <div class="m-note" data-in="5.2"><span class="m-dot amber"></span>Certificate expires in 45 days<em>Alert to owner</em></div>
    <div class="m-note" data-in="6.3"><span class="m-dot sage"></span>2 attributes extracted<em>Waiting for review</em></div>`) },

  c: { dur: 10.5, key: 9, label: 'Principal portal · Principal A', html: mk(`
    <div class="m-perm"><span class="m-dot sage"></span>Showing Principal A products only</div>
    <div class="m-tiles">
      <div><small>Proposed</small><b data-count="0.2,1.2,42">42</b></div>
      <div><small>Won</small><b class="g" data-count="0.5,1.2,17">17</b></div>
      <div><small>Lost</small><b class="r" data-count="0.8,1.2,9">9</b></div>
    </div>
    <div class="m-lbl" data-in="1.2">WINS AND LOSSES BY COUNTRY</div>
    <div class="m-bars" data-in="1.4">
      <div class="m-brow"><span>Saudi Arabia</span><div><i class="w" data-grow="1.5,1" style="--w:78%"></i><i class="l" data-grow="1.7,1" style="--w:36%"></i></div></div>
      <div class="m-brow"><span>UAE</span><div><i class="w" data-grow="1.9,1" style="--w:50%"></i><i class="l" data-grow="2.1,1" style="--w:30%"></i></div></div>
    </div>
    <div class="m-lbl" data-in="2.8">WHY DEALS WERE LOST</div>
    <div class="m-bars" data-in="3">
      <div class="m-brow"><span>Price vs competitor</span><div><i class="r" data-grow="3.1,1" style="--w:80%"></i><b>4</b></div></div>
      <div class="m-brow"><span>Registration pending</span><div><i class="r" data-grow="3.4,1" style="--w:40%"></i><b>2</b></div></div>
      <div class="m-brow"><span>No dose trial run</span><div><i class="r" data-grow="3.7,1" style="--w:40%"></i><b>2</b></div></div>
      <div class="m-brow"><span>Lead time</span><div><i class="r" data-grow="4,1" style="--w:20%"></i><b>1</b></div></div>
    </div>
    ${src(5, 'Source: opportunities logged by the distributor')}
    <div class="m-note" data-in="6"><span class="m-dot amber"></span>Competitor named on 5 of 9 losses<em>Review pack ready</em></div>`) },

  d: { dur: 10, key: 8.5, label: 'Registrations · Saudi Arabia', html: mk(`
    <div class="m-tbl">
      <div class="m-tr h"><span>Product</span><span>Country</span><span>Expires</span></div>
      <div class="m-tr"><span>Betaine HCl</span><span>Saudi Arabia</span><span class="ok">Mar 2028</span></div>
      <div class="m-tr x" data-warn="1.2"><span>Xylanase blend</span><span>Saudi Arabia</span><span class="w1">Dec 2026 <em class="w2" data-in="1.2">60 days</em></span></div>
    </div>
    <div class="m-toast" data-in="1.8"><span class="m-dot amber"></span><div><b>Registration expiring in 60 days</b><small>Xylanase blend · holder: Principal B</small></div></div>
    <div class="m-task" data-in="3"><div class="m-task-h"><span>Renewal task created</span><em>Regulatory team · due in 46 days</em></div>
      <div class="m-ck" data-in="3.5"><i class="y"></i>Certificate of analysis, current</div>
      <div class="m-ck" data-in="4.2"><i class="n"></i>Free sale certificate, request from principal</div></div>
    <div class="m-note" data-in="5.4"><span class="m-dot sage"></span>3 customers buy this in Saudi Arabia<em>Listed for sales</em></div>
    ${src(6.4, 'Source: registration record')}`) },

  e: { dur: 14, key: 12.5, label: 'Concierge · website', html: mk(`
    <div class="m-chat">
      <div class="m-b v" dir="rtl" lang="ar"><span data-type="0.2,26" data-text="أحتاج منتجاً لتخفيف الإجهاد الحراري في الدجاج اللاحم"></span></div>
      <div class="m-gl" data-in="2.2">I need a product to reduce heat stress in broilers</div>
      <div class="m-b a" dir="rtl" lang="ar" data-in="2.8"><span data-type="3,30" data-text="هناك ثلاثة خيارات من ثلاثة موردين. هل تريد أن يتواصل معك مندوب المنطقة الشرقية؟"></span><span class="m-cite" data-in="5.9">المصدر: ورقة البيانات الفنية</span></div>
      <div class="m-gl" data-in="6.4">Three options from three suppliers. Want the Eastern Province rep to contact you?</div>
      <div class="m-b v" dir="rtl" lang="ar" data-in="7.4"><span data-type="7.5,22" data-text="نعم، شركتي في الدمام"></span></div>
    </div>
    <div class="m-lead" data-in="9"><div class="m-lead-h"><span class="m-dot sage"></span>Lead routed<em>Eastern Province sales</em></div>
      <div class="m-kv2"><span>Interest <b>Heat stress, broilers</b></span><span>Language <b>Arabic</b></span><span>Place <b>Dammam</b></span></div></div>`) },

  f: { dur: 11, key: 9.5, label: 'Document Studio', html: mk(`
    <div class="m-opts"><span class="m-chip a">Data sheet</span><span class="m-chip">Co-branded</span><span class="m-chip">EN</span></div>
    <div class="m-paper">
      <div class="m-ph"><span class="m-logo" data-in="0.3">Principal A</span><span class="m-x" data-in="0.5">×</span><span class="m-logo me" data-in="0.7">Your brand</span></div>
      <div class="m-pt" data-in="1">Heat stress solution for broilers</div>
      <div class="m-sp" data-in="1.5"><span>Dose</span><b>1,000 g/t</b></div>
      <div class="m-sp" data-in="2"><span>Form</span><b>Free-flowing powder</b></div>
      <div class="m-sp" data-in="2.5"><span>Shelf life</span><b>24 months</b></div>
      <div class="m-sp" data-in="3"><span>Registration</span><b>Saudi Arabia, valid to Feb 2029</b></div>
      <div class="m-pf" data-in="3.8">Sources: TDS v4 p.3 · registration record</div>
    </div>
    <div class="m-act" data-in="5"><span class="m-btn">Export PDF</span><span class="m-st"><span class="m-dot sage"></span>Draft for review</span></div>`) },

  coat: { dur: 9.5, key: 7.6, label: 'Find · Coatings', html: mk(`
    <div class="m-q"><span data-type="0.2,40" data-text="Dispersant for water-based wall paint, UAE, high TiO2"></span><b class="m-caret"></b></div>
    <div class="m-chips" data-in="1.4"><span class="m-chip a">Architectural paint</span><span class="m-chip a">Pigment dispersion</span><span class="m-chip a">UAE</span></div>
    ${res(1.9, 0, 1, 'Polyacrylate dispersant', 'Principal B', 90, '0.4% on pigment', '$0.05/kg paint', '$3.20')}
    ${res(2.6, 0, 2, 'Hydrophobic copolymer', 'Principal A', 84, '0.6% on pigment', '$0.07/kg paint', '$4.10')}
    ${res(3.3, 0, 3, 'Phosphate ester blend', 'Principal C', 71, '0.8% on pigment', '$0.06/kg paint', '$2.40')}
    ${src(4, 'Sources: supplier TDS · formulation guide p.2')}
    <div class="m-src" data-in="4.4"><span class="m-dot sage"></span>Low-VOC claim supported by supplier data</div>
    <div class="m-slot"><div class="m-tags" data-in="4.8,6.2"><span class="m-chip g">Competitor equivalent of 1</span><span class="m-chip a">Replace</span></div>
    <div class="m-swap" data-in="6.2"><span>Replace</span><b>Principal B</b><i>→</i><b>Principal C</b><em>−$0.01/kg paint</em></div></div>`) },

  cons: { dur: 9.5, key: 7.6, label: 'Find · Construction chemicals', html: mk(`
    <div class="m-q"><span data-type="0.2,40" data-text="Superplasticiser for ready-mix, Riyadh, 45°C summer pour"></span><b class="m-caret"></b></div>
    <div class="m-chips" data-in="1.4"><span class="m-chip a">Ready-mix concrete</span><span class="m-chip a">Slump retention</span><span class="m-chip a">Saudi Arabia</span></div>
    ${res(1.9, 0, 1, 'PCE, retarded grade', 'Principal A', 91, '0.8% by cement', '$1.90/m³', '$1.45')}
    ${res(2.6, 0, 2, 'PCE with slump keeper', 'Principal C', 87, '0.7% by cement', '$2.10/m³', '$1.80')}
    ${res(3.3, 0, 3, 'SNF plasticiser', 'Principal B', 68, '1.2% by cement', '$1.60/m³', '$0.80')}
    ${src(4, 'Sources: supplier TDS · trial mix report p.6')}
    <div class="m-src" data-in="4.4"><span class="m-dot sage"></span>Meets the customer's 90-minute slump target</div>
    <div class="m-slot"><div class="m-tags" data-in="4.8,6.2"><span class="m-chip g">Competitor equivalent of 2</span><span class="m-chip a">Replace</span></div>
    <div class="m-swap" data-in="6.2"><span>Replace</span><b>Principal C</b><i>→</i><b>Principal A</b><em>−$0.20/m³</em></div></div>`) },

  g: { dur: 10, key: 8.6, label: 'Light CRM · Dynamics 365 import', html: mk(`
    <div class="m-upl"><span class="m-file">CSV</span><span>dynamics-accounts.csv</span><span class="m-ok">Ready-made settings</span></div>
    <div class="m-tiles" data-in="0.6">
      <div><small>Accounts</small><b data-count="0.7,1.2,128">128</b></div>
      <div><small>Opportunities</small><b class="g" data-count="1,1.2,46">46</b></div>
      <div><small>Territories</small><b data-count="1.3,1.2,4">4</b></div>
    </div>
    <div class="m-lbl" data-in="2.4">OPPORTUNITY · FEED MILL, JEDDAH</div>
    <div class="m-tbl" data-in="2.6">
      <div class="m-tr h"><span>Product</span><span>Stage</span><span>Value</span></div>
      <div class="m-tr x" data-warn="3.6"><span>Betaine HCl</span><span class="w1">Lost</span><span>$18,400</span></div>
    </div>
    <div class="m-task" data-in="4"><div class="m-task-h"><span>Why was it lost?</span><em>Required</em></div>
      <div class="m-ck" data-in="4.6"><i class="y"></i>Price vs competitor</div>
      <div class="m-ck" data-in="5"><i class="n"></i>Competitor named: Principal D</div></div>
    ${src(6.2, 'Loss reason goes into the principal review pack')}`) },

  h: { dur: 10, key: 8.8, label: 'Learning path · new reps', html: mk(`
    <div class="m-lbl">FEED ADDITIVES FOR NEW REPS · 5 MODULES</div>
    <div class="m-bars" data-in="0.2">
      <div class="m-brow"><span>1 · Why additives</span><div><i class="w" data-grow="0.3,0.8" style="--w:60%"></i><b>Done</b></div></div>
      <div class="m-brow"><span>2 · Heat stress</span><div><i class="w" data-grow="0.6,0.8" style="--w:60%"></i><b>Done</b></div></div>
      <div class="m-brow"><span>3 · Enzymes</span><div><i class="w" data-grow="0.9,0.8" style="--w:36%"></i><b>In progress</b></div></div>
      <div class="m-brow"><span>4 · Mycotoxins</span><div><i class="l" data-grow="1.2,0.8" style="--w:4%"></i></div></div>
      <div class="m-brow"><span>5 · Registrations</span><div><i class="l" data-grow="1.4,0.8" style="--w:4%"></i></div></div>
    </div>
    <div class="m-q" data-in="2.4"><span data-type="2.5,40" data-text="Quiz: what does phytase release from feed?"></span></div>
    <div class="m-task" data-in="3.8">
      <div class="m-ck" data-in="4"><i class="n"></i>Amino acids</div>
      <div class="m-ck" data-in="4.3"><i class="y"></i>Phosphorus bound in phytate</div>
      <div class="m-ck" data-in="4.6"><i class="n"></i>Vitamin E</div></div>
    <div class="m-note" data-in="5.8"><span class="m-dot sage"></span>Correct · 4 of 5 so far<em>Module 3</em></div>`) },

  i: { dur: 10.5, key: 9, label: 'Flag this answer', html: mk(`
    <div class="m-ans"><span>Layer feed: up to 4,000 g/t of complete feed.</span><span class="m-cite">TDS v3 · page 3</span></div>
    <div class="m-act" data-in="1"><span class="m-btn">Flag this answer</span></div>
    <div class="m-q" data-in="1.6"><span data-type="1.7,36" data-text="Looks high. The new data sheet says 2,000 g/t."></span></div>
    <div class="m-note" data-in="3.4"><span class="m-dot amber"></span>Sent to today's review<em>Technical team</em></div>
    <div class="m-lbl" data-in="4.6">AFTER REVIEW</div>
    <div class="m-ans" data-in="4.8"><span>Layer feed: up to 2,000 g/t of complete feed.</span><span class="m-cite">TDS v4 · page 3</span></div>
    <div class="m-note" data-in="6"><span class="m-dot sage"></span>Corrected in today's review<em>Daily review</em></div>`) },

  j: { dur: 9.5, key: 8.2, label: 'Account brief · plant visit', html: mk(`
    <div class="m-perm"><span class="m-dot sage"></span>Saved for offline use</div>
    <div class="m-paper" data-in="0.4">
      <div class="m-pt">Broiler integrator, Dammam plant</div>
      <div class="m-sp" data-in="0.9"><span>Buys from us</span><b>Betaine HCl, xylanase blend</b></div>
      <div class="m-sp" data-in="1.4"><span>Open opportunity</span><b>Toxin binder, $22,000</b></div>
      <div class="m-sp" data-in="1.9"><span>Last visit</span><b>14 Sep · heat stress trial</b></div>
      <div class="m-sp" data-in="2.4"><span>Registrations</span><b>All valid in Saudi Arabia</b></div>
    </div>
    <div class="m-toast" data-in="3.6"><span class="m-dot amber"></span><div><b>No signal at the plant</b><small>The brief still opens</small></div></div>
    <div class="m-note" data-in="5"><span class="m-dot sage"></span>Removed from the device at sign-out<em>Policy</em></div>`) },

  k: { dur: 10, key: 8.6, label: 'Product passport · data quality', html: mk(`
    <div class="m-res"><div class="m-res-h"><span class="m-nm">Xylanase blend, Principal B</span><span class="m-pr">Passport</span></div>
      <div class="m-fit"><i data-grow="0.3,1.4" style="--w:78%"></i></div><div class="m-kv"><span>Completeness <b data-count="0.3,1.4,78">78</b><b>%</b></span></div></div>
    <div class="m-lbl" data-in="1.9">GAPS</div>
    <div class="m-task" data-in="2.1">
      <div class="m-ck" data-in="2.3"><i class="n"></i>Shelf life missing</div>
      <div class="m-ck" data-in="2.7"><i class="n"></i>Arabic product name missing</div>
      <div class="m-ck" data-in="3.1"><i class="y"></i>Dose, form and registration complete</div></div>
    <div class="m-note" data-in="4"><span class="m-dot amber"></span>Possible duplicate: "Xylanase 2X"<em>Merge?</em></div>
    <div class="m-chips" data-in="5.2"><span class="m-chip g">Feeds website</span><span class="m-chip g">Feeds CRM</span><span class="m-chip g">Feeds ERP</span></div>`) },

  l: { dur: 10.5, key: 9, label: 'Formulation · feed savings', html: mk(`
    <div class="m-q"><span data-type="0.2,40" data-text="Broiler grower feed, add phytase at 500 FTU/kg"></span><b class="m-caret"></b></div>
    <div class="m-lbl" data-in="1.5">MATRIX VALUES APPLIED</div>
    <div class="m-tbl" data-in="1.7">
      <div class="m-tr h"><span>Ingredient</span><span>Before</span><span>After</span></div>
      <div class="m-tr"><span>Dicalcium phosphate</span><span>12 kg/t</span><span class="ok">6 kg/t</span></div>
      <div class="m-tr"><span>Limestone</span><span>9 kg/t</span><span class="ok">7 kg/t</span></div>
    </div>
    <div class="m-swap" data-in="3.4"><span>Saving</span><b>$3.10/t feed</b><i>·</i><b>after enzyme cost</b><em>$1.95/t net</em></div>
    <div class="m-lbl" data-in="5">MYCOTOXIN RISK · MAIZE FROM THIS ORIGIN</div>
    <div class="m-bars" data-in="5.2">
      <div class="m-brow"><span>Aflatoxin</span><div><i class="r" data-grow="5.3,1" style="--w:70%"></i><b>High</b></div></div>
      <div class="m-brow"><span>Fumonisin</span><div><i class="w" data-grow="5.6,1" style="--w:30%"></i><b>Low</b></div></div>
    </div>
    ${src(7, 'Matrix values from the supplier data')}`) },
};

// The hero cycles through three industries.
SCENES.hero = { variants: [SCENES.a, SCENES.coat, SCENES.cons] };

const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
const ICON_PAUSE = '<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true"><path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true"><path d="M3 1.5l9 5.5-9 5.5z" fill="currentColor"/></svg>';

export function initTsgMotion(root) {
  return mountScenes(root, SCENES, 'data-tsg-scene');
}

// Mounts every [attr] element in root as a looping scene from scenes. Shared with products-motion.js.
export function mountScenes(root, scenes, attr) {
  root = root || document;
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const mob = window.matchMedia ? window.matchMedia('(max-width: 600px)') : { matches: false };
  const cleanups = [];

  root.querySelectorAll('[' + attr + ']').forEach((mount) => {
    const top = scenes[mount.getAttribute(attr)];
    if (!top || mount.__tsg) return;
    mount.__tsg = true;
    // A scene may hold several examples in `variants`; each loop shows the next one.
    const list = top.variants || [top];
    let vi = 0, def = list[0];
    const title = mount.getAttribute('data-title') || 'Animated example';
    mount.innerHTML = '';
    const fig = el(`<div class="tsg-fig" role="img" aria-label="${title}. Animation with sample figures; a text description follows."><div class="tsg-stage" aria-hidden="true"><div class="m-win"><div class="m-barx"><i></i><i></i><i></i><span class="m-t"></span></div><div class="m-body"></div></div></div></div>`);
    const ctl = el(`<div class="tsg-ctl"><button type="button" class="tsg-btn" aria-pressed="false"></button><div class="tsg-prog" aria-hidden="true"><i></i></div><span class="tsg-ill">${list.length > 1 ? list.length + ' examples · ' : ''}Sample figures</span></div>`);
    mount.appendChild(fig); mount.appendChild(ctl);
    const stage = fig.firstElementChild, labelEl = stage.querySelector('.m-t'), body = stage.querySelector('.m-body');
    const btn = ctl.querySelector('button'), bar = ctl.querySelector('.tsg-prog i');

    let items, typers, counters, grows, hls, warns, caret;
    const load = (v) => {
      def = list[v]; labelEl.textContent = def.label; body.innerHTML = def.html;
      items = [];
      stage.querySelectorAll('[data-in]').forEach((e) => { const [a, b] = e.getAttribute('data-in').split(',').map(Number); items.push({ e, a, b: isNaN(b) ? 1e9 : b, on: null }); });
      typers = [...stage.querySelectorAll('[data-type]')].map((e) => { const [a, cps] = e.getAttribute('data-type').split(',').map(Number); return { e, a, cps, text: e.getAttribute('data-text'), n: -1 }; });
      counters = [...stage.querySelectorAll('[data-count]')].map((e) => { const [a, d, to] = e.getAttribute('data-count').split(',').map(Number); return { e, a, d, to, v: -1 }; });
      grows = [...stage.querySelectorAll('[data-grow]')].map((e) => { const [a, d] = e.getAttribute('data-grow').split(',').map(Number); return { e, a, d, v: -1 }; });
      hls = [...stage.querySelectorAll('[data-hl]')].map((e) => ({ e, a: Number(e.getAttribute('data-hl')), on: null }));
      warns = [...stage.querySelectorAll('[data-warn]')].map((e) => ({ e, a: Number(e.getAttribute('data-warn')), on: null }));
      caret = stage.querySelector('.m-caret');
    };
    load(0);

    const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
    const render = (t) => {
      for (const i of items) { const on = t >= i.a && t < i.b; if (on !== i.on) { i.on = on; i.e.classList.toggle('on', on); } }
      for (const y of typers) { const n = Math.max(0, Math.min(y.text.length, Math.floor((t - y.a) * y.cps))); if (n !== y.n) { y.n = n; y.e.textContent = y.text.slice(0, n); } }
      for (const c of counters) { const v = Math.round(c.to * ease((t - c.a) / c.d)); if (v !== c.v) { c.v = v; c.e.textContent = v; } }
      for (const g of grows) { const v = ease((t - g.a) / g.d); if (Math.abs(v - g.v) > 0.01 || v === 0 || v === 1) { g.v = v; g.e.style.transform = 'scaleX(' + v.toFixed(3) + ')'; } }
      for (const h of hls) { const on = t >= h.a; if (on !== h.on) { h.on = on; h.e.classList.toggle('on', on); } }
      for (const w of warns) { const on = t >= w.a; if (on !== w.on) { w.on = on; w.e.classList.toggle('warn', on); } }
      if (caret) caret.style.display = t < 1.6 ? 'inline-block' : 'none';
      bar.style.transform = 'scaleX(' + Math.min(1, t / def.dur).toFixed(3) + ')';
    };

    const fit = () => {
      const d = mob.matches ? MOB : DESK;
      stage.style.width = d.w + 'px'; stage.style.height = d.h + 'px';
      const w = fig.clientWidth || d.w;
      stage.style.transform = 'scale(' + (w / d.w).toFixed(4) + ')';
    };
    fit();
    let ro; if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(fig); } else window.addEventListener('resize', fit);

    const p = { t: def.key, inView: false, userPaused: false, started: !mq.matches, raf: 0, last: 0, hold: 0 };
    const playing = () => p.started && !p.userPaused && p.inView && !document.hidden;
    const setBtn = () => {
      const running = p.started && !p.userPaused;
      btn.innerHTML = (running ? ICON_PAUSE : ICON_PLAY) + '<span>' + (running ? 'Pause' : (p.started ? 'Play' : 'Play animation')) + '</span>';
      btn.setAttribute('aria-pressed', String(!running));
      btn.setAttribute('aria-label', (running ? 'Pause' : 'Play') + ' animation: ' + title);
    };
    const tick = (now) => {
      p.raf = 0;
      if (!playing()) return;
      const dt = Math.min(0.1, (now - p.last) / 1000); p.last = now;
      if (p.t >= def.dur) { p.hold += dt; if (p.hold > 1.2) { p.t = 0; p.hold = 0; if (list.length > 1) { vi = (vi + 1) % list.length; load(vi); } } }
      else p.t += dt;
      render(Math.min(p.t, def.dur));
      p.raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!p.raf && playing()) { p.last = performance.now(); p.raf = requestAnimationFrame(tick); } };

    if (mq.matches) stage.classList.add('still');
    render(def.key);
    setBtn();
    btn.addEventListener('click', () => {
      if (!p.started) { p.started = true; p.userPaused = false; stage.classList.remove('still'); p.t = 0; p.hold = 0; render(0); }
      else p.userPaused = !p.userPaused;
      setBtn(); kick();
    });
    const io = new IntersectionObserver((es) => { p.inView = es[0].isIntersecting; kick(); }, { threshold: 0.35 });
    io.observe(fig);
    const vis = () => kick();
    document.addEventListener('visibilitychange', vis);
    cleanups.push(() => { io.disconnect(); if (ro) ro.disconnect(); document.removeEventListener('visibilitychange', vis); cancelAnimationFrame(p.raf); });
  });
  return () => cleanups.forEach((f) => f());
}
