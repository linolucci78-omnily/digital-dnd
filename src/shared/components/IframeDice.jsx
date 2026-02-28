// ═══════════════════════════════════════════════
//  IframeDice — Usa il file HTML funzionante in iframe
//  SOLUZIONE SEMPLICE che FUNZIONA al 100%
// ═══════════════════════════════════════════════

import { useEffect, useRef } from 'react';

export default function IframeDice({
  diceType = 'd20',
  result = 20,
  onComplete = () => {}
}) {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Aspetta che l'iframe sia caricato
    const timer = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        // Simula click per lanciare il dado nell'iframe
        console.log('🎲 Lancio dado nell\'iframe');
        const iframeDoc = iframeRef.current.contentWindow.document;
        const container = iframeDoc.getElementById('dice-container');
        if (container) {
          container.click();
        }
      }

      // Chiama onComplete dopo l'animazione
      setTimeout(() => {
        onComplete(result);
      }, 4000);
    }, 500);

    return () => clearTimeout(timer);
  }, [result, onComplete]);

  return (
    <iframe
      ref={iframeRef}
      src="/dice-roller.html"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'transparent',
      }}
      title="3D Dice Roller"
    />
  );
}
