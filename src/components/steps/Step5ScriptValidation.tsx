"use client";

import React, { useState } from "react";
import { ShieldCheck, RotateCcw, BookOpen, FileText, Download, ArrowRight, Sparkles } from "lucide-react";
import { parseScriptForViewer } from "../WebViewerModal";

interface Step5ScriptValidationProps {
  setCurrentStep: (step: number) => void;
  loading: boolean;
  finalScript: string;
  validationResult: any;
  handleReValidate: () => void;
  handleRefineScript: () => void;
  setShowFullViewer: (show: boolean) => void;
  topic: string;
  selectedType: any;
  handleGoToTtsStep: () => void;
}

export default function Step5ScriptValidation({
  setCurrentStep,
  loading,
  finalScript,
  validationResult,
  handleReValidate,
  handleRefineScript,
  setShowFullViewer,
  topic,
  selectedType,
  handleGoToTtsStep,
}: Step5ScriptValidationProps) {
  const [scriptViewTab, setScriptViewTab] = useState<"viewer" | "raw">("viewer");

  const downloadTextFile = (content: string, filename: string, mimeType: string = "text/plain") => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parsedLines = parseScriptForViewer(finalScript);

  return (
    <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
      <div className="border-b border-amber-600/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            대본 품질 검수 결과
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            글자 수, 복선 구조, 교훈, 메타데이터 부착률, 잔혹 표현 차단율을 종합 검수한 결과입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReValidate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-600/30 hover:border-amber-500 text-xs font-semibold text-amber-500 transition disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 재검수
          </button>
          {validationResult && !validationResult.overallPassed && (
            <button
              onClick={handleRefineScript}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black text-xs font-bold transition disabled:opacity-50 shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" /> 자동 개선
            </button>
          )}
        </div>
      </div>

      {validationResult ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          {/* 좌측: 검수 요약 패널 */}
          <div className="md:col-span-2 space-y-4">
            {/* 게이지 바들 */}
            <div className="glass-panel p-5 border-amber-600/10 space-y-4 bg-[#12100e]/30">
              <span className="text-sm font-semibold text-neutral-200 block border-b border-amber-600/10 pb-2">📊 품질 지표</span>

              {/* 1. 글자 수 게이지 */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium">전체 대본 글자 수</span>
                    <span className="font-mono text-neutral-400 font-bold">
                      {validationResult.charCount.toLocaleString()} 자
                    </span>
                  </div>
                  <div className="w-full bg-neutral-900 border border-neutral-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-neutral-600 h-full"
                      style={{ width: `${Math.min((validationResult.charCount / 10000) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-amber-400 font-semibold">순수 텍스트 (목표: 10,000자 이상)</span>
                    <span className={`font-mono font-bold ${validationResult.pureTextCharCount >= 10000 ? "text-emerald-400" : "text-red-400"}`}>
                      {validationResult.pureTextCharCount ? validationResult.pureTextCharCount.toLocaleString() : 0} 자
                    </span>
                  </div>
                  <div className="w-full bg-neutral-900 border border-neutral-800 h-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${validationResult.pureTextCharCount >= 10000 ? "bg-emerald-600 shadow-emerald-500/20" : "bg-amber-600 shadow-amber-500/20"}`}
                      style={{ width: `${Math.min(((validationResult.pureTextCharCount || 0) / 10000) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. TTS 메타데이터 커버리지 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-300 font-medium">TTS 메타데이터 부착률</span>
                  <span className="font-mono text-amber-500 font-bold">{validationResult.metadataCoveragePercentage}% 완료</span>
                </div>
                <div className="w-full bg-neutral-900 border border-neutral-800 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-600 h-full transition-all duration-300"
                    style={{ width: `${validationResult.metadataCoveragePercentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{validationResult.metadataCoverageDetails}</p>
              </div>
            </div>

            {/* 체크리스트 디테일 */}
            <div className="glass-panel p-5 border-amber-600/10 space-y-3.5 bg-[#12100e]/30">
              <div className="flex items-center justify-between border-b border-amber-600/10 pb-2">
                <span className="text-sm font-semibold text-neutral-200">📋 상세 심사 분석</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  validationResult.overallPassed 
                    ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700/50" 
                    : "bg-red-900/50 text-red-400 border border-red-700/50"
                }`}>
                  {validationResult.overallPassed ? "✅ 종합 통과" : "⚠️ 개선 필요"}
                </span>
              </div>
              
              <div className="space-y-3 text-xs">
                {/* 후킹 분석 */}
                <div className="flex gap-2.5 items-start">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${validationResult.hasHook ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  <div>
                    <strong className="text-neutral-200">1. 도입부 시청자 1분 후킹:</strong>
                    <p className="text-neutral-400 mt-0.5 leading-relaxed">{validationResult.hookCheckDetails}</p>
                  </div>
                </div>

                {/* 복선 회수 */}
                <div className="flex gap-2.5 items-start">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${validationResult.hasForeshadowingResolved ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  <div>
                    <strong className="text-neutral-200">2. 3막 복선 & 4막 극적 회수 구조:</strong>
                    <p className="text-neutral-400 mt-0.5 leading-relaxed">{validationResult.foreshadowingDetails}</p>
                  </div>
                </div>

                {/* 결말 교훈 */}
                <div className="flex gap-2.5 items-start">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${validationResult.hasLesson ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  <div>
                    <strong className="text-neutral-200">3. 결말 교훈:</strong>
                    <p className="text-neutral-400 mt-0.5 leading-relaxed">{validationResult.lessonDetails}</p>
                  </div>
                </div>

                {/* 피/잔혹 방지 */}
                <div className="flex gap-2.5 items-start">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${validationResult.isCrueltyMinimized ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  <div>
                    <strong className="text-neutral-200">4. 노란 딱지 방지(잔혹 표현 최소화):</strong>
                    <p className="text-neutral-400 mt-0.5 leading-relaxed">{validationResult.crueltyDetails}</p>
                  </div>
                </div>

                {/* AI 번역투 감지 */}
                <div className="flex gap-2.5 items-start">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${validationResult.isTranslationToneClean ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <div>
                    <strong className="text-neutral-200">5. AI 번역투 감지 ({validationResult.translationToneCount ?? 0}회):</strong>
                    <p className="text-neutral-400 mt-0.5 leading-relaxed">{validationResult.translationToneDetails || "분석 데이터 없음"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 대본 미리 보기 첩 및 웹뷰어 통합 */}
          <div className="glass-panel p-5 border-amber-600/10 flex flex-col gap-3.5 bg-[#12100e]/50 text-xs">
            <div className="flex items-center justify-between border-b border-amber-600/10 pb-2">
              <span className="text-sm font-semibold text-amber-500 serif-title">
                📜 최종 대본 뷰어
              </span>
              <button
                onClick={() => setShowFullViewer(true)}
                className="px-2 py-1 bg-amber-950/40 border border-amber-600/30 hover:border-amber-500 text-[10px] text-amber-500 rounded font-semibold transition"
              >
                📖 전체화면 뷰어
              </button>
            </div>

            {/* 원문 코드 vs 웹뷰어 탭 전환기 */}
            <div className="flex border-b border-neutral-800 text-[10px] gap-1">
              <button
                onClick={() => setScriptViewTab("viewer")}
                className={`px-3 py-1.5 font-bold transition flex items-center gap-1 border-b-2 rounded-t ${
                  scriptViewTab === "viewer"
                    ? "border-amber-500 text-amber-400 bg-amber-950/10"
                    : "border-transparent text-neutral-450 hover:text-neutral-200"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                웹뷰어
              </button>
              <button
                onClick={() => setScriptViewTab("raw")}
                className={`px-3 py-1.5 font-bold transition flex items-center gap-1 border-b-2 rounded-t ${
                  scriptViewTab === "raw"
                    ? "border-amber-500 text-amber-400 bg-amber-950/10"
                    : "border-transparent text-neutral-450 hover:text-neutral-200"
                }`}
              >
                <FileText className="w-3 h-3" />
                원문 코드
              </button>
            </div>

            {/* 탭 내용 출력부 */}
            <div className="flex-1 bg-black/40 border border-neutral-900 rounded p-3 overflow-y-auto max-h-[350px] leading-relaxed">
              {scriptViewTab === "raw" ? (
                <div className="text-neutral-300 whitespace-pre-line font-mono text-[11px] select-all text-left">
                  {finalScript}
                </div>
              ) : (
                <div className="space-y-3.5 select-text text-left">
                  {parsedLines.map((line, lIdx) => {
                    if (line.type === "header") {
                      return (
                        <h4 key={lIdx} className="text-center font-bold text-xs text-amber-500 serif-title border-b border-amber-600/10 pb-1 mt-4">
                          {line.text}
                        </h4>
                      );
                    }
                    if (line.type === "divider") {
                      return <hr key={lIdx} className="border-amber-600/10 my-3" />;
                    }
                    if (line.type === "narration") {
                      return (
                        <div key={lIdx} className="py-2 px-3 bg-amber-950/10 border-l-2 border-amber-600/30 text-neutral-300 italic text-[11px] rounded-r leading-relaxed shadow-sm">
                          <span className="text-[9px] text-amber-600 font-bold block mb-0.5 not-italic">해설</span>
                          {line.text}
                        </div>
                      );
                    }
                    if (line.type === "dialogue") {
                      return (
                        <div key={lIdx} className="py-1 text-[11px] leading-relaxed flex items-start gap-2">
                          <span className="shrink-0 font-bold text-amber-500 font-mono w-[60px] text-right truncate pt-0.5 select-none">
                            {line.speakerName}
                          </span>
                          <span className="text-neutral-200 border-l border-neutral-800 pl-2 flex-1">
                            {line.text}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <p key={lIdx} className="text-neutral-400 text-[11px]">
                        {line.text}
                      </p>
                    );
                  })}
                  {parsedLines.length === 0 && (
                    <p className="text-center text-neutral-500 py-8 italic">대본 내용이 비어있습니다.</p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => downloadTextFile(finalScript, "script.md")}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-600/40 text-neutral-300 hover:text-white transition font-medium"
            >
              <Download className="w-3.5 h-3.5 text-amber-500" />
              script.md 로컬 즉시 저장
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 border border-dashed border-amber-600/20 rounded-xl bg-neutral-950/20">
          <ShieldCheck className="w-12 h-12 text-neutral-600" />
          <div className="text-center">
            <p className="text-sm font-semibold text-amber-500 mb-1">검수가 아직 실행되지 않았습니다</p>
            <p className="text-xs text-neutral-400 max-w-md">
              서버에서 불러온 프로젝트는 검수 결과가 저장되어 있지 않습니다.<br />
              아래 버튼으로 대본 품질 검수를 실행하세요.
            </p>
          </div>
          <button
            onClick={handleReValidate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl transition duration-300 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            검수 실행하기
          </button>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-amber-600/10">
        <button
          disabled={loading}
          onClick={() => setCurrentStep(4)}
          className="px-5 py-2.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition text-sm disabled:opacity-50"
        >
          이전으로
        </button>
        <button
          onClick={handleGoToTtsStep}
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-black font-bold text-sm transition duration-300 shadow-md"
        >
          TTS 화자 분할 및 매핑 확인
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
