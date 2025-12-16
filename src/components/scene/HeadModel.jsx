/**
 * HeadModel.jsx
 * =============
 * 3D head model with EEG targets and fiducials.
 * 
 * Features:
 * - Auto-normalization to 0.22m world size
 * - Clickable target markers
 * - Scalp mesh extraction for raycasting
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useTMSStore } from '../../stores/tmsStore';
import { normalizeModelScale, validateRadiologicConvention } from '../../utils/scaleNormalization';
import { TARGETS, TARGET_COLORS, FIDUCIAL_COLOR } from '../../constants/targets';
import * as THREE from 'three';

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

// Target marker component
function TargetMarker({ position, name, info, onClick, isSelected, isFiducial }) {
  const meshRef = useRef();
  const color = isFiducial ? FIDUCIAL_COLOR : (TARGET_COLORS[name] || '#ffffff');
  
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
          metalness={isFiducial ? 0.8 : 0.2}
          roughness={isFiducial ? 0.3 : 0.5}
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
    
    // STEP 1: Apply normalization scale FIRST
    normalizeModelScale(clone, 'head', true);
    const scaleFactor = clone.scale.x;
    console.log(`[HeadModel] Scale factor applied: ${scaleFactor.toFixed(6)}`);
    
    // STEP 2: Force full matrix world update on entire hierarchy
    clone.updateMatrixWorld(true);
    
    // STEP 3: Now extract positions using getWorldPosition (matrices are ready)
    const extractedTargets = {};
    const extractedFiducials = {};
    let mainHeadMesh = null;
    let maxRadius = 0;
    const tempVec = new THREE.Vector3();
    
    clone.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      
      child.geometry.computeBoundingSphere();
      const sphere = child.geometry.boundingSphere;
      const radius = sphere?.radius || 0;
      
      // Find main head mesh (largest)
      if (radius > maxRadius) {
        maxRadius = radius;
        mainHeadMesh = child;
      }
      
      const name = child.name?.toUpperCase();
      if (!name || !sphere) return;
      
      // For marker meshes, the geometry center IS the position
      // Transform it to world space
      const worldCenter = sphere.center.clone();
      worldCenter.applyMatrix4(child.matrixWorld);
      
      // Extract targets
      for (const targetName of Object.keys(TARGETS)) {
        if (name.includes(targetName.toUpperCase())) {
          extractedTargets[targetName] = worldCenter.clone();
          console.log(`[HeadModel] Target ${targetName}: world=(${worldCenter.x.toFixed(4)}, ${worldCenter.y.toFixed(4)}, ${worldCenter.z.toFixed(4)})`);
        }
      }
      
      // Extract fiducials
      for (const [alias, fidName] of Object.entries(FIDUCIAL_ALIASES)) {
        if (name.includes(alias) && !extractedFiducials[fidName]) {
          extractedFiducials[fidName] = worldCenter.clone();
          console.log(`[HeadModel] Fiducial ${fidName}: world=(${worldCenter.x.toFixed(4)}, ${worldCenter.y.toFixed(4)}, ${worldCenter.z.toFixed(4)})`);
        }
      }
    });
    
    // STEP 4: Sanity check fiducial distances
    if (extractedFiducials.Nasion && extractedFiducials.Inion && 
        extractedFiducials.LPA && extractedFiducials.RPA) {
      const nasionInionDist = extractedFiducials.Nasion.distanceTo(extractedFiducials.Inion);
      const lpaRpaDist = extractedFiducials.LPA.distanceTo(extractedFiducials.RPA);
      console.log(`[HeadModel] Fiducial distances: Nasion-Inion=${nasionInionDist.toFixed(4)}m, LPA-RPA=${lpaRpaDist.toFixed(4)}m`);
      
      if (nasionInionDist < 0.05 || lpaRpaDist < 0.05) {
        console.error('[HeadModel] WARNING: Fiducial distances too small! Transform may not be applied.');
        console.error('  Nasion:', extractedFiducials.Nasion.toArray());
        console.error('  Inion:', extractedFiducials.Inion.toArray());
        console.error('  LPA:', extractedFiducials.LPA.toArray());
        console.error('  RPA:', extractedFiducials.RPA.toArray());
      }
    }
    
    // Ensure head mesh geometry is ready
    if (mainHeadMesh?.geometry) {
      mainHeadMesh.geometry.computeBoundingBox();
      mainHeadMesh.geometry.computeBoundingSphere();
    }
    
    // Validate radiologic convention with full coords
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
      
      {/* Target markers (EEG positions) */}
      {Object.entries(targets).map(([name, position]) => (
        <TargetMarker
          key={name}
          position={[position.x, position.y, position.z]}
          name={name}
          info={TARGETS[name]}
          onClick={onTargetClick}
          isSelected={selectedTarget === name}
          isFiducial={false}
        />
      ))}
      
      {/* Fiducial markers (anatomical landmarks) */}
      {Object.entries(fiducials).map(([name, position]) => (
        <TargetMarker
          key={name}
          position={[position.x, position.y, position.z]}
          name={name}
          info={{ description: `${name} fiducial landmark` }}
          onClick={onTargetClick}
          isSelected={selectedTarget === name}
          isFiducial={true}
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
