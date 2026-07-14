"use client";

// 数値を 0 から目標値までカウントアップし、完了時に一瞬グローさせるコンポーネント。
// 画面内に入ったら開始し、value が変わるたびに 0 から再生する。

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  /** アニメーション時間（ms） */
  duration?: number;
  /** 表示フォーマッタ（途中の中間値も受け取る） */
  format: (n: number) => string;
  className?: string;
}

export default function CountUp({ value, duration = 1100, format, className = "" }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [glow, setGlow] = useState(false);
  const [inView, setInView] = useState(false);
  const rafRef = useRef<number | null>(null);
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 画面内に入ったら再生可能にする
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (glowTimer.current) clearTimeout(glowTimer.current);
    setGlow(false);

    if (value <= 0) {
      setDisplay(0);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(value * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
        setGlow(true);
        glowTimer.current = setTimeout(() => setGlow(false), 900);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (glowTimer.current) clearTimeout(glowTimer.current);
    };
  }, [value, inView, duration]);

  return (
    <span ref={ref} className={`${className} ${glow ? "count-glow" : ""}`}>
      {format(display)}
    </span>
  );
}
