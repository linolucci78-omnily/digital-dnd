// ═══════════════════════════════════════════════
//  SpectacularDice — Animazione SPETTACOLARE con sprite veri
//  Usa HiResDicePack 1080x1080 + effetti WOW
//  Mostra il RISULTATO CORRETTO (non casuale!)
// ═══════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

const getPackColor = (hexColor) => {
  const colorMap = {
    '#d4af37': 'yellow',
    '#f0d060': 'yellow',
    '#c04040': 'red',
    '#60c0f0': 'blue',
    '#40c040': 'green',
    '#9b59b6': 'purple',
  };
  return colorMap[hexColor.toLowerCase()] || 'yellow';
};

export default function SpectacularDice({
  diceType = 'd20',
  result = 20,
  color = '#d4af37',
  onComplete = () => {}
}) {
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isRolling, setIsRolling] = useState(true);
  const sides = parseInt(diceType.slice(1));
  const packColor = getPackColor(color);

  useEffect(() => {
    let frame = 1;
    let speed = 25; // Velocissimo!
    let iterations = 0;

    const animate = () => {
      iterations++;

      // Frame casuale velocissimo
      frame = Math.floor(Math.random() * sides) + 1;
      setCurrentFrame(frame);

      // Rallenta progressivamente
      speed += 10;

      // Stop dopo 1.2 secondi
      if (speed > 180) {
        setCurrentFrame(result); // RISULTATO VERO!
        setIsRolling(false);
        setTimeout(onComplete, 2000);
      } else {
        setTimeout(animate, speed);
      }
    };

    const timer = setTimeout(animate, 50);
    return () => clearTimeout(timer);
  }, [result, sides, onComplete]);

  const imagePath = `/dice/HiResDicePack/${diceType.toUpperCase()}/${diceType}_${packColor}_${currentFrame}.png`;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      {/* Dado gigante */}
      <motion.div
        initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
        animate={{
          scale: isRolling ? [1, 1.05, 1] : 1.4,
          rotate: isRolling ? [0, 360] : 0,
          opacity: 1,
        }}
        transition={{
          scale: { duration: isRolling ? 0.15 : 0.6, ease: 'easeOut', repeat: isRolling ? Infinity : 0 },
          rotate: { duration: isRolling ? 0.4 : 0, ease: 'linear', repeat: isRolling ? Infinity : 0 },
          opacity: { duration: 0.2 },
        }}
        style={{
          width: 'min(40vw, 40vh)',
          height: 'min(40vw, 40vh)',
          position: 'relative',
          filter: isRolling
            ? `drop-shadow(0 0 40px ${color}99)`
            : `drop-shadow(0 0 100px ${color}) drop-shadow(0 0 200px ${color}66) brightness(1.2)`,
        }}
      >
        <img
          src={imagePath}
          alt={`${diceType} = ${currentFrame}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          onError={(e) => {
            console.error('❌ Sprite non trovato:', imagePath);
            e.target.style.display = 'none';
          }}
        />
      </motion.div>

      {/* Glow gigante quando si ferma */}
      {!isRolling && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.8, 0], scale: [1, 1.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            width: 'min(60vw, 60vh)',
            height: 'min(60vw, 60vh)',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}60 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Particelle esplosive finali */}
      {!isRolling && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24;
            const distance = 400;
            return (
              <motion.div
                key={i}
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  left: '50%',
                  top: '50%',
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((angle * Math.PI) / 180) * distance,
                  y: Math.sin((angle * Math.PI) / 180) * distance,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.015 }}
              />
            );
          })}
        </div>
      )}

      {/* Anello luminoso pulsante */}
      {!isRolling && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 'min(45vw, 45vh)',
            height: 'min(45vw, 45vh)',
            border: `4px solid ${color}`,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>,
    document.body
  );
}
