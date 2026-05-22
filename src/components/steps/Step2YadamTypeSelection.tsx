"use client";

import React from "react";
import { Layers, RotateCcw, CheckCircle2, ArrowRight } from "lucide-react";

interface Step2YadamTypeSelectionProps {
  setCurrentStep: (step: number) => void;
  analysis: any;
  recommendedTypes: any[];
  selectedType: any;
  setSelectedType: (type: any) => void;
  handleGenerateHooks: () => void;
}

export default function Step2YadamTypeSelection({
  setCurrentStep,
  analysis,
  recommendedTypes,
  selectedType,
  setSelectedType,
  handleGenerateHooks,
}: Step2YadamTypeSelectionProps) {
  return (
    <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
      <div className="border-b border-amber-600/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            야담 서사유형 자동 추천 및 선택
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            AI가 주제를 분석해 가장 매혹적인 전통 야담의 틀 3가지를 도출했습니다. 
          </p>
        </div>
        <button
          onClick={() => setCurrentStep(1)}
          className="text-xs text-neutral-400 hover:text-amber-500 flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" /> 처음으로
        </button>
      </div>

      {/* 서사 기획 분석 결과 미리 보기 */}
      {analysis && (
        <div className="p-4 bg-neutral-950/40 border border-neutral-800 rounded-xl text-xs grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-amber-500 font-semibold block mb-1">🎎 등장인물 설정</span>
            <p className="text-neutral-300">{analysis.mainCharacters}</p>
          </div>
          <div>
            <span className="text-amber-500 font-semibold block mb-1">🗺️ 이야기 무대배경</span>
            <p className="text-neutral-300">{analysis.setting}</p>
          </div>
          <div>
            <span className="text-amber-500 font-semibold block mb-1">🔗 갈등 및 복선 방향</span>
            <p className="text-neutral-300">{analysis.narrativeConflict}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <span className="text-sm font-semibold text-neutral-300 block">장르 유형 3선 비교선택</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedTypes.map((type, idx) => {
            const isSelected = selectedType?.name === type.name;
            return (
              <div
                key={idx}
                onClick={() => setSelectedType(type)}
                className={`glass-panel p-5 cursor-pointer relative border transition-all duration-300 select-none flex flex-col gap-3 hover:scale-[1.01]
                  ${isSelected ? "border-amber-500 bg-amber-950/20" : "border-amber-600/10 bg-[#161310]/50"}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-950/60 text-amber-500 border border-amber-600/20 font-semibold">
                    추천 후보 {idx + 1}
                  </span>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-500" />}
                </div>

                <div>
                  <h4 className="text-base font-bold text-amber-400 serif-title">{type.name}</h4>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-3 leading-relaxed">{type.description}</p>
                </div>

                <div className="mt-auto border-t border-amber-600/10 pt-2 text-xs">
                  <p className="text-neutral-300 font-medium"><span className="text-amber-600">어조:</span> {type.tone}</p>
                  <p className="text-neutral-400 mt-1 italic">"{type.reason}"</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 선택한 유형 수동 튜닝 폼 */}
      {selectedType && (
        <div className="p-5 bg-neutral-950/40 border border-amber-600/10 rounded-xl space-y-3">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block">✍️ 세부 속성 수정 (선택사항)</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1">장르명</label>
              <input
                type="text"
                value={selectedType.name}
                onChange={(e) => setSelectedType({ ...selectedType, name: e.target.value })}
                className="w-full bg-[#12100e] border border-amber-600/20 rounded p-2 text-neutral-200"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">어조 톤</label>
              <input
                type="text"
                value={selectedType.tone}
                onChange={(e) => setSelectedType({ ...selectedType, tone: e.target.value })}
                className="w-full bg-[#12100e] border border-amber-600/20 rounded p-2 text-neutral-200"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">상세 특징</label>
              <input
                type="text"
                value={selectedType.description}
                onChange={(e) => setSelectedType({ ...selectedType, description: e.target.value })}
                className="w-full bg-[#12100e] border border-amber-600/20 rounded p-2 text-neutral-200"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-amber-600/10">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-5 py-2.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition text-sm"
        >
          이전으로
        </button>
        <button
          onClick={handleGenerateHooks}
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-black font-bold text-sm transition duration-300 shadow-md"
        >
          후킹 오프닝 3개 생성하기
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
