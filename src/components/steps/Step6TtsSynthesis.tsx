"use client";

import React from "react";
import { Volume2, Loader2, Play } from "lucide-react";
import { SPEAKERS } from "../WebViewerModal";

interface Step6TtsSynthesisProps {
  setCurrentStep: (step: number) => void;
  ttsSegments: any[];
  synthesizing: boolean;
  synthProgress: { current: number; total: number };
  ttsConfig: any;
  playPreview: (text: string, speakerId: string) => void;
  handleSynthesizeTts: () => void;
}

export default function Step6TtsSynthesis({
  setCurrentStep,
  ttsSegments,
  synthesizing,
  synthProgress,
  ttsConfig,
  playPreview,
  handleSynthesizeTts,
}: Step6TtsSynthesisProps) {
  return (
    <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
      <div className="border-b border-amber-600/10 pb-4">
        <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-amber-500 animate-pulse" />
          TTS 세그먼트 분석 및 음성 생성
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          대본에서 나레이션과 대사를 분리하고 화자별로 매핑했습니다. 보이스를 청취하고 TTS 음성을 생성할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
        {/* 좌측: 7명의 목소리 배역 보드 */}
        <div className="space-y-4 text-xs">
          <span className="text-sm font-semibold text-neutral-200 block border-b border-neutral-800 pb-1.5">👥 성우 배역 목록</span>
          
          <div className="flex flex-col gap-2.5">
            {SPEAKERS.map((sp) => {
              const voiceCount = ttsSegments.filter(s => s.speakerId === sp.id).length;
              return (
                <div key={sp.id} className="p-3 bg-[#161310]/60 border border-neutral-850 rounded-lg flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-400 serif-title">{sp.name}</span>
                    <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">
                      {voiceCount} 문장
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400">{sp.role}</p>
                  <div className="flex items-center justify-between border-t border-neutral-900 pt-1.5 text-[9px] text-neutral-500 font-mono">
                    <span>Google Voice:</span>
                    <span className="text-amber-600">{sp.tone}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측: 실제 대사 매핑 결과 리스트 및 실행 버튼 */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-200">
              🎙️ 화자 분할 대본 ({ttsSegments.length}개 세그먼트 감지됨)
            </span>

            {/* TTS 음성 생성 실행 단추 */}
            <button
              disabled={synthesizing || ttsSegments.length === 0}
              onClick={handleSynthesizeTts}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-xl text-black font-bold text-xs transition duration-300 disabled:opacity-50"
            >
              {synthesizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  합성 진행 중... ({synthProgress.current}/{synthProgress.total})
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  전체 TTS 오디오 음성 합성 시작
                </>
              )}
            </button>
          </div>

          {/* 진행률 롤링 안내 */}
          {synthesizing && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-amber-500 font-bold">
                <span>실시간 구글 TTS 합성 및 서버 파일 쓰기 중...</span>
                <span>{Math.round((synthProgress.current / (synthProgress.total || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-neutral-950 border border-neutral-900 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-600 h-full transition-all duration-300 shadow" 
                  style={{ width: `${(synthProgress.current / (synthProgress.total || 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* 리스트 본문 */}
          <div className="flex-1 bg-black/30 border border-neutral-900 rounded-xl p-4 overflow-y-auto max-h-[450px]">
            <div className="space-y-3.5 pr-1 text-xs text-left">
              {ttsSegments.map((seg, idx) => {
                const spInfo = SPEAKERS.find(s => s.id === seg.speakerId) || { name: seg.speakerId };
                const spNameOnly = spInfo.name.split(" ")[0];
                return (
                  <div key={idx} className="p-3 bg-[#13100e]/40 border border-neutral-850 rounded-lg flex gap-3.5 items-start">
                    <div className="shrink-0 flex flex-col gap-1 w-[80px]">
                      <span className="font-bold text-amber-500 font-mono truncate text-right">
                        {spNameOnly}
                      </span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-black/40 text-neutral-500 text-center uppercase tracking-wider font-mono">
                        {seg.emotion}
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="text-neutral-200 leading-relaxed">{seg.text}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[9px] text-neutral-550 border-t border-neutral-900/40 pt-1">
                        <span>종료 대기: {seg.pauseAfterMs}ms</span>
                        {seg.ssml && (
                          <span className="font-mono text-cyan-600/80">SSML 적용됨</span>
                        )}
                      </div>
                    </div>

                    {/* 오디오 미리듣기 단추 */}
                    <div className="shrink-0">
                      {(seg.type === "N" || seg.type === "대사") && (
                        <button
                          type="button"
                          onClick={() => playPreview(seg.text, seg.speakerId)}
                          className="p-1.5 bg-[#d97706]/10 border border-[#d97706]/30 hover:border-[#d97706]/75 hover:bg-[#d97706]/20 text-[#d97706] rounded-md transition"
                          title="목소리 미리듣기"
                        >
                          <Play className="w-3.5 h-3.5 fill-[#d97706]" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-amber-600/10">
        <button
          disabled={synthesizing}
          onClick={() => setCurrentStep(5)}
          className="px-5 py-2.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition text-sm disabled:opacity-50"
        >
          이전으로
        </button>
      </div>
    </section>
  );
}
