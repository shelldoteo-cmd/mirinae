"use client";

import React from "react";
import { Volume2, CheckCircle2, Play, ArrowRight } from "lucide-react";

interface Step3HookSelectionProps {
  setCurrentStep: (step: number) => void;
  hookCandidates: any[];
  selectedHook: any;
  setSelectedHook: (hook: any) => void;
  playPreview: (text: string, speakerId: string) => void;
  handleSelectHookAndCreatePlot: () => void;
}

export default function Step3HookSelection({
  setCurrentStep,
  hookCandidates,
  selectedHook,
  setSelectedHook,
  playPreview,
  handleSelectHookAndCreatePlot,
}: Step3HookSelectionProps) {
  return (
    <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
      <div className="border-b border-amber-600/10 pb-4">
        <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-amber-500" />
          오프닝 1분 후킹 선택
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          첫 1분에 시청자를 사로잡는 후킹 후보 3개입니다. 하나를 선택해 주세요.
        </p>
      </div>

      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {hookCandidates.map((hook, idx) => {
            const isSelected = selectedHook?.id === hook.id;
            return (
              <div
                key={hook.id}
                onClick={() => setSelectedHook(hook)}
                className={`glass-panel p-5 cursor-pointer relative border transition-all duration-300 select-none flex flex-col gap-3 hover:scale-[1.01]
                  ${isSelected ? "border-amber-500 bg-amber-950/20" : "border-amber-600/10 bg-[#161310]/50"}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-950/60 text-amber-500 border border-amber-600/20 font-semibold">
                    후보 {idx + 1}
                  </span>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-500" />}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-amber-400 serif-title leading-relaxed">{hook.title}</h4>
                  <p className="text-[10px] text-amber-600/90 font-medium mt-1">기법: {hook.technique}</p>
                </div>

                <div className="mt-2 flex-1 border-t border-amber-600/10 pt-2">
                  <p className="text-xs text-neutral-400 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line p-2 bg-black/30 rounded border border-neutral-900">
                    {hook.hookText}
                  </p>
                </div>

                {/* 미리듣기 재생 아이콘 단추 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playPreview(hook.hookText.replace(/\([^)]+\)\[[^\]]+\]/g, ""), "narrator_main");
                  }}
                  className="mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 text-xs font-semibold text-amber-500 transition"
                >
                  <Play className="w-3 h-3" />
                  목소리 미리듣기
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-amber-600/10">
        <button
          onClick={() => setCurrentStep(2)}
          className="px-5 py-2.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition text-sm"
        >
          이전으로
        </button>
        <button
          onClick={handleSelectHookAndCreatePlot}
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-black font-bold text-sm transition duration-300 shadow-md"
        >
          플롯 설계 시작
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
