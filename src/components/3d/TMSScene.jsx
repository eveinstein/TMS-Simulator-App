/**
 * TMS Scene Component
 * ====================
 * Main 3D scene combining head model, coil, lighting, and camera controls.
 * 
 * RADIOLOGIC CONVENTION (enforced throughout):
 * Patient LEFT = +X = viewer's RIGHT
 * Patient RIGHT = −X = viewer's LEFT
 */

import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { HeadModel } from './HeadModel';
import { TMSCoil } from './TMSCoil';
import { useTMSStore } from '../../stores/tmsStore';

// Axis indicator widget
function AxisIndicator() {
  return (
    <group position={[-0.2, -0.15, 0]} scale={0.025}>
      {/* X axis - Red (Patient Left) */}
      <mesh position={[0.5, 0, 0]}>
        <boxGeometry args={[1, 0.08, 0.08]} />
        <meshStandardMaterial color="#fc8181" />
      </mesh>
      <Html position={[1.2, 0, 0]} center>
        <div style={{ 
          color: '#fc8181', 
          fontSize: '10px', 
          fontWeight: 'bold',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}>
          +X (L)
        </div>
      </Html>
      
      {/* Y axis - Green (Superior) */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshStandardMaterial color="#68d391" />
      </mesh>
      <Html position={[0, 1.2, 0]} center>
        <div style={{ 
          color: '#68d391', 
          fontSize: '10px', 
          fontWeight: 'bold',
          fontFamily: 'monospace',
        }}>
          +Y
        </div>
      </Html>
      
      {/* Z axis - Blue (Anterior) */}
      <mesh position={[0, 0, 0.5]}>
        <boxGeometry args={[0.08, 0.08, 1]} />
        <meshStandardMaterial color="#63b3ed" />
      </mesh>
      <Html position={[0, 0, 1.2]} center>
        <div style={{ 
          color: '#63b3ed', 
          fontSize: '10px', 
          fontWeight: 'bold',
          fontFamily: 'monospace',
        }}>
          +Z
        </div>
      </Html>
      
      {/* Origin sphere */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#a0aec0" />
      </mesh>
    </group>
  );
}

// Left/Right indicator overlay
function OrientationGuide() {
  return (
    <group>
      {/* Left indicator (viewer's right, +X) */}
      <Html position={[0.18, 0.05, 0]} center>
        <div style={{
          background: 'rgba(104, 211, 145, 0.15)',
          border: '1px solid rgba(104, 211, 145, 0.5)',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: '600',
          color: '#68d391',
          fontFamily: 'system-ui',
          letterSpacing: '0.5px',
        }}>
          L
        </div>
      </Html>
      
      {/* Right indicator (viewer's left, -X) */}
      <Html position={[-0.18, 0.05, 0]} center>
        <div style={{
          background: 'rgba(252, 129, 129, 0.15)',
          border: '1px solid rgba(252, 129, 129, 0.5)',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: '600',
          color: '#fc8181',
          fontFamily: 'system-ui',
          letterSpacing: '0.5px',
        }}>
          R
        </div>
      </Html>
    </group>
  );
}

// Distance indicator
function DistanceIndicator() {
  const { nearestTarget, distanceToNearestTarget, isCoilLocked, lockedTarget } = useTMSStore();
  
  if (!nearestTarget) return null;
  
  const isClose = distanceToNearestTarget < 15;
  const isVeryClose = distanceToNearestTarget < 5;
  
  return (
    <Html position={[0.12, 0.22, 0]} center>
      <div style={{
        background: isCoilLocked ? 'rgba(72, 187, 120, 0.95)' : 
                   isVeryClose ? 'rgba(246, 173, 85, 0.95)' :
                   isClose ? 'rgba(99, 179, 237, 0.95)' : 
                   'rgba(45, 55, 72, 0.9)',
        borderRadius: '6px',
        padding: '6px 10px',
        fontSize: '11px',
        fontFamily: 'system-ui',
        color: '#fff',
        minWidth: '100px',
        textAlign: 'center',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {isCoilLocked ? (
          <>
            <div style={{ fontWeight: '700', fontSize: '10px', opacity: 0.8, marginBottom: '2px' }}>
              🔒 LOCKED
            </div>
            <div style={{ fontWeight: '600' }}>
              {lockedTarget}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: '600' }}>
              → {nearestTarget}
            </div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '700',
              marginTop: '2px',
              fontFamily: 'monospace',
            }}>
              {distanceToNearestTarget.toFixed(1)} mm
            </div>
          </>
        )}
      </div>
    </Html>
  );
}

// Loading component
function Loader() {
  return (
    <Html center>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        color: '#a0aec0',
        fontFamily: 'system-ui',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(99, 179, 237, 0.2)',
          borderTop: '3px solid #63b3ed',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{ fontSize: '14px' }}>Loading models...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </Html>
  );
}

// Main scene content
function SceneContent({ onTargetClick }) {
  const controlsRef = useRef();
  
  // Scale factor for models (original head is ~10 units tall, scale to ~0.3 units)
  const MODEL_SCALE = 0.03;
  
  return (
    <>
      {/* Lighting setup - medical grade */}
      <ambientLight intensity={0.4} />
      
      {/* Key light - main illumination */}
      <directionalLight
        position={[2, 3, 2]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={10}
        shadow-camera-left={-1}
        shadow-camera-right={1}
        shadow-camera-top={1}
        shadow-camera-bottom={-1}
      />
      
      {/* Fill light - soften shadows */}
      <directionalLight
        position={[-2, 1, -1]}
        intensity={0.5}
        color="#e8f4fc"
      />
      
      {/* Rim light - edge definition */}
      <directionalLight
        position={[0, 0, -3]}
        intensity={0.6}
        color="#fff8f0"
      />
      
      {/* Top light for vertex illumination */}
      <directionalLight
        position={[0, 4, 0]}
        intensity={0.4}
      />
      
      {/* Environment for realistic reflections */}
      <Environment preset="studio" />
      
      {/* Contact shadows */}
      <ContactShadows
        position={[0, -0.15, 0]}
        opacity={0.3}
        scale={0.5}
        blur={2}
        far={0.3}
      />
      
      {/* Models - wrapped in scaled group */}
      <Suspense fallback={<Loader />}>
        <group scale={[MODEL_SCALE, MODEL_SCALE, MODEL_SCALE]}>
          <HeadModel onTargetClick={onTargetClick} />
          <TMSCoil />
        </group>
        
        {/* Orientation indicators */}
        <AxisIndicator />
        <OrientationGuide />
        <DistanceIndicator />
      </Suspense>
      
      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.15}
        maxDistance={1.5}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
        target={[0, 0, 0]}
        makeDefault
      />
    </>
  );
}

// Main Scene export
export function TMSScene({ onTargetClick }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{
          position: [0, 0.15, 0.4],
          fov: 45,
          near: 0.01,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <SceneContent onTargetClick={onTargetClick} />
      </Canvas>
      
      {/* Overlay legend */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(26, 32, 44, 0.85)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#a0aec0',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
        lineHeight: '1.6',
      }}>
        <div style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '4px', fontSize: '11px' }}>
          Radiologic Convention
        </div>
        <div><span style={{ color: '#68d391' }}>Patient Left</span> = +X = Viewer's Right</div>
        <div><span style={{ color: '#fc8181' }}>Patient Right</span> = −X = Viewer's Left</div>
        <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
          <span style={{ color: '#63b3ed' }}>WASD</span> move coil on scalp<br/>
          <span style={{ color: '#f6ad55' }}>Q/E</span> rotate coil<br/>
          <span style={{ color: '#a0aec0' }}>Drag</span> to slide • <span style={{ color: '#a0aec0' }}>Shift+drag</span> rotate
        </div>
      </div>
    </div>
  );
}
