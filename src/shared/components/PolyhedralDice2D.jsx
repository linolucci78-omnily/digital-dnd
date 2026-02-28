// ═══════════════════════════════════════════════
//  PolyhedralDice2D — Dadi poliedrici 2D animati
//  Canvas con sprite/SVG dei veri dadi D&D
//  d4, d6, d8, d10, d12, d20 - ognuno con forma diversa
// ═══════════════════════════════════════════════

import { useRef, useEffect, useState } from 'react';

// SVG paths per ogni dado poliedrico
const DICE_SVG = {
  d4: (color) => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-d4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.6" />
        </linearGradient>
      </defs>
      <polygon points="50,10 90,85 10,85" fill="url(#grad-d4)" stroke="${color}" stroke-width="2"/>
      <polygon points="50,15 85,82 15,82" fill="none" stroke="${color}" stroke-width="1" opacity="0.3"/>
    </svg>
  `,
  d6: (color) => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-d6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.6" />
        </linearGradient>
      </defs>
      <rect x="15" y="15" width="70" height="70" rx="8" fill="url(#grad-d6)" stroke="${color}" stroke-width="2"/>
      <rect x="20" y="20" width="60" height="60" rx="6" fill="none" stroke="${color}" stroke-width="1" opacity="0.3"/>
    </svg>
  `,
  d8: (color) => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-d8" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.6" />
        </linearGradient>
      </defs>
      <polygon points="50,8 92,40 92,70 50,92 8,70 8,40" fill="url(#grad-d8)" stroke="${color}" stroke-width="2"/>
      <line x1="50" y1="8" x2="50" y2="92" stroke="${color}" stroke-width="1" opacity="0.2"/>
      <line x1="8" y1="50" x2="92" y2="50" stroke="${color}" stroke-width="1" opacity="0.2"/>
    </svg>
  `,
  d10: (color) => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-d10" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.6" />
        </linearGradient>
      </defs>
      <polygon points="50,8 90,35 80,78 50,92 20,78 10,35" fill="url(#grad-d10)" stroke="${color}" stroke-width="2"/>
      <polygon points="50,15 83,38 74,74 50,86 26,74 17,38" fill="none" stroke="${color}" stroke-width="1" opacity="0.3"/>
    </svg>
  `,
  d12: (color) => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-d12" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.6" />
        </linearGradient>
      </defs>
      <polygon points="50,8 68,15 82,28 88,46 84,64 72,78 55,87 45,87 28,78 16,64 12,46 18,28 32,15" fill="url(#grad-d12)" stroke="${color}" stroke-width="2"/>
    </svg>
  `,
  d20: (color) => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-d20" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.6" />
        </linearGradient>
      </defs>
      <polygon points="50,5 94,30 94,70 50,95 6,70 6,30" fill="url(#grad-d20)" stroke="${color}" stroke-width="2"/>
      <polygon points="50,12 87,33 87,67 50,88 13,67 13,33" fill="none" stroke="${color}" stroke-width="1" opacity="0.3"/>
      <line x1="50" y1="5" x2="13" y2="33" stroke="${color}" stroke-width="1" opacity="0.15"/>
      <line x1="50" y1="5" x2="87" y2="33" stroke="${color}" stroke-width="1" opacity="0.15"/>
      <line x1="50" y1="12" x2="13" y2="33" stroke="${color}" stroke-width="1" opacity="0.15"/>
      <line x1="50" y1="12" x2="87" y2="33" stroke="${color}" stroke-width="1" opacity="0.15"/>
    </svg>
  `,
};

export default function PolyhedralDice2D({
  diceType = 'd20',
  diceColor = '#d4af37',
  result = null,
  isRolling = false,
  size = 200,
}) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef(null);
  const [diceImage, setDiceImage] = useState(null);

  // Carica SVG come immagine
  useEffect(() => {
    const svgString = DICE_SVG[diceType]?.(diceColor) || DICE_SVG.d20(diceColor);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      setDiceImage(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [diceType, diceColor]);

  // Animazione rotazione
  useEffect(() => {
    if (!isRolling || !canvasRef.current || !diceImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationRotation = 0;
    let speed = 30; // Velocità iniziale alta

    const animate = () => {
      // Pulisci canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Decelera gradualmente
      speed *= 0.95;

      // Ruota
      animationRotation += speed;

      // Disegna dado ruotato al centro
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((animationRotation * Math.PI) / 180);

      // Ombra
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;

      ctx.drawImage(
        diceImage,
        -size / 2,
        -size / 2,
        size,
        size
      );
      ctx.restore();

      // Continua se sta ancora girando veloce
      if (speed > 0.5) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setRotation(0); // Fermo
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRolling, diceImage, size]);

  // Disegna dado fermo
  useEffect(() => {
    if (isRolling || !canvasRef.current || !diceImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Disegna dado fermo al centro
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Ombra
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    ctx.drawImage(
      diceImage,
      -size / 2,
      -size / 2,
      size,
      size
    );
    ctx.restore();

    // Risultato sopra
    if (result !== null) {
      ctx.save();
      ctx.font = `bold ${size / 3}px var(--font-heading, sans-serif)`;
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(result, canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }
  }, [isRolling, rotation, result, diceImage, size]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={size * 1.5}
        height={size * 1.5}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          filter: `drop-shadow(0 0 20px ${diceColor}80)`,
        }}
      />

      {/* Etichetta tipo dado */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-heading)',
          fontSize: '1rem',
          fontWeight: '700',
          color: diceColor,
          textShadow: `0 0 10px ${diceColor}`,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        {diceType.toUpperCase()}
      </div>
    </div>
  );
}
