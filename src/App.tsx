import { type AutomergeUrl, useDocument } from "@automerge/react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { useState } from "react";

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wall, type WallProps } from "@/components/three/Wall.tsx";

export interface Scene {
  walls: (WallProps & { id: string })[];
}

function App({ docUrl }: { docUrl: AutomergeUrl }) {
  const [doc, changeDoc] = useDocument<Scene>(docUrl);
  const [newWall, setNewWall] = useState({
    posX: 0,
    posY: 0.5,
    posZ: 0,
    dimX: 1,
    dimY: 1,
    dimZ: 1
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewWall((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const addWall = () => {
    changeDoc((d) => {
      d.walls.push({
        id: crypto.randomUUID(),
        position: [newWall.posX, newWall.posY, newWall.posZ],
        dimensions: [newWall.dimX, newWall.dimY, newWall.dimZ]
      });
    });
  };

  if (!doc) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <p className="text-lg text-gray-500">Loading Document...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <Card className="absolute z-10 m-4 w-[350px]">
        <CardHeader>
          <CardTitle>Create a Wall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label>Position (X, Y, Z)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  name="posX"
                  value={newWall.posX}
                  onChange={handleInputChange}
                />
                <Input
                  type="number"
                  name="posY"
                  value={newWall.posY}
                  onChange={handleInputChange}
                />
                <Input
                  type="number"
                  name="posZ"
                  value={newWall.posZ}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Dimensions (Width, Height, Depth)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  name="dimX"
                  value={newWall.dimX}
                  onChange={handleInputChange}
                />
                <Input
                  type="number"
                  name="dimY"
                  value={newWall.dimY}
                  onChange={handleInputChange}
                />
                <Input
                  type="number"
                  name="dimZ"
                  value={newWall.dimZ}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
          <Button className="mt-6 w-full" onClick={addWall}>
            Add Wall
          </Button>
        </CardContent>
      </Card>
      <Canvas>
        <ambientLight intensity={Math.PI / 2} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          decay={0}
          intensity={Math.PI}
        />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        <Grid infiniteGrid />
        {doc.walls.map((wall) => (
          <Wall key={wall.id} props={wall} />
        ))}
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;
