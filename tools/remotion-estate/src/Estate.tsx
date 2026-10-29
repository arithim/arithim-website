import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const W = 1280;
export const H = 720;
export const FPS = 30;
export const DURATION = 360;
const BEAT = 72;

const C = {
  bg: "#0C1424", ink: "#070C16", card: "#0F1828", card2: "#131D30", cream: "#F5F1E8", t2: "#AEB8C6", t4: "#8794A6",
  amber: "#E8A13C", amberL: "#F6CE8C", sage: "#7E9B87", sageL: "#A9C8B3", blue: "#3B6FD4", blueL: "#AEC2E0", rule: "#3A4557",
};

const fontCss = `
@font-face{font-family:'Hanken Grotesk';font-weight:100 900;src:url(${staticFile("hanken-grotesk-latin-fe1634.woff2")}) format('woff2');}
@font-face{font-family:'JetBrains Mono';font-weight:100 800;src:url(${staticFile("jetbrains-mono-latin-1cd702.woff2")}) format('woff2');}
`;
const SANS = "'Hanken Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const prog = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

// Fade envelope for a beat: local frame 0..BEAT
const env = (lf: number) => interpolate(lf, [0, 10, BEAT - 10, BEAT], [0, 1, 1, 0], clamp);

const Dotgrid: React.FC<{ f: number }> = ({ f }) => {
  const dots = [];
  for (let x = 0; x < 33; x++) for (let y = 0; y < 19; y++) {
    const d = Math.sin((x * 0.5 + f * 0.034907) + Math.cos(y * 0.6 - f * 0.017453)) * 0.5 + 0.5;
    dots.push(<circle key={`${x}-${y}`} cx={20 + x * 40} cy={20 + y * 40} r={1.2 + d * 0.9} fill={C.blueL} opacity={0.05 + d * 0.09} />);
  }
  return <svg width={W} height={H} style={{ position: "absolute" }}>{dots}</svg>;
};

const Ribbons: React.FC<{ f: number }> = ({ f }) => {
  const t = (f / DURATION) * Math.PI * 2; // exact loop
  const path = (o: number, a: number) => {
    let d = "";
    for (let x = 0; x <= W; x += 40) {
      const y = 560 + o + Math.sin(x / 210 + t + o) * a + Math.sin(x / 90 - t * 2) * (a * 0.25);
      d += `${x === 0 ? "M" : "L"}${x},${y.toFixed(1)} `;
    }
    return d;
  };
  return (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      <path d={path(0, 46)} stroke={C.amber} strokeWidth={2} fill="none" opacity={0.22} />
      <path d={path(26, 38)} stroke={C.blue} strokeWidth={2} fill="none" opacity={0.28} />
      <path d={path(54, 30)} stroke={C.sage} strokeWidth={1.5} fill="none" opacity={0.22} />
    </svg>
  );
};

const Label: React.FC<{ children: React.ReactNode; x: number; y: number; size?: number; color?: string; weight?: number; mono?: boolean; align?: "left" | "center" | "right"; opacity?: number; ls?: number }> =
  ({ children, x, y, size = 32, color = C.cream, weight = 600, mono, align = "left", opacity = 1, ls = 0 }) => (
    <div style={{ position: "absolute", left: x, top: y, width: 0, overflow: "visible", opacity }}>
      <div style={{ display: "inline-block", whiteSpace: "nowrap", fontFamily: mono ? MONO : SANS, fontSize: size, fontWeight: weight, color, letterSpacing: ls, lineHeight: 1.1,
        transform: align === "center" ? "translateX(-50%)" : align === "right" ? "translateX(-100%)" : undefined }}>{children}</div>
    </div>
  );

const Box: React.FC<{ x: number; y: number; w: number; h: number; fill?: string; stroke?: string; r?: number; opacity?: number; scale?: number; glow?: string; children?: React.ReactNode }> =
  ({ x, y, w, h, fill = C.card, stroke = C.rule, r = 16, opacity = 1, scale = 1, glow, children }) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: fill, border: `1.5px solid ${stroke}`, borderRadius: r, opacity,
      transform: `scale(${scale})`, boxShadow: glow ? `0 0 40px ${glow}` : "0 18px 40px rgba(0,0,0,.35)" }}>{children}</div>
  );

// ---------- Beat 1: feeds fill the portfolio ----------
const Feeds: React.FC<{ lf: number }> = ({ lf }) => {
  const feeds = [["Identity", C.blueL], ["Finance", C.amberL], ["Cards", C.sageL], ["Contracts", C.cream]] as const;
  const rows = 6;
  const total = Math.round(interpolate(lf, [14, 62], [0, 2.4], { ...clamp, easing: ease }) * 10) / 10;
  const dots: React.ReactNode[] = [];
  feeds.forEach(([, col], i) => {
    const y0 = 150 + i * 120;
    for (let k = 0; k < 6; k++) {
      const t = ((lf * 0.035 + k / 6 + i * 0.13) % 1);
      const x = 300 + t * 380;
      const ty = 360;
      const y = y0 + (ty - y0) * Math.pow(t, 1.6);
      const o = Math.sin(t * Math.PI) * 0.9 * prog(lf, 4 + i * 3, 16 + i * 3);
      dots.push(<circle key={`${i}-${k}`} cx={x} cy={y} r={5} fill={col} opacity={o} />);
    }
  });
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute" }}>{dots}</svg>
      {feeds.map(([n, col], i) => {
        const p = prog(lf, i * 3, 14 + i * 3);
        return (
          <Box key={n} x={70} y={118 + i * 120} w={230} h={66} r={33} opacity={p} scale={0.9 + 0.1 * p}>
            <div style={{ position: "absolute", left: 24, top: 25, width: 14, height: 14, borderRadius: 7, background: col }} />
            <Label x={54} y={17} size={32}>{n}</Label>
          </Box>
        );
      })}
      <Box x={730} y={96} w={490} h={528} r={22} fill={C.card2} opacity={prog(lf, 6, 20)}>
        {Array.from({ length: rows }).map((_, i) => {
          const p = prog(lf, 16 + i * 5, 30 + i * 5);
          const cols = [C.amber, C.blueL, C.sage, C.amberL, C.blue, C.sageL];
          return (
            <div key={i} style={{ position: "absolute", left: 28, top: 28 + i * 66, width: 434, height: 48, opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: 48, height: 48, borderRadius: 12, background: cols[i], opacity: 0.9 }} />
              <div style={{ position: "absolute", left: 66, top: 10, width: 120 + ((i * 37) % 70), height: 12, borderRadius: 6, background: C.cream, opacity: 0.8 }} />
              <div style={{ position: "absolute", left: 66, top: 30, width: 70 + ((i * 53) % 60), height: 9, borderRadius: 5, background: C.t4, opacity: 0.6 }} />
              <div style={{ position: "absolute", right: 0, top: 12, width: 60 + ((i * 29) % 40), height: 24, borderRadius: 12, border: `1.5px solid ${C.rule}` }} />
            </div>
          );
        })}
      </Box>
      <Label x={1220 - 28} y={520} size={36} align="right" color={C.t2} weight={500} opacity={prog(lf, 14, 26)}>Spend</Label>
      <Label x={1220 - 28} y={562} size={44} align="right" color={C.amberL} mono weight={700} opacity={prog(lf, 14, 26)}>${total.toFixed(1)}M</Label>
    </>
  );
};

// ---------- Beat 2: capability map + TIME ----------
const MapBeat: React.FC<{ lf: number }> = ({ lf }) => {
  const cols = 5, rows = 3, tw = 168, th = 118, gx = 18, gy = 18, x0 = (W - (cols * tw + (cols - 1) * gx)) / 2, y0 = 118;
  const time = [["T", C.sage], ["I", C.amber], ["M", C.blue], ["E", "#C96A5A"]] as const;
  const heat = [0.2, 0.55, 0.9, 0.4, 0.7, 0.85, 0.3, 0.6, 0.15, 0.5, 0.45, 0.8, 0.25, 0.65, 0.35];
  return (
    <>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const cx = i % cols, cy = Math.floor(i / cols);
        const p = prog(lf, cx * 2 + cy * 3, 14 + cx * 2 + cy * 3);
        const tp = prog(lf, 26 + (i % 7) * 3, 38 + (i % 7) * 3);
        const [letter, col] = time[(i * 3 + cy) % 4];
        return (
          <Box key={i} x={x0 + cx * (tw + gx)} y={y0 + cy * (th + gy)} w={tw} h={th} r={14} fill={C.card2} opacity={p} scale={0.92 + 0.08 * p}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: C.amber, opacity: heat[i] * 0.4 * prog(lf, 18, 34) }} />
            <div style={{ position: "absolute", left: 18, top: 20, width: 70, height: 10, borderRadius: 5, background: C.cream, opacity: 0.75 }} />
            <div style={{ position: "absolute", left: 18, top: 40, width: 46, height: 8, borderRadius: 4, background: C.t4, opacity: 0.6 }} />
            <div style={{ position: "absolute", right: 14, bottom: 14, width: 44, height: 44, borderRadius: 22, background: col, opacity: tp, transform: `scale(${0.5 + 0.5 * tp})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 30, color: C.ink }}>{letter}</div>
          </Box>
        );
      })}
      {time.map(([l, col], i) => {
        const names = ["Tolerate", "Invest", "Migrate", "Eliminate"];
        const wlist = [150, 120, 140, 160];
        const xs = [150, 360, 540, 740];
        const p = prog(lf, 40 + i * 3, 52 + i * 3);
        return (
          <React.Fragment key={l}>
            <div style={{ position: "absolute", left: xs[i], top: 574, width: 22, height: 22, borderRadius: 11, background: col, opacity: p }} />
            <Label x={xs[i] + 34} y={566} size={32} weight={500} color={C.cream} opacity={p}>{names[i]}</Label>
            <div style={{ display: "none" }}>{wlist[i]}</div>
          </React.Fragment>
        );
      })}
    </>
  );
};

// ---------- Beat 3: front door ----------
const Door: React.FC<{ lf: number }> = ({ lf }) => {
  const bub = prog(lf, 2, 16);
  const door = prog(lf, 18, 32);
  const tick = prog(lf, 30, 42);
  const routes = ["Access", "Purchase", "Review", "Project"];
  const pick = prog(lf, 44, 56);
  return (
    <>
      <Box x={70} y={150} w={360} h={150} r={28} fill={C.card2} opacity={bub} scale={0.9 + 0.1 * bub} stroke={C.blueL}>
        <Label x={32} y={30} size={32} weight={500} color={C.cream}>Need a tool</Label>
        <Label x={32} y={74} size={32} weight={500} color={C.cream}>for whiteboards?</Label>
      </Box>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <path d="M430 225 C 500 225, 480 360, 560 360" stroke={C.t4} strokeWidth={2.5} fill="none" strokeDasharray="8 8" strokeDashoffset={-lf * 1.2} opacity={door} />
        {routes.map((_, i) => (
          <path key={i} d={`M850 360 C 900 360, 880 ${186 + i * 116}, 930 ${186 + i * 116}`} stroke={i === 0 ? C.amber : C.rule} strokeWidth={i === 0 ? 3.5 : 2} fill="none" opacity={door} />
        ))}
      </svg>
      <Box x={560} y={250} w={290} h={220} r={24} fill={C.card} stroke={C.amber} opacity={door} scale={0.92 + 0.08 * door} glow="rgba(232,161,60,.25)">
        <Label x={145} y={34} size={30} align="center" color={C.t2} weight={500}>Front door</Label>
        <div style={{ position: "absolute", left: 105, top: 82, width: 80, height: 80, borderRadius: 40, background: C.sage, opacity: tick, transform: `scale(${0.6 + 0.4 * tick})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="46" height="46" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" stroke={C.ink} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" strokeDashoffset={24 * (1 - tick)} /></svg>
        </div>
        <Label x={145} y={174} size={30} align="center" opacity={tick}>You own this</Label>
      </Box>
      {routes.map((r, i) => {
        const on = i === 0;
        return (
          <Box key={r} x={930} y={150 + i * 116} w={280} h={72} r={36} fill={on ? C.amber : C.card2} stroke={on ? C.amberL : C.rule}
            opacity={door * (on ? 1 : 1 - 0.55 * pick)} scale={on ? 1 + 0.04 * pick : 1}>
            <Label x={140} y={19} size={34} align="center" weight={700} color={on ? C.ink : C.cream}>{r}</Label>
          </Box>
        );
      })}
    </>
  );
};

// ---------- Beat 4: renewal clock ----------
const Clock: React.FC<{ lf: number }> = ({ lf }) => {
  const stops = [120, 90, 60, 30];
  const x = (i: number) => 150 + i * 320;
  const run = interpolate(lf, [8, 50], [0, 3], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const lineW = run * 320;
  const stamp = prog(lf, 50, 62);
  return (
    <>
      <div style={{ position: "absolute", left: 150, top: 330, width: 960, height: 4, background: C.rule, borderRadius: 2 }} />
      <div style={{ position: "absolute", left: 150, top: 330, width: lineW, height: 4, background: C.amber, borderRadius: 2 }} />
      {stops.map((s, i) => {
        const reached = run >= i - 0.01;
        const p = prog(lf, i * 3, 12 + i * 3);
                return (
          <React.Fragment key={s}>
            <div style={{ position: "absolute", left: x(i) - 18, top: 316, width: 36, height: 36, borderRadius: 18, background: reached ? C.amber : C.card2, border: `3px solid ${reached ? C.amberL : C.rule}`, opacity: p }} />
            <Label x={x(i)} y={196} size={84} align="center" mono weight={700} color={reached ? C.cream : C.t4} opacity={p * (reached ? 1 : 0.7)}>{s}</Label>
          </React.Fragment>
        );
      })}
      <Label x={W / 2} y={120} size={32} align="center" color={C.t2} weight={500} opacity={prog(lf, 0, 10)}>Days to renewal notice</Label>
      <Box x={W / 2 - 250} y={462} w={500} h={104} r={52} fill={C.amber} stroke={C.amberL} opacity={stamp} scale={0.85 + 0.15 * stamp} glow="rgba(232,161,60,.35)">
        <Label x={250} y={30} size={42} align="center" weight={800} color={C.ink}>Decision made</Label>
      </Box>
    </>
  );
};

// ---------- Beat 5: saving signed -> ledger ----------
const Prove: React.FC<{ lf: number }> = ({ lf }) => {
  const card = prog(lf, 0, 14);
  const sign = prog(lf, 16, 30);
  const fly = prog(lf, 32, 50);
  const val = Math.round(interpolate(lf, [40, 62], [0, 412], { ...clamp, easing: ease }));
  const fx = 430 + fly * 210, fy = 260 + fly * 140;
  return (
    <>
      <Box x={80} y={130} w={340} h={260} r={24} fill={C.card2} opacity={card * (1 - fly * 0.0)} scale={0.92 + 0.08 * card}>
        <Label x={32} y={30} size={32} weight={500} color={C.t2}>Saving</Label>
        <Label x={32} y={84} size={64} mono weight={700} color={C.amberL}>$412k</Label>
        <div style={{ position: "absolute", left: 32, top: 176, width: 276, height: 4, background: C.rule }} />
        <div style={{ position: "absolute", left: 32, top: 176, width: 276 * sign, height: 4, background: C.sage }} />
        <div style={{ position: "absolute", left: 32, top: 196, width: 40, height: 40, borderRadius: 20, background: C.sage, opacity: sign, transform: `scale(${0.5 + 0.5 * sign})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" stroke={C.ink} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <Label x={86} y={200} size={32} weight={600} color={C.sageL} opacity={sign}>Signed once</Label>
      </Box>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <path d="M420 260 C 520 260, 560 380, 640 400" stroke={C.t4} strokeWidth={2.5} fill="none" strokeDasharray="8 8" strokeDashoffset={-lf * 1.2} opacity={sign} />
      </svg>
      <div style={{ position: "absolute", left: fx - 15, top: fy - 15 + 0, width: 30, height: 30, borderRadius: 15, background: C.amber, opacity: sign * (fly < 0.98 ? 1 : 0), boxShadow: `0 0 24px ${C.amber}` }} />
      <Box x={640} y={150} w={560} h={430} r={24} fill={C.card} opacity={prog(lf, 8, 22)}>
        <Label x={32} y={30} size={32} weight={500} color={C.t2}>Benefit line</Label>
        {[0.55, 0.8, 0.4].map((w, i) => (
          <div key={i} style={{ position: "absolute", left: 32, top: 100 + i * 60, width: 496 * w, height: 22, borderRadius: 11, background: [C.blue, C.sage, C.blueL][i], opacity: 0.55 }} />
        ))}
        <div style={{ position: "absolute", left: 32, top: 290, width: 496 * 0.9 * prog(lf, 44, 62), height: 22, borderRadius: 11, background: C.amber }} />
        <div style={{ position: "absolute", left: 32, top: 346, width: 496, height: 2, background: C.rule }} />
        <Label x={32} y={366} size={32} weight={500} color={C.t2}>Realised</Label>
        <Label x={528} y={356} size={52} align="right" mono weight={700} color={C.amberL}>${val}k</Label>
      </Box>
    </>
  );
};

const Footer: React.FC<{ f: number }> = ({ f }) => {
  const names = ["Discover", "Map", "Request", "Renew", "Prove"];
  const cur = Math.min(4, Math.floor(f / BEAT));
  return (
    <>
      <div style={{ position: "absolute", left: 70, top: 36, display: "flex", alignItems: "center", gap: 14, fontFamily: SANS }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, background: C.amber }} />
        <div style={{ fontSize: 30, fontWeight: 700, color: C.cream, letterSpacing: 0.5 }}>Arithim Estate</div>
      </div>
      <div style={{ position: "absolute", right: 70, top: 38, fontFamily: SANS, fontSize: 30, fontWeight: 600, color: C.amberL }}>{names[cur]}</div>
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 36, display: "flex", gap: 10 }}>
        {names.map((n, i) => (
          <div key={n} style={{ flex: 1, height: 5, borderRadius: 3, background: C.rule, overflow: "hidden" }}>
            <div style={{ width: `${(i < cur ? 1 : i === cur ? ((f % BEAT) / BEAT) : 0) * 100}%`, height: "100%", background: C.amber }} />
          </div>
        ))}
      </div>
    </>
  );
};

export const Estate: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  void spring; void fps;
  const beats = [Feeds, MapBeat, Door, Clock, Prove];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1000px 600px at 70% 30%, #14203A 0%, ${C.bg} 60%, ${C.ink} 100%)` }}>
      <style>{fontCss}</style>
      <Dotgrid f={f} />
      <Ribbons f={f} />
      {beats.map((B, i) => {
        const lf = f - i * BEAT;
        if (lf < 0 || lf >= BEAT) return null;
        return <AbsoluteFill key={i} style={{ opacity: env(lf) }}><B lf={lf} /></AbsoluteFill>;
      })}
      <Footer f={f} />
    </AbsoluteFill>
  );
};
