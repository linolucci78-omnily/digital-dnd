import { useState, useEffect, useRef, useCallback } from "react";
import DiceBox from "@3d-dice/dice-box";

/*
 * D&D 3D Dice Roller — with Premium Theme Support
 * Uses @3d-dice/dice-box + @3d-dice/dice-themes
 * Professional 3D models, real physics, multiple skins
 */

const DICE_TYPES = [
  { id: "d4",  label: "D4",  color: "#d4384e" },
  { id: "d6",  label: "D6",  color: "#22aa55" },
  { id: "d8",  label: "D8",  color: "#3399ee" },
  { id: "d10", label: "D10", color: "#aa55ee" },
  { id: "d12", label: "D12", color: "#eeaa33" },
  { id: "d20", label: "D20", color: "#7777ff" },
];

const THEMES = [
  { id: "diceOfRolling", name: "Dice of Rolling", desc: "Premium smooth dice", icon: "✦" },
  { id: "default",       name: "Classic",         desc: "Sharp-edge standard",  icon: "◆" },
  { id: "smooth",        name: "Smooth",          desc: "Clean rounded dice",   icon: "●" },
  { id: "gemstone",      name: "Gemstone",        desc: "Translucent gems",     icon: "💎" },
  { id: "gemstoneMarble",name: "Marble",          desc: "Rainbow marble",       icon: "🔮" },
  { id: "blueGreenMetal",name: "Metal",           desc: "Weathered metal",      icon: "⚙" },
  { id: "rust",          name: "Rust",            desc: "Rusty metal",          icon: "🔥" },
  { id: "rock",          name: "Rock",            desc: "Stone texture",        icon: "🪨" },
  { id: "wooden",        name: "Wooden",          desc: "Wood grain",           icon: "🪵" },
];

export default function DnDDiceRoller() {
  const [sel, setSel] = useState("d20");
  const [qty, setQty] = useState(1);
  const [theme, setTheme] = useState("diceOfRolling");
  const [result, setResult] = useState(null);
  const [parts, setParts] = useState([]);
  const [crit, setCrit] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [showThemes, setShowThemes] = useState(false);
  const [themeColor, setThemeColor] = useState("#7777ff");
  const boxRef = useRef(null);
  const initRef = useRef(false);

  // Init
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const box = new DiceBox({
      assetPath: "/assets/dice-box/",
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
      theme: "diceOfRolling",
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
        } else setCrit(null);
        setTimeout(() => { setShowResult(true); setRolling(false); }, 100);
      },
    });

    box.init().then(() => {
      boxRef.current = box;
      setReady(true);
    }).catch((e) => {
      console.error(e);
      setError(e.message);
    });
  }, []);

  // Theme change
  const changeTheme = useCallback((newTheme) => {
    if (!boxRef.current) return;
    setTheme(newTheme);
    setShowThemes(false);
    setShowResult(false);
    boxRef.current.updateConfig({ theme: newTheme, themeColor });
  }, [themeColor]);

  // Die type change
  useEffect(() => {
    if (boxRef.current) {
      const t = DICE_TYPES.find((d) => d.id === sel);
      setThemeColor(t.color);
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
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); doRoll(); }
      if (e.code === "KeyT") setShowThemes((v) => !v);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [doRoll]);

  const cur = DICE_TYPES.find((d) => d.id === sel);
  const curTheme = THEMES.find((t) => t.id === theme);

  return (
    <div className="dice-root">
      {/* Dice 3D canvas */}
      <div id="dice-container" className="dice-container" onClick={() => { if (!showThemes) doRoll(); }} />

      {/* Vignette */}
      <div className="vig" />

      {/* Top info */}
      <div className="top-bar">
        <div className="die-title" style={{ color: cur.color, textShadow: `0 0 60px ${cur.color}44, 0 2px 10px rgba(0,0,0,1)` }}>
          {qty > 1 ? `${qty}${cur.label}` : cur.label}
        </div>
        <div className="die-hint">
          {!ready ? "Loading..." : rolling ? "Rolling..." : "Tap anywhere to roll · T for themes"}
        </div>
        {/* Theme badge */}
        <button className="theme-badge" onClick={(e) => { e.stopPropagation(); setShowThemes((v) => !v); }}>
          {curTheme?.icon} {curTheme?.name}
        </button>
      </div>

      {/* Loading */}
      {!ready && !error && (
        <div className="loading">
          <div className="spinner" />
          <div className="load-text">Loading 3D Dice Engine</div>
          <div className="load-sub">Professional models & physics</div>
        </div>
      )}
      {error && (
        <div className="loading">
          <div style={{ fontSize: 48 }}>⚠</div>
          <div className="load-text" style={{ color: "#ef4444" }}>Failed to load</div>
          <div className="load-sub">{error}</div>
        </div>
      )}

      {/* Result */}
      {showResult && result !== null && (
        <div className="res-wrap show">
          <div className={`res-num ${crit === "crit" ? "crit-num" : crit === "fumble" ? "fumble-num" : ""}`}
            style={{ textShadow: crit ? undefined : `0 0 60px ${cur.color}22, 0 4px 20px rgba(0,0,0,0.5)` }}>
            {result}
          </div>
          {parts.length > 1 && (
            <div className="res-bd">
              {parts.map((v, i) => (
                <span key={i}>
                  <span className="bd-val">{v}</span>
                  {i < parts.length - 1 && <span className="bd-plus">+</span>}
                </span>
              ))}
            </div>
          )}
          {crit === "crit" && <div className="crit-label">✦ NATURAL 20 ✦</div>}
          {crit === "fumble" && <div className="fumble-label">✧ NATURAL 1 ✧</div>}
        </div>
      )}

      {/* Theme selector panel */}
      {showThemes && (
        <div className="theme-overlay" onClick={() => setShowThemes(false)}>
          <div className="theme-panel" onClick={(e) => e.stopPropagation()}>
            <div className="theme-title">Dice Theme</div>
            <div className="theme-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-card ${theme === t.id ? "active" : ""}`}
                  onClick={() => changeTheme(t.id)}
                >
                  <span className="theme-icon">{t.icon}</span>
                  <span className="theme-name">{t.name}</span>
                  <span className="theme-desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Qty */}
      <div className="qty-row">
        <button className="qty-btn" style={{ opacity: qty <= 1 ? 0.2 : 1 }}
          onClick={(e) => { e.stopPropagation(); setQty((q) => Math.max(1, q - 1)); }}>−</button>
        <div className="qty-disp">
          <div className="qty-num">{qty}</div>
          <div className="qty-lbl">{qty === 1 ? "die" : "dice"}</div>
        </div>
        <button className="qty-btn" style={{ opacity: qty >= 10 ? 0.2 : 1 }}
          onClick={(e) => { e.stopPropagation(); setQty((q) => Math.min(10, q + 1)); }}>+</button>
      </div>

      {/* Dice selector */}
      <div className="sel-bar">
        {DICE_TYPES.map((d) => {
          const on = sel === d.id;
          return (
            <button key={d.id}
              className={`sel-btn ${on ? "on" : ""}`}
              style={{
                borderColor: on ? d.color : "rgba(255,255,255,.06)",
                background: on ? `${d.color}22` : "rgba(0,0,0,.6)",
                boxShadow: on ? `0 0 20px ${d.color}33` : "none",
              }}
              onClick={(e) => { e.stopPropagation(); setSel(d.id); setShowResult(false); }}
            >
              <span className="sel-label" style={{ color: on ? d.color : "#444" }}>{d.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
