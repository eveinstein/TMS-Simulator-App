/**
 * Head Model Component
 * ====================
 * Renders the head mesh with interactive target and fiducial markers.
 * 
 * RADIOLOGIC CONVENTION:
 * Patient LEFT = +X = viewer's RIGHT
 * Patient RIGHT = −X = viewer's LEFT
 * 
 * Target positions are extracted from the GLB and validated against
 * the Python script coordinate conventions.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTMSStore, TARGET_INFO } from '../../stores/tmsStore';

// Target marker component
function TargetMarker({ name, position, isTarget, isSelected, isLocked, onSelect, onHover }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  const info = TARGET_INFO[name];
  const isFiducial = info && info.brainTarget === 'N/A - Anatomical Landmark';
  
  // Determine colors based on state and type
  const baseColor = useMemo(() => {
    if (isFiducial) return '#4fd1c5'; // Cyan for fiducials
    if (name === 'SMA') return '#f6ad55'; // Orange for SMA
    if (name === 'F3' || name === 'C3') return '#68d391'; // Green for left hemisphere
    if (name === 'F4' || name === 'FP2') return '#fc8181'; // Red for right hemisphere
    return '#a0aec0'; // Default gray
  }, [name, isFiducial]);
  
  const markerSize = isFiducial ? 0.006 : 0.008;
  
  useFrame((state) => {
    if (meshRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
      const scale = (hovered || isSelected || isLocked) ? markerSize * 1.3 * pulse : markerSize;
      meshRef.current.scale.setScalar(scale);
    }
    
    if (glowRef.current) {
      glowRef.current.material.opacity = (hovered || isSelected || isLocked) ? 0.4 : 0.15;
    }
  });
  
  return (
    <group position={position}>
      {/* Outer glow ring */}
      <mesh ref={glowRef}>
        <ringGeometry args={[markerSize * 1.5, markerSize * 2.5, 32]} />
        <meshBasicMaterial 
          color={isLocked ? '#48bb78' : baseColor} 
          transparent 
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Main marker sphere */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover?.(name); }}
        onPointerOut={() => { setHovered(false); onHover?.(null); }}
        onClick={(e) => { e.stopPropagation(); onSelect?.(name); }}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial 
          color={isLocked ? '#48bb78' : (hovered || isSelected) ? '#fff' : baseColor}
          emissive={isLocked ? '#48bb78' : baseColor}
          emissiveIntensity={hovered || isSelected || isLocked ? 0.5 : 0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {/* Lock indicator */}
      {isLocked && (
        <mesh position={[0, markerSize * 2, 0]}>
          <octahedronGeometry args={[markerSize * 0.5]} />
          <meshStandardMaterial color="#48bb78" emissive="#48bb78" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// Main Head component
export function HeadModel({ onTargetClick }) {
  const { scene } = useGLTF('/models/head.glb');
  const headMeshRef = useRef();
  const [targets, setTargets] = useState({});
  const [fiducials, setFiducials] = useState({});
  const [headMesh, setHeadMesh] = useState(null);
  
  const { 
    selectedTarget, 
    lockedTarget, 
    isCoilLocked,
    openPopup,
  } = useTMSStore();
  
  // Extract meshes and markers from GLB
  useEffect(() => {
    const extractedTargets = {};
    const extractedFiducials = {};
    let mainHeadMesh = null;
    
    scene.traverse((child) => {
      if (child.isMesh) {
        const name = child.name;
        
        // Identify head mesh (largest mesh or one containing 'head')
        if (name.toLowerCase().includes('head') || name.toLowerCase().includes('scalp')) {
          mainHeadMesh = child;
          child.material = child.material.clone();
          child.material.color = new THREE.Color('#e8d5c4');
          child.material.roughness = 0.7;
          child.material.metalness = 0.1;
        }
        
        // Extract targets - look for standard EEG positions
        const targetNames = ['F3', 'F4', 'FP2', 'Fp2', 'C3', 'SMA'];
        const fiducialNames = ['Nasion', 'Nz', 'Inion', 'Iz', 'LPA', 'RPA', 'Left', 'Right', 'AL', 'AR'];
        
        // Check if this mesh is a target
        for (const target of targetNames) {
          if (name.includes(target) || name.toUpperCase() === target) {
            const pos = new THREE.Vector3();
            child.getWorldPosition(pos);
            const normalizedName = target === 'Fp2' ? 'FP2' : target;
            extractedTargets[normalizedName] = [pos.x, pos.y, pos.z];
            child.visible = false; // Hide original marker
            
            // VALIDATION: Check radiologic convention
            if (target === 'F3' || target === 'C3') {
              console.log(`[VALIDATION] ${target} position:`, pos.x, '(should be > 0 for patient LEFT)');
              if (pos.x <= 0) {
                console.warn(`[WARNING] ${target} has negative X! Radiologic convention may be violated.`);
              }
            }
            if (target === 'F4' || target === 'FP2' || target === 'Fp2') {
              console.log(`[VALIDATION] ${normalizedName} position:`, pos.x, '(should be < 0 for patient RIGHT)');
              if (pos.x >= 0) {
                console.warn(`[WARNING] ${normalizedName} has positive X! Radiologic convention may be violated.`);
              }
            }
          }
        }
        
        // Check if this mesh is a fiducial
        for (const fid of fiducialNames) {
          if (name.includes(fid)) {
            const pos = new THREE.Vector3();
            child.getWorldPosition(pos);
            
            // Normalize fiducial names
            let normalizedName = fid;
            if (fid === 'Nz') normalizedName = 'Nasion';
            if (fid === 'Iz') normalizedName = 'Inion';
            if (fid === 'Left' || fid === 'AL') normalizedName = 'LPA';
            if (fid === 'Right' || fid === 'AR') normalizedName = 'RPA';
            
            extractedFiducials[normalizedName] = [pos.x, pos.y, pos.z];
            child.visible = false; // Hide original marker
          }
        }
        
        // If no specific head mesh found, use the largest mesh
        if (!mainHeadMesh && child.geometry) {
          if (!mainHeadMesh || 
              (child.geometry.attributes.position && 
               child.geometry.attributes.position.count > 
               (mainHeadMesh.geometry?.attributes?.position?.count || 0))) {
            mainHeadMesh = child;
          }
        }
      }
    });
    
    // Apply proper head material
    if (mainHeadMesh) {
      mainHeadMesh.material = new THREE.MeshStandardMaterial({
        color: '#e8d5c4',
        roughness: 0.75,
        metalness: 0.05,
      });
      setHeadMesh(mainHeadMesh);
    }
    
    setTargets(extractedTargets);
    setFiducials(extractedFiducials);
    
    console.log('Extracted targets:', extractedTargets);
    console.log('Extracted fiducials:', extractedFiducials);
  }, [scene]);
  
  // Expose head mesh for raycasting
  useEffect(() => {
    if (headMesh) {
      headMeshRef.current = headMesh;
    }
  }, [headMesh]);
  
  const handleTargetSelect = (name) => {
    openPopup(name);
    onTargetClick?.(name);
  };
  
  return (
    <group>
      {/* Render the head model */}
      <primitive object={scene} />
      
      {/* Render target markers */}
      {Object.entries(targets).map(([name, position]) => (
        <TargetMarker
          key={name}
          name={name}
          position={position}
          isTarget={true}
          isSelected={selectedTarget === name}
          isLocked={lockedTarget === name && isCoilLocked}
          onSelect={handleTargetSelect}
        />
      ))}
      
      {/* Render fiducial markers */}
      {Object.entries(fiducials).map(([name, position]) => (
        <TargetMarker
          key={name}
          name={name}
          position={position}
          isTarget={false}
          isSelected={selectedTarget === name}
          isLocked={false}
          onSelect={handleTargetSelect}
        />
      ))}
    </group>
  );
}

// Export a hook to get the head mesh for raycasting
export function useHeadMesh() {
  const { scene } = useGLTF('/models/head.glb');
  
  return useMemo(() => {
    let headMesh = null;
    scene.traverse((child) => {
      if (child.isMesh) {
        const name = child.name.toLowerCase();
        if (name.includes('head') || name.includes('scalp')) {
          headMesh = child;
        } else if (!headMesh && child.geometry?.attributes?.position) {
          if (!headMesh || 
              child.geometry.attributes.position.count > 
              (headMesh.geometry?.attributes?.position?.count || 0)) {
            headMesh = child;
          }
        }
      }
    });
    return headMesh;
  }, [scene]);
}

// Export target positions hook
export function useTargetPositions() {
  const { scene } = useGLTF('/models/head.glb');
  
  return useMemo(() => {
    const targets = {};
    scene.traverse((child) => {
      if (child.isMesh) {
        const name = child.name;
        const targetNames = ['F3', 'F4', 'FP2', 'Fp2', 'C3', 'SMA'];
        
        for (const target of targetNames) {
          if (name.includes(target) || name.toUpperCase() === target) {
            const pos = new THREE.Vector3();
            child.getWorldPosition(pos);
            const normalizedName = target === 'Fp2' ? 'FP2' : target;
            targets[normalizedName] = pos;
          }
        }
      }
    });
    return targets;
  }, [scene]);
}

// Preload the model
useGLTF.preload('/models/head.glb');
