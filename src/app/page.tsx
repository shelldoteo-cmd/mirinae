"use client";

import React, { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { 
  Sparkles, 
  Settings, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Play, 
  Download, 
  Database, 
  Music, 
  FileText, 
  RotateCcw, 
  CheckCircle2, 
  Volume2, 
  Loader2,
  BookOpen,
  Award,
  Layers,
  ShieldCheck,
  PackageOpen
} from "lucide-react";
import confetti from "canvas-confetti";

// -------------------------------------------------------------------
// Zod 검증 스키마
// -------------------------------------------------------------------
const inputFormSchema = z.object({
  topic: z.string().min(2, "주제는 최소 2자 이상 입력해야 합니다."),
  keywordsString: z.string().refine((val) => val.split(",").map(k => k.trim()).filter(Boolean).length >= 1, {
    message: "쉼표(,)로 구분된 키워드를 최소 1개 이상 입력해 주세요.",
  }),
});

// 화자 캐릭터 및 음색 정보 리스트
const SPEAKERS = [
  { id: "narrator_main", name: "해설 (narrator_main)", role: "차분하고 장중한 메인 화자", tone: "ko-KR-Neural2-C" },
  { id: "male_1", name: "남성 1 (male_1)", role: "젊은 나그네, 청년 주인공", tone: "ko-KR-Wavenet-C" },
  { id: "male_2", name: "남성 2 (male_2)", role: "심술궂은 대감, 장년 악역", tone: "ko-KR-Wavenet-I" },
  { id: "female_1", name: "여성 1 (female_1)", role: "단아한 낭자, 다정한 아낙", tone: "ko-KR-Neural2-A" },
  { id: "female_2", name: "여성 2 (female_2)", role: "기묘한 노파, 절규하는 아내", tone: "ko-KR-Neural2-B" },
  { id: "elder_1", name: "노인 (elder_1)", role: "지혜로운 촌장, 도승, 훈장", tone: "ko-KR-Wavenet-D" },
  { id: "ghost_1", name: "원혼 (ghost_1)", role: "오싹하고 서늘한 귀신, 요괴", tone: "ko-KR-Wavenet-B" },
];

export default function YadamDashboard() {
  // -------------------------------------------------------------------
  // 설정 정보 상태 (LLM & TTS)
  // -------------------------------------------------------------------
  const [llmConfig, setLlmConfig] = useState({
    type: "ollama",
    endpoint: "http://localhost:11434",
    apiKey: "",
    model: "deepseek-v4-pro:cloud",
  });

  const [ttsConfig, setTtsConfig] = useState({
    apiKey: "",
    isSimulation: true,
  });

  const [showSettings, setShowSettings] = useState(false);

  // -------------------------------------------------------------------
  // 애플리케이션 생성 파이프라인 상태
  // -------------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState(1); // 1~7 필수 화면
  const [maxReachedStep, setMaxReachedStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 입력 데이터
  const [topic, setTopic] = useState("욕심쟁이 김대감과 밤안개 도깨비의 황금 계약");
  const [keywordsString, setKeywordsString] = useState("황금, 주막, 밤안개, 도깨비, 궤짝, 인과응보");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // API 수신 데이터
  const [analysis, setAnalysis] = useState<any>(null);
  const [recommendedTypes, setRecommendedTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<any>(null);
  
  const [hookCandidates, setHookCandidates] = useState<any[]>([]);
  const [selectedHook, setSelectedHook] = useState<any>(null);

  const [plotPlan, setPlotPlan] = useState<any>(null);
  const [actScripts, setActScripts] = useState<Record<number, string>>({});
  const [generatingActNum, setGeneratingActNum] = useState<number>(0);
  const [actGenProgress, setActGenProgress] = useState("");

  const [finalScript, setFinalScript] = useState("");
  const [validationResult, setValidationResult] = useState<any>(null);

  const [ttsSegments, setTtsSegments] = useState<any[]>([]);
  const [ssmlList, setSsmlList] = useState<any[]>([]);
  const [csvContent, setCsvContent] = useState("");
  const [audioManifest, setAudioManifest] = useState<any[]>([]);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthProgress, setSynthProgress] = useState({ current: 0, total: 0 });

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------
  // 설정 동적 로드
  // -------------------------------------------------------------------
  useEffect(() => {
    const savedLlm = localStorage.getItem("yadam_llm_config");
    const savedTts = localStorage.getItem("yadam_tts_config");
    if (savedLlm) setLlmConfig(JSON.parse(savedLlm));
    if (savedTts) setTtsConfig(JSON.parse(savedTts));
  }, []);

  const saveSettingsToLocal = (newLlm: any, newTts: any) => {
    localStorage.setItem("yadam_llm_config", JSON.stringify(newLlm));
    localStorage.setItem("yadam_tts_config", JSON.stringify(newTts));
  };

  // -------------------------------------------------------------------
  // 단계 1: 입력 제출 및 분석 & 유형 추천
  // -------------------------------------------------------------------
  const handleAnalyzeInput = async () => {
    setValidationErrors({});
    setErrorMsg("");

    const validation = inputFormSchema.safeParse({ topic, keywordsString });
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errMap[err.path[0] as string] = err.message;
      });
      setValidationErrors(errMap);
      return;
    }

    setLoading(true);
    try {
      const keywords = keywordsString.split(",").map((k) => k.trim()).filter(Boolean);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "analyzeInput",
          llmConfig,
          topic,
          keywords,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "입력 분석 중 서버 오류가 발생했습니다.");
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setRecommendedTypes(data.recommendedTypes);
      // 첫 번째 타입을 기본값으로 자동 마크
      if (data.recommendedTypes?.length > 0) {
        setSelectedType(data.recommendedTypes[0]);
      }

      setMaxReachedStep(2);
      setCurrentStep(2);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // 단계 2: 유형 선택 및 후킹 후보 3개 생성
  // -------------------------------------------------------------------
  const handleGenerateHooks = async () => {
    if (!selectedType) {
      setErrorMsg("원하는 야담 유형을 선택하거나 수동 등록해야 합니다.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const keywords = keywordsString.split(",").map((k) => k.trim()).filter(Boolean);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "generateHook",
          llmConfig,
          topic,
          keywords,
          selectedType,
          analysis,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "후킹 후보 생성 중 오류가 발생했습니다.");
      }

      const data = await res.json();
      setHookCandidates(data.hookCandidates);
      // 첫 번째 후보 기본 선택
      if (data.hookCandidates?.length > 0) {
        setSelectedHook(data.hookCandidates[0]);
      }

      setMaxReachedStep(3);
      setCurrentStep(3);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // 단계 3: 후킹 선택 및 플롯 생성
  // -------------------------------------------------------------------
  const handleSelectHookAndCreatePlot = async () => {
    if (!selectedHook) {
      setErrorMsg("후킹 도입부 후보 3개 중 하나를 반드시 선택해야 합니다.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "generatePlot",
          llmConfig,
          topic,
          selectedType,
          selectedHook,
          analysis,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "5막 플롯 수립 중 오류가 발생했습니다.");
      }

      const data = await res.json();
      setPlotPlan(data.plotPlan);
      setMaxReachedStep(4);
      setCurrentStep(4);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // 단계 4: 5개 막 대본 순차적 고도화 생성 및 최종 병합/윤색
  // -------------------------------------------------------------------
  const handleGenerateFullScript = async () => {
    if (!plotPlan) return;
    setErrorMsg("");
    setLoading(true);
    const tempScripts: Record<number, string> = {};

    try {
      // 1막부터 5막까지 루프 돌면서 순차 빌드
      for (let act = 1; act <= 5; act++) {
        setGeneratingActNum(act);
        setActGenProgress(`제 ${act}막 대본을 생성하고 있습니다 (최소 2,000자 보장 모드)...`);

        const previousScripts = Object.entries(tempScripts)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([num, txt]) => `[제 ${num}막 대본]\n${txt}`)
          .join("\n\n");

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "generateAct",
            llmConfig,
            actNumber: act,
            topic,
            selectedType,
            plotPlan,
            previousScripts,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(`[제 ${act}막] 생성 에러: ${data.error || "오류 발생"}`);
        }

        const data = await res.json();
        tempScripts[act] = data.actScript;
        setActScripts({ ...tempScripts });
      }

      // 병합 윤색 단계 돌입
      setGeneratingActNum(6);
      setActGenProgress("5개 막의 대본 병합 완료. '미리내야담' 톤과 사극 윤색 조율 작업을 진행 중입니다...");

      const polishRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "polishedScript" || "polishScript",
          // Fallback을 위해 polishScript 및 polishedScript 둘다 호환
          llmConfig,
          topic,
          selectedType,
          actScripts: tempScripts,
        }),
      });

      // 백엔드 라우트에 맞춤: switch(step) 에 polishScript 로직 매칭됨
      const polishResRetry = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "polishScript",
          llmConfig,
          topic,
          selectedType,
          actScripts: tempScripts,
        }),
      });

      if (!polishResRetry.ok) {
        const data = await polishResRetry.json();
        throw new Error(`대본 병합/윤색 실패: ${data.error || "오류 발생"}`);
      }

      const polishData = await polishResRetry.json();
      setFinalScript(polishData.polishedScript);

      // 검수 자동 실행
      setGeneratingActNum(7);
      setActGenProgress("최종 대본 6대 품질 검수를 진행 중입니다...");

      const valRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "validateScript",
          llmConfig,
          script: polishData.polishedScript,
          plotPlan,
        }),
      });

      if (valRes.ok) {
        const valData = await valRes.json();
        setValidationResult(valData.validationResult);
      }

      setMaxReachedStep(5);
      setCurrentStep(5);
      
      // 기쁨의 팡파레!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
      setGeneratingActNum(0);
      setActGenProgress("");
    }
  };

  // -------------------------------------------------------------------
  // 단계 5: 대본 검수 결과 확인 및 재검수 요청
  // -------------------------------------------------------------------
  const handleReValidate = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const valRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "validateScript",
          llmConfig,
          script: finalScript,
          plotPlan,
        }),
      });

      if (!valRes.ok) {
        const data = await valRes.json();
        throw new Error(data.error || "대본 재검수 중 오류가 발생했습니다.");
      }

      const valData = await valRes.json();
      setValidationResult(valData.validationResult);
      
      confetti({
        particleCount: 50,
        spread: 40,
      });
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToTtsStep = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // 8단계: tts_segments 분할 API
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse",
          script: finalScript,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "대본 파싱 및 세그먼트 생성에 실패했습니다.");
      }

      const data = await res.json();
      setTtsSegments(data.segments);
      setSsmlList(data.ssmlList);
      setCsvContent(data.csvContent);

      setMaxReachedStep(6);
      setCurrentStep(6);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // 단계 6: TTS 음성 합성 호출
  // -------------------------------------------------------------------
  const handleSynthesizeTts = async () => {
    setSynthesizing(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "synthesize",
          script: finalScript,
          ttsConfig: {
            apiKey: ttsConfig.isSimulation ? "" : ttsConfig.apiKey,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "TTS 음성 합성 진행 중 오류가 발생했습니다.");
      }

      const data = await res.json();
      setAudioManifest(data.manifest);

      setMaxReachedStep(7);
      setCurrentStep(7);

      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
      });
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSynthesizing(false);
    }
  };

  // -------------------------------------------------------------------
  // 오디오 미리듣기 재생 (시뮬레이션 모드에서는 Web Speech API 사용)
  // -------------------------------------------------------------------
  const playPreview = (text: string, speakerId: string) => {
    if (!window.speechSynthesis) {
      alert("이 브라우저는 음성 재생을 지원하지 않습니다.");
      return;
    }

    // 재생 중인 다른 오디오 중단
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";

    // 화자 성별에 맞춘 브라우저 보이스 검색 대입
    const voices = window.speechSynthesis.getVoices();
    const krVoices = voices.filter(v => v.lang.includes("ko-KR"));

    if (krVoices.length > 0) {
      // 촌장(elder_1), 나그네(male_1)는 남성/속도 늦추고, 아낙(female_1), 노파(female_2)는 여성
      if (speakerId.includes("female") || speakerId === "ghost_1") {
        // 여성 보이스 매핑
        const femaleVoice = krVoices.find(v => v.name.includes("혜경") || v.name.includes("Google") || v.name.includes("Female"));
        if (femaleVoice) utterance.voice = femaleVoice;
      } else {
        const maleVoice = krVoices.find(v => v.name.includes("민상") || v.name.includes("Google") || v.name.includes("Male"));
        if (maleVoice) utterance.voice = maleVoice;
      }
    }

    // 화자별 속도 튜닝
    if (speakerId === "elder_1") utterance.rate = 0.75;
    else if (speakerId === "ghost_1") utterance.rate = 0.7;
    else utterance.rate = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  // -------------------------------------------------------------------
  // 산출물 파일 직접 다운로드 도구
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // UI 헬퍼
  // -------------------------------------------------------------------
  const stepsMenu = [
    { num: 1, name: "대본 기획" },
    { num: 2, name: "야담 유형" },
    { num: 3, name: "1분 후킹" },
    { num: 4, name: "5막 플롯" },
    { num: 5, name: "검수 분석" },
    { num: 6, name: "TTS 매핑" },
    { num: 7, name: "다운로드" },
  ];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-6 relative">
      {/* 대시보드 헤더 */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-600/20 pb-6 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-600/10 rounded-xl border border-amber-600/30 animate-flicker">
            <Sparkles className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight serif-title text-amber-500">
              미리내야담 대본 생성기
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              조선 시대 설화 & 미스터리 고품격 유튜브 오디오 극본 AI 엔진
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* TTS 설정 및 LLM 설정 토글 단추 */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-600/50 hover:bg-neutral-850 transition duration-300 text-sm font-medium"
          >
            <Settings className="w-4 h-4 text-amber-500" />
            엔진 설정
          </button>

          {/* 시뮬레이션 활성화 표시기 */}
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-amber-900/20 border border-amber-500/30">
            <span className={`w-2 h-2 rounded-full ${ttsConfig.isSimulation ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            {ttsConfig.isSimulation ? "TTS 시뮬레이션 모드" : "구글 TTS 실서버 모드"}
          </div>
        </div>
      </header>

      {/* 설정 팝업 패널 */}
      {showSettings && (
        <section className="glass-panel p-6 z-25 relative mb-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-amber-600/20 pb-3 mb-4">
            <h2 className="text-lg font-semibold text-amber-500 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              미리내야담 AI 및 TTS 코어 설정
            </h2>
            <button
              onClick={() => setShowSettings(false)}
              className="text-neutral-400 hover:text-white text-sm"
            >
              닫기
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* LLM 설정 영역 */}
            <div className="space-y-4">
              <h3 className="font-semibold border-l-2 border-amber-500 pl-2 text-neutral-200">
                1. 야담 집필 LLM 엔진 설정
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">어댑터 종류</label>
                  <select
                    value={llmConfig.type}
                    onChange={(e) => setLlmConfig({ ...llmConfig, type: e.target.value })}
                    className="w-full bg-[#12100e] border border-amber-600/20 rounded px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="ollama">OllamaAdapter (로컬/원격 Ollama API)</option>
                    <option value="deepseek">DeepSeekDirectAdapter (클라우드 Direct API)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">API Endpoint</label>
                  <input
                    type="text"
                    value={llmConfig.endpoint}
                    onChange={(e) => setLlmConfig({ ...llmConfig, endpoint: e.target.value })}
                    placeholder={llmConfig.type === "ollama" ? "http://localhost:11434" : "https://api.deepseek.com/v1"}
                    className="w-full bg-[#12100e] border border-amber-600/20 rounded px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {llmConfig.type === "deepseek" && (
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">DeepSeek API Key</label>
                    <input
                      type="password"
                      value={llmConfig.apiKey}
                      onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full bg-[#12100e] border border-amber-600/20 rounded px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">모델 이름</label>
                  <input
                    type="text"
                    value={llmConfig.model}
                    onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                    placeholder={llmConfig.type === "ollama" ? "deepseek-v4-pro:cloud" : "deepseek-chat"}
                    className="w-full bg-[#12100e] border border-amber-600/20 rounded px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* TTS 설정 영역 */}
            <div className="space-y-4">
              <h3 className="font-semibold border-l-2 border-amber-500 pl-2 text-neutral-200">
                2. Google Cloud Text-to-Speech 설정
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="isSim"
                    checked={ttsConfig.isSimulation}
                    onChange={(e) => setTtsConfig({ ...ttsConfig, isSimulation: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-500 text-black border-amber-600/30"
                  />
                  <label htmlFor="isSim" className="text-xs text-neutral-300 font-medium select-none cursor-pointer">
                    시뮬레이션 모드 활성화 (구글 API 비용 차단, 더미 무음 MP3 생성)
                  </label>
                </div>

                {!ttsConfig.isSimulation && (
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Google Cloud API Key</label>
                    <input
                      type="password"
                      value={ttsConfig.apiKey}
                      onChange={(e) => setTtsConfig({ ...ttsConfig, apiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className="w-full bg-[#12100e] border border-amber-600/20 rounded px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded text-xs text-amber-300/80 leading-relaxed">
                  <strong>💡 시뮬레이션 모드 안내:</strong><br />
                  Google Cloud API Key가 없으셔도 시뮬레이션 모드에서는 음성 합성 파이프라인(tts_segments.csv, ssml_segments.json, audio_manifest.json) 생성이 무결하게 완료됩니다. 대사별 미리보기는 웹 표준 Web Speech API를 통해 한국어 브라우저 음성으로 직접 미리 청취하실 수 있어, 실서버 비용 청구 없이 모든 기획 흐름을 완벽히 테스트할 수 있습니다.
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 border-t border-amber-600/10 pt-4">
            <button
              onClick={() => {
                setLlmConfig({
                  type: "ollama",
                  endpoint: "http://localhost:11434",
                  apiKey: "",
                  model: "deepseek-v4-pro:cloud",
                });
                setTtsConfig({ apiKey: "", isSimulation: true });
              }}
              className="px-4 py-2 rounded text-xs text-neutral-400 hover:text-white"
            >
              기본값 복원
            </button>
            <button
              onClick={() => {
                saveSettingsToLocal(llmConfig, ttsConfig);
                setShowSettings(false);
              }}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold text-black transition"
            >
              설정 저장 완료
            </button>
          </div>
        </section>
      )}

      {/* 단계별 내비게이션 바 */}
      <nav className="glass-panel p-3.5 z-10 flex justify-between items-center overflow-x-auto gap-2 md:gap-4 select-none">
        {stepsMenu.map((item) => {
          const isActive = currentStep === item.num;
          const isDone = maxReachedStep > item.num;
          const isLocked = item.num > maxReachedStep;

          return (
            <button
              key={item.num}
              disabled={isLocked || loading}
              onClick={() => setCurrentStep(item.num)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition duration-300 whitespace-nowrap
                ${isActive ? "bg-amber-600 text-black font-bold shadow" : ""}
                ${isDone && !isActive ? "text-amber-500/80 hover:bg-amber-950/20" : ""}
                ${isLocked ? "text-neutral-600 cursor-not-allowed" : "hover:bg-amber-950/10"}
              `}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border 
                ${isActive ? "border-black bg-black text-amber-500" : ""}
                ${isDone && !isActive ? "border-amber-500 bg-amber-950/30 text-amber-500" : ""}
                ${isLocked ? "border-neutral-700 bg-neutral-900 text-neutral-600" : "border-neutral-500 text-neutral-400"}
              `}>
                {isDone ? <Check className="w-3 h-3" /> : item.num}
              </span>
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* 에러 메시지 배너 */}
      {errorMsg && (
        <div className="glass-panel p-4 border-red-500/30 bg-red-950/15 flex items-center gap-3 text-sm text-red-300 z-10 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <strong>기획 생성 중 오류 발생:</strong> {errorMsg}
          </div>
          <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-white text-xs px-2 py-1">
            닫기
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 7대 메인 작업 화면 영역 */}
      {/* =================================================================== */}
      <main className="flex-1 w-full z-10 flex flex-col min-h-[450px]">
        {loading && currentStep !== 4 && (
          <div className="glass-panel p-16 flex flex-col items-center justify-center gap-4 flex-1 text-center animate-pulse">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
            <div>
              <p className="text-lg font-semibold text-amber-400 serif-title">조선 백서 기록관에 붓을 적시는 중...</p>
              <p className="text-xs text-neutral-400 mt-1">대량의 연출 템플릿과 조선 사극 서사구조를 분석하고 있습니다. 잠시만 대기해 주세요.</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* ------------------------------------------------------------- */}
            {/* 1. 입력 화면 */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 1 && (
              <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
                <div className="border-b border-amber-600/10 pb-4">
                  <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-500" />
                    야담 서사 및 핵심 키워드 봉정
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    원하시는 흥미로운 서사 주제와 조선시대 풍미의 키워드를 대령해 주십시오. AI 이야기꾼이 웅장한 전설을 기획합니다.
                  </p>
                </div>

                <div className="flex flex-col gap-4 flex-1">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-neutral-300 flex items-center justify-between">
                      <span>이야기 대주제</span>
                      <span className="text-xs text-neutral-500 font-normal">구체적인 뼈대를 적을수록 야담이 풍부해집니다.</span>
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="예: 욕심쟁이 김대감과 도깨비의 황금 계약"
                      className="w-full bg-[#12100e] border border-amber-600/20 rounded-lg px-4 py-3 text-neutral-200 focus:outline-none focus:border-amber-500 text-sm md:text-base korean-border"
                    />
                    {validationErrors.topic && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {validationErrors.topic}
                      </p>
                    )}
                  </div>

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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-4 bg-amber-950/10 border border-amber-800/20 rounded-lg text-xs leading-relaxed text-neutral-300 space-y-2">
                      <strong className="text-amber-500 flex items-center gap-1">📜 미리내야담 대본 규칙</strong>
                      <ul className="list-disc pl-4 space-y-1 text-neutral-400">
                        <li><strong>글자 수:</strong> 1만 자 이상 초장편 (1막~5막 구성)</li>
                        <li><strong>1막:</strong> 극적 몰입을 위한 콜드 오픈 및 1분 후킹 포함</li>
                        <li><strong>3막/4막:</strong> 3막에 미스터리 복선 설치, 4막에서 속시원한 해소</li>
                        <li><strong>5막:</strong> 시청자 가슴을 울리는 사필귀정의 묵직한 교훈 제시</li>
                        <li><strong>화자 포맷:</strong> <code className="text-amber-400 bg-black/40 px-1 py-0.5 rounded">(N)[narrator_main, neutral, 500]</code> 형태 필수 부착</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-neutral-900/40 border border-neutral-800 rounded-lg text-xs text-neutral-400 flex flex-col justify-center">
                      <p className="font-semibold text-neutral-300 mb-1">🛠️ 집필 진행 순서</p>
                      <p>기본 기획 분석 → 야담 장르 유형 추천 → 강력한 후킹 3선 택일 → 5막 구성 시놉시스 수립 → 단계별 실시간 대본 생성 (1~5막 고도화) → 최종 대본 윤색 및 검수 → TTS 분석 & 음성 생성</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-amber-600/10">
                  <button
                    onClick={handleAnalyzeInput}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-black font-bold text-sm transition duration-300 shadow-md hover:scale-[1.02]"
                  >
                    기획 및 야담 추천 받기
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2. 야담 유형 추천 화면 */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 2 && (
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
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block">✍️ 선택된 유형 세부 속성 (원하는 문맥으로 수정 가능)</span>
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
                    1분 후킹 오프닝 생성하기
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 3. 후킹 후보 3개 선택 화면 */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 3 && (
              <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
                <div className="border-b border-amber-600/10 pb-4">
                  <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-amber-500" />
                    유튜브 오프닝 1분 후킹 3선 선택
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    야담은 첫 1분이 성공을 좌우합니다. 시청자가 영상 시작 60초 만에 이탈하는 것을 막기 위해 설계된 후킹 후보 중 마음에 드는 하나를 택해 주십시오.
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
                              후킹 후보 {idx + 1}
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
                            목소리 가상 청취
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
                    5막 서사 플롯 설계 수립
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 4. 단계별 대본 생성 화면 */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 4 && (
              <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
                <div className="border-b border-amber-600/10 pb-4">
                  <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-500 animate-pulse" />
                    단계별 대본 집필 및 조선시대 윤색
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    선택하신 후킹 오프닝에 연결하여 AI 이야기꾼이 5막 대본(총 10,000자 이상)을 실시간 점진적 연쇄 생성 방식으로 써내려갑니다.
                  </p>
                </div>

                {/* 플롯 설계 보드 표시 */}
                {plotPlan && !loading && Object.keys(actScripts).length === 0 && (
                  <div className="space-y-4 flex-1">
                    <div className="p-4 bg-amber-950/15 border border-amber-800/20 rounded-xl text-xs text-amber-400 leading-relaxed">
                      <strong>⚖️ 5막 구조 집필 교훈:</strong> "{plotPlan.lesson}"
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                      {plotPlan.acts.map((act: any) => (
                        <div key={act.actNumber} className="glass-panel p-4 border-amber-600/10 flex flex-col gap-2 bg-[#12100e]/50">
                          <span className="text-[10px] font-bold text-amber-500 border-b border-amber-600/10 pb-1 uppercase tracking-wider block">
                            제 {act.actNumber}막 - {act.actNumber === 1 ? "기" : act.actNumber === 2 ? "승" : act.actNumber === 3 ? "전" : act.actNumber === 4 ? "결" : "미"}
                          </span>
                          <h4 className="text-xs font-semibold text-neutral-200 serif-title leading-relaxed">{act.title}</h4>
                          <p className="text-[11px] text-neutral-400 leading-relaxed mt-1">{act.synopsis}</p>
                          <div className="mt-auto pt-2 border-t border-neutral-900 text-[10px] text-neutral-500 space-y-1">
                            <p><strong>주요사:</strong> {act.keyLines}</p>
                            <p><strong>복선:</strong> {act.foreshadowingDetails}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col items-center justify-center p-8 border border-dashed border-amber-600/20 rounded-xl bg-neutral-950/20">
                      <p className="text-sm font-semibold text-amber-500 mb-2">대본 집필 준비가 완료되었습니다.</p>
                      <p className="text-xs text-neutral-500 text-center max-w-lg mb-4">
                        단추를 누르시면 1막부터 5막까지 각 막당 2,000자 분량의 정밀 서사를 이전 맥락을 이어받아 작성합니다. 집필이 끝나면 자동으로 채널 멘트 윤색 및 6대 항목 검수까지 진행됩니다.
                      </p>
                      <button
                        onClick={handleGenerateFullScript}
                        className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl transition duration-300 hover:scale-105 shadow-lg shadow-amber-900/30 text-sm"
                      >
                        상세 1만자 대본 연속 집필 시작
                      </button>
                    </div>
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
                          {generatingActNum <= 5 ? `${generatingActNum * 20}% 완료` : "99% 완료"}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-900 border border-neutral-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-600 h-full transition-all duration-500 ease-out shadow-inner"
                          style={{ width: `${generatingActNum <= 5 ? generatingActNum * 20 : 99}%` }}
                        />
                      </div>
                    </div>

                    {/* 터미널 스크롤러 창 */}
                    <div className="flex-1 bg-black/80 border border-amber-600/20 rounded-xl p-4 font-mono text-xs text-[#ced4da] leading-relaxed flex flex-col gap-3 min-h-[300px] overflow-hidden">
                      <div className="flex items-center gap-1.5 border-b border-neutral-900 pb-2 text-neutral-500 select-none">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600/80" />
                        <span className="ml-2 font-mono text-[10px]">MIRINAE_YADAM_WRITER_SHELL.LOG</span>
                      </div>

                      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 scroll-smooth">
                        <p className="text-amber-600/80">[SYSTEM] Yadam Generator v1.2 Core initialized.</p>
                        <p className="text-neutral-500">[SYSTEM] Adapter selected: {llmConfig.type.toUpperCase()} / Model: {llmConfig.model}</p>
                        <p className="text-neutral-500">[SYSTEM] Target rule: 10,000 characters minimum, oriental tone adapter binding.</p>

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
            )}

            {/* ------------------------------------------------------------- */}
            {/* 5. 검수 결과 화면 */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 5 && (
              <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
                <div className="border-b border-amber-600/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-500" />
                      대본 무결성 및 고품질 검수 종합 보고
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">
                      대본 총량(1만 자), 복선 구조, 교훈성, 메타데이터 부착율, 잔혹 묘사 차단율에 대해 엄격히 진단한 종합 판독표입니다.
                    </p>
                  </div>
                  <button
                    onClick={handleReValidate}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-600/30 hover:border-amber-500 text-xs font-semibold text-amber-500 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> 대본 재검수 요청
                  </button>
                </div>

                {validationResult && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                    {/* 좌측: 검수 요약 패널 */}
                    <div className="md:col-span-2 space-y-4">
                      {/* 게이지 바들 */}
                      <div className="glass-panel p-5 border-amber-600/10 space-y-4 bg-[#12100e]/30">
                        <span className="text-sm font-semibold text-neutral-200 block border-b border-amber-600/10 pb-2">📊 항목별 품질 지표</span>

                        {/* 1. 글자 수 게이지 */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-300 font-medium">총 대본 글자 수 (목표: 10,000자 이상)</span>
                            <span className={`font-mono font-bold ${validationResult.isValidCharCount ? "text-emerald-500" : "text-amber-500"}`}>
                              {validationResult.charCount.toLocaleString()} 자 ({validationResult.isValidCharCount ? "초과 달성" : "미달"})
                            </span>
                          </div>
                          <div className="w-full bg-neutral-900 border border-neutral-800 h-3 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${validationResult.isValidCharCount ? "bg-emerald-600 shadow-emerald-500/20" : "bg-amber-600 shadow-amber-500/20"}`}
                              style={{ width: `${Math.min((validationResult.charCount / 10000) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* 2. TTS 메타데이터 커버리지 */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-300 font-medium">모든 줄의 TTS 메타데이터 부착율</span>
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
                        <span className="text-sm font-semibold text-neutral-200 block border-b border-amber-600/10 pb-2">📋 6대 세부 심사 상세 분석</span>
                        
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

                          {/* 5막 교훈 */}
                          <div className="flex gap-2.5 items-start">
                            <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${validationResult.hasLesson ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                            <div>
                              <strong className="text-neutral-200">3. 5막 사필귀정/인과응보 교훈:</strong>
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
                        </div>
                      </div>
                    </div>

                    {/* 우측: 대본 미리 보기 첩 */}
                    <div className="glass-panel p-5 border-amber-600/10 flex flex-col gap-3.5 bg-[#12100e]/50 text-xs">
                      <span className="text-sm font-semibold text-amber-500 serif-title border-b border-amber-600/10 pb-2 flex items-center justify-between">
                        <span>📜 최종 윤색 대본 보기</span>
                        <span className="text-[10px] text-neutral-500 font-mono">script.md</span>
                      </span>

                      <div className="flex-1 bg-black/40 border border-neutral-900 rounded p-3 text-neutral-300 whitespace-pre-line overflow-y-auto max-h-[350px] leading-relaxed select-all">
                        {finalScript}
                      </div>

                      <button
                        onClick={() => downloadTextFile(finalScript, "script.md")}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-600/40 text-neutral-300 hover:text-white transition font-medium"
                      >
                        <Download className="w-4 h-4 text-amber-500" />
                        script.md 로컬 즉시 저장
                      </button>
                    </div>
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
            )}

            {/* ------------------------------------------------------------- */}
            {/* 6. TTS 세그먼트 화면 */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 6 && (
              <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
                <div className="border-b border-amber-600/10 pb-4">
                  <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-amber-500 animate-pulse" />
                    TTS 화자 세그먼트 분석 및 오디오 생성
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    대본으로부터 나레이션(N)과 대사 라인을 완벽히 분할하여 매핑하였습니다. 7인의 캐릭터별 보이스 톤을 청취하고 Google Cloud TTS 합성을 지시할 수 있습니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
                  {/* 좌측: 7명의 목소리 배역 보드 */}
                  <div className="space-y-4 text-xs">
                    <span className="text-sm font-semibold text-neutral-200 block border-b border-neutral-800 pb-1.5">👥 미리내야담 7인 성우진</span>
                    
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
                            <div className="flex items-center justify-between border-t border-neutral-900 pt-1.5 mt-0.5">
                              <span className="text-[9px] text-neutral-500 font-mono">구글 {sp.tone}</span>
                              <button
                                onClick={() => playPreview("옛날 옛적 조선 팔도에 기이한 소문이 하나 퍼지기 시작했사옵니다.", sp.id)}
                                className="text-[10px] text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1"
                              >
                                <Volume2 className="w-3 h-3" /> 보이스 테스트
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 우측: 세그먼트 대본 목록 테이블 및 일괄 합성 버튼 */}
                  <div className="md:col-span-3 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                      <span className="text-sm font-semibold text-neutral-200">📋 대사 분할 세그먼트 ({ttsSegments.length}개 발견)</span>
                      
                      <button
                        onClick={handleSynthesizeTts}
                        disabled={synthesizing}
                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-black font-bold text-xs transition duration-300 shadow hover:scale-105"
                      >
                        {synthesizing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            전체 오디오 구글 합성 중...
                          </>
                        ) : (
                          <>
                            <Music className="w-4 h-4" />
                            전체 세그먼트 음성 파일 일괄 생성
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex-1 bg-black/40 border border-neutral-850 rounded-xl overflow-hidden flex flex-col min-h-[300px]">
                      {/* 테이블 헤더 */}
                      <div className="grid grid-cols-12 bg-neutral-950/70 border-b border-neutral-850 p-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        <div className="col-span-1 text-center">ID</div>
                        <div className="col-span-2">구분 / 화자</div>
                        <div className="col-span-1 text-center">감정</div>
                        <div className="col-span-6">대사 내용 (한글 텍스트)</div>
                        <div className="col-span-1 text-center">포즈</div>
                        <div className="col-span-1 text-center">듣기</div>
                      </div>

                      {/* 테이블 본체 */}
                      <div className="flex-1 overflow-y-auto max-h-[350px] divide-y divide-neutral-900">
                        {ttsSegments.map((seg) => {
                          const isSpeech = seg.type === "N" || seg.type === "대사";
                          return (
                            <div
                              key={seg.id}
                              className={`grid grid-cols-12 p-2.5 text-xs items-center hover:bg-neutral-900/30 transition
                                ${isSpeech ? "text-neutral-300" : "text-neutral-500 bg-neutral-950/20 italic"}
                              `}
                            >
                              <div className="col-span-1 text-center font-mono text-[10px]">{seg.id}</div>
                              <div className="col-span-2 flex items-center gap-1.5">
                                <span className={`text-[9px] px-1 rounded-sm font-semibold
                                  ${seg.type === "N" ? "bg-amber-950/60 text-amber-500 border border-amber-600/10" : ""}
                                  ${seg.type === "대사" ? "bg-emerald-950/60 text-emerald-500 border border-emerald-600/10" : ""}
                                  ${seg.type === "BGM" ? "bg-blue-950/60 text-blue-500 border border-blue-600/10" : ""}
                                  ${seg.type === "E" ? "bg-purple-950/60 text-purple-500 border border-purple-600/10" : ""}
                                `}>
                                  {seg.type}
                                </span>
                                <span className="font-medium truncate max-w-[80px]">{seg.speakerId}</span>
                              </div>
                              <div className="col-span-1 text-center font-mono text-[10px] text-neutral-400">{seg.emotion}</div>
                              <div className="col-span-6 truncate pr-2" title={seg.text}>{seg.text}</div>
                              <div className="col-span-1 text-center font-mono text-[10px] text-neutral-400">
                                {isSpeech ? `${seg.pauseAfterMs}ms` : "-"}
                              </div>
                              <div className="col-span-1 text-center">
                                {isSpeech && (
                                  <button
                                    onClick={() => playPreview(seg.text, seg.speakerId)}
                                    className="p-1 text-neutral-500 hover:text-amber-500 hover:bg-neutral-900 rounded"
                                    title="임시 더미 듣기"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
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
            )}

            {/* ------------------------------------------------------------- */}
            {/* 7. 다운로드 화면 */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 7 && (
              <section className="glass-panel p-6 md:p-8 flex flex-col gap-6 flex-1 animate-in fade-in duration-300">
                <div className="border-b border-amber-600/10 pb-4">
                  <h2 className="text-xl serif-title text-amber-500 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500 animate-bounce" />
                    야담 5대 산출물 다운로드 및 완료 보고
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    축하합니다! 대본 집필부터 오디오 합성, 구조화 데이터 파일 추출까지 모든 필수 산출물이 서버 디렉토리(`output/`)에 영구 저장 완료되었습니다.
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
                        <p className="text-[10px] text-neutral-400 mt-1">최종 윤색된 1만자 분량의 정식 대본 파일</p>
                      </div>
                      <button
                        onClick={() => downloadTextFile(finalScript, "script.md")}
                        className="mt-auto w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition"
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
                        <p className="text-[10px] text-neutral-400 mt-1">서사 기획, 5막 플롯 등을 담은 전체 메타데이터</p>
                      </div>
                      <button
                        onClick={() => {
                          const storyObj = { topic, keywords: keywordsString.split(","), analysis, selectedType, selectedHook, plotPlan, validationResult };
                          downloadTextFile(JSON.stringify(storyObj, null, 2), "story.json", "application/json");
                        }}
                        className="mt-auto w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition"
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
                        onClick={() => downloadTextFile(csvContent, "tts_segments.csv")}
                        className="mt-auto w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition"
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
                        onClick={() => downloadTextFile(JSON.stringify(ssmlList, null, 2), "ssml_segments.json", "application/json")}
                        className="mt-auto w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition"
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
                        onClick={() => downloadTextFile(JSON.stringify(audioManifest, null, 2), "audio_manifest.json", "application/json")}
                        className="mt-auto w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition"
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
                          <div className="truncate">
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
                                  // 실 서버 저장 경로에서 오디오 바로 재생 (Next.js public 폴더에 마운트되어 바로 재생 가능!)
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

                  <div className="p-4 bg-amber-950/10 border border-amber-600/10 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-400 serif-title">최종 집필 완수 및 로컬 디렉토리 저장 확인</p>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                        모든 파일은 사용자님의 작업 프로젝트 폴더인 <code className="text-amber-500 bg-black/40 px-1 py-0.5 rounded text-[11px] font-mono">yadam/output/</code> 및 Next.js 웹 구동용 정적 디스크인 <code className="text-amber-500 bg-black/40 px-1 py-0.5 rounded text-[11px] font-mono">yadam/public/output/</code> 하위에 정식 파일명으로 고스란히 영구 보관되었습니다. 이 웹화면에서도 각각 개별 다운로드 및 테스트 청취가 가능하여 바로 복사 사용하실 수 있습니다!
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
            )}
          </>
        )}
      </main>

      {/* 푸터 영역 */}
      <footer className="mt-auto border-t border-amber-600/10 py-6 text-center text-xs text-neutral-500 z-10">
        <p>© 2026 미리내야담 대본 생성기. All rights reserved.</p>
        <p className="mt-1 text-[10px] text-neutral-600">
          Powered by Next.js, Tailwind v4, Zod and Google Cloud Text-to-Speech API
        </p>
      </footer>
    </div>
  );
}
