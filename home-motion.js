// Homepage "What we build" explainers: one short looping scene per service, on the same timeline engine as tsg-motion.js.
// Mount points are <div data-home-scene="ready|auto|sap|web|train|reg">. All names and figures on screen are samples.
import { mountScenes } from './tsg-motion.js?v=4';

const mk = (s) => s.replace(/\n\s*/g, '');
const src = (t, txt) => `<div class="m-src" data-in="${t}"><svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path d="M2 1h5l3 3v7H2z" fill="none" stroke="currentColor" stroke-width="1"/></svg>${txt}</div>`;
const row = (t, n, nm, pr, w, kv) => `<div class="m-res" data-in="${t}"><div class="m-res-h"><span class="m-rk">${n}</span><span class="m-nm">${nm}</span><span class="m-pr">${pr}</span></div><div class="m-fit"><i data-grow="${t + 0.2},1" style="--w:${w}%"></i></div><div class="m-kv">${kv.map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('')}</div></div>`;
const bar = (t, name, w, val, cls) => `<div class="m-brow"><span>${name}</span><div><i class="${cls}" data-grow="${t},1" style="--w:${w}%"></i><b data-in="${t + 0.5}">${val}</b></div></div>`;
// A status that changes part way through: shows `a` until time t, then `b`.
const flip = (t, a, b) => `<u class="m-sw"><b data-in="0,${t}">${a}</b><b class="ok" data-in="${t}">${b}</b></u>`;

export const SCENES = {
  ready: { dur: 10, key: 8.6, label: 'Readiness · use-case shortlist', html: mk(`
    <div class="m-lbl">WORKFLOWS SCORED FOR DATA READINESS</div>
    <div class="m-bars">
      ${bar(0.3, 'Invoice matching', 82, '82', 'w')}
      ${bar(0.6, 'Customer enquiries', 71, '71', 'w')}
      ${bar(0.9, 'Contract review', 55, '55', 'w')}
      ${bar(1.2, 'Demand planning', 34, '34', 'r')}
    </div>
    <div class="m-lbl" data-in="2.4">RANKED SHORTLIST</div>
    ${row(2.7, 1, 'Invoice matching', 'Build first', 90, [['Data ready', '82%'], ['Effort', 'low'], ['Risk', 'low']])}
    ${row(3.3, 2, 'Customer enquiries', 'Next', 76, [['Data ready', '71%'], ['Effort', 'medium'], ['Risk', 'low']])}
    <div class="m-note" data-in="4.6"><span class="m-dot amber"></span>Demand planning: history incomplete<em>Fix data first</em></div>
    ${src(5.6, 'Scored from workshops and system samples')}`) },

  auto: { dur: 11, key: 9.6, label: 'Accounts payable · inbox', html: mk(`
    <div class="m-upl"><span class="m-file">PDF</span><span>invoice-4471.pdf</span><span class="m-ok">Received</span></div>
    <div class="m-lbl" data-in="0.8">FIELDS EXTRACTED</div>
    <div class="m-paper" data-in="1">
      <div class="m-sp" data-in="1.3"><span>Supplier</span><b>Sample Supplies Ltd</b></div>
      <div class="m-sp" data-in="1.7"><span>Purchase order</span><b>PO-20318</b></div>
      <div class="m-sp" data-in="2.1"><span>Amount</span><b>£12,480.00</b></div>
      <div class="m-sp" data-in="2.5"><span>Due</span><b>30 days</b></div>
    </div>
    <div class="m-task" data-in="3.3">
      <div class="m-ck" data-in="3.5"><i class="y"></i>Purchase order found</div>
      <div class="m-ck" data-in="4.1"><i class="y"></i>Supplier bank details match</div>
      <div class="m-ck" data-in="4.7"><i class="n"></i>Amount is £480 over the order</div>
    </div>
    <div class="m-lead" data-in="6"><div class="m-lead-h"><span class="m-dot amber"></span>Sent for approval<em>Buyer for PO-20318</em></div>
      <div class="m-kv2"><span>Reason <b>Over order by £480</b></span><span>Evidence <b>attached</b></span></div></div>`) },

  sap: { dur: 10.5, key: 9.2, label: 'SAP ECC · read-only layer', html: mk(`
    <div class="m-perm"><span class="m-dot sage"></span>Read-only extract · ECC core unchanged</div>
    <div class="m-q"><span data-type="0.3,38" data-text="Open purchase orders past due, by plant"></span><b class="m-caret"></b></div>
    <div class="m-tiles" data-in="1.5">
      <div><small>Open orders</small><b data-count="1.6,1.2,846">846</b></div>
      <div><small>Past due</small><b class="r" data-count="1.9,1.2,57">57</b></div>
      <div><small>Plants</small><b data-count="2.2,1.2,4">4</b></div>
    </div>
    <div class="m-lbl" data-in="2.8">PAST DUE BY PLANT</div>
    <div class="m-bars" data-in="2.9">
      ${bar(3, 'Plant 1000', 80, '24', 'r')}
      ${bar(3.2, 'Plant 2000', 57, '17', 'r')}
      ${bar(3.4, 'Plant 3000', 37, '11', 'r')}
      ${bar(3.6, 'Plant 4000', 17, '5', 'r')}
    </div>
    <div class="m-toast" data-in="5"><span class="m-dot amber"></span><div><b>Goods received, no invoice</b><small>Order 4500018273 · 41 days · Plant 1000</small></div></div>
    ${src(6.2, 'Source: purchasing tables, read-only')}`) },

  web: { dur: 13, key: 11.6, label: 'Page check · /services/compliance', html: mk(`
    <div class="m-lbl">ENTITIES FOUND</div>
    <div class="m-chips" data-in="0.4"><span class="m-chip g">Organisation</span><span class="m-chip g">Service</span><span class="m-chip g">London</span><span class="m-chip a" data-in="1">FAQ, no markup</span></div>
    <div class="m-tbl" data-in="1.6">
      <div class="m-tr h"><span>Structured data</span><span>On page</span><span>Status</span></div>
      <div class="m-tr"><span>Organization</span><span>Yes</span><span class="ok">Valid</span></div>
      <div class="m-tr"><span>Service</span><span>Yes</span><span class="ok">Valid</span></div>
      <div class="m-tr x" data-warn="2.4"><span>FAQPage</span><span>${flip(4.4, 'No', 'Yes')}</span><span class="w1">${flip(4.4, 'Missing', 'Added')}</span></div>
    </div>
    <div class="m-chat" data-in="5.4">
      <div class="m-b v"><span data-type="5.5,34" data-text="Who builds compliance workflows in London?"></span></div>
      <div class="m-b a" data-in="7"><span data-type="7.1,44" data-text="Example Ltd builds evidence-led compliance workflows for regulated teams."></span><span class="m-cite" data-in="9">example.com/services/compliance</span></div>
    </div>`) },

  train: { dur: 10.5, key: 9.2, label: 'Learning path · operations team', html: mk(`
    <div class="m-tiles">
      <div><small>Team</small><b data-count="0.2,1,12">12</b></div>
      <div><small>Modules</small><b data-count="0.4,1,5">5</b></div>
      <div><small>Practising</small><b class="g" data-count="0.6,1.2,9">9</b></div>
    </div>
    <div class="m-task" data-in="1.4">
      <div class="m-task-h"><span>Path</span><em>On your own documents</em></div>
      <div class="m-ck" data-in="1.6"><i class="y"></i>1 · Where AI fits your work</div>
      <div class="m-ck" data-in="2"><i class="y"></i>2 · Practice on real cases</div>
      <div class="m-ck" data-in="2.4"><i class="y"></i>3 · Checking outputs safely</div>
      <div class="m-ck" data-in="2.8"><i class="n"></i>4 · Running the system day to day</div>
      <div class="m-ck" data-in="3.2"><i class="n"></i>5 · Governance and change control</div>
    </div>
    <div class="m-lbl" data-in="3.8">COMPLETED, BY MODULE</div>
    <div class="m-bars" data-in="3.9">
      ${bar(4, 'Where AI fits', 100, '12/12', 'w')}
      ${bar(4.3, 'Practice', 75, '9/12', 'w')}
      ${bar(4.6, 'Checking outputs', 50, '6/12', 'w')}
      ${bar(4.9, 'Running it', 17, '2/12', 'w')}
    </div>
    <div class="m-note" data-in="6.2"><span class="m-dot sage"></span>Next: running it day to day<em>Hands-on session</em></div>`) },

  reg: { dur: 11.5, key: 10.2, label: 'Change request · CR-112', html: mk(`
    <div class="m-upl"><span class="m-file">PDF</span><span>change-request-112.pdf</span><span class="m-ok">Submitted</span></div>
    <div class="m-lbl" data-in="0.6">REVIEW GATES</div>
    <div class="m-tbl" data-in="0.8">
      <div class="m-tr h"><span>Gate</span><span>Owner</span><span>Status</span></div>
      <div class="m-tr"><span>Completeness</span><span>System</span><span>${flip(1.6, 'Pending', 'Passed')}</span></div>
      <div class="m-tr"><span>Technical</span><span>Engineering</span><span>${flip(3, 'Pending', 'Approved')}</span></div>
      <div class="m-tr"><span>Compliance</span><span>QA lead</span><span>${flip(4.6, 'Pending', 'Signed')}</span></div>
    </div>
    <div class="m-lbl" data-in="1.4">AUDIT LOG</div>
    ${src(1.6, '09:02 · completeness check passed')}
    ${src(3, '11:40 · technical review approved')}
    ${src(4.6, '14:15 · sign-off, evidence attached')}
    <div class="m-swap" data-in="6"><span>Released</span><b>CR-112</b><i>→</i><b>evidence pack</b><em>3 records</em></div>`) },
};

export function initHomeMotion(root) {
  return mountScenes(root, SCENES, 'data-home-scene');
}
