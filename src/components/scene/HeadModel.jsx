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

// Map alternate names to standard fiducial names
const FIDUCIAL_ALIASES = {
  'NASION': 'Nasion',
  'NZ': 'Nasion',
  'INION': 'Inion', 
  'IZ': 'Inion',
  'LPA': 'LPA',
  'LEFTPREAURICULAR': 'LPA',
  'LEFT_PREAURICULAR': 'LPA',
  'AL': 'LPA',  // AL = Auricular Left
  'RPA': 'RPA',
  'RIGHTPREAURICULAR': 'RPA',
  'RIGHT_PREAURICULAR': 'RPA',
  'AR': 'RPA',  // AR = Auricular Right
};

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

export function HeadModel({ onHeadMeshReady, onFiducialsReady, onTargetClick, selectedTarget }) {
  const groupRef = useRef();
  const headMeshRef = useRef();
  
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/head.glb`);
  const { setTargetPositions } = useTMSStore();
  
  // Clone and process the model
  const { scene: clonedScene, targets, fiducials, headMesh } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    
    // Auto-normalize scale
    normalizeModelScale(clone, 'head', true);
    
    // CRITICAL: Update matrices after scaling so raycasting works correctly
    clone.updateMatrixWorld(true);
    
    // Extract targets and fiducials
    const extractedTargets = {};
    const extractedFiducials = {};
    let mainHeadMesh = null;
    let maxRadius = 0;
    
    clone.traverse((child) => {
      // Find main head mesh (largest mesh by bounding sphere)
      if (child.isMesh && child.geometry) {
        // Ensure geometry has bounding sphere computed
        child.geometry.computeBoundingSphere();
        const radius = child.geometry.boundingSphere?.radius || 0;
        if (radius > maxRadius) {
          maxRadius = radius;
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
            
            // Debug: log local vs world position
            console.log(`[HeadModel] Target ${targetName} (${child.name}):`, {
              local: [child.position.x.toFixed(4), child.position.y.toFixed(4), child.position.z.toFixed(4)],
              world: [worldPos.x.toFixed(4), worldPos.y.toFixed(4), worldPos.z.toFixed(4)],
              hasParent: !!child.parent,
              parentName: child.parent?.name,
            });
            
            extractedTargets[targetName] = worldPos;
          }
        }
        
        // Extract fiducials using alias map
        for (const [alias, fidName] of Object.entries(FIDUCIAL_ALIASES)) {
          if (name.includes(alias) && !extractedFiducials[fidName]) {
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            extractedFiducials[fidName] = worldPos;
          }
        }
      }
    });
    
    // Ensure head mesh geometry is ready for raycasting
    if (mainHeadMesh?.geometry) {
      mainHeadMesh.geometry.computeBoundingBox();
      mainHeadMesh.geometry.computeBoundingSphere();
    }
    
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
  
  // Notify parent when fiducials are extracted
  useEffect(() => {
    const foundKeys = Object.keys(fiducials);
    if (foundKeys.length > 0) {
      onFiducialsReady?.(fiducials);
      console.log('[HeadModel] Fiducials extracted:', foundKeys, 
        foundKeys.length === 4 ? '✓ Complete' : `⚠ Missing ${4 - foundKeys.length}`);
    }
  }, [fiducials, onFiducialsReady]);
  
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
