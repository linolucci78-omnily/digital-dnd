// ═══════════════════════════════════════════════
//  EpicDiceRoll — Animazione EPICA per TV
//  Usa sprite HiResDicePack + CSS 3D
//  SEMPLICE ma SPETTACOLARE
// ═══════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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

export default function EpicDiceRoll({
  diceType = 'd20',
  result = 20,
  color = '#d4af37',
  onComplete = () => {}
}) {
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isRolling, setIsRolling] = useState(true);
  const sides = parseInt(diceType.slice(1)); // d20 -> 20
  const packColor = getPackColor(color);

  useEffect(() => {
    let frame = 1;
    let speed = 40; // ms tra frame
    let iterations = 0;

    const animate = () => {
      iterations++;

      // Cambia frame casuale (simula rotolamento)
      frame = Math.floor(Math.random() * sides) + 1;
      setCurrentFrame(frame);

      // Rallenta progressivamente
      speed += 8;

      // Stop dopo circa 1.5 secondi (quando speed > 150)
      if (speed > 150) {
        setCurrentFrame(result);
        setIsRolling(false);
        setTimeout(onComplete, 1500);
      } else {
        setTimeout(animate, speed);
      }
    };

    const timer = setTimeout(() => animate(), 100);
    return () => clearTimeout(timer);
  }, [result, sides, onComplete]);

  const imagePath = `/dice/HiResDicePack/${diceType.toUpperCase()}/${diceType}_${packColor}_${currentFrame}.png`;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Dado con effetti */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{
          scale: isRolling ? 1 : 1.15,
          opacity: 1,
          rotateZ: isRolling ? [0, -5, 5, -5, 5, 0] : 0,
        }}
        transition={{
          scale: { duration: 0.3, ease: 'easeOut' },
          opacity: { duration: 0.2 },
          rotateZ: {
            duration: 0.3,
            repeat: isRolling ? Infinity : 0,
            ease: 'easeInOut'
          },
        }}
        style={{
          width: 'min(25vw, 35vh)',
          height: 'min(25vw, 35vh)',
          position: 'relative',
          filter: isRolling
            ? 'drop-shadow(0 0 20px rgba(212, 175, 55, 0.5))'
            : `drop-shadow(0 0 40px ${color}) drop-shadow(0 0 60px ${color})`,
        }}
      >
        <img
          src={imagePath}
          alt={`${diceType} showing ${currentFrame}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          onError={(e) => {
            console.error('❌ Errore caricamento sprite:', imagePath);
            e.target.style.display = 'none';
          }}
        />
      </motion.div>

      {/* Glow pulsante quando si ferma */}
      {!isRolling && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: 'absolute',
            width: 'min(35vw, 45vh)',
            height: 'min(35vw, 45vh)',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Particelle esplosive quando si ferma */}
      {!isRolling && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                left: '50%',
                top: '50%',
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: (Math.cos(i * 30 * Math.PI / 180)) * 200,
                y: (Math.sin(i * 30 * Math.PI / 180)) * 200,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
