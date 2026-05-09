'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface Terrain3DProps {
  imageData: string; // Base64 encoded image
  /**
   * Field bounds — currently unused at the renderer level (the mesh is normalized
   * to a 100x100 plane), but kept in the prop signature for future
   * geographic anchoring.
   */
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  elevationScale?: number;
}

function TerrainMesh({ imageData, elevationScale = 50 }: { imageData: string; elevationScale: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [heightData, setHeightData] = useState<Float32Array | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageDataObj = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageDataObj.data;

      // Convert RGBA to grayscale heights
      const heights = new Float32Array(img.width * img.height);
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a === 0) {
          heights[i / 4] = 0;
        } else {
          heights[i / 4] = (r + g + b) / (3 * 255);
        }
      }

      if (cancelled) return;
      setHeightData(heights);
      setDimensions({ width: img.width, height: img.height });
    };
    img.src = `data:image/png;base64,${imageData}`;

    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [imageData]);

  const geometry = useMemo(() => {
    if (!heightData || dimensions.width === 0) return null;

    const geom = new THREE.PlaneGeometry(
      100,
      100,
      dimensions.width - 1,
      dimensions.height - 1
    );

    const vertices = geom.attributes.position.array;

    for (let i = 0; i < heightData.length; i++) {
      vertices[i * 3 + 2] = heightData[i] * elevationScale;
    }

    geom.attributes.position.needsUpdate = true;
    geom.computeVertexNormals();

    return geom;
  }, [heightData, dimensions, elevationScale]);

  // Dispose previous geometry when imageData/scale change.
  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  const texture = useMemo(() => {
    if (!imageData) return null;
    const loader = new THREE.TextureLoader();
    return loader.load(`data:image/png;base64,${imageData}`);
  }, [imageData]);

  // Dispose previous texture when imageData changes / on unmount.
  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  if (!geometry || !texture) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function Terrain3DViewer({ imageData, elevationScale = 50 }: Terrain3DProps) {
  return (
    <div className="w-full h-full bg-gray-900">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 80, 120]} fov={60} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={50}
          maxDistance={300}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 50]} intensity={1} castShadow />
        <directionalLight position={[-100, 100, -50]} intensity={0.5} />
        <hemisphereLight args={['#ffffff', '#444444', 0.6]} />

        {/* Terrain */}
        <TerrainMesh imageData={imageData} elevationScale={elevationScale} />

        {/* Grid helper */}
        <gridHelper args={[200, 20, '#444444', '#222222']} position={[0, -5, 0]} />
      </Canvas>

      {/* Controls info */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs p-3 rounded-lg">
        <div className="space-y-1">
          <p className="font-semibold">Controls:</p>
          <p>Left Click + Drag: Rotate</p>
          <p>Right Click + Drag: Pan</p>
          <p>Scroll: Zoom</p>
        </div>
      </div>
    </div>
  );
}
