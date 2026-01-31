import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

const StarField = ({ speed = 0.5, active = false }: { speed?: number, active?: boolean }) => {
  const meshRef = useRef<THREE.Points>(null);
  
  const starCount = 4000;
  const positions = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 600;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 600;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 600;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Animate stars moving towards the camera (Z-axis)
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const acceleration = active ? 20.0 : 1.0;
    
    for (let i = 0; i < starCount; i++) {
        // Move Z
        positions[i * 3 + 2] += speed * acceleration;

        // Reset if passed camera
        if (positions[i * 3 + 2] > 300) {
            positions[i * 3 + 2] = -300;
        }
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;

    // Stretch effect when active
    if (active) {
        meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, 20, 0.1);
    } else {
        meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, 1, 0.1);
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={starCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={active ? 0.5 : 1.2}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
};

export const HyperspaceOverlay = ({ isActive, onComplete }: { isActive: boolean, onComplete?: () => void }) => {
    const [visible, setVisible] = React.useState(isActive);

    React.useEffect(() => {
        if (isActive) {
            setVisible(true);
            const timer = setTimeout(() => {
                if (onComplete) onComplete();
                // Optional: fade out logic could go here
            }, 2500); // Duration of the jump
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => setVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isActive, onComplete]);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 1000, pointerEvents: 'none',
            opacity: isActive ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            background: 'black'
        }}>
            <Canvas camera={{ position: [0, 0, 50], fov: 75 }}>
                <color attach="background" args={['#000000']} />
                <StarField speed={2} active={isActive} />
                <EffectComposer>
                    <Bloom luminanceThreshold={0} intensity={2.0} radius={0.8} />
                </EffectComposer>
            </Canvas>
             <div style={{
                position: 'absolute', bottom: '50px', width: '100%', textAlign: 'center',
                color: '#fff', fontFamily: 'monospace', fontSize: '1.5rem', letterSpacing: '8px',
                textShadow: '0 0 10px #00ffff'
            }}>
                INITIATING HYPERDRIVE...
            </div>
        </div>
    );
};