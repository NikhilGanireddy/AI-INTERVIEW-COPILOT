"use client";

/* eslint-disable react/no-unknown-property */

import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import clsx from "clsx";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  Image,
  MeshTransmissionMaterial,
  Preload,
  Scroll,
  ScrollControls,
  Text,
  useFBO,
  useGLTF,
  useScroll
} from "@react-three/drei";
import { easing } from "maath";

type BaseModeProps = {
  scale?: number;
  ior?: number;
  thickness?: number;
  anisotropy?: number;
  chromaticAberration?: number;
  transmission?: number;
  roughness?: number;
  color?: string;
  attenuationColor?: string;
  attenuationDistance?: number;
};

type NavItem = { label: string; link: string };

type FluidGlassProps = {
  mode?: "lens" | "bar" | "cube";
  className?: string;
  canvasClassName?: string;
  lensProps?: BaseModeProps & { navItems?: NavItem[] };
  barProps?: BaseModeProps & { navItems?: NavItem[] };
  cubeProps?: BaseModeProps & { navItems?: NavItem[] };
};

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Home", link: "" },
  { label: "About", link: "" },
  { label: "Contact", link: "" }
];

type ModeWrapperProps = {
  children: React.ReactNode;
  glb: string;
  geometryKey: string;
  lockToBottom?: boolean;
  followPointer?: boolean;
  modeProps: BaseModeProps;
};

function ModeWrapper({
  children,
  glb,
  geometryKey,
  lockToBottom = false,
  followPointer = true,
  modeProps
}: ModeWrapperProps) {
  const ref = useRef<THREE.Mesh>(null);
  const { nodes } = useGLTF(glb) as unknown as { nodes: Record<string, { geometry: THREE.BufferGeometry }> };
  const buffer = useFBO();
  const { viewport: vp } = useThree();
  const [scene] = useState(() => new THREE.Scene());
  const geoWidthRef = useRef(1);

  useEffect(() => {
    const geometry = nodes[geometryKey]?.geometry;
    if (!geometry) return;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    geoWidthRef.current = box ? box.max.x - box.min.x || 1 : 1;
  }, [nodes, geometryKey]);

  useFrame((state, delta) => {
    const { gl, viewport, pointer, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);

    const destX = followPointer ? (pointer.x * v.width) / 2 : 0;
    const destY = lockToBottom ? -v.height / 2 + 0.2 : followPointer ? (pointer.y * v.height) / 2 : 0;

    if (ref.current) {
      easing.damp3(ref.current.position, [destX, destY, 15], 0.15, delta);
      if (modeProps.scale == null) {
        const maxWorld = v.width * 0.9;
        const desired = maxWorld / geoWidthRef.current;
        ref.current.scale.setScalar(Math.min(0.15, desired));
      }
    }

    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.setClearColor(0x5227ff, 1);
  });

  const { scale, ior, thickness, anisotropy, chromaticAberration, ...extra } = modeProps;

  return (
    <>
      {createPortal(children, scene)}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      <mesh
        ref={ref}
        scale={scale ?? 0.15}
        rotation-x={Math.PI / 2}
        geometry={nodes[geometryKey]?.geometry}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={ior ?? 1.15}
          thickness={thickness ?? 5}
          anisotropy={anisotropy ?? 0.01}
          chromaticAberration={chromaticAberration ?? 0.1}
          {...extra}
        />
      </mesh>
    </>
  );
}

const Lens = memo(function Lens({ modeProps }: { modeProps: BaseModeProps }) {
  return (
    <ModeWrapper glb="/assets/3d/lens.glb" geometryKey="Cylinder" followPointer modeProps={modeProps}>
      <Scroll>
        <Typography />
        <Images />
      </Scroll>
      <Scroll html />
      <Preload />
    </ModeWrapper>
  );
});

const Cube = memo(function Cube({ modeProps }: { modeProps: BaseModeProps }) {
  return (
    <ModeWrapper glb="/assets/3d/cube.glb" geometryKey="Cube" followPointer modeProps={modeProps}>
      <Scroll>
        <Typography />
        <Images />
      </Scroll>
      <Scroll html />
      <Preload />
    </ModeWrapper>
  );
});

const Bar = memo(function Bar({
  modeProps,
  navItems
}: {
  modeProps: BaseModeProps;
  navItems: NavItem[];
}) {
  const defaults: BaseModeProps = {
    transmission: 1,
    roughness: 0,
    thickness: 10,
    ior: 1.15,
    color: "#ffffff",
    attenuationColor: "#ffffff",
    attenuationDistance: 0.25
  };

  return (
    <ModeWrapper
      glb="/assets/3d/bar.glb"
      geometryKey="Cube"
      lockToBottom
      followPointer={false}
      modeProps={{ ...defaults, ...modeProps }}
    >
      <Scroll>
        <Typography />
        <Images />
      </Scroll>
      <Scroll html>
        <NavItems items={navItems} />
      </Scroll>
      <Preload />
    </ModeWrapper>
  );
});

function NavItems({ items }: { items: NavItem[] }) {
  const group = useRef<THREE.Group>(null);
  const { viewport, camera } = useThree();

  const DEVICE = {
    mobile: { max: 639, spacing: 0.2, fontSize: 0.035 },
    tablet: { max: 1023, spacing: 0.24, fontSize: 0.035 },
    desktop: { max: Infinity, spacing: 0.3, fontSize: 0.035 }
  } as const;

  const getDevice = useMemo(
    () => () => {
      const width = typeof window === "undefined" ? 1024 : window.innerWidth;
      return width <= DEVICE.mobile.max ? "mobile" : width <= DEVICE.tablet.max ? "tablet" : "desktop";
    },
    []
  );

  const [device, setDevice] = useState<keyof typeof DEVICE>("desktop");

  useEffect(() => {
    setDevice(getDevice());

    const onResize = () => setDevice(getDevice());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getDevice]);

  const { spacing, fontSize } = DEVICE[device];

  useFrame(() => {
    if (!group.current) return;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);
    group.current.position.set(0, -v.height / 2 + 0.2, 15.1);

    group.current.children.forEach((child, index) => {
      child.position.x = (index - (items.length - 1) / 2) * spacing;
    });
  });

  const handleNavigate = (link: string) => {
    if (!link) return;
    if (link.startsWith("#")) {
      window.location.hash = link;
    } else {
      window.location.href = link;
    }
  };

  return (
    <group ref={group} renderOrder={10}>
      {items.map(({ label, link }) => (
        <Text
          key={label}
          fontSize={fontSize}
          color="white"
          anchorX="center"
          anchorY="middle"
          depthWrite={false}
          outlineWidth={0}
          outlineBlur="20%"
          outlineColor="#000"
          outlineOpacity={0.5}
          depthTest={false}
          renderOrder={10}
          onClick={event => {
            event.stopPropagation();
            handleNavigate(link);
          }}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          {label}
        </Text>
      ))}
    </group>
  );
}

function Images() {
  const group = useRef<THREE.Group>(null);
  const data = useScroll();
  const { height } = useThree(state => state.viewport);

  useFrame(() => {
    if (!group.current) return;
    const children = group.current.children as unknown as THREE.Mesh[];
    if (children.length < 5) return;
    children[0].material.zoom = 1 + data.range(0, 1 / 3) / 3;
    children[1].material.zoom = 1 + data.range(0, 1 / 3) / 3;
    children[2].material.zoom = 1 + data.range(1.15 / 3, 1 / 3) / 2;
    children[3].material.zoom = 1 + data.range(1.15 / 3, 1 / 3) / 2;
    children[4].material.zoom = 1 + data.range(1.15 / 3, 1 / 3) / 2;
  });

  return (
    <group ref={group}>
      <Image position={[-2, 0, 0]} scale={[3, height / 1.1, 1]} url="/assets/demo/cs1.webp" />
      <Image position={[2, 0, 3]} scale={3} url="/assets/demo/cs2.webp" />
      <Image position={[-2.05, -height, 6]} scale={[1, 3, 1]} url="/assets/demo/cs3.webp" />
      <Image position={[-0.6, -height, 9]} scale={[1, 2, 1]} url="/assets/demo/cs1.webp" />
      <Image position={[0.75, -height, 10.5]} scale={1.5} url="/assets/demo/cs2.webp" />
    </group>
  );
}

function Typography() {
  const DEVICE = {
    mobile: { fontSize: 0.2 },
    tablet: { fontSize: 0.4 },
    desktop: { fontSize: 0.6 }
  } as const;

  const getDevice = () => {
    if (typeof window === "undefined") return "desktop" as const;
    const w = window.innerWidth;
    return w <= 639 ? "mobile" : w <= 1023 ? "tablet" : "desktop";
  };

  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">(getDevice());

  useEffect(() => {
    const onResize = () => setDevice(getDevice());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { fontSize } = DEVICE[device];

  return (
    <Text
      position={[0, 0, 12]}
      fontSize={fontSize}
      letterSpacing={-0.05}
      outlineWidth={0}
      outlineBlur="20%"
      outlineColor="#000"
      outlineOpacity={0.5}
      color="white"
      anchorX="center"
      anchorY="middle"
    >
      React Bits
    </Text>
  );
}

export default function FluidGlass({
  mode = "lens",
  className,
  canvasClassName,
  lensProps = {},
  barProps = {},
  cubeProps = {}
}: FluidGlassProps) {
  const Wrapper = mode === "bar" ? Bar : mode === "cube" ? Cube : Lens;
  const rawOverrides = mode === "bar" ? barProps : mode === "cube" ? cubeProps : lensProps;

  const { navItems = DEFAULT_NAV_ITEMS, ...modeProps } = rawOverrides;

  return (
    <div className={clsx("absolute inset-0", className)}>
      <Canvas
        camera={{ position: [0, 0, 20], fov: 15 }}
        gl={{ alpha: true }}
        dpr={[1, 2]}
        className={clsx("h-full w-full", canvasClassName)}
        style={{ pointerEvents: "none" }}
      >
        <ScrollControls damping={0.2} pages={3} distance={0.4}>
          {mode === "bar" && <NavItems items={navItems} />}
          <Wrapper modeProps={modeProps} navItems={navItems} />
        </ScrollControls>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/assets/3d/lens.glb");
useGLTF.preload("/assets/3d/bar.glb");
useGLTF.preload("/assets/3d/cube.glb");
