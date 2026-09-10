"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

/** Smoothly counts a number into the element when it scrolls into view. */
export function useCountUp(value: number, duration = 1.05) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-16px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        setDisplay(Math.round(v).toLocaleString("en-IN"));
      },
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return { ref, display };
}

/** Rupee-prefixed animated amount. */
export function AnimatedRupees({ value, className }: { value: number; className?: string }) {
  const { ref, display } = useCountUp(value);
  return (
    <span ref={ref} className={className}>
      {"\u20B9"}
      {display}
    </span>
  );
}
