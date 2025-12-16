/**
 * Coil Surface Proxy
 * ==================
 * Creates a smooth, high-resolution dome mesh for coil movement.
 * 
 * The proxy mesh:
 * - Is invisible in production
 * - Has smooth vertex normals (no faceting)
 * - Is bounded by a base plane through fiducials (Nasion, Inion, LPA, RPA)
 * - Conforms closely to the scalp (~1-3mm hover)
 * 
 * This eliminates snag/jitter caused by triangle edge normals on the raw head mesh.
 */

import * as THREE from 'three';

/**
 * Compute the best-fit plane from fiducial points
 * 
 * @param {Object} fiducials - Object with Nasion, Inion, LPA, RPA as Vector3
 * @returns {{ plane: THREE.Plane, origin: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, n: THREE.Vector3, baseRadius: number }}
 */
export function computeFiducialPlane(fiducials, headMesh = null) {
  const { Nasion, Inion, LPA, RPA } = fiducials || {};
  
  if (!Nasion || !Inion || !LPA || !RPA) {
    console.warn('[CoilProxy] Missing fiducials, deriving from head mesh');
    
    // If we have a head mesh, use its bounding sphere
    if (headMesh && headMesh.geometry) {
      // CRITICAL: Update matrix world before computing bounds
      headMesh.updateMatrixWorld(true);
      
      headMesh.geometry.computeBoundingSphere();
      const sphere = headMesh.geometry.boundingSphere;
      
      if (sphere) {
        // Get world-space center
        const worldCenter = sphere.center.clone();
        worldCenter.applyMatrix4(headMesh.matrixWorld);
        
        // Use world-space radius (account for scale)
        const scale = new THREE.Vector3();
        headMesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
        const worldRadius = sphere.radius * Math.max(scale.x, scale.y, scale.z);
        
        console.log('[CoilProxy] Using head mesh bounds:', {
          center: worldCenter.toArray().map(v => v.toFixed(4)),
          radius: worldRadius.toFixed(4),
        });
        
        return {
          plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -worldCenter.y),
          origin: worldCenter.clone(),
          u: new THREE.Vector3(1, 0, 0),
          v: new THREE.Vector3(0, 0, 1),
          n: new THREE.Vector3(0, 1, 0),
          baseRadius: worldRadius,
        };
      }
    }
    
    // Ultimate fallback - generic values
    console.warn('[CoilProxy] No head mesh, using generic fallback');
    return {
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      origin: new THREE.Vector3(0, 0.05, 0),
      u: new THREE.Vector3(1, 0, 0),
      v: new THREE.Vector3(0, 0, 1),
      n: new THREE.Vector3(0, 1, 0),
      baseRadius: 0.1,
    };
  }
  
  // Compute centroid
  const origin = new THREE.Vector3()
    .add(Nasion).add(Inion).add(LPA).add(RPA)
    .multiplyScalar(0.25);
  
  // Compute plane normal using cross product of two spanning vectors
  const v1 = new THREE.Vector3().subVectors(Nasion, Inion);
  const v2 = new THREE.Vector3().subVectors(LPA, RPA);
  const n = new THREE.Vector3().crossVectors(v1, v2).normalize();
  
  // Ensure normal points upward (positive Y component)
  if (n.y < 0) n.negate();
  
  // Create orthonormal basis on the plane
  // u points toward Nasion (anterior direction)
  const toNasion = new THREE.Vector3().subVectors(Nasion, origin);
  const u = toNasion.sub(n.clone().multiplyScalar(toNasion.dot(n))).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  
  // Compute base radius (mean distance of fiducials from origin in plane coords)
  const points = [Nasion, Inion, LPA, RPA];
  let totalRadius = 0;
  for (const p of points) {
    const rel = new THREE.Vector3().subVectors(p, origin);
    const px = rel.dot(u);
    const py = rel.dot(v);
    totalRadius += Math.sqrt(px * px + py * py);
  }
  const baseRadius = totalRadius / 4;
  
  // Create THREE.Plane
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, origin);
  
  if (import.meta.env.DEV) {
    console.log('[CoilProxy] Fiducial plane computed:', {
      origin: `(${origin.x.toFixed(3)}, ${origin.y.toFixed(3)}, ${origin.z.toFixed(3)})`,
      normal: `(${n.x.toFixed(3)}, ${n.y.toFixed(3)}, ${n.z.toFixed(3)})`,
      baseRadius: baseRadius.toFixed(4),
    });
  }
  
  return { plane, origin, u, v, n, baseRadius };
}

/**
 * Apply Laplacian smoothing to a geometry
 * 
 * @param {THREE.BufferGeometry} geometry - Geometry to smooth
 * @param {number} iterations - Number of smoothing passes
 * @param {number} lambda - Smoothing factor (0-1, typically 0.2-0.5)
 */
export function laplacianSmooth(geometry, iterations = 5, lambda = 0.3) {
  const posAttr = geometry.getAttribute('position');
  const positions = posAttr.array;
  const vertexCount = posAttr.count;
  
  // Build adjacency list from indexed geometry
  const adjacency = new Array(vertexCount).fill(null).map(() => []);
  
  const index = geometry.getIndex();
  if (index) {
    const indices = index.array;
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      if (!adjacency[a].includes(b)) adjacency[a].push(b);
      if (!adjacency[a].includes(c)) adjacency[a].push(c);
      if (!adjacency[b].includes(a)) adjacency[b].push(a);
      if (!adjacency[b].includes(c)) adjacency[b].push(c);
      if (!adjacency[c].includes(a)) adjacency[c].push(a);
      if (!adjacency[c].includes(b)) adjacency[c].push(b);
    }
  } else {
    // Non-indexed: triangles are sequential
    for (let i = 0; i < vertexCount; i += 3) {
      const a = i, b = i + 1, c = i + 2;
      if (!adjacency[a].includes(b)) adjacency[a].push(b);
      if (!adjacency[a].includes(c)) adjacency[a].push(c);
      if (!adjacency[b].includes(a)) adjacency[b].push(a);
      if (!adjacency[b].includes(c)) adjacency[b].push(c);
      if (!adjacency[c].includes(a)) adjacency[c].push(a);
      if (!adjacency[c].includes(b)) adjacency[c].push(b);
    }
  }
  
  const newPositions = new Float32Array(positions.length);
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < vertexCount; i++) {
      const neighbors = adjacency[i];
      if (neighbors.length === 0) {
        newPositions[i * 3] = positions[i * 3];
        newPositions[i * 3 + 1] = positions[i * 3 + 1];
        newPositions[i * 3 + 2] = positions[i * 3 + 2];
        continue;
      }
      
      // Compute centroid of neighbors
      let cx = 0, cy = 0, cz = 0;
      for (const j of neighbors) {
        cx += positions[j * 3];
        cy += positions[j * 3 + 1];
        cz += positions[j * 3 + 2];
      }
      cx /= neighbors.length;
      cy /= neighbors.length;
      cz /= neighbors.length;
      
      // Move toward centroid
      newPositions[i * 3] = positions[i * 3] + lambda * (cx - positions[i * 3]);
      newPositions[i * 3 + 1] = positions[i * 3 + 1] + lambda * (cy - positions[i * 3 + 1]);
      newPositions[i * 3 + 2] = positions[i * 3 + 2] + lambda * (cz - positions[i * 3 + 2]);
    }
    
    // Copy back
    positions.set(newPositions);
  }
  
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Build a smooth proxy surface for coil movement
 * 
 * @param {Object} options
 * @param {THREE.Mesh} options.headMesh - The original head mesh for shrinkwrap raycasting
 * @param {Object} options.fiducials - Fiducial positions { Nasion, Inion, LPA, RPA }
 * @param {number} [options.latSegments=48] - Latitude segments for dome
 * @param {number} [options.lonSegments=64] - Longitude segments for dome
 * @param {number} [options.offsetMm=2] - Hover distance above scalp in mm
 * @param {number} [options.smoothingIters=8] - Laplacian smoothing iterations
 * @returns {THREE.Mesh} The proxy surface mesh
 */
export function buildCoilProxySurface({
  headMesh,
  fiducials,
  latSegments = 48,
  lonSegments = 64,
  offsetMm = 2,
  smoothingIters = 8,
}) {
  const offset = offsetMm / 1000; // Convert to meters
  
  // Compute fiducial plane (pass headMesh for fallback when fiducials missing)
  const { origin, u, v, n, baseRadius } = computeFiducialPlane(fiducials, headMesh);
  
  // Increase dome radius slightly to ensure coverage
  const domeRadius = baseRadius * 1.15;
  
  // Create hemisphere geometry
  const geometry = new THREE.SphereGeometry(
    domeRadius,
    lonSegments,
    latSegments,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2  // Only top hemisphere
  );
  
  // Transform hemisphere to align with fiducial plane
  // Default hemisphere has Y-up, we need to rotate to align with plane normal
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  
  const posAttr = geometry.getAttribute('position');
  const positions = posAttr.array;
  const vertexCount = posAttr.count;
  
  // Transform all vertices
  const tempVec = new THREE.Vector3();
  for (let i = 0; i < vertexCount; i++) {
    tempVec.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    tempVec.applyQuaternion(quaternion);
    tempVec.add(origin);
    positions[i * 3] = tempVec.x;
    positions[i * 3 + 1] = tempVec.y;
    positions[i * 3 + 2] = tempVec.z;
  }
  posAttr.needsUpdate = true;
  
  // Compute head center from head mesh (CRITICAL for raycasting)
  let headCenter = origin.clone(); // Default to fiducial plane origin
  
  // Shrinkwrap: project vertices onto head mesh
  if (headMesh) {
    headMesh.updateMatrixWorld(true);
    
    const raycaster = new THREE.Raycaster();
    
    // Compute head center from bounding sphere of ACTUAL head mesh
    if (headMesh.geometry) {
      headMesh.geometry.computeBoundingSphere();
      const sphere = headMesh.geometry.boundingSphere;
      if (sphere) {
        headCenter = sphere.center.clone().applyMatrix4(headMesh.matrixWorld);
      }
    }
    
    // Track rim vertices (near base plane) for clamping
    const rimIndices = [];
    
    for (let i = 0; i < vertexCount; i++) {
      tempVec.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      
      // Check if this is a rim vertex (on or near base plane)
      const relToOrigin = new THREE.Vector3().subVectors(tempVec, origin);
      const heightAbovePlane = relToOrigin.dot(n);
      const isRim = heightAbovePlane < 0.005; // Within 5mm of base plane
      
      if (isRim) {
        rimIndices.push(i);
        // Clamp rim vertices to the base circle
        const px = relToOrigin.dot(u);
        const py = relToOrigin.dot(v);
        const r = Math.sqrt(px * px + py * py);
        if (r > 0.001) {
          const scale = baseRadius / r;
          positions[i * 3] = origin.x + u.x * px * scale + v.x * py * scale;
          positions[i * 3 + 1] = origin.y + u.y * px * scale + v.y * py * scale;
          positions[i * 3 + 2] = origin.z + u.z * px * scale + v.z * py * scale;
        }
        continue;
      }
      
      // Raycast from head center toward this vertex
      // IMPORTANT: recursive=false to avoid hitting fiducial marker spheres
      const direction = new THREE.Vector3().subVectors(tempVec, headCenter).normalize();
      raycaster.set(headCenter, direction);
      
      const intersects = raycaster.intersectObject(headMesh, false);
      
      if (intersects.length > 0) {
        // Use OUTERMOST hit (Fix A)
        const hit = intersects[intersects.length - 1];
        
        // Get outward normal
        const hitNormal = hit.face.normal.clone();
        hitNormal.transformDirection(headMesh.matrixWorld);
        
        // Ensure normal points outward
        const outwardDir = new THREE.Vector3().subVectors(hit.point, headCenter).normalize();
        if (hitNormal.dot(outwardDir) < 0) {
          hitNormal.negate();
        }
        
        // Position vertex at hit point + offset along normal
        const newPos = hit.point.clone().add(hitNormal.multiplyScalar(offset));
        positions[i * 3] = newPos.x;
        positions[i * 3 + 1] = newPos.y;
        positions[i * 3 + 2] = newPos.z;
      }
    }
    
    posAttr.needsUpdate = true;
  }
  
  // Apply Laplacian smoothing
  laplacianSmooth(geometry, smoothingIters, 0.25);
  
  // Recompute normals after smoothing
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  
  // Create mesh with transparent material (invisible in prod)
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: import.meta.env.DEV ? 0.15 : 0,
    wireframe: import.meta.env.DEV,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'coilProxySurface';
  mesh.visible = import.meta.env.DEV; // Only visible in dev mode
  
  // Store metadata for boundary clamping AND raycasting
  mesh.userData = {
    planeOrigin: origin,
    planeU: u,
    planeV: v,
    planeN: n,
    baseRadius: baseRadius,
    headCenter: headCenter.clone(), // CRITICAL: Store for ScalpSurface raycasting
  };
  
  if (import.meta.env.DEV) {
    console.log('[CoilProxy] Proxy mesh built:', {
      vertices: vertexCount,
      domeRadius: domeRadius.toFixed(4),
      baseRadius: baseRadius.toFixed(4),
      offset: offset.toFixed(4),
    });
  }
  
  return mesh;
}

/**
 * Clamp a position to stay within the proxy dome's footprint
 * 
 * @param {THREE.Vector3} position - Position to clamp (modified in place)
 * @param {THREE.Mesh} proxyMesh - The proxy mesh with userData containing plane info
 * @param {number} [margin=0.005] - Margin from edge in meters
 * @returns {boolean} True if position was clamped
 */
export function clampToProxyBoundary(position, proxyMesh, margin = 0.005) {
  const { planeOrigin, planeU, planeV, baseRadius } = proxyMesh.userData;
  
  if (!planeOrigin || !planeU || !planeV || !baseRadius) {
    return false;
  }
  
  const rel = new THREE.Vector3().subVectors(position, planeOrigin);
  const px = rel.dot(planeU);
  const py = rel.dot(planeV);
  const r = Math.sqrt(px * px + py * py);
  
  const maxRadius = baseRadius - margin;
  
  if (r > maxRadius) {
    const scale = maxRadius / r;
    const clampedX = px * scale;
    const clampedY = py * scale;
    
    // Reconstruct position with clamped planar coordinates
    const height = rel.dot(proxyMesh.userData.planeN);
    position.copy(planeOrigin)
      .add(planeU.clone().multiplyScalar(clampedX))
      .add(planeV.clone().multiplyScalar(clampedY))
      .add(proxyMesh.userData.planeN.clone().multiplyScalar(height));
    
    return true;
  }
  
  return false;
}
