"use client";

// スクロールで画面に入ったときに、下からフェードインさせるラッパー。
// IntersectionObserver で初回可視化を検知し、一度だけ表示アニメーションを走らせる。

import { ReactNode, useEffect, useRef, useState } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** 表示開始までの遅延（ms）。並べたときのスタッガーに使う */
  delay?: number;
  /** 立ち上がりの移動量 */
  y?: number;
}

export default function Reveal({ children, className = "", delay = 0, y = 24 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 既に画面内（初期表示）でも発火する
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: visible ? `${delay}ms` : "0ms",
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
      }}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
