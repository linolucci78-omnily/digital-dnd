// ═══════════════════════════════════════════════
//  WorkingDice3D — Dadi 3D con React Three Fiber
//  Versione SEMPLICE che FUNZIONA
// ═══════════════════════════════════════════════

import { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

// Geometrie per ogni tipo di dado
const DICE_GEOMETRIES = {
  d4: () => new THREE.TetrahedronGeometry(1.5),
  d6: () => new THREE.BoxGeometry(1.5, 1.5, 1.5),
  d8: () => new THREE.OctahedronGeometry(1.5),
  d10: () => new THREE.ConeGeometry(1.2, 2, 10),
  d12: () => new THREE.DodecahedronGeometry(1.5),
  d20: () => new THREE.IcosahedronGeometry(1.5),
};

function AnimatedDice({ diceType, diceColor, isRolling, result }) {
  const meshRef = useRef();

  // Animazione rotazione
  const { rotation } = useSpring({
    rotation: isRolling ? [Math.PI * 8, Math.PI * 8, Math.PI * 8] : [0.3, 0.3, 0],
    config: { mass: 5, tension: 100, friction: 50 },
  });

  // Movimento bounce quando appare
  const { scale } = useSpring({
    scale: 1,
    from: { scale: 0 },
    config: { mass: 2, tension: 200, friction: 20 },
  });

  return (
    <animated.mesh
      ref={meshRef}
      rotation-x={rotation[0]}
      rotation-y={rotation[1]}
      rotation-z={rotation[2]}
      scale={scale}
    >
      <primitive object={DICE_GEOMETRIES[diceType]()} />
      <meshStandardMaterial
        color={diceColor}
        metalness={0.6}
        roughness={0.3}
        emissive={diceColor}
        emissiveIntensity={0.2}
      />
    </animated.mesh>
  );
}


export default function WorkingDice3D({
  diceType = 'd20',
  diceColor = '#d4af37',
  result = null,
  isRolling = false,
  size = 250,
}) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      >
        <Suspense fallback={null}>
          {/* Luci */}
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color={diceColor} />
          <spotLight
            position={[0, 10, 5]}
            angle={0.3}
            penumbra={1}
            intensity={1}
            castShadow
          />

          {/* Dado animato */}
          <AnimatedDice
            diceType={diceType}
            diceColor={diceColor}
            isRolling={isRolling}
            result={result}
          />
        </Suspense>
      </Canvas>

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

      {/* Risultato in overlay */}
      {!isRolling && result !== null && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-heading)',
            fontSize: '4rem',
            fontWeight: '900',
            color: '#fff',
            textShadow: `0 0 20px ${diceColor}, 0 0 40px ${diceColor}`,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}
