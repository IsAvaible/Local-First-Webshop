export interface WallProps {
  position: [number, number, number];
  dimensions: [number, number, number];
}

export function Wall({ props }: { props: WallProps }) {
  return (
    <mesh position={props.position}>
      <boxGeometry args={props.dimensions} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
