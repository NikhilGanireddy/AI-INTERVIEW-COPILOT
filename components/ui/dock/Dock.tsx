'use client';

import { Children, cloneElement, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import type { MotionValue } from 'motion/react';
import type { ReactElement, ReactNode } from 'react';
import clsx from 'clsx';

import './Dock.css';

export type DockItemConfig = {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
};

interface DockProps {
  items: DockItemConfig[];
  className?: string;
  spring?: {
    mass?: number;
    stiffness?: number;
    damping?: number;
  };
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
}

interface DockItemProps {
  children: ReactElement | ReactElement[];
  className?: string;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: Required<DockProps['spring']>;
  distance: number;
  magnification: number;
  baseItemSize: number;
}

function DockItem({
  children,
  className,
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isHovered = useMotionValue<number>(0);

  const mouseDistance = useTransform(mouseX, (val: number) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize,
    };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={clsx('dock-item', className)}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
    >
      {Children.map(children, (child) => {
        if (!child) return null;
        const childElement = child as ReactElement;
        return cloneElement(childElement, { isHovered } as Record<string, unknown>);
      })}
    </motion.div>
  );
}

interface DockLabelProps {
  children: ReactNode;
  className?: string;
  isHovered?: MotionValue<number>;
}

function DockLabel({ children, className = '', isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) {
      setIsVisible(false);
      return;
    }
    setIsVisible(isHovered.get() === 1);
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={clsx('dock-label', className)}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = '' }: { children: ReactNode; className?: string; isHovered?: MotionValue<number> }) {
  return <div className={clsx('dock-icon', className)}>{children}</div>;
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  baseItemSize = 50,
}: DockProps) {
  const router = useRouter();
  const mouseX = useMotionValue<number>(Infinity);

  const resolvedSpring = {
    mass: spring.mass ?? 0.1,
    stiffness: spring.stiffness ?? 150,
    damping: spring.damping ?? 12,
  };

  return (
    <motion.div style={{ height: panelHeight, scrollbarWidth: 'none' }} className="dock-outer">
      <motion.div
        onMouseMove={({ pageX }) => {
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          mouseX.set(Infinity);
        }}
        className={clsx('dock-panel', className)}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => (
          <DockItem
            key={`${item.label}-${index}`}
            onClick={() => {
              if (item.onClick) {
                item.onClick();
                return;
              }
              if (item.href) {
                router.push(item.href);
              }
            }}
            className={item.className}
            mouseX={mouseX}
            spring={resolvedSpring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}
