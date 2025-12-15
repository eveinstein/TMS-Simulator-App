/**
 * TMS Coil Component
 * ==================
 * Renders the TMS coil with:
 * - Surface-attached sliding (constrained to scalp)
 * - WASD keyboard controls for moving coil on scalp
 * - QE keyboard controls for rotation around surface normal
 * - Mouse drag for positioning
 * - Shift+drag for rotation
 * - Snap-to-target functionality
 * - Pulse animation during stimulation
 * 
 * RADIOLOGIC CONVENTION:
 * Patient LEFT = +X = viewer's RIGHT
 * Patient RIGHT = −X = viewer's LEFT
 * 
 * CONTROLS:
 * - W/S: Move coil forward/backward (along Z axis relative to view)
 * - A/D: Move coil left/right (along X axis relative to view)
 * - Q/E: Rotate coil counter-clockwise/clockwise around surface normal
 * - Mouse drag: Position coil on scalp
 * - Shift+drag: Rotate coil
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTMSStore } from '../../stores/tmsStore';
import { useHeadMesh, useTargetPositions } from './HeadModel';

// Pulse ring animation component
function PulseRing({ position, normal }) {
  const [rings, setRings] = useState([]);
  const { isRunning, isPaused, frequency, isInTrain, stimulationType } = useTMSStore();
  
  // Track pulse timing
  const lastPulseTime = useRef(0);
  const pulseInterval = useMemo(() => {
    if (stimulationType === 'iTBS' || stimulationType === 'cTBS') {
      return 1 / 50; // Theta burst at 50 Hz
    }
    return 1 / frequency;
  }, [frequency, stimulationType]);
  
  useFrame((state, delta) => {
    // Trigger new pulses based on frequency
    if (isRunning && !isPaused && isInTrain) {
      lastPulseTime.current += delta;
      
      if (lastPulseTime.current >= pulseInterval) {
        lastPulseTime.current = 0;
        
        // Add new pulse ring
        setRings(prev => [...prev, {
          id: Date.now() + Math.random(),
          createdAt: state.clock.elapsedTime,
          scale: 0.01,
          opacity: 0.8,
        }]);
      }
    } else {
      lastPulseTime.current = 0;
    }
    
    // Update existing rings
    setRings(prev => prev
      .map(ring => ({
        ...ring,
        scale: ring.scale + delta * 0.15,
        opacity: Math.max(0, ring.opacity - delta * 2),
      }))
      .filter(ring => ring.opacity > 0)
    );
  });
  
  // Calculate rotation to align with normal
  const rotation = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const normalVec = new THREE.Vector3(...normal).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalVec);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z];
  }, [normal]);
  
  return (
    <group position={position} rotation={rotation}>
      {rings.map(ring => (
        <mesh key={ring.id} position={[0, 0.001, 0]}>
          <ringGeometry args={[ring.scale, ring.scale + 0.008, 32]} />
          <meshBasicMaterial
            color="#63b3ed"
            transparent
            opacity={ring.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export function TMSCoil() {
  const { scene } = useGLTF('/models/coil.glb');
  const coilGroupRef = useRef();
  const headMesh = useHeadMesh();
  const targetPositions = useTargetPositions();
  const { camera, gl, raycaster } = useThree();
  
  const {
    coilPosition,
    coilRotation,
    coilNormal,
    setCoilPosition,
    setCoilRotation,
    setCoilNormal,
    isCoilLocked,
    lockedTarget,
    setNearestTarget,
    isRunning,
    isPaused,
    isInTrain,
  } = useTMSStore();
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [userYawOffset, setUserYawOffset] = useState(0);
  const lastPointer = useRef({ x: 0, y: 0 });
  
  // Keyboard state
  const keysPressed = useRef(new Set());
  
  // Glow intensity for pulse animation
  const [glowIntensity, setGlowIntensity] = useState(0);
  
  // Configure coil material
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color = new THREE.Color('#2d3748');
        child.material.roughness = 0.3;
        child.material.metalness = 0.7;
      }
    });
  }, [scene]);
  
  // Calculate distance to nearest target
  const updateNearestTarget = useCallback((pos) => {
    let nearestName = null;
    let nearestDistance = Infinity;
    
    Object.entries(targetPositions).forEach(([name, targetPos]) => {
      const dist = new THREE.Vector3(...pos).distanceTo(targetPos);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestName = name;
      }
    });
    
    // Convert to mm (assuming model units are meters)
    const distMm = nearestDistance * 1000;
    setNearestTarget(nearestName, distMm);
    
    return { name: nearestName, distance: nearestDistance };
  }, [targetPositions, setNearestTarget]);
  
  // Raycast from a world position toward head center to find scalp point
  const raycastToScalpFromPosition = useCallback((worldPos) => {
    if (!headMesh) return null;
    
    // Get head center
    const headCenter = new THREE.Vector3();
    headMesh.geometry.computeBoundingBox();
    headMesh.geometry.boundingBox.getCenter(headCenter);
    headMesh.localToWorld(headCenter);
    
    // Direction from head center outward to the desired position
    const direction = worldPos.clone().sub(headCenter).normalize();
    
    const localRaycaster = new THREE.Raycaster();
    localRaycaster.set(headCenter, direction);
    
    const intersects = localRaycaster.intersectObject(headMesh, true);
    if (intersects.length > 0) {
      return {
        point: intersects[0].point,
        normal: intersects[0].face.normal.clone().transformDirection(headMesh.matrixWorld).normalize(),
      };
    }
    return null;
  }, [headMesh]);
  
  // Raycast to scalp surface from screen coordinates
  const raycastToScalp = useCallback((screenX, screenY) => {
    if (!headMesh) return null;
    
    const pointerVec = new THREE.Vector2(screenX, screenY);
    raycaster.setFromCamera(pointerVec, camera);
    
    const intersects = raycaster.intersectObject(headMesh, true);
    if (intersects.length > 0) {
      return {
        point: intersects[0].point,
        normal: intersects[0].face.normal.clone().transformDirection(headMesh.matrixWorld).normalize(),
      };
    }
    return null;
  }, [headMesh, raycaster, camera]);
  
  // Calculate coil orientation from surface normal
  const calculateCoilOrientation = useCallback((normal, yawOffset = 0) => {
    // Coil should face "into" the head (contact surface perpendicular to normal)
    const up = new THREE.Vector3(0, 1, 0);
    const normalVec = normal.clone().normalize();
    
    // Create rotation that aligns coil's down direction with surface normal
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalVec.negate());
    
    // Apply user yaw offset
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(normalVec.negate(), yawOffset);
    quaternion.premultiply(yawQuat);
    
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z];
  }, []);
  
  // Move coil to a new position on the scalp surface
  const moveCoilOnScalp = useCallback((deltaX, deltaZ) => {
    if (isCoilLocked || !headMesh) return;
    
    const currentPos = new THREE.Vector3(...coilPosition);
    const currentNormal = new THREE.Vector3(...coilNormal);
    
    // Get camera's right and forward vectors (projected onto XZ plane for intuitive movement)
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    cameraDir.y = 0;
    cameraDir.normalize();
    
    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(new THREE.Vector3(0, 1, 0), cameraDir).normalize();
    
    // Calculate movement in world space
    const moveSpeed = 0.003;
    const movement = new THREE.Vector3();
    movement.add(cameraRight.clone().multiplyScalar(deltaX * moveSpeed));
    movement.add(cameraDir.clone().multiplyScalar(-deltaZ * moveSpeed));
    
    // Target position (before snapping to surface)
    const targetPos = currentPos.clone().add(movement);
    
    // Raycast to find the new position on the scalp
    const hit = raycastToScalpFromPosition(targetPos);
    if (hit) {
      const offset = hit.normal.clone().multiplyScalar(0.02);
      const newPos = hit.point.clone().add(offset);
      
      setCoilPosition([newPos.x, newPos.y, newPos.z]);
      setCoilNormal([hit.normal.x, hit.normal.y, hit.normal.z]);
      
      const rotation = calculateCoilOrientation(hit.normal, userYawOffset);
      setCoilRotation(rotation);
      
      updateNearestTarget([newPos.x, newPos.y, newPos.z]);
    }
  }, [isCoilLocked, headMesh, coilPosition, coilNormal, camera, raycastToScalpFromPosition, setCoilPosition, setCoilNormal, setCoilRotation, calculateCoilOrientation, userYawOffset, updateNearestTarget]);
  
  // Rotate coil around surface normal
  const rotateCoil = useCallback((deltaYaw) => {
    if (isCoilLocked) return;
    
    const rotationSpeed = 0.05;
    const newYaw = userYawOffset + deltaYaw * rotationSpeed;
    setUserYawOffset(newYaw);
    
    const normal = new THREE.Vector3(...coilNormal);
    const rotation = calculateCoilOrientation(normal, newYaw);
    setCoilRotation(rotation);
  }, [isCoilLocked, userYawOffset, coilNormal, calculateCoilOrientation, setCoilRotation]);
  
  // Handle keyboard controls (WASD for movement, QE for rotation)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const key = e.key.toLowerCase();
      keysPressed.current.add(key);
      
      // Shift for rotation mode during drag
      if (e.key === 'Shift' && isDragging) {
        setIsRotating(true);
      }
    };
    
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      keysPressed.current.delete(key);
      
      if (e.key === 'Shift') {
        setIsRotating(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDragging]);
  
  // Process keyboard input each frame
  useFrame(() => {
    if (isCoilLocked) return;
    
    const keys = keysPressed.current;
    
    // WASD movement
    let deltaX = 0;
    let deltaZ = 0;
    
    if (keys.has('w')) deltaZ += 1;
    if (keys.has('s')) deltaZ -= 1;
    if (keys.has('a')) deltaX -= 1;
    if (keys.has('d')) deltaX += 1;
    
    if (deltaX !== 0 || deltaZ !== 0) {
      moveCoilOnScalp(deltaX, deltaZ);
    }
    
    // QE rotation
    let deltaYaw = 0;
    if (keys.has('q')) deltaYaw -= 1;
    if (keys.has('e')) deltaYaw += 1;
    
    if (deltaYaw !== 0) {
      rotateCoil(deltaYaw);
    }
  });
  
  // Handle pointer down
  const handlePointerDown = useCallback((e) => {
    if (isCoilLocked) return;
    
    e.stopPropagation();
    setIsDragging(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
    
    // Check if shift is held for rotation
    if (e.shiftKey) {
      setIsRotating(true);
    }
    
    gl.domElement.style.cursor = 'grabbing';
  }, [isCoilLocked, gl]);
  
  // Handle pointer move (drag along scalp)
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging || isCoilLocked) return;
      
      if (isRotating) {
        // Rotate coil around its local normal
        const deltaX = e.clientX - lastPointer.current.x;
        setUserYawOffset(prev => prev + deltaX * 0.01);
        
        const normal = new THREE.Vector3(...coilNormal);
        const rotation = calculateCoilOrientation(normal, userYawOffset + deltaX * 0.01);
        setCoilRotation(rotation);
        
        lastPointer.current = { x: e.clientX, y: e.clientY };
        return;
      }
      
      // Calculate normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      const hit = raycastToScalp(x, y);
      if (hit) {
        // Offset position along normal to prevent clipping
        const offset = hit.normal.clone().multiplyScalar(0.02);
        const newPos = hit.point.clone().add(offset);
        
        setCoilPosition([newPos.x, newPos.y, newPos.z]);
        setCoilNormal([hit.normal.x, hit.normal.y, hit.normal.z]);
        
        const rotation = calculateCoilOrientation(hit.normal, userYawOffset);
        setCoilRotation(rotation);
        
        updateNearestTarget([newPos.x, newPos.y, newPos.z]);
      }
      
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };
    
    const handlePointerUp = () => {
      setIsDragging(false);
      setIsRotating(false);
      gl.domElement.style.cursor = 'auto';
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, isRotating, isCoilLocked, raycastToScalp, gl, setCoilPosition, setCoilNormal, setCoilRotation, calculateCoilOrientation, updateNearestTarget, userYawOffset, coilNormal]);
  
  // Snap coil to target when locked
  useEffect(() => {
    if (isCoilLocked && lockedTarget && targetPositions[lockedTarget]) {
      const targetPos = targetPositions[lockedTarget];
      
      // Raycast from target outward to find scalp surface normal
      if (headMesh) {
        const headCenter = new THREE.Vector3();
        headMesh.geometry.computeBoundingBox();
        headMesh.geometry.boundingBox.getCenter(headCenter);
        headMesh.localToWorld(headCenter);
        
        const direction = targetPos.clone().sub(headCenter).normalize();
        const localRaycaster = new THREE.Raycaster();
        localRaycaster.set(headCenter, direction);
        
        const intersects = localRaycaster.intersectObject(headMesh, true);
        if (intersects.length > 0) {
          const normal = intersects[0].face.normal.clone()
            .transformDirection(headMesh.matrixWorld)
            .normalize();
          
          // Position coil at target with normal offset
          const offset = normal.clone().multiplyScalar(0.02);
          const newPos = targetPos.clone().add(offset);
          
          setCoilPosition([newPos.x, newPos.y, newPos.z]);
          setCoilNormal([normal.x, normal.y, normal.z]);
          
          const rotation = calculateCoilOrientation(normal, userYawOffset);
          setCoilRotation(rotation);
        }
      }
    }
  }, [isCoilLocked, lockedTarget, targetPositions, headMesh, setCoilPosition, setCoilNormal, setCoilRotation, calculateCoilOrientation, userYawOffset]);
  
  // Pulse glow animation
  useFrame((state) => {
    if (isRunning && !isPaused && isInTrain) {
      // Pulsing glow effect
      const pulse = Math.sin(state.clock.elapsedTime * Math.PI * 20) * 0.5 + 0.5;
      setGlowIntensity(pulse);
    } else {
      setGlowIntensity(0);
    }
  });
  
  return (
    <group>
      {/* Main coil group */}
      <group
        ref={coilGroupRef}
        position={coilPosition}
        rotation={coilRotation}
        onPointerDown={handlePointerDown}
      >
        <primitive object={scene} scale={1} />
        
        {/* Glow effect during stimulation */}
        {isRunning && isInTrain && (
          <pointLight
            color="#63b3ed"
            intensity={glowIntensity * 2}
            distance={0.3}
            position={[0, -0.02, 0]}
          />
        )}
        
        {/* Lock indicator */}
        {isCoilLocked && (
          <group position={[0, 0.05, 0]}>
            <mesh>
              <boxGeometry args={[0.015, 0.01, 0.015]} />
              <meshStandardMaterial color="#48bb78" emissive="#48bb78" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, 0.008, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 0.006, 8]} />
              <meshStandardMaterial color="#48bb78" emissive="#48bb78" emissiveIntensity={0.5} />
            </mesh>
          </group>
        )}
      </group>
      
      {/* Pulse rings emanating from coil contact point */}
      <PulseRing
        position={coilPosition}
        normal={coilNormal}
      />
    </group>
  );
}

useGLTF.preload('/models/coil.glb');
