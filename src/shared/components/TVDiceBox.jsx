// ═══════════════════════════════════════════════
//  TVDiceBox — Dadi 3D Professionali per TV
//  Usa @3d-dice/dice-box + @3d-dice/dice-themes
//  Tema "diceOfRolling" - identico a D&D Beyond
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import DiceBox from '@3d-dice/dice-box';

export default function TVDiceBox({
  diceType = 'd20',
  result = 20,
  color = '#7777ff',
  onComplete = () => {}
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const boxRef = useRef(null);
  const initRef = useRef(false);
  const containerIdRef = useRef(`tv-dice-${Math.random().toString(36).slice(2)}`);

  // Init quando il container è pronto
  const initDiceBox = async (container) => {
    if (!container || initRef.current || boxRef.current) return;
    initRef.current = true;

    try {
      console.log('🎲 Inizializzazione DiceBox TV...');

      const box = new DiceBox({
        assetPath: '/assets/dice-box/',
        container: `#${containerIdRef.current}`,
        id: `${containerIdRef.current}-canvas`,
        gravity: 2,
        mass: 1,
        friction: 0.8,
        restitution: 0,
        angularDamping: 0.4,
        linearDamping: 0.4,
        spinForce: 5,
        throwForce: 5,
        startingHeight: 8,
        settleTimeout: 4000,
        delay: 10,
        lightIntensity: 1.3,
        enableShadows: true,
        shadowTransparency: 0.8,
        theme: 'diceOfRolling', // IL TEMA MIGLIORE - identico a D&D Beyond!
        themeColor: color,
        scale: 12, // GRANDE per TV
        offscreen: true, // Performance migliore
        onRollComplete: (results) => {
          console.log('🎲 Lancio completato:', results);
          setTimeout(() => {
            onComplete(result);
          }, 1500);
        },
      });

      console.log('🎲 Inizializzazione...');
      await box.init();
      console.log('✅ DiceBox TV pronto!');

      boxRef.current = box;
      setReady(true);

      // Lancia automaticamente
      setTimeout(() => {
        console.log('🎲 Lancio:', `1${diceType}`);
        box.roll(`1${diceType}`);
      }, 200);

    } catch (e) {
      console.error('❌ Errore DiceBox TV:', e);
      setError(e.message);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (boxRef.current) {
        console.log('🎲 Cleanup DiceBox TV');
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
        fontFamily: 'var(--font-heading)',
      }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.1em' }}>
          ERRORE DADI 3D
        </div>
        <div style={{ fontSize: '0.9rem', opacity: 0.7, maxWidth: '80%', textAlign: 'center' }}>
          {error}
        </div>
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
          width: 60,
          height: 60,
          border: '4px solid rgba(255,255,255,.08)',
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{
          fontSize: '1.2rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          Caricamento Dadi 3D
        </div>
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
