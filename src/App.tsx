import "./App.css";

import { type AutomergeUrl, useDocument } from "@automerge/react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useRef, useState } from "react";

export interface Cube {
  id: string;
  size: number;
}

interface BoxProps {
  cube: Cube;
  changeCube: (callback: (cube: Cube) => void) => void;
}

/**
 * A functional React component that renders a 3D box linked to an Automerge document.
 * @param {BoxProps} props - The props for the component, including the cube document.
 */
function Box({ cube, changeCube, ...props }: BoxProps & ThreeElements["mesh"]) {
  const meshRef = useRef<THREE.Mesh>(null!);

  const [hovered, setHover] = useState(false);

  // The useFrame hook runs on every frame of the animation loop.
  // The `delta` argument is the time in seconds since the last frame.
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta;
      meshRef.current.rotation.z += delta;
    }
  });

  /**
   * Handles the click event on the mesh.
   * It calls the changeCube function from useDocument to update the cube's size.
   */
  const handleClick = () => {
    changeCube((c) => {
      c.size = (c.size || 1) + 0.5;
    });
  };

  return (
    <mesh
      {...props}
      ref={meshRef}
      scale={cube?.size || 1}
      onClick={handleClick}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? "hotpink" : "orange"} />
    </mesh>
  );
}

function App({ docUrl }: { docUrl: AutomergeUrl }) {
  const [cube, changeCube] = useDocument<Cube>(docUrl);

  if (!cube) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <p className="text-lg text-gray-500">Loading Document...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="mb-4 text-4xl font-bold text-gray-900">Automerge Demo</h1>
      <p className="mb-2 text-lg text-gray-600">
        Click the cube to make it bigger!
      </p>
      <p className="mb-4 font-mono text-lg text-gray-800">
        Current Size: {cube.size?.toFixed(1) || "1.0"}
      </p>
      <Canvas className="h-64 w-64 rounded-lg border border-gray-300 bg-white shadow-lg">
        <ambientLight intensity={Math.PI / 2} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          decay={0}
          intensity={Math.PI}
        />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        <Box cube={cube} changeCube={changeCube} />
      </Canvas>
    </div>
  );
}

export default App;
