"use client";

import React, { useState } from "react";
import { BookOpen, Download } from "lucide-react";

export const SPEAKERS = [
  { id: "narrator_main", name: "해설 (narrator_main)", role: "차분하고 장중한 메인 화자", tone: "ko-KR-Neural2-C" },
  { id: "male_1", name: "남성 1 (male_1)", role: "젊은 나그네, 청년 주인공", tone: "ko-KR-Wavenet-C" },
  { id: "male_2", name: "남성 2 (male_2)", role: "심술궂은 대감, 장년 악역", tone: "ko-KR-Wavenet-I" },
  { id: "female_1", name: "여성 1 (female_1)", role: "단아한 낭자, 다정한 아낙", tone: "ko-KR-Neural2-A" },
  { id: "female_2", name: "여성 2 (female_2)", role: "기묘한 노파, 절규하는 아내", tone: "ko-KR-Neural2-B" },
  { id: "elder_1", name: "노인 (elder_1)", role: "지혜로운 촌장, 도승, 훈장", tone: "ko-KR-Wavenet-D" },
  { id: "ghost_1", name: "원혼 (ghost_1)", role: "오싹하고 서늘한 귀신, 요괴", tone: "ko-KR-Wavenet-B" },
];

export interface ParsedViewerLine {
  type: "header" | "divider" | "narration" | "dialogue" | "plain";
  speakerName?: string;
  speakerId?: string;
  text: string;
}

export function parseScriptForViewer(script: string): ParsedViewerLine[] {
  if (!script) return [];
  const lines = script.split("\n");
  const result: ParsedViewerLine[] = [];
  
  const speechPattern = /^\((N|대사)\)\[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+),\s*(\d+)\]\s*(.*)$/;
  const mediaPattern = /^\((BGM|E)\)\[([^\]]+)\]/;

  const getSpeakerName = (id: string) => {
    const sp = SPEAKERS.find(s => s.id === id);
    if (sp) {
      return sp.name.split(" ")[0]; // 예: "해설 (narrator_main)" -> "해설"
    }
    return id === "narrator_main" ? "해설" : id;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#")) {
      result.push({
        type: "header",
        text: trimmed.replace(/^#+\s*/, "").trim()
      });
      continue;
    }

    if (trimmed.startsWith("---")) {
      result.push({
        type: "divider",
        text: ""
      });
      continue;
    }

    const speechMatch = trimmed.match(speechPattern);
    if (speechMatch) {
      const [, typeStr, speakerId, , , rawText] = speechMatch;
      
      let cleanText = rawText.trim();
      // 감정 괄호 및 텍스트 제거
      cleanText = cleanText.replace(/^\([^)]+\)\s*/g, ""); // 문장 앞부분
      cleanText = cleanText.replace(/\s*\([^)]+\)/g, "");   // 문장 중간/뒷부분

      result.push({
        type: typeStr === "N" ? "narration" : "dialogue",
        speakerId,
        speakerName: getSpeakerName(speakerId),
        text: cleanText
      });
      continue;
    }

    const mediaMatch = trimmed.match(mediaPattern);
    if (mediaMatch) {
      // BGM/E 미디어는 뷰어에서 숨김
      continue;
    }

    if (!trimmed.startsWith("(") && !trimmed.startsWith("[")) {
      result.push({
        type: "plain",
        text: trimmed
      });
    }
  }

  return result;
}

interface WebViewerModalProps {
  setShowFullViewer: (show: boolean) => void;
  topic: string;
  selectedType: any;
  finalScript: string;
  validationResult: any;
}

export default function WebViewerModal({
  setShowFullViewer,
  topic,
  selectedType,
  finalScript,
  validationResult,
}: WebViewerModalProps) {
  const [viewerFontSize, setViewerFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");

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
    <div className="fixed inset-0 z-50 bg-[#0d0a08]/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl bg-[#161310] border border-amber-500/20 rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden max-h-[850px]">
        {/* 모달 상단 헤더 */}
        <div className="p-4 md:p-5 border-b border-amber-600/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <div className="text-left">
              <h3 className="text-sm md:text-base serif-title text-amber-400 font-bold">📖 미리내야담 대본 웹뷰어</h3>
              <p className="text-[10px] md:text-xs text-neutral-400 mt-0.5">
                {topic || "제목 없음"} · 깨끗한 대본 본문 보기 (나레이션 코드/감정 배제)
              </p>
            </div>
          </div>
          
          {/* 글자 크기 제어 및 닫기 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-[10px] md:text-xs">
              <button
                onClick={() => setViewerFontSize("sm")}
                className={`px-2 py-1 rounded transition ${viewerFontSize === "sm" ? "bg-amber-600 text-black font-bold" : "text-neutral-400 hover:text-white"}`}
              >
                작게
              </button>
              <button
                onClick={() => setViewerFontSize("base")}
                className={`px-2 py-1 rounded transition ${viewerFontSize === "base" ? "bg-amber-600 text-black font-bold" : "text-neutral-400 hover:text-white"}`}
              >
                보통
              </button>
              <button
                onClick={() => setViewerFontSize("lg")}
                className={`px-2 py-1 rounded transition ${viewerFontSize === "lg" ? "bg-amber-600 text-black font-bold" : "text-neutral-400 hover:text-white"}`}
              >
                크게
              </button>
              <button
                onClick={() => setViewerFontSize("xl")}
                className={`px-2 py-1 rounded transition ${viewerFontSize === "xl" ? "bg-amber-600 text-black font-bold" : "text-neutral-400 hover:text-white"}`}
              >
                대형
              </button>
            </div>
            
            <button
              onClick={() => setShowFullViewer(false)}
              className="px-2.5 py-1.5 bg-[#d97706]/10 hover:bg-[#d97706]/20 border border-[#d97706]/30 rounded-lg text-amber-500 hover:text-amber-400 transition text-xs font-bold"
            >
              ✕ 닫기
            </button>
          </div>
        </div>

        {/* 모달 본문 - 스페셜 서체 리더 */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-[#120f0c] space-y-6 scrollbar-thin scrollbar-thumb-amber-700">
          <div className={`max-w-2xl mx-auto space-y-5 md:space-y-7 text-left
            ${viewerFontSize === "sm" ? "text-xs leading-relaxed" : ""}
            ${viewerFontSize === "base" ? "text-sm leading-relaxed md:leading-loose" : ""}
            ${viewerFontSize === "lg" ? "text-base leading-loose md:text-lg" : ""}
            ${viewerFontSize === "xl" ? "text-lg leading-loose md:text-xl" : ""}
          `}>
            {/* 대본 제목 */}
            <div className="text-center py-6 space-y-2 border-b border-amber-600/10">
              <span className="text-amber-500 font-semibold text-[10px] md:text-xs tracking-widest block uppercase">PREVIEW CLEAN SCRIPT</span>
              <h1 className="serif-title text-xl md:text-2xl text-amber-400 font-extrabold">{topic || "미리내야담"}</h1>
              {selectedType && (
                <p className="text-[10px] md:text-xs text-neutral-450 italic">야담 유형: {selectedType.name} ({selectedType.tone})</p>
              )}
            </div>

            {/* 대본 라인별 렌더러 */}
            {parsedLines.map((line, lIdx) => {
              if (line.type === "header") {
                return (
                  <h2 key={lIdx} className="text-center font-bold text-amber-500 serif-title border-b border-amber-600/20 pb-2 pt-6 text-lg md:text-xl">
                    {line.text}
                  </h2>
                );
              }
              if (line.type === "divider") {
                return <hr key={lIdx} className="border-amber-600/15 my-6" />;
              }
              if (line.type === "narration") {
                return (
                  <div key={lIdx} className="py-3 px-4.5 bg-amber-950/10 border-l-4 border-amber-600/40 rounded-r text-neutral-300 italic my-4 shadow-inner">
                    <span className="text-[10px] md:text-xs text-amber-500 not-italic font-bold block mb-1">해설</span>
                    {line.text}
                  </div>
                );
              }
              if (line.type === "dialogue") {
                return (
                  <div key={lIdx} className="py-1.5 flex items-start gap-2.5 md:gap-4 my-2.5">
                    <span className="shrink-0 font-bold text-amber-500 font-mono w-[80px] md:w-[100px] text-right truncate text-[11px] md:text-xs pt-1 select-none">
                      {line.speakerName}
                    </span>
                    <span className="text-neutral-200 border-l border-neutral-800 pl-3 flex-1 select-text">
                      {line.text}
                    </span>
                  </div>
                );
              }
              return (
                <p key={lIdx} className="text-neutral-350 select-text">
                  {line.text}
                </p>
              );
            })}
            
            {parsedLines.length === 0 && (
              <p className="text-center text-neutral-500 py-12 italic">작성 완료된 최종 대본이 없습니다. 먼저 4단계에서 대본을 정상적으로 완성해 주세요.</p>
            )}
          </div>
        </div>

        {/* 모달 하단 정보 */}
        <div className="p-4 border-t border-amber-600/10 bg-black/40 flex items-center justify-between text-[10px] md:text-xs text-neutral-450">
          <div>
            <span>대본 총량: {validationResult?.charCount ? `${validationResult.charCount.toLocaleString()} 자 (순수 대사/해설: ${validationResult.pureTextCharCount.toLocaleString()} 자)` : "-"}</span>
          </div>
          <button
            onClick={() => downloadTextFile(
              parsedLines.map(l => {
                if (l.type === "header") return `\n# ${l.text}\n`;
                if (l.type === "divider") return `\n---\n`;
                if (l.type === "narration") return `[해설] ${l.text}`;
                if (l.type === "dialogue") return `${l.speakerName}: ${l.text}`;
                return l.text;
              }).join("\n"),
              `${topic || "yadam"}_clean.txt`
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded transition text-[10px] md:text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            깨끗한 텍스트 파일 저장 (.txt)
          </button>
        </div>
      </div>
    </div>
  );
}
