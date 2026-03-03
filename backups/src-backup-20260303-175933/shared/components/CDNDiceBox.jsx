// ═══════════════════════════════════════════════
//  CDNDiceBox — Dadi 3D per TV usando @3d-dice/dice-box via CDN
//  Basato sul magnifico componente di Claude Code
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';

const VER = "1.1.3";
const CDN = `https://unpkg.com/@3d-dice/dice-box@${VER}/dist`;

export default function CDNDiceBox({
  diceType = 'd20',
  result = 20,
  color = '#7777ff',
  onComplete = () => {}
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const boxRef = useRef(null);
  const initRef = useRef(false);
  const containerIdRef = useRef(`dice-cdn-${Math.random().toString(36).slice(2)}`);

  // Init quando il container è pronto
  const initDiceBox = async (container) => {
    if (!container || initRef.current || boxRef.current) return;
    initRef.current = true;

    try {
      console.log('🎲 Container pronto, caricamento DiceBox dal CDN...');

      const { default: DiceBox } = await import(
        /* @vite-ignore */ `${CDN}/dice-box.es.min.js`
      );

      console.log('✅ DiceBox caricato dal CDN');

      const box = new DiceBox({
        assetPath: "assets/",
        origin: `${CDN}/`,
        container: `#${containerIdRef.current}`,
        id: `${containerIdRef.current}-canvas`,
        gravity: 2,
        mass: 1,
        friction: 0.8,
        restitution: 0,
        angularDamping: 0.4,
        linearDamping: 0.4,
        spinForce: 6,
        throwForce: 6,
        startingHeight: 8,
        settleTimeout: 3000,
        delay: 10,
        lightIntensity: 1.5,
        enableShadows: true,
        shadowTransparency: 0.8,
        theme: "default",
        themeColor: color,
        scale: 12, // GRANDE per TV
        offscreen: true, // Performance migliore!
        onRollComplete: (results) => {
          console.log('🎲 Lancio completato:', results);
          setTimeout(() => {
            onComplete(result);
          }, 1500);
        },
      });

      console.log('🎲 Inizializzazione DiceBox...');
      await box.init();
      console.log('✅ DiceBox pronto!');

      boxRef.current = box;
      setReady(true);

      // Lancia automaticamente quando pronto
      setTimeout(() => {
        console.log('🎲 Lancio automatico:', `1${diceType}`);
        box.roll(`1${diceType}`);
      }, 300);

    } catch (e) {
      console.error('❌ Errore DiceBox CDN:', e);
      setError(e.message);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (boxRef.current) {
        console.log('🎲 Cleanup DiceBox');
        boxRef.current.clear();
      }
    };
  }, []);

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 20,
        color: '#ef4444',
        fontFamily: 'var(--font-body)',
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Errore caricamento dadi 3D</div>
        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{error}</div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 20,
        color: color,
        fontFamily: 'var(--font-heading)',
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '3px solid rgba(255,255,255,.08)',
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{ fontSize: '1rem', letterSpacing: '0.2em' }}>CARICAMENTO DADI 3D</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div
      id={containerIdRef.current}
      ref={(el) => {
        if (el && !initRef.current) {
          initDiceBox(el);
        }
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'transparent',
      }}
    />
  );
}
