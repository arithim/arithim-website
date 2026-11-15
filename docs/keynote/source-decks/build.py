import os
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+"/talks/"

CSS=r'''
:root{--bg:#11161a;--surface:#182026;--fg:#ebe8e1;--muted:#9ba5ab;--rule:#2a343b;--mark:#f0c04a;--mark-bg:rgba(240,192,74,.16);--link:#8fc6d6;
--display:"Schibsted Grotesk","Helvetica Neue",Arial,sans-serif;--body:"Source Serif 4",Georgia,"Times New Roman",serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;color-scheme:dark}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#f7f7f4;--surface:#ecede8;--fg:#161b1f;--muted:#5a646a;--rule:#d8dad3;--mark:#8a6200;--mark-bg:rgba(240,192,74,.38);--link:#1d6a80;color-scheme:light}}
:root[data-theme="light"]{--bg:#f7f7f4;--surface:#ecede8;--fg:#161b1f;--muted:#5a646a;--rule:#d8dad3;--mark:#8a6200;--mark-bg:rgba(240,192,74,.38);--link:#1d6a80;color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;height:100%;overflow:hidden;background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased;overscroll-behavior:none}
body{font-family:var(--body)}
a{color:var(--link);text-underline-offset:3px}
a:focus-visible,button:focus-visible{outline:2px solid var(--mark);outline-offset:3px}
.viewport{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;touch-action:pan-y}
.stage{position:relative;width:1280px;height:720px;flex:none;transform-origin:center center;background:var(--bg);overflow:hidden}
.slide{position:absolute;inset:0;padding:88px 96px 80px;display:flex;flex-direction:column;justify-content:center;opacity:0;visibility:hidden;transform:translateY(12px);transition:opacity .35s ease,transform .35s ease,visibility 0s .35s}
.slide.active{opacity:1;visibility:visible;transform:none;transition:opacity .35s ease,transform .35s ease}
@media (prefers-reduced-motion:reduce){.slide,.slide.active{transition:none;transform:none}.bar i{transition:none}}
.kicker{font-family:var(--mono);font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 28px}
h1,h2{font-family:var(--display);margin:0;text-wrap:balance}
h1{font-weight:800;font-size:92px;line-height:1.02;letter-spacing:-.03em}
h2{font-weight:800;font-size:68px;line-height:1.06;letter-spacing:-.025em}
h2.huge{font-size:84px}
mark{background:var(--mark-bg);color:inherit;padding:0 6px;text-decoration:underline;text-decoration-color:var(--mark);text-decoration-thickness:3px;text-underline-offset:8px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.sub{font-family:var(--mono);font-size:24px;letter-spacing:.08em;color:var(--muted);margin-top:44px}
.lede{font-size:36px;line-height:1.4;margin:32px 0 0;max-width:960px}
.rule{width:96px;height:4px;background:var(--mark);margin:0 0 36px}
.num{font-family:var(--display);font-weight:800;font-size:210px;line-height:.95;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.num em{font-style:normal;color:var(--mark)}
.nums{display:grid;grid-template-columns:1fr 1fr;gap:56px;margin-top:20px}
.nums .cap{font-family:var(--mono);font-size:24px;letter-spacing:.04em;color:var(--muted);margin-top:18px;line-height:1.4}
.list{list-style:none;margin:36px 0 0;padding:0;display:flex;flex-direction:column;gap:22px}
.list li{font-family:var(--display);font-weight:600;font-size:42px;line-height:1.2;display:flex;gap:26px;align-items:flex-start}
.list li::before{content:"";flex:none;width:36px;height:36px;margin-top:8px;border:3px solid var(--mark)}
.list.plain li::before{display:none}
.list li small{display:block;font-family:var(--body);font-weight:400;font-size:26px;color:var(--muted);margin-top:6px;line-height:1.35}
.list.num1{counter-reset:n}.list.num1 li{counter-increment:n}
.list.num1 li::before{content:counter(n);border:0;width:auto;height:auto;margin-top:0;font-family:var(--mono);font-size:30px;color:var(--mark);padding-top:8px;min-width:44px}
.cols{display:grid;gap:40px;margin-top:44px}
.cols.c3{grid-template-columns:repeat(3,1fr)}.cols.c2{grid-template-columns:1fr 1fr}.cols.c4{grid-template-columns:repeat(4,1fr);gap:28px}
.card{border-top:4px solid var(--mark);padding-top:22px}
.card h3{font-family:var(--display);font-weight:800;font-size:44px;margin:0 0 12px;letter-spacing:-.01em}
.card p{font-size:28px;line-height:1.4;margin:0;color:var(--fg)}
.card.dim{border-top-color:var(--rule)}.card.dim h3{color:var(--muted)}
svg{display:block;width:100%;height:auto}
svg text{font-family:var(--display);font-weight:700;fill:var(--fg)}
svg .mono{font-family:var(--mono);font-weight:500;fill:var(--muted)}
.node{fill:var(--surface);stroke:var(--rule);stroke-width:2}.node.hot{stroke:var(--mark);stroke-width:3}
.edge{stroke:var(--muted);stroke-width:3;fill:none}.edge.hot{stroke:var(--mark)}
.fillhot{fill:var(--mark)}
.dimtxt{fill:var(--muted)!important}
.tag{position:absolute;left:96px;bottom:34px;font-family:var(--mono);font-size:16px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.back{position:fixed;top:12px;left:16px;z-index:10;font-family:var(--mono);font-size:13px;letter-spacing:.06em;color:var(--muted);text-decoration:none;padding:6px 8px;border-radius:2px;background:color-mix(in srgb,var(--bg) 80%,transparent)}
.back:hover{color:var(--mark)}
.count{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:12px;z-index:10;font-family:var(--mono);font-size:13px;letter-spacing:.1em;color:var(--muted);font-variant-numeric:tabular-nums;background:color-mix(in srgb,var(--bg) 80%,transparent);padding:4px 8px}
.bar{position:fixed;left:0;right:0;top:0;height:4px;background:var(--rule);z-index:11}
.bar i{display:block;height:100%;width:0;background:var(--mark);transition:width .3s ease}
.nav{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:10;display:flex;gap:8px}
.nav button{font-family:var(--mono);font-size:13px;color:var(--muted);background:transparent;border:1px solid var(--rule);padding:4px 12px;cursor:pointer;border-radius:2px}
.nav button:hover{color:var(--mark);border-color:var(--mark)}
@media (max-width:700px){.nav{display:none}}
'''

JS=r'''
(function(){
var slides=[].slice.call(document.querySelectorAll('.slide')),n=slides.length,cur=0;
var stage=document.getElementById('stage'),cnt=document.getElementById('count'),bar=document.getElementById('bar');
function fit(){var s=Math.min(innerWidth/1280,innerHeight/720);stage.style.transform='scale('+s+')';stage.style.margin=(-(720-720*s)/2)+'px '+(-(1280-1280*s)/2)+'px'}
function pad(x){return (x<10?'0':'')+x}
function show(i,upd){cur=Math.max(0,Math.min(n-1,i));
 slides.forEach(function(s,k){var a=k===cur;s.classList.toggle('active',a);s.setAttribute('aria-hidden',a?'false':'true')});
 cnt.textContent=pad(cur+1)+' / '+pad(n);bar.style.width=((cur+1)/n*100)+'%';
 if(upd!==false){try{history.replaceState(null,'','#s'+(cur+1))}catch(e){location.hash='s'+(cur+1)}}}
function fromHash(){var m=/^#s(\d+)$/.exec(location.hash);return m?parseInt(m[1],10)-1:0}
function next(){show(cur+1)}function prev(){show(cur-1)}
addEventListener('resize',fit);addEventListener('hashchange',function(){show(fromHash(),false)});
addEventListener('keydown',function(e){if(e.metaKey||e.ctrlKey||e.altKey)return;var k=e.key;
 if(k==='ArrowRight'||k===' '||k==='PageDown'||k==='ArrowDown'){e.preventDefault();next()}
 else if(k==='ArrowLeft'||k==='PageUp'||k==='ArrowUp'){e.preventDefault();prev()}
 else if(k==='Home'){e.preventDefault();show(0)}else if(k==='End'){e.preventDefault();show(n-1)}});
var vp=document.getElementById('viewport'),tx=0,ty=0,moved=false;
vp.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;ty=e.touches[0].clientY;moved=false},{passive:true});
vp.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
 if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){moved=true;dx<0?next():prev()}});
vp.addEventListener('click',function(e){if(moved){moved=false;return}if(e.target.closest('a,button'))return;
 e.clientX<innerWidth/2?prev():next()});
document.getElementById('prev').addEventListener('click',function(e){e.stopPropagation();prev()});
document.getElementById('next').addEventListener('click',function(e){e.stopPropagation();next()});
fit();show(fromHash(),false);
})();
'''

def page(title,desc,slides):
    body="\n".join('<section class="slide" aria-label="Slide %d">%s</section>'%(i+1,s) for i,s in enumerate(slides))
    return f'''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title} · Tarun Bulchandani</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>{CSS}</style>
</head>
<body>
<a class="back" href="../">← Speaker page</a>
<div class="bar"><i id="bar"></i></div>
<div class="viewport" id="viewport"><div class="stage" id="stage">
{body}
</div></div>
<div class="nav"><button id="prev" aria-label="Previous slide">Prev</button><button id="next" aria-label="Next slide">Next</button></div>
<div class="count" id="count" aria-live="polite">01 / {len(slides):02d}</div>
<script>{JS}</script>
</body>
</html>
'''

def title(t,kicker):
    return f'<p class="kicker">{kicker}</p><div class="rule"></div><h1>{t}</h1><p class="sub">Tarun Bulchandani · Arithim</p>'
def lis(items,cls="list"):
    out=[]
    for it in items:
        if isinstance(it,tuple): out.append(f'<li><span>{it[0]}<small>{it[1]}</small></span></li>')
        else: out.append(f'<li><span>{it}</span></li>')
    return f'<ul class="{cls}">'+"".join(out)+'</ul>'
def cards(items,c="c3"):
    return f'<div class="cols {c}">'+"".join(f'<div class="card"><h3>{a}</h3><p>{b}</p></div>' for a,b in items)+'</div>'

# ---------- Deck 1
life=('''<svg viewBox="0 0 1088 330" role="img" aria-label="Agent lifecycle: requisition, job description, named owner, supervised start, earned autonomy, retirement. A model upgrade loops back to a re-hire check.">
<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
<marker id="arh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--mark)"/></marker></defs>'''
+"".join(f'<rect class="node{" hot" if i in (1,2,4) else ""}" x="{x}" y="150" width="152" height="120" rx="4"/><text class="mono" x="{x+14}" y="182" font-size="18">0{i+1}</text><text x="{x+14}" y="226" font-size="22">{a}</text><text x="{x+14}" y="254" font-size="22">{b}</text>'
  for i,(x,a,b) in enumerate([(0,"Requi-","sition"),(187,"Job","description"),(374,"Named","owner"),(561,"Super-","vised start"),(748,"Earned","autonomy"),(935,"Retire-","ment")]))
+"".join(f'<path class="edge" d="M{x+152} 210 H{x+187}" marker-end="url(#ar)"/>' for x in (0,187,374,561,748))
+'''<path class="edge hot" stroke-dasharray="8 8" d="M824 150 V60 H263 V146" marker-end="url(#arh)"/>
<rect x="400" y="30" width="350" height="60" rx="4" fill="var(--bg)"/>
<text x="575" y="68" font-size="26" text-anchor="middle" class="fillhot" style="fill:var(--mark)">Model upgrade = re-hire</text>
</svg>''')

d1=[
 title("Hiring the <mark>Machine Workforce</mark>","Talk"),
 '<p class="kicker">The hook</p><h2 class="huge">Would you give a new hire production access on day one?</h2>'+lis(["No job description","No manager","No probation period"]),
 '<p class="kicker">The gap</p><h2>We do it with AI agents all the time.</h2><p class="lede">Agents go live with none of the three. Then someone asks who is responsible for them.</p>',
 '<p class="kicker">The idea</p><h2 style="font-size:56px">Onboard agents the way you onboard people.</h2><p class="lede" style="margin-top:16px;font-size:30px">Requisition to retirement.</p><div style="margin-top:28px">'+life+'</div>',
 '<p class="kicker">Step 1</p><h2>Write a <mark>job description</mark>.</h2>'+lis([("What it does",""),("What it must never do","")],"list plain num1"),
 '<p class="kicker">Step 2</p><h2>Name an owner.</h2><p class="lede">A person, not a team.</p><div class="cols c2"><div class="card"><h3>Ask in the room</h3><p>Who owns the agent when the person who built it leaves?</p></div></div>',
 '<p class="kicker">Step 3</p><h2>Autonomy is <mark>earned</mark>.</h2>'+cards([("Day one","Supervised."),("Over time","More freedom as it shows a record.")],"c2"),
 '<p class="kicker">Step 4</p><h2 class="huge">A model upgrade is a <mark>re-hire</mark>.</h2><p class="lede">Same name, different employee. Re-check it.</p>',
 '<p class="kicker">Step 5</p><h2>Give it a retirement step.</h2><p class="lede">Old agents should not keep running quietly.</p>',
 '<p class="kicker">Why it matters</p><h2>This is the shape an auditor wants to see.</h2><p class="lede">If you cannot say who owns an agent and what it may do, you cannot evidence control. And you cannot govern agents you cannot list.</p>',
 '<p class="kicker">The checklist</p><h2>One page per agent.</h2>'+lis(["Job description, with a never list","Named human owner","Current autonomy level","Model upgrade triggers a re-check","Retirement step"]),
 '<p class="kicker">On Monday</p><h2>Start small.</h2>'+lis(["List every agent you run","Name an owner for each","Write each one a never list","Treat the next model upgrade as a re-hire"],"list num1")+'<p class="sub" style="margin-top:36px">Who owns yours?</p>',
]

# ---------- Deck 2
rows=''.join(f'<rect class="node" x="470" y="{y}" width="560" height="52" rx="4"/><text class="mono" x="490" y="{y+33}" font-size="20">user {u}</text><rect x="600" y="{y+10}" width="410" height="32" rx="3" fill="var(--mark)" opacity=".85"/><text x="614" y="{y+33}" font-size="19" style="fill:#11161a">the whole job advert</text>' for u,y in (("A",36),("B",104),("C",172),("D",240)))
dup=('''<svg viewBox="0 0 1088 330" role="img" aria-label="One job advert is copied in full into every user's row.">
<rect class="node hot" x="0" y="130" width="300" height="100" rx="4"/><text x="24" y="188" font-size="28">One job advert</text>
<path class="edge hot" d="M300 180 H440" marker-end="url(#arh)"/>
<defs><marker id="arh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--mark)"/></marker></defs>
<g>'''+rows+'''</g>
<text class="mono" x="470" y="326" font-size="20">...and so on, for every user</text></svg>''')

d2=[
 title("Don't <mark>Ship Slop</mark>","Talk"),
 '<p class="kicker">The hook</p><h2 class="huge">I reviewed the design.</h2><h2 class="huge" style="margin-top:12px"><mark>I did not review the code.</mark></h2>',
 '<p class="kicker">The product</p><h2>Find Me A Job.</h2><p class="lede">A product I built myself. An AI assistant wrote part of the code.</p>',
 '<p class="kicker">What it did</p><h2>It copied whole job adverts into every user\'s row.</h2><div style="margin-top:28px">'+dup+'</div>',
 '<p class="kicker">The problem with slop</p><h2 class="huge">Nothing broke.</h2>'+lis(["The page loaded","The tests passed"],"list"),
 '<p class="kicker">The fix</p><h2>I read the code. Then I fixed it.</h2><div class="nums"><div><div class="num">76<em>%</em></div><div class="cap">smaller table</div></div><div><div class="num">38<em>%</em></div><div class="cap">smaller database</div></div></div>',
 '<p class="kicker">Two reviews</p><h2>A design review is not a code review.</h2>'+cards([("Design review","I did it. It looked fine."),("Code review","I skipped it. The cost landed here.")],"c2"),
 '<p class="kicker">Where the cost lands</p><h2>AI makes writing code cheap.</h2><p class="lede">Reviewing it is still work, and that is where the cost shows up.</p>',
 '<p class="kicker">The review standard</p><h2>Before you merge AI-written code.</h2>'+lis(["Read the diff, not just the summary","Check what it stores, not only what it shows","Ask what happens when this is multiplied by every user"],"list num1"),
 '<p class="kicker">Over to you</p><h2 class="huge">What is your review rule for AI-written code?</h2>',
 '<p class="kicker">On Monday</p><h2>Adopt the standard.</h2>'+lis(["Put the three questions in your pull request template","Make someone read the diff before merge","Look at what the code stores"],"list num1"),
]

# ---------- Deck 3
gate=('''<svg viewBox="0 0 1088 300" role="img" aria-label="A pilot passes a gate of four questions before production.">
<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--mark)"/></marker></defs>
<rect class="node" x="0" y="100" width="200" height="100" rx="4"/><text x="28" y="160" font-size="34">Pilot</text>
<path class="edge hot" d="M200 150 H380" marker-end="url(#ar)"/>
<rect class="node hot" x="380" y="0" width="330" height="300" rx="4"/>
<text class="mono" x="404" y="40" font-size="19" style="fill:var(--mark)">THE AUDITOR ASKS</text>'''
+"".join(f'<text x="404" y="{y}" font-size="27">{t}</text>' for y,t in ((95,"Who owns it?"),(155,"What may it do?"),(215,"How is it logged?"),(275,"Who can switch it off?")))
+'''<path class="edge hot" d="M710 150 H888" marker-end="url(#ar)"/>
<rect class="node" x="888" y="100" width="200" height="100" rx="4"/><text x="906" y="160" font-size="27">Production</text></svg>''')

d3=[
 title("From <mark>Pilot to Production</mark> in Regulated Industries","Talk"),
 '<p class="kicker">The hook</p><h2 class="huge">Most enterprise AI pilots work.</h2>',
 '<p class="kicker">The catch</p><h2 class="huge">Few reach production in regulated firms.</h2>',
 '<p class="kicker">Why they stall</p><h2>The blockers are not the model.</h2>'+cards([("Ownership","Nobody is named."),("Evidence","Nothing an auditor can read."),("Control","No clear way to limit or stop it.")]),
 '<p class="kicker">Production readiness</p><h2>Four questions before go-live.</h2><div style="margin-top:32px">'+gate+'</div>',
 '<p class="kicker">Question 1</p><h2>Who owns the agent?</h2><p class="lede">A named person, not a team. Not whoever built it.</p>',
 '<p class="kicker">Question 2 and 3</p><h2>What may it do, and how is it logged?</h2>'+cards([("What it may do","Written down, including what it must never do."),("How it is logged","Actions recorded as evidence an auditor can ask for.")],"c2"),
 '<p class="kicker">Question 4</p><h2>Who can switch it off?</h2><p class="lede">Autonomy is earned. A model upgrade means a re-check. Old agents get retired.</p>',
 '<p class="kicker">Governance you may already have</p><h2>Owner. Decision record. Review.</h2><p class="lede">I built an architecture function from scratch at Sonnedix with a governance board and decision records, across 100+ applications. An AI management system such as ISO 42001 asks for the same structure.</p>',
 '<p class="kicker">ISO 42001, as artefacts</p><h2>What a team actually produces.</h2>'+lis(["AI inventory","Risk classification","Named owners","Approval gates","Evidence capture and review cadence"]),
 '<p class="kicker">The business case</p><h2>Four things I would trust.</h2>'+lis(["A measured baseline","A named owner for the number","A cost line that includes review and governance","A stop rule"],"list num1"),
 '<p class="kicker">On Monday</p><h2>Take one pilot through the gate.</h2>'+lis(["Pick your most advanced pilot","Answer the four auditor questions in writing","Write its stop rule"],"list num1")+'<p class="sub" style="margin-top:32px">What is the stop rule on your largest AI project?</p>',
]

for f,t,d,s in [("hiring-the-machine-workforce","Hiring the Machine Workforce","An HR-style lifecycle for AI agents, from requisition to retirement.",d1),
 ("dont-ship-slop","Don't Ship Slop","What an AI assistant did to a database, and the review standard that would have caught it.",d2),
 ("pilot-to-production","From Pilot to Production in Regulated Industries","What production readiness means when an auditor will ask for evidence.",d3)]:
    open(BASE+f+".html","w").write(page(t,d,s)); print(f,len(s))
