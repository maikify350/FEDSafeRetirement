/**
 * ExplainerScene3D — the Three.js way to animate a shot.
 *
 * Renders a glTF model (from the shot's 3D asset slot) or a procedural placeholder on a
 * camera path chosen by `cameraMotion`. Rendered by @remotion/three inside Headless Chrome.
 * Keep models small (< 20 MB GLB, < 200k tris); labels live in the 2D overlay, never in the mesh.
 */
import { Suspense, useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill, Img, staticFile } from "remotion";
import type { ExplainerScene, CameraMotion } from "./ExplainerReel";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Camera position/lookAt for progress p ∈ [0,1]. Real 3D paths, not fake zooms. */
export const cameraPath3D = (motion: CameraMotion, p: number): { pos: [number, number, number]; look: [number, number, number] } => {
  const look: [number, number, number] = [0, 0.6, 0];
  switch (motion) {
    case "orbit":
    case "dynamic_orbit": {
      const a = interpolate(p, [0, 1], [Math.PI * 0.15, Math.PI * 0.85]);
      return { pos: [Math.cos(a) * 6, 2.2, Math.sin(a) * 6], look };
    }
    case "push_forward":
    case "slow_dolly_in": return { pos: [3.2, 1.6, interpolate(p, [0, 1], [9, 4.5])], look };
    case "dolly_out": return { pos: [3.2, 1.6, interpolate(p, [0, 1], [4.5, 9])], look };
    case "crash_zoom": return { pos: [2.5, 1.4, interpolate(p * p, [0, 1], [10, 3])], look };
    case "fly_by_left":
    case "drone_fly_by": return { pos: [interpolate(p, [0, 1], [10, -10]), interpolate(p, [0, 1], [4, 2.2]), 6], look };
    case "fly_by_right":
    case "tracking_shot": return { pos: [interpolate(p, [0, 1], [-10, 10]), 1.8, 5.5], look };
    case "tilt_up":
    case "aerial_reveal": return { pos: [4, interpolate(p, [0, 1], [10, 2.5]), interpolate(p, [0, 1], [2, 7])], look };
    case "pan_slow_right": return { pos: [5, 1.8, 6], look: [interpolate(p, [0, 1], [-2, 2]), 0.6, 0] };
    case "handheld": return { pos: [4 + Math.sin(p * 29) * 0.08, 1.7 + Math.cos(p * 23) * 0.05, 6], look };
    default: return { pos: [4, 1.8, 6.5], look };
  }
};

const Rig = ({ motion, frames }: { motion: CameraMotion; frames: number }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const p = interpolate(frame, [0, frames], [0, 1], clamp);
  const { pos, look } = cameraPath3D(motion, p);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(new THREE.Vector3(look[0], look[1], look[2]));
  return null;
};

const Model = ({ url }: { url: string }) => {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    // Normalise to ~4 units wide and sit on the ground plane.
    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 4 / Math.max(size.x, size.y, size.z, 0.001);
    s.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(s);
    s.position.y -= box2.min.y;
    s.position.x -= (box2.min.x + box2.max.x) / 2;
    s.position.z -= (box2.min.z + box2.max.z) / 2;
    return s;
  }, [gltf]);
  return <primitive object={scene} />;
};

/** Procedural stand-in so a shot renders even before its GLB is supplied. */
const Placeholder = ({ accent }: { accent: string }) => {
  const frame = useCurrentFrame();
  const wheelSpin = frame * 0.15;
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[4, 1.2, 1.2]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[1.4, 1.75, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.6, 24]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      {[-1.3, 0, 1.3].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.35, 0.62]} rotation={[0, 0, wheelSpin]}>
            <cylinderGeometry args={[0.35, 0.35, 0.1, 32]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[x, 0.35, -0.62]} rotation={[0, 0, wheelSpin]}>
            <cylinderGeometry args={[0.35, 0.35, 0.1, 32]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const Ground = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#0b1220" roughness={1} />
    </mesh>
    {/* Rails */}
    {[-0.55, 0.55].map((z) => (
      <mesh key={z} position={[0, 0.02, z]}>
        <boxGeometry args={[80, 0.04, 0.08]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
      </mesh>
    ))}
  </group>
);

export const ExplainerScene3D = ({ scene, frames, accent }: { scene: ExplainerScene; frames: number; accent: string }) => {
  const { width, height } = useVideoConfig();
  const modelUrl = scene.assets3d?.find((a) => a.source_url)?.source_url;
  const backdrop = scene.image ? (scene.image.startsWith("http") ? scene.image : staticFile(scene.image)) : null;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1220" }}>
      {backdrop && <Img src={backdrop} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.55, filter: "blur(2px)" }} />}
      <ThreeCanvas width={width} height={height} camera={{ fov: 42, near: 0.1, far: 200, position: [4, 1.8, 6.5] }} style={{ position: "absolute", inset: 0 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 10, 4]} intensity={2.2} castShadow />
        <pointLight position={[-6, 3, -4]} intensity={1.2} color={accent} />
        <fog attach="fog" args={["#0b1220", 12, 45]} />
        <Rig motion={scene.cameraMotion} frames={frames} />
        <Ground />
        <Suspense fallback={<Placeholder accent={accent} />}>
          {modelUrl ? <Model url={modelUrl} /> : <Placeholder accent={accent} />}
        </Suspense>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
