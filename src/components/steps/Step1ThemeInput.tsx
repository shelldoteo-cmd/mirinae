"use client";

import React, { useState } from "react";
import { BookOpen, ArrowRight, AlertCircle, Dices, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { getRandomPreset, CATEGORY_LABELS, TopicCategory } from "@/data/topicPresets";

export interface CustomCharacter {
  role: "주인공" | "조력자" | "악역" | "기타";
  name: string;
  title: string;
  personality: string;
}

export type ScriptLength = "short" | "medium" | "long";

export const SCRIPT_LENGTH_OPTIONS: Record<ScriptLength, { label: string; acts: number; minChars: number; desc: string }> = {
  short:  { label: "단편 (3분)", acts: 3, minChars: 3000,  desc: "유튜브 숏폼 · 3막 구성" },
  medium: { label: "중편 (7분)", acts: 4, minChars: 7000,  desc: "일반 영상 · 4막 구성" },
  long:   { label: "장편 (15분+)", acts: 5, minChars: 10000, desc: "풀 에피소드 · 5막 구성" },
};

interface Step1ThemeInputProps {
  topic: string;
  setTopic: (val: string) => void;
  keywordsString: string;
  setKeywordsString: (val: string) => void;
  validationErrors: Record<string, string>;
  handleAnalyzeInput: () => void;
  scriptLength: ScriptLength;
  setScriptLength: (val: ScriptLength) => void;
  customCharacters: CustomCharacter[];
  setCustomCharacters: (val: CustomCharacter[]) => void;
}

export default function Step1ThemeInput({
  topic,
  setTopic,
  keywordsString,
  setKeywordsString,
  validationErrors,
  handleAnalyzeInput,
  scriptLength,
  setScriptLength,
  customCharacters,
  setCustomCharacters,
}: Step1ThemeInputProps) {
  const [showCharPanel, setShowCharPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TopicCategory | undefined>(undefined);

  const handleRandomTopic = () => {
    const preset = getRandomPreset(selectedCategory);
    setTopic(preset.topic);
    setKeywordsString(preset.keywords);
  };

  const addCharacter = () => {
    if (customCharacters.length >= 4) return;
    setCustomCharacters([
      ...customCharacters,
      { role: "기타", name: "", title: "", personality: "" },
    ]);
  };

  const removeCharacter = (idx: number) => {
    setCustomCharacters(customCharacters.filter((_, i) => i !== idx));
  };

  const updateCharacter = (idx: number, field: keyof CustomCharacter, value: string) => {
    const updated = [...customCharacters];
    updated[idx] = { ...updated[idx], [field]: value };
    setCustomCharacters(updated);
  };

  return (
    <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
      <div className="border-b border-amber-600/10 pb-4">
        <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" />
          주제 및 키워드 입력
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          야담의 주제와 핵심 키워드를 입력해 주세요. AI가 이를 바탕으로 대본을 기획합니다.
        </p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {/* 주제 입력 + 랜덤 버튼 */}
        <div className="space-y-1">
          <label className="text-sm font-semibold text-neutral-300 flex items-center justify-between">
            <span>이야기 주제</span>
            <span className="text-xs text-neutral-500 font-normal">구체적일수록 더 좋은 대본이 나옵니다.</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 욕심쟁이 김대감과 도깨비의 황금 계약"
              className="flex-1 bg-[#12100e] border border-amber-600/20 rounded-lg px-4 py-3 text-neutral-200 focus:outline-none focus:border-amber-500 text-sm md:text-base korean-border"
            />
            <button
              onClick={handleRandomTopic}
              title="랜덤 주제 추천"
              className="shrink-0 px-3 py-2.5 bg-amber-950/40 border border-amber-600/30 hover:border-amber-500 hover:bg-amber-900/30 rounded-lg text-amber-500 transition flex items-center gap-1.5 text-xs font-bold"
            >
              <Dices className="w-4 h-4" />
              영감
            </button>
          </div>
          {/* 카테고리 필터 칩 */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition font-semibold ${
                !selectedCategory
                  ? "bg-amber-600/20 border-amber-500 text-amber-400"
                  : "border-neutral-800 text-neutral-500 hover:text-neutral-300"
              }`}
            >
              전체
            </button>
            {(Object.keys(CATEGORY_LABELS) as TopicCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition font-semibold ${
                  selectedCategory === cat
                    ? "bg-amber-600/20 border-amber-500 text-amber-400"
                    : "border-neutral-800 text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {CATEGORY_LABELS[cat].emoji} {CATEGORY_LABELS[cat].label}
              </button>
            ))}
          </div>
          {validationErrors.topic && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {validationErrors.topic}
            </p>
          )}
        </div>

        {/* 키워드 입력 */}
        <div className="space-y-1">
          <label className="text-sm font-semibold text-neutral-300 flex items-center justify-between">
            <span>조선시대 핵심 단어들 (쉼표로 구분)</span>
            <span className="text-xs text-neutral-500 font-normal">도입, 갈등, 분위기를 묘사할 수 있는 키워드군</span>
          </label>
          <input
            type="text"
            value={keywordsString}
            onChange={(e) => setKeywordsString(e.target.value)}
            placeholder="예: 주막, 나그네, 가야금, 한밤중, 복수"
            className="w-full bg-[#12100e] border border-amber-600/20 rounded-lg px-4 py-3 text-neutral-200 focus:outline-none focus:border-amber-500 text-sm md:text-base korean-border"
          />
          {validationErrors.keywordsString && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {validationErrors.keywordsString}
            </p>
          )}
        </div>

        {/* 📏 분량 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-neutral-300">📏 대본 분량 선택</label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(SCRIPT_LENGTH_OPTIONS) as [ScriptLength, typeof SCRIPT_LENGTH_OPTIONS["short"]][]).map(([key, opt]) => (
              <button
                key={key}
                onClick={() => setScriptLength(key)}
                className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                  scriptLength === key
                    ? "border-amber-500 bg-amber-950/30 shadow-md shadow-amber-900/20"
                    : "border-neutral-800 bg-neutral-950/30 hover:border-amber-600/40"
                }`}
              >
                <span className={`text-sm font-bold block ${scriptLength === key ? "text-amber-400" : "text-neutral-300"}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">{opt.desc}</span>
                <span className="text-[10px] text-neutral-600 block">최소 {opt.minChars.toLocaleString()}자</span>
              </button>
            ))}
          </div>
        </div>

        {/* 🎭 등장인물 커스터마이징 (접이식) */}
        <div className="border border-amber-600/10 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowCharPanel(!showCharPanel)}
            className="w-full flex items-center justify-between px-4 py-3 bg-neutral-950/40 hover:bg-neutral-900/40 transition text-sm"
          >
            <span className="font-semibold text-neutral-300 flex items-center gap-2">
              🎭 등장인물 설정
              <span className="text-[10px] text-neutral-500 font-normal">(선택사항 · 비워두면 AI가 자동 결정)</span>
            </span>
            {showCharPanel ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
          </button>

          {showCharPanel && (
            <div className="p-4 space-y-3 bg-[#0e0c0a]/50">
              {customCharacters.map((char, idx) => (
                <div key={idx} className="grid grid-cols-[80px_1fr_1fr_1fr_32px] gap-2 items-center text-xs">
                  <select
                    value={char.role}
                    onChange={(e) => updateCharacter(idx, "role", e.target.value)}
                    className="bg-[#12100e] border border-amber-600/20 rounded px-1.5 py-2 text-neutral-200 text-[11px]"
                  >
                    <option value="주인공">주인공</option>
                    <option value="조력자">조력자</option>
                    <option value="악역">악역</option>
                    <option value="기타">기타</option>
                  </select>
                  <input
                    value={char.name}
                    onChange={(e) => updateCharacter(idx, "name", e.target.value)}
                    placeholder="이름 (예: 김도령)"
                    className="bg-[#12100e] border border-amber-600/20 rounded px-2 py-2 text-neutral-200"
                  />
                  <input
                    value={char.title}
                    onChange={(e) => updateCharacter(idx, "title", e.target.value)}
                    placeholder="신분 (예: 양반집 셋째)"
                    className="bg-[#12100e] border border-amber-600/20 rounded px-2 py-2 text-neutral-200"
                  />
                  <input
                    value={char.personality}
                    onChange={(e) => updateCharacter(idx, "personality", e.target.value)}
                    placeholder="성격 한 줄"
                    className="bg-[#12100e] border border-amber-600/20 rounded px-2 py-2 text-neutral-200"
                  />
                  <button
                    onClick={() => removeCharacter(idx)}
                    className="text-red-500 hover:text-red-400 transition p-1"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {customCharacters.length < 4 && (
                <button
                  onClick={addCharacter}
                  className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition font-semibold px-2 py-1.5 border border-dashed border-amber-600/20 rounded-lg hover:border-amber-500/40 w-full justify-center"
                >
                  <Plus className="w-3.5 h-3.5" /> 인물 추가 (최대 4명)
                </button>
              )}
            </div>
          )}
        </div>

        {/* 규칙 및 안내 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="p-4 bg-amber-950/10 border border-amber-800/20 rounded-lg text-xs leading-relaxed text-neutral-300 space-y-2">
            <strong className="text-amber-500 flex items-center gap-1">📜 미리내야담 대본 규칙</strong>
            <ul className="list-disc pl-4 space-y-1 text-neutral-400">
              <li><strong>글자 수:</strong> {SCRIPT_LENGTH_OPTIONS[scriptLength].minChars.toLocaleString()}자 이상 ({SCRIPT_LENGTH_OPTIONS[scriptLength].acts}막 구성)</li>
              <li><strong>1막:</strong> 극적 몰입을 위한 콜드 오픈 및 1분 후킹 포함</li>
              <li><strong>복선/회수:</strong> 중간막에 미스터리 복선 설치, 후반막에서 해소</li>
              <li><strong>마지막 막:</strong> 교훈과 결말을 제시</li>
              <li><strong>화자 포맷:</strong> <code className="text-amber-400 bg-black/40 px-1 py-0.5 rounded">(N)[narrator_main, neutral, 500]</code> 형태 필수 부착</li>
            </ul>
          </div>

          <div className="p-4 bg-neutral-900/40 border border-neutral-800 rounded-lg text-xs text-neutral-400 flex flex-col justify-center">
            <p className="font-semibold text-neutral-300 mb-1">🛠️ 집필 진행 순서</p>
            <p>기본 기획 분석 → 야담 장르 유형 추천 → 강력한 후킹 3선 택일 → {SCRIPT_LENGTH_OPTIONS[scriptLength].acts}막 구성 시놉시스 수립 → 단계별 실시간 대본 생성 → 최종 대본 윤색 및 검수 → TTS 분석 &amp; 음성 생성</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-amber-600/10">
        <button
          onClick={handleAnalyzeInput}
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-black font-bold text-sm transition duration-300 shadow-md hover:scale-[1.02]"
        >
          분석 시작
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
