"use client";

import React, { useEffect, useState } from "react";

interface OrientalProviderProps {
  children: React.ReactNode;
}

export function OrientalProvider({ children }: OrientalProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-[#090807] text-[#f4eae0]">{children}</div>;
  }

  return (
    <div className="relative min-h-screen bg-[#090807] text-[#f4eae0] overflow-hidden">
      {/* 1. 신비로운 전통 안개 효과 레이어 */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]">
        <div 
          className="absolute inset-0 animate-mist"
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.015\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')",
            backgroundSize: "300px 300px",
          }}
        />
      </div>

      {/* 2. 주막의 일렁이는 등불 불빛 효과 (우측 상단, 좌측 하단) */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-600/10 blur-[120px] animate-flicker z-0" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-orange-600/5 blur-[120px] animate-flicker z-0" />

      {/* 3. 한국식 은은한 고전 격자 무늬 배경 오버레이 (아주 미세하게 세련됨) */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #d97706 1px, transparent 1px),
            linear-gradient(to bottom, #d97706 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px"
        }}
      />

      {/* 4. 메인 콘텐츠 */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
