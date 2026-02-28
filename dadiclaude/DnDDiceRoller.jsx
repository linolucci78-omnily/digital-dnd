import { useState, useEffect, useRef, useCallback } from "react";

/*
 * D&D 3D Dice Roller — React Component
 * Uses @3d-dice/dice-box (MIT) via CDN for professional 3D dice
 * 
 * USAGE in your Vite app:
 *   import DnDDiceRoller from './DnDDiceRoller'
 *   <DnDDiceRoller />
 * 
 * No npm install needed — loads from CDN.
 * Or install locally: npm i @3d-dice/dice-box
 * then copy assets and change import path.
 */

const VER = "1.1.3";
const CDN = `https://unpkg.com/@3d-dice/dice-box@${VER}/dist`;

const TYPES = [
  { id: "d4",  label: "D4",  color: "#d4384e", body: "#6b1520" },
  { id: "d6",  label: "D6",  color: "#22aa55", body: "#0d3b20" },
  { id: "d8",  label: "D8",  color: "#3399ee", body: "#0d2844" },
  { id: "d10", label: "D10", color: "#aa55ee", body: "#3a0d44" },
  { id: "d12", label: "D12", color: "#eeaa33", body: "#44300d" },
  { id: "d20", label: "D20", color: "#7777ff", body: "#12121e" },
];

export default function DnDDiceRoller() {
  const [sel, setSel] = useState("d20");
  const [qty, setQty] = useState(1);
  const [result, setResult] = useState(null);
  const [parts, setParts] = useState([]);
  const [crit, setCrit] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const boxRef = useRef(null);
  const initRef = useRef(false);

  // Init dice-box
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        const { default: DiceBox } = await import(
          /* @vite-ignore */ `${CDN}/dice-box.es.min.js`
        );
        const box = new DiceBox({
          assetPath: "assets/",
          origin: `${CDN}/`,
          container: "#dice-container",
          id: "dice-canvas",
          gravity: 2,
          mass: 1,
          friction: 0.8,
          restitution: 0,
          angularDamping: 0.4,
          linearDamping: 0.4,
          spinForce: 5,
          throwForce: 5,
          startingHeight: 8,
          settleTimeout: 5000,
          delay: 10,
          lightIntensity: 1.3,
          enableShadows: true,
          shadowTransparency: 0.8,
          theme: "default",
          themeColor: "#7777ff",
          scale: 9,
          offscreen: true,
          onRollComplete: (results) => {
            const vals = results.map((r) => r.value);
            const total = vals.reduce((a, b) => a + b, 0);
            setParts(vals);
            setResult(total);
            if (vals.length === 1 && results[0].sides === 20) {
              setCrit(total === 20 ? "crit" : total === 1 ? "fumble" : null);
            } else {
              setCrit(null);
            }
            setTimeout(() => {
              setShowResult(true);
              setRolling(false);
            }, 100);
          },
        });
        await box.init();
        boxRef.current = box;
        setReady(true);
      } catch (e) {
        console.error("Dice init error:", e);
        setError(e.message);
      }
    })();
  }, []);

  // Update theme color when die changes
  useEffect(() => {
    if (boxRef.current) {
      const t = TYPES.find((d) => d.id === sel);
      boxRef.current.updateConfig({ themeColor: t.color });
    }
  }, [sel]);

  // Roll
  const doRoll = useCallback(() => {
    if (rolling || !boxRef.current) return;
    setRolling(true);
    setShowResult(false);
    setResult(null);
    setCrit(null);
    setParts([]);
    boxRef.current.roll(`${qty}${sel}`);
  }, [sel, qty, rolling]);

  // Keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        doRoll();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [doRoll]);

  const cur = TYPES.find((d) => d.id === sel);

  return (
    <div style={S.root}>
      <link
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap"
        rel="stylesheet"
      />

      {/* Dice 3D container — MUST be position:relative with explicit size */}
      <div id="dice-container" style={S.container} onClick={doRoll} />

      {/* Vignette */}
      <div style={S.vig} />

      {/* Title */}
      <div style={S.top}>
        <div
          style={{
            ...S.title,
            color: cur.color,
            textShadow: `0 0 60px ${cur.color}44, 0 2px 10px rgba(0,0,0,1)`,
          }}
        >
          {qty > 1 ? `${qty}${cur.label}` : cur.label}
        </div>
        <div style={S.hint}>
          {!ready ? "Loading dice engine..." : rolling ? "Rolling..." : "Tap anywhere to roll"}
        </div>
      </div>

      {/* Loading */}
      {!ready && !error && (
        <div style={S.loading}>
          <div style={S.spinner} />
          <div style={S.loadText}>Loading 3D Dice Engine</div>
          <div style={S.loadSub}>Professional models & physics</div>
        </div>
      )}
      {error && (
        <div style={S.loading}>
          <div style={{ fontSize: 48 }}>⚠</div>
          <div style={{ ...S.loadText, color: "#ef4444" }}>Failed to load</div>
          <div style={S.loadSub}>{error}</div>
        </div>
      )}

      {/* Result */}
      {showResult && result !== null && (
        <div style={{ ...S.resWrap, animation: "popIn .5s cubic-bezier(.16,1,.3,1) forwards" }}>
          <div
            style={{
              ...S.resNum,
              color: crit === "crit" ? "#ffd700" : crit === "fumble" ? "#ef4444" : "#eee",
              textShadow:
                crit === "crit"
                  ? "0 0 80px #ffd70088, 0 0 160px #ffd70033"
                  : crit === "fumble"
                  ? "0 0 80px #ef444488"
                  : "0 0 40px rgba(255,255,255,.2), 0 4px 20px rgba(0,0,0,.5)",
              animation: crit === "crit" ? "gP 1s ease-in-out infinite" : crit === "fumble" ? "fS .35s ease-in-out infinite" : "none",
            }}
          >
            {result}
          </div>
          {parts.length > 1 && (
            <div style={S.breakdown}>
              {parts.map((v, i) => (
                <span key={i}>
                  <span style={{ color: "rgba(255,255,255,.5)" }}>{v}</span>
                  {i < parts.length - 1 && <span style={{ color: "rgba(255,255,255,.15)", margin: "0 6px" }}>+</span>}
                </span>
              ))}
            </div>
          )}
          {crit === "crit" && <div style={S.critLabel}>✦ NATURAL 20 ✦</div>}
          {crit === "fumble" && <div style={S.fumbleLabel}>✧ NATURAL 1 ✧</div>}
        </div>
      )}

      {/* Qty */}
      <div style={S.qtyRow}>
        <button style={{ ...S.qtyBtn, opacity: qty <= 1 ? 0.2 : 1 }} onClick={(e) => { e.stopPropagation(); setQty((q) => Math.max(1, q - 1)); }}>−</button>
        <div style={S.qtyDisp}>
          <div style={S.qtyNum}>{qty}</div>
          <div style={S.qtyLabel}>{qty === 1 ? "die" : "dice"}</div>
        </div>
        <button style={{ ...S.qtyBtn, opacity: qty >= 10 ? 0.2 : 1 }} onClick={(e) => { e.stopPropagation(); setQty((q) => Math.min(10, q + 1)); }}>+</button>
      </div>

      {/* Selector */}
      <div style={S.selBar}>
        {TYPES.map((d) => {
          const on = sel === d.id;
          return (
            <button
              key={d.id}
              style={{
                ...S.selBtn,
                borderColor: on ? d.color : "rgba(255,255,255,.06)",
                background: on ? d.body + "66" : "rgba(0,0,0,.6)",
                boxShadow: on ? `0 0 20px ${d.color}33` : "none",
                transform: on ? "scale(1.12) translateY(-3px)" : "scale(1)",
              }}
              onClick={(e) => { e.stopPropagation(); setSel(d.id); setShowResult(false); }}
            >
              <span style={{ ...S.selLabel, color: on ? d.color : "#444" }}>{d.label}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes popIn{0%{opacity:0;transform:scale(.3) translateY(40px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes gP{0%,100%{transform:scale(1)}50%{transform:scale(1.05);filter:brightness(1.25)}}
        @keyframes fS{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        #dice-container canvas{width:100%!important;height:100%!important;position:absolute!important;top:0!important;left:0!important}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        button:hover{filter:brightness(1.2)}
      `}</style>
    </div>
  );
}

const S = {
  root: { position: "fixed", inset: 0, background: "#050508", fontFamily: "'Cinzel',serif", overflow: "hidden", userSelect: "none" },
  container: { position: "relative", width: "100vw", height: "100vh", background: "#050508", cursor: "pointer", zIndex: 1 },
  vig: { position: "fixed", inset: 0, zIndex: 3, pointerEvents: "none", background: "radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.75) 100%)" },
  top: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 10, textAlign: "center", padding: "clamp(16px,3.5vh,44px) 20px", pointerEvents: "none" },
  title: { fontSize: "clamp(32px,6vw,72px)", fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", transition: "all .4s" },
  hint: { fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: "clamp(12px,1.6vw,18px)", color: "rgba(255,255,255,.2)", marginTop: 4, letterSpacing: ".06em", fontWeight: 300 },
  loading: { position: "fixed", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, background: "rgba(5,5,8,.95)" },
  spinner: { width: 48, height: 48, border: "3px solid rgba(255,255,255,.08)", borderTopColor: "#7c5cbf", borderRadius: "50%", animation: "spin 1s linear infinite" },
  loadText: { fontSize: 18, color: "rgba(255,255,255,.5)", fontWeight: 700, letterSpacing: ".1em" },
  loadSub: { fontFamily: "'Cormorant Garamond',serif", fontSize: 14, color: "rgba(255,255,255,.2)", fontStyle: "italic" },
  resWrap: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 8, textAlign: "center", pointerEvents: "none" },
  resNum: { fontSize: "clamp(80px,20vw,240px)", fontWeight: 900, lineHeight: 1, letterSpacing: "-.02em" },
  breakdown: { marginTop: 8, fontSize: "clamp(15px,2.2vw,26px)", fontFamily: "'Cormorant Garamond',serif" },
  critLabel: { marginTop: 14, fontSize: "clamp(16px,3vw,38px)", color: "#ffd700", letterSpacing: ".3em", textShadow: "0 0 40px #ffd70066", animation: "gP 1.5s ease-in-out infinite" },
  fumbleLabel: { marginTop: 14, fontSize: "clamp(16px,3vw,38px)", color: "#ef4444", letterSpacing: ".3em", textShadow: "0 0 40px #ef444466" },
  qtyRow: { position: "fixed", bottom: "clamp(80px,14vh,125px)", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 16, zIndex: 10 },
  qtyBtn: { width: 42, height: 42, borderRadius: "50%", border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 20, fontFamily: "'Cinzel',serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)", transition: "all .2s", lineHeight: 1, padding: 0 },
  qtyDisp: { textAlign: "center", minWidth: 44 },
  qtyNum: { fontSize: "clamp(22px,3vw,34px)", color: "rgba(255,255,255,.85)", fontWeight: 900, lineHeight: 1 },
  qtyLabel: { fontSize: 11, color: "rgba(255,255,255,.18)", fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", letterSpacing: ".15em", marginTop: 2 },
  selBar: { position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, display: "flex", justifyContent: "center", gap: "clamp(6px,1.5vw,14px)", padding: "clamp(14px,3vh,30px) clamp(10px,3vw,36px)", background: "linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.3) 60%,transparent 100%)" },
  selBtn: { display: "flex", flexDirection: "column", alignItems: "center", padding: "clamp(10px,1.5vh,16px) clamp(14px,2.5vw,28px)", borderRadius: 12, border: "2px solid", cursor: "pointer", transition: "all .35s cubic-bezier(.16,1,.3,1)", backdropFilter: "blur(12px)", minWidth: "clamp(50px,10vw,80px)", outline: "none" },
  selLabel: { fontSize: "clamp(13px,2vw,18px)", fontWeight: 700, letterSpacing: ".12em", fontFamily: "'Cinzel',serif", transition: "color .3s" },
};
