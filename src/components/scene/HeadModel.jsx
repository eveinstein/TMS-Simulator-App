/**
 * HeadModel.jsx
 * =============
 * 3D head model with EEG targets and fiducials.
 * 
 * Features:
 * - Auto-normalization to 0.22m world size
 * - Radiologic convention validation (Left = +X)
 * - Clickable target markers
 * - Scalp mesh extraction for raycasting
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useTMSStore } from '../../stores/tmsStore';
import { normalizeModelScale, validateRadiologicConvention } from '../../utils/scaleNormalization';
import * as THREE from 'three';

// Target definitions with expected positions (for validation)
const TARGET_INFO = {
  F3:  { name: 'Left DLPFC (F3)', hemisphere: 'left', description: 'Left dorsolateral prefrontal cortex - Depression treatment target. Beam F3 method uses tape measure from nasion.' },
  F4:  { name: 'Right DLPFC (F4)', hemisphere: 'right', description: 'Right dorsolateral prefrontal cortex' },
  FP2: { name: 'Right OFC (FP2)', hemisphere: 'right', description: 'Right orbitofrontal cortex' },
  C3:  { name: 'Left Motor (C3)', hemisphere: 'left', description: 'Left primary motor cortex - Motor threshold hotspot region' },
  SMA: { name: 'SMA', hemisphere: 'midline', description: 'Supplementary Motor Area - Motor planning and coordination' },
};

const FIDUCIALS = ['Nasion', 'Inion', 'LPA', 'RPA'];

// Color scheme by hemisphere
const HEMISPHERE_COLORS = {
  left: '#22c55e',    // Green
  right: '#ef4444',   // Red
  midline: '#f97316', // Orange
  fiducial: '#06b6d4', // Cyan
};

// Target marker component
function TargetMarker({ position, name, info, onClick, isSelected }) {
  const meshRef = useRef();
  const hemisphere = info?.hemisphere || 'fiducial';
  const color = HEMISPHERE_COLORS[hemisphere];
  
  return (
    <group position={position}>
      {/* Clickable sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(name, info);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.004, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : 0.3}
        />
      </mesh>
      
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.006, 0.008, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export function HeadModel({ onHeadMeshReady, onTargetClick, selectedTarget }) {
  const groupRef = useRef();
  const headMeshRef = useRef();
  
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/head.glb`);
  const { setTargetPositions } = useTMSStore();
  
  // Clone and process the model
  const { scene: clonedScene, targets, fiducials, headMesh } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    
    // Auto-normalize scale
    normalizeModelScale(clone, 'head', true);
    
    // Extract targets and fiducials
    const extractedTargets = {};
    const extractedFiducials = {};
    let mainHeadMesh = null;
    
    clone.traverse((child) => {
      // Find main head mesh (largest mesh)
      if (child.isMesh) {
        if (!mainHeadMesh || 
            (child.geometry.boundingSphere?.radius > 
             mainHeadMesh.geometry.boundingSphere?.radius)) {
          mainHeadMesh = child;
        }
      }
      
      // Extract targets by name
      const name = child.name?.toUpperCase();
      if (name) {
        for (const targetName of Object.keys(TARGET_INFO)) {
          if (name.includes(targetName.toUpperCase())) {
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            extractedTargets[targetName] = worldPos;
          }
        }
        
        // Extract fiducials
        for (const fidName of FIDUCIALS) {
          if (name.includes(fidName.toUpperCase())) {
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            extractedFiducials[fidName] = worldPos;
          }
        }
      }
    });
    
    // Validate radiologic convention
    validateRadiologicConvention(extractedTargets);
    
    return {
      scene: clone,
      targets: extractedTargets,
      fiducials: extractedFiducials,
      headMesh: mainHeadMesh,
    };
  }, [gltf]);
  
  // Store target positions in global state
  useEffect(() => {
    if (Object.keys(targets).length > 0) {
      setTargetPositions(targets);
      console.log('[HeadModel] Targets extracted:', Object.keys(targets));
    }
  }, [targets, setTargetPositions]);
  
  // Notify parent when head mesh is ready
  useEffect(() => {
    if (headMesh) {
      headMeshRef.current = headMesh;
      onHeadMeshReady?.(headMesh);
    }
  }, [headMesh, onHeadMeshReady]);
  
  return (
    <group ref={groupRef}>
      {/* Head model */}
      <primitive object={clonedScene} />
      
      {/* Target markers */}
      {Object.entries(targets).map(([name, position]) => (
        <TargetMarker
          key={name}
          position={[position.x, position.y, position.z]}
          name={name}
          info={TARGET_INFO[name]}
          onClick={onTargetClick}
          isSelected={selectedTarget === name}
        />
      ))}
      
      {/* Fiducial markers (smaller, different style) */}
      {Object.entries(fiducials).map(([name, position]) => (
        <TargetMarker
          key={name}
          position={[position.x, position.y, position.z]}
          name={name}
          info={{ hemisphere: 'fiducial', description: `${name} fiducial landmark` }}
          onClick={onTargetClick}
          isSelected={selectedTarget === name}
        />
      ))}
    </group>
  );
}

// Preload the model
// Preload is called at module load time, so we need to handle the path carefully
// Using empty string as base URL since import.meta.env.BASE_URL might not be available at parse time
try {
  useGLTF.preload(`${import.meta.env.BASE_URL || './'}models/head.glb`);
} catch (e) {
  // Preload failure is not critical
}
