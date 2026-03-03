// ═══════════════════════════════════════════════
//  SimpleDice3D — Versione semplificata per test
//  SENZA fisica, solo rendering 3D
// ═══════════════════════════════════════════════

import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Dado 3D semplice che ruota
function RotatingDice({ type, color }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.05;
      meshRef.current.rotation.y += 0.05;
    }
  });

  const geometry = type === 'd20'
    ? new THREE.IcosahedronGeometry(1)
    : new THREE.BoxGeometry(1, 1, 1);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
    </mesh>
  );
}

export default function SimpleDice3D({ diceType = 'd20', diceColor = '#d4af37' }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />

        <RotatingDice type={diceType} color={diceColor} />

        <OrbitControls enableZoom={false} />
      </Canvas>

      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        color: diceColor,
        fontFamily: 'var(--font-heading)',
        fontSize: '1rem',
        textShadow: `0 0 10px ${diceColor}`,
      }}>
        Test Dado 3D - {diceType}
      </div>
    </div>
  );
}
