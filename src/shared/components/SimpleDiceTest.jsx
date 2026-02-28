// Test minimale di @3d-dice/dice-box
import { useEffect } from 'react';

export default function SimpleDiceTest() {
  useEffect(() => {
    console.log('🎲 SimpleDiceTest montato');

    const init = async () => {
      try {
        console.log('🎲 Provo a importare DiceBox...');

        // Import dinamico per vedere se funziona
        const DiceBoxModule = await import('@3d-dice/dice-box');
        const DiceBox = DiceBoxModule.default;

        console.log('🎲 DiceBox importato:', DiceBox);

        // NUOVA API v1.1.0+ - passa solo config object
        const box = new DiceBox({
          id: 'simple-dice-container',  // ID del container (senza #)
          assetPath: '/assets/dice-box/',
          theme: 'default',
          scale: 6,
        });

        console.log('🎲 DiceBox istanza creata, inizializzo...');

        await box.init();

        console.log('✅ SUCCESSO! DiceBox funziona!');

        // Lancia un dado di test
        setTimeout(() => {
          console.log('🎲 Lancio dado di test...');
          box.roll('1d20');
        }, 1000);

      } catch (e) {
        console.error('❌ ERRORE:', e);
        console.error('Stack:', e.stack);
      }
    };

    init();
  }, []);

  return (
    <div
      id="simple-dice-container"
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.9)',
      }}
    />
  );
}
