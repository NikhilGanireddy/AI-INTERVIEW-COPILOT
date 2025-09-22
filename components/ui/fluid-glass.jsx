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

const DEFAULT_NAV_ITEMS = [
  { label: "Home", link: "" },
  { label: "About", link: "" },
  { label: "Contact", link: "" }
];

function ModeWrapper({
  children,
  glb,
  geometryKey,
  lockToBottom = false,
  followPointer = true,
  modeProps = {}
}) {
  const ref = useRef(null);
  const gltf = useGLTF(glb);
  const nodes = (gltf && gltf.nodes) || {};
  const buffer = useFBO();
  const { viewport: vp } = useThree();
  const [scene] = useState(() => new THREE.Scene());
  const geoWidthRef = useRef(1);

  useEffect(() => {
    const node = nodes[geometryKey];
    const geometry = node && node.geometry;
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

  const {
    scale,
    ior,
    thickness,
    anisotropy,
    chromaticAberration,
    transmission,
    roughness,
    color,
    attenuationColor,
    attenuationDistance
  } = modeProps;

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
        geometry={nodes[geometryKey] ? nodes[geometryKey].geometry : undefined}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={ior ?? 1.15}
          thickness={thickness ?? 5}
          anisotropy={anisotropy ?? 0.01}
          chromaticAberration={chromaticAberration ?? 0.1}
          transmission={transmission}
          roughness={roughness}
          color={color}
          attenuationColor={attenuationColor}
          attenuationDistance={attenuationDistance}
        />
      </mesh>
    </>
  );
}

const Lens = memo(function Lens({ modeProps = {} }) {
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

const Cube = memo(function Cube({ modeProps = {} }) {
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

const Bar = memo(function Bar({ modeProps = {}, navItems = DEFAULT_NAV_ITEMS }) {
  const defaults = {
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

function NavItems({ items = DEFAULT_NAV_ITEMS }) {
  const group = useRef(null);
  const { viewport, camera } = useThree();

  const DEVICE = {
    mobile: { max: 639, spacing: 0.2, fontSize: 0.035 },
    tablet: { max: 1023, spacing: 0.24, fontSize: 0.035 },
    desktop: { max: Infinity, spacing: 0.3, fontSize: 0.035 }
  };

  const getDevice = useMemo(
    () => () => {
      const width = typeof window === "undefined" ? 1024 : window.innerWidth;
      return width <= DEVICE.mobile.max ? "mobile" : width <= DEVICE.tablet.max ? "tablet" : "desktop";
    },
    []
  );

  const [device, setDevice] = useState("desktop");

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

  const handleNavigate = (link) => {
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
          outlineWidth={0}
          outlineBlur="20%"
          outlineColor="#000"
          outlineOpacity={0.5}
          renderOrder={10}
          onClick={(event) => {
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
  const group = useRef(null);
  const data = useScroll();
  const { height } = useThree((state) => state.viewport);

  useFrame(() => {
    if (!group.current) return;
    const children = group.current.children || [];
    if (children.length < 5) return;
    if (children[0].material) children[0].material.zoom = 1 + data.range(0, 1 / 3) / 3;
    if (children[1].material) children[1].material.zoom = 1 + data.range(0, 1 / 3) / 3;
    if (children[2].material) children[2].material.zoom = 1 + data.range(1.15 / 3, 1 / 3) / 2;
    if (children[3].material) children[3].material.zoom = 1 + data.range(1.15 / 3, 1 / 3) / 2;
    if (children[4].material) children[4].material.zoom = 1 + data.range(1.15 / 3, 1 / 3) / 2;
  });

  return (
    <group ref={group}>
      <Image position={[-2, 0, 0]} scale={[3, Number(height) / 1.1]} url="/assets/demo/cs1.webp" />
      <Image position={[2, 0, 3]} scale={[3, 3]} url="/assets/demo/cs2.webp" />
      <Image position={[-2.05, -height, 6]} scale={[1, 3]} url="/assets/demo/cs3.webp" />
      <Image position={[-0.6, -height, 9]} scale={[1, 2]} url="/assets/demo/cs1.webp" />
      <Image position={[0.75, -height, 10.5]} scale={1.5} url="/assets/demo/cs2.webp" />
    </group>
  );
}

function Typography() {
  const DEVICE = {
    mobile: { fontSize: 0.2 },
    tablet: { fontSize: 0.4 },
    desktop: { fontSize: 0.6 }
  };

  const getDevice = () => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    return w <= 639 ? "mobile" : w <= 1023 ? "tablet" : "desktop";
  };

  const [device, setDevice] = useState(getDevice());

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
}) {
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