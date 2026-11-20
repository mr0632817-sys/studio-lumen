"use client";

import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  MeshTransmissionMaterial,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";

interface AstrolabeProps {
  isDark: boolean;
}

function AstrolabeAssembly({ isDark }: AstrolabeProps) {
  const rootRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const middleRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const satelliteOrbitRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (rootRef.current) {
      const targetX = state.pointer.y * 0.28;
      const targetY = state.pointer.x * 0.38;
      rootRef.current.rotation.x = THREE.MathUtils.lerp(
        rootRef.current.rotation.x,
        targetX,
        0.06
      );
      rootRef.current.rotation.y = THREE.MathUtils.lerp(
        rootRef.current.rotation.y,
        targetY,
        0.06
      );
    }

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += delta * 0.16;
      outerRingRef.current.rotation.x = Math.sin(t * 0.4) * 0.24;
    }
    if (middleRingRef.current) {
      middleRingRef.current.rotation.y -= delta * 0.26;
      middleRingRef.current.rotation.z = Math.cos(t * 0.35) * 0.28;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.x += delta * 0.38;
      innerRingRef.current.rotation.y += delta * 0.2;
    }
    if (satelliteOrbitRef.current) {
      satelliteOrbitRef.current.rotation.y += delta * 0.48;
      satelliteOrbitRef.current.rotation.z = 0.35;
    }
  });

  const metalColor = isDark ? "#1e293b" : "#cbd5e1";
  const accentRingColor = isDark ? "#38bdf8" : "#4f46e5";
  const coreColor = isDark ? "#6366f1" : "#818cf8";
  const satelliteColor = isDark ? "#7dd3fc" : "#4338ca";

  return (
    <Float speed={1.7} rotationIntensity={0.22} floatIntensity={0.55}>
      <group ref={rootRef} scale={1.12}>
        {/* Central Refractive Glass Core */}
        <mesh>
          <icosahedronGeometry args={[0.78, 4]} />
          <MeshTransmissionMaterial
            backside
            samples={4}
            resolution={256}
            thickness={0.85}
            roughness={isDark ? 0.12 : 0.18}
            transmission={0.94}
            ior={1.45}
            chromaticAberration={0.04}
            anisotropy={0.3}
            color={isDark ? "#a5b4fc" : "#e0e7ff"}
          />
        </mesh>

        {/* Inner Energy Nucleus */}
        <mesh>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial
            color={coreColor}
            emissive={accentRingColor}
            emissiveIntensity={isDark ? 2.3 : 0.85}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        {/* Outer Gyroscope Ring */}
        <mesh ref={outerRingRef}>
          <torusGeometry args={[1.65, 0.032, 24, 120]} />
          <meshStandardMaterial
            color={metalColor}
            metalness={0.92}
            roughness={isDark ? 0.22 : 0.28}
          />
        </mesh>

        {/* Middle Precision Ring */}
        <mesh ref={middleRingRef} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.35, 0.022, 24, 120]} />
          <meshStandardMaterial
            color={accentRingColor}
            emissive={accentRingColor}
            emissiveIntensity={isDark ? 0.65 : 0.2}
            metalness={0.85}
            roughness={0.2}
          />
        </mesh>

        {/* Inner Gimbal Ring */}
        <mesh ref={innerRingRef} rotation={[0, Math.PI / 4, 0]}>
          <torusGeometry args={[1.08, 0.018, 24, 100]} />
          <meshStandardMaterial
            color={isDark ? "#94a3b8" : "#64748b"}
            metalness={0.95}
            roughness={0.18}
          />
        </mesh>

        {/* Orbiting Satellite Nodes */}
        <group ref={satelliteOrbitRef}>
          <mesh position={[1.95, 0, 0]}>
            <sphereGeometry args={[0.065, 24, 24]} />
            <meshStandardMaterial
              color={satelliteColor}
              emissive={satelliteColor}
              emissiveIntensity={isDark ? 2 : 0.6}
            />
          </mesh>
          <mesh position={[-1.95, 0, 0]}>
            <octahedronGeometry args={[0.075, 0]} />
            <meshStandardMaterial
              color={accentRingColor}
              emissive={accentRingColor}
              emissiveIntensity={isDark ? 1.8 : 0.5}
            />
          </mesh>
        </group>

        {/* Ambient Space Dust */}
        <Sparkles
          count={65}
          scale={5.2}
          size={isDark ? 2.1 : 1.5}
          speed={0.35}
          opacity={isDark ? 0.75 : 0.4}
          color={isDark ? "#38bdf8" : "#4f46e5"}
        />
      </group>
    </Float>
  );
}

export default function CelestialAstrolabe({ isDark }: AstrolabeProps) {
  return (
    <div className="relative h-[400px] w-full sm:h-[500px] lg:h-[580px]">
      <div
        className="pointer-events-none absolute inset-12 rounded-full blur-3xl transition-all duration-500"
        style={{ backgroundColor: "var(--accent-glow)" }}
      />

      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5.2], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={isDark ? 0.45 : 0.95} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={isDark ? 1.8 : 2.2}
          color={isDark ? "#e0f2fe" : "#ffffff"}
        />
        <pointLight
          position={[-4, -3, -2]}
          intensity={isDark ? 2.5 : 1.1}
          color={isDark ? "#6366f1" : "#818cf8"}
        />

        <Environment resolution={256}>
          <Lightformer
            form="ring"
            intensity={2.2}
            position={[0, 5, -5]}
            scale={10}
            color={isDark ? "#38bdf8" : "#ffffff"}
          />
          <Lightformer
            form="rect"
            intensity={1.6}
            position={[-5, 2, 5]}
            scale={[10, 2, 1]}
            color={isDark ? "#818cf8" : "#e2e8f0"}
          />
          <Lightformer
            form="rect"
            intensity={1.6}
            position={[5, -2, 5]}
            scale={[10, 2, 1]}
            color={isDark ? "#c084fc" : "#cbd5e1"}
          />
        </Environment>

        <Suspense fallback={null}>
          <AstrolabeAssembly isDark={isDark} />
        </Suspense>
      </Canvas>
    </div>
  );
}
