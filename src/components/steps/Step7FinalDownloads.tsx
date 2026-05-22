"use client";

import React from "react";
import { Award, FileText, Database, Volume2, Layers, Music, Play, CheckCircle2, RotateCcw } from "lucide-react";

interface Step7FinalDownloadsProps {
  setCurrentStep: (step: number) => void;
  setMaxReachedStep: (step: number) => void;
  topic: string;
  keywordsString: string;
  analysis: any;
  selectedType: any;
  selectedHook: any;
  plotPlan: any;
  validationResult: any;
  finalScript: string;
  csvContent: string;
  ssmlList: any[];
  audioManifest: any[];
  ttsConfig: any;
  playPreview: (text: string, speakerId: string) => void;
  setActScripts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setFinalScript: (val: string) => void;
  setValidationResult: (val: any) => void;
  setTtsSegments: (val: any[]) => void;
}

export default function Step7FinalDownloads({
  setCurrentStep,
  setMaxReachedStep,
  topic,
  keywordsString,
  analysis,
  selectedType,
  selectedHook,
  plotPlan,
  validationResult,
  finalScript,
  csvContent,
  ssmlList,
  audioManifest,
  ttsConfig,
  playPreview,
  setActScripts,
  setFinalScript,
  setValidationResult,
  setTtsSegments,
}: Step7FinalDownloadsProps) {

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

  return (
    <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
      <div className="border-b border-amber-600/10 pb-4">
        <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500 animate-bounce" />
          산출물 다운로드
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          대본, 메타데이터, TTS 세그먼트, 오디오 파일 등 모든 산출물을 다운로드할 수 있습니다.
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        {/* 황금빛 목재 보물상자 컨셉의 산출물 첩 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 1. script.md */}
          <div className="glass-panel p-5 border-amber-500/20 bg-[#1e1712]/40 text-center flex flex-col items-center gap-3 hover:scale-[1.02] transition duration-300">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-500 border border-amber-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-400 serif-title">script.md</h4>
              <p className="text-[10px] text-neutral-400 mt-1">최종 윤색된 정식 대본 파일</p>
            </div>
            <button
              disabled={!finalScript}
              onClick={() => downloadTextFile(finalScript, "script.md")}
              className="mt-auto w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              다운로드
            </button>
          </div>

          {/* 2. story.json */}
          <div className="glass-panel p-5 border-amber-500/20 bg-[#1e1712]/40 text-center flex flex-col items-center gap-3 hover:scale-[1.02] transition duration-300">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-500 border border-amber-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-400 serif-title">story.json</h4>
              <p className="text-[10px] text-neutral-400 mt-1">서사 기획, 플롯 등을 담은 전체 메타데이터</p>
            </div>
            <button
              disabled={!plotPlan}
              onClick={() => {
                const storyObj = { topic, keywords: keywordsString.split(","), analysis, selectedType, selectedHook, plotPlan, validationResult };
                downloadTextFile(JSON.stringify(storyObj, null, 2), "story.json", "application/json");
              }}
              className="mt-auto w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              다운로드
            </button>
          </div>

          {/* 3. tts_segments.csv */}
          <div className="glass-panel p-5 border-amber-500/20 bg-[#1e1712]/40 text-center flex flex-col items-center gap-3 hover:scale-[1.02] transition duration-300">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-500 border border-amber-500/30">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-400 serif-title">tts_segments.csv</h4>
              <p className="text-[10px] text-neutral-400 mt-1">각 오디오 편집 매핑용 기재 데이터 시트</p>
            </div>
            <button
              disabled={!csvContent}
              onClick={() => downloadTextFile(csvContent, "tts_segments.csv")}
              className="mt-auto w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              다운로드
            </button>
          </div>

          {/* 4. ssml_segments.json */}
          <div className="glass-panel p-5 border-amber-500/20 bg-[#1e1712]/40 text-center flex flex-col items-center gap-3 hover:scale-[1.02] transition duration-300">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-500 border border-amber-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-400 serif-title">ssml_segments.json</h4>
              <p className="text-[10px] text-neutral-400 mt-1">목소리 높낮이, 딜레이 태그가 적용된 SSML 정보</p>
            </div>
            <button
              disabled={ssmlList.length === 0}
              onClick={() => downloadTextFile(JSON.stringify(ssmlList, null, 2), "ssml_segments.json", "application/json")}
              className="mt-auto w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              다운로드
            </button>
          </div>

          {/* 5. audio_manifest.json */}
          <div className="glass-panel p-5 border-amber-500/20 bg-[#1e1712]/40 text-center flex flex-col items-center gap-3 hover:scale-[1.02] transition duration-300">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-500 border border-amber-500/30">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-400 serif-title">audio_manifest.json</h4>
              <p className="text-[10px] text-neutral-400 mt-1">합성된 개별 MP3 파일군 오디오 리스트 명세서</p>
            </div>
            <button
              disabled={audioManifest.length === 0}
              onClick={() => downloadTextFile(JSON.stringify(audioManifest, null, 2), "audio_manifest.json", "application/json")}
              className="mt-auto w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              다운로드
            </button>
          </div>
        </div>

        {/* 오디오 파일 재생 보드 */}
        <div className="glass-panel p-5 border-amber-600/10 bg-black/20 flex flex-col gap-4 text-xs">
          <span className="text-sm font-semibold text-neutral-200 border-b border-neutral-850 pb-2 block">
            🎵 합성된 실제 오디오 파일 목록 재생 테스트 (서버에 기록된 개별 MP3 파일군)
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
            {audioManifest.map((au) => (
              <div key={au.id} className="p-2.5 bg-neutral-950 border border-neutral-900 rounded-lg flex items-center justify-between gap-3 text-xs">
                <div className="truncate text-left">
                  <span className="font-mono text-[10px] text-amber-500 mr-2">[{au.fileName}]</span>
                  <span className="font-medium text-neutral-300">{au.text}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-850 text-neutral-500">
                    {au.speakerId}
                  </span>
                  <button
                    onClick={() => {
                      if (ttsConfig.isSimulation) {
                        // 시뮬레이션일 경우 브라우저 TTS 프리뷰 재생
                        playPreview(au.text, au.speakerId);
                      } else {
                        // 실 서버 저장 경로에서 오디오 바로 재생
                        const audio = new Audio(au.audioPath);
                        audio.play().catch(e => {
                          console.error("Audio play error, falling back to synthesis preview:", e);
                          playPreview(au.text, au.speakerId);
                        });
                      }
                    }}
                    className="p-1.5 bg-[#d97706]/10 border border-[#d97706]/30 hover:border-[#d97706]/75 hover:bg-[#d97706]/20 text-[#d97706] rounded-md transition shrink-0"
                    title="오디오 재생"
                  >
                    <Play className="w-3.5 h-3.5 fill-[#d97706]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-amber-950/10 border border-amber-600/10 rounded-xl flex items-start gap-3 text-left">
          <CheckCircle2 className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-400 serif-title">모든 산출물 생성 완료</p>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              모든 파일이 <code className="text-amber-500 bg-black/40 px-1 py-0.5 rounded text-[11px] font-mono">output/</code> 폴더에 저장되었습니다. 위의 버튼으로 개별 다운로드하실 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-amber-600/10">
        <button
          onClick={() => setCurrentStep(6)}
          className="px-5 py-2.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition text-sm"
        >
          이전으로
        </button>
        <button
          onClick={() => {
            setCurrentStep(1);
            setMaxReachedStep(1);
            setActScripts({});
            setFinalScript("");
            setValidationResult(null);
            setTtsSegments([]);
          }}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 border border-neutral-800 hover:border-amber-600/40 text-neutral-300 hover:text-white transition text-xs font-semibold rounded-lg"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          새로운 야담 대본 기획하기
        </button>
      </div>
    </section>
  );
}
