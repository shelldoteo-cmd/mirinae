"use client";

import React, { useEffect, useState } from "react";
import { Database, Loader2, ArrowRight, Pencil, Check } from "lucide-react";
import type { ScriptLength } from "./Step1ThemeInput";
import { SCRIPT_LENGTH_OPTIONS } from "./Step1ThemeInput";

interface Step4PlotPlanCreationProps {
  setCurrentStep: (step: number) => void;
  plotPlan: any;
  setPlotPlan: (plan: any) => void;
  loading: boolean;
  actScripts: Record<number, string>;
  failedActs: number[];
  generatingActNum: number;
  actGenProgress: string;
  llmConfig: any;
  handleRetryAct: (actNumber: number) => void;
  handleGenerateFullScript: () => void;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
  scriptLength: ScriptLength;
}

export default function Step4PlotPlanCreation({
  setCurrentStep,
  plotPlan,
  setPlotPlan,
  loading,
  actScripts,
  failedActs,
  generatingActNum,
  actGenProgress,
  llmConfig,
  handleRetryAct,
  handleGenerateFullScript,
  terminalEndRef,
  scriptLength,
}: Step4PlotPlanCreationProps) {
  const [editingAct, setEditingAct] = useState<number | null>(null);

  const totalActs = SCRIPT_LENGTH_OPTIONS[scriptLength].acts;
  const actLabels = ["기", "승", "전", "결", "미"];

  // 터미널 자동 스크롤
  useEffect(() => {
    if (loading && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, actScripts, actGenProgress, terminalEndRef]);

  const handleActFieldChange = (actNumber: number, field: string, value: string) => {
    if (!plotPlan) return;
    const updatedActs = plotPlan.acts.map((act: any) =>
      act.actNumber === actNumber ? { ...act, [field]: value } : act
    );
    setPlotPlan({ ...plotPlan, acts: updatedActs });
  };

  const handleLessonChange = (value: string) => {
    if (!plotPlan) return;
    setPlotPlan({ ...plotPlan, lesson: value });
  };

  return (
    <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
      <div className="border-b border-amber-600/10 pb-4">
        <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-500 animate-pulse" />
          {totalActs}막 대본 생성
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          선택한 후킹을 기반으로 AI가 {totalActs}막 대본을 막별로 순차 생성합니다.
          각 막의 시놉시스를 클릭하여 직접 편집할 수 있습니다.
        </p>
      </div>

      {/* 플롯 설계 보드 표시 */}
      {plotPlan && !loading && (
        <div className="space-y-4 flex-1">
          {/* 교훈 (편집 가능) */}
          <div className="p-4 bg-amber-950/15 border border-amber-800/20 rounded-xl text-xs text-amber-400 leading-relaxed">
            <div className="flex items-center justify-between mb-1">
              <strong>⚖️ {totalActs}막 교훈:</strong>
            </div>
            <input
              type="text"
              value={plotPlan.lesson}
              onChange={(e) => handleLessonChange(e.target.value)}
              className="w-full bg-transparent border-b border-amber-600/20 focus:border-amber-500 text-amber-400 text-xs py-1 outline-none"
            />
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-${totalActs} gap-3.5`} style={{ gridTemplateColumns: `repeat(${totalActs}, minmax(0, 1fr))` }}>
            {plotPlan.acts.slice(0, totalActs).map((act: any) => {
              const isEditing = editingAct === act.actNumber;
              return (
                <div key={act.actNumber} className="glass-panel p-4 border-amber-600/10 flex flex-col gap-2 bg-[#12100e]/50">
                  <div className="flex items-center justify-between border-b border-amber-600/10 pb-1">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                      제 {act.actNumber}막 - {actLabels[act.actNumber - 1] || ""}
                    </span>
                    <button
                      onClick={() => setEditingAct(isEditing ? null : act.actNumber)}
                      className={`text-[10px] flex items-center gap-0.5 transition ${isEditing ? "text-emerald-400" : "text-neutral-500 hover:text-amber-400"}`}
                      title={isEditing ? "편집 완료" : "시놉시스 편집"}
                    >
                      {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                      {isEditing ? "확정" : "편집"}
                    </button>
                  </div>

                  {isEditing ? (
                    /* 편집 모드 */
                    <div className="flex flex-col gap-2 text-[11px]">
                      <div>
                        <label className="text-neutral-500 block mb-0.5">제목</label>
                        <input
                          value={act.title}
                          onChange={(e) => handleActFieldChange(act.actNumber, "title", e.target.value)}
                          className="w-full bg-[#0a0908] border border-amber-600/20 rounded px-2 py-1.5 text-neutral-200 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-500 block mb-0.5">시놉시스</label>
                        <textarea
                          value={act.synopsis}
                          onChange={(e) => handleActFieldChange(act.actNumber, "synopsis", e.target.value)}
                          rows={3}
                          className="w-full bg-[#0a0908] border border-amber-600/20 rounded px-2 py-1.5 text-neutral-200 text-[11px] resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-500 block mb-0.5">주요 대사</label>
                        <input
                          value={act.keyLines}
                          onChange={(e) => handleActFieldChange(act.actNumber, "keyLines", e.target.value)}
                          className="w-full bg-[#0a0908] border border-amber-600/20 rounded px-2 py-1.5 text-neutral-200 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-500 block mb-0.5">복선 설정</label>
                        <input
                          value={act.foreshadowingDetails}
                          onChange={(e) => handleActFieldChange(act.actNumber, "foreshadowingDetails", e.target.value)}
                          className="w-full bg-[#0a0908] border border-amber-600/20 rounded px-2 py-1.5 text-neutral-200 text-[11px]"
                        />
                      </div>
                    </div>
                  ) : (
                    /* 보기 모드 */
                    <>
                      <h4 className="text-xs font-semibold text-neutral-200 serif-title leading-relaxed">{act.title}</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed mt-1">{act.synopsis}</p>
                      <div className="mt-auto pt-2 border-t border-neutral-900 text-[10px] text-neutral-500 space-y-1">
                        <p><strong>주요사:</strong> {act.keyLines}</p>
                        <p><strong>복선:</strong> {act.foreshadowingDetails}</p>
                      </div>
                    </>
                  )}

                  <div className="mt-2 pt-2 border-t border-amber-600/10 flex flex-col gap-1.5 text-[10px]">
                    {actScripts[act.actNumber] ? (
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>✓ 완료</span>
                        <span className="text-[9px] font-normal text-neutral-400">({actScripts[act.actNumber].length}자)</span>
                      </div>
                    ) : failedActs.includes(act.actNumber) ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-red-400 font-bold">✗ 실패</span>
                        <button
                          onClick={() => handleRetryAct(act.actNumber)}
                          className="w-full py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 hover:border-red-500 rounded text-[9px] font-bold text-red-300 transition"
                        >
                          개별 재시도
                        </button>
                      </div>
                    ) : Object.keys(actScripts).length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-neutral-500">대기 중</span>
                        <button
                          onClick={() => handleRetryAct(act.actNumber)}
                          className="w-full py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-600/40 rounded text-[9px] font-semibold text-neutral-300 transition"
                        >
                          개별 생성
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-500">대기 중</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {Object.keys(actScripts).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-amber-600/20 rounded-xl bg-neutral-950/20">
              <p className="text-sm font-semibold text-amber-500 mb-2">대본 생성 준비 완료</p>
              <p className="text-xs text-neutral-500 text-center max-w-lg mb-4">
                버튼을 누르면 1막부터 {totalActs}막까지 순차적으로 대본을 생성합니다. 완료 후 자동으로 검수까지 진행됩니다.
              </p>
              <button
                onClick={handleGenerateFullScript}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl transition duration-300 hover:scale-105 shadow-lg shadow-amber-900/30 text-sm"
              >
                대본 연속 생성 시작
              </button>
            </div>
          ) : failedActs.length > 0 ? (
            <div className="flex flex-col items-center justify-center p-6 border border-red-500/20 rounded-xl bg-red-950/5">
              <p className="text-sm font-semibold text-red-400 mb-1">일부 대본 생성 중 에러가 발생했습니다.</p>
              <p className="text-xs text-neutral-400 text-center max-w-lg mb-3">
                실패한 막의 [개별 재시도] 버튼을 눌러 해당 막만 다시 생성할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 border border-emerald-500/20 rounded-xl bg-emerald-950/5">
              <p className="text-sm font-semibold text-emerald-400 mb-1">모든 막의 대본 생성이 완료되었습니다.</p>
              <p className="text-xs text-neutral-400 text-center max-w-lg mb-3">
                자동으로 검수 단계로 넘어가지 않았다면, 아래 버튼으로 전체 대본 병합 및 검수를 재시작할 수 있습니다.
              </p>
              <button
                onClick={handleGenerateFullScript}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-lg text-xs transition"
              >
                전체 병합 및 검수 재시작
              </button>
            </div>
          )}
        </div>
      )}

      {/* 집필 작동 시 리얼타임 터미널 롤러 화면 */}
      {loading && (
        <div className="flex-1 flex flex-col gap-4">
          {/* 선형 프로그레스 바 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-500 font-bold flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {actGenProgress}
              </span>
              <span className="text-neutral-400 font-mono">
                {generatingActNum <= totalActs ? `${Math.round(generatingActNum / totalActs * 100)}% 완료` : "99% 완료"}
              </span>
            </div>
            <div className="w-full bg-neutral-900 border border-neutral-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-600 h-full transition-all duration-500 ease-out shadow-inner"
                style={{ width: `${generatingActNum <= totalActs ? Math.round(generatingActNum / totalActs * 100) : 99}%` }}
              />
            </div>
          </div>

          {/* 터미널 스크롤러 창 */}
          <div className="flex-1 bg-black/80 border border-amber-600/20 rounded-xl p-4 font-mono text-xs text-[#ced4da] leading-relaxed flex flex-col gap-3 min-h-[300px] overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-neutral-900 pb-2 text-neutral-500 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600/80" />
              <span className="ml-2 font-mono text-[10px]">GENERATOR_LOG</span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 scroll-smooth">
              <p className="text-amber-600/80">[SYSTEM] Generator initialized.</p>
              <p className="text-neutral-500">[SYSTEM] Model: {llmConfig.model}</p>

              {/* 1막부터 순서대로 대본 누적 보여주기 */}
              {Object.entries(actScripts).map(([num, txt]) => (
                <div key={num} className="space-y-1 bg-[#100c0a]/50 p-2.5 rounded border border-neutral-900">
                  <span className="text-amber-500 font-semibold">[제 {num}막 작성 본체 - {txt.length}자]</span>
                  <p className="line-clamp-6 text-neutral-400 whitespace-pre-line text-[11px] leading-relaxed">{txt}</p>
                </div>
              ))}

              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-amber-600/10">
        <button
          disabled={loading}
          onClick={() => setCurrentStep(3)}
          className="px-5 py-2.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition text-sm disabled:opacity-50"
        >
          이전으로
        </button>
      </div>
    </section>
  );
}
