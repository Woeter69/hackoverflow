import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const SOSBeacon = ({ position }: { position: [number, number, number] }) => {
  const beamRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (beamRef.current) {
      // Slight pulse in opacity and scale
      beamRef.current.scale.x = 1 + Math.sin(t * 10) * 0.1;
      beamRef.current.scale.z = 1 + Math.sin(t * 10) * 0.1;
    }
    if (ringRef.current) {
      // Expanding shockwave effect
      ringRef.current.scale.setScalar(1 + (t % 1) * 5);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - (t % 1);
    }
  });

  return (
    <group position={position}>
      {/* Central Infinite Beam */}
      <mesh ref={beamRef} position={[0, 50, 0]}>
        <cylinderGeometry args={[0.2, 0.5, 100, 12]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.6} />
      </mesh>

      {/* Glow Aura */}
      <mesh position={[0, 50, 0]}>
        <cylinderGeometry args={[0.8, 1.2, 100, 12]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.1} />
      </mesh>

      {/* Ground Shockwave */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.1, 32]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={1} side={THREE.DoubleSide} />
      </mesh>

      {/* Red Sparkles at base */}
      <Sparkles count={50} scale={2} size={4} speed={0.5} color="#ff0000" />
    </group>
  );
};

export default SOSBeacon;
