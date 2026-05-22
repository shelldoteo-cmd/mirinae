"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { z } from "zod";
import { useYadamProjects } from "./useYadamProjects";
import type { CustomCharacter, ScriptLength } from "@/components/steps/Step1ThemeInput";
import { SCRIPT_LENGTH_OPTIONS } from "@/components/steps/Step1ThemeInput";

// -------------------------------------------------------------------
// Zod 검증 스키마
// -------------------------------------------------------------------
const inputFormSchema = z.object({
  topic: z.string().min(2, "주제는 최소 2자 이상 입력해야 합니다."),
  keywordsString: z.string().refine((val) => val.split(",").map(k => k.trim()).filter(Boolean).length >= 1, {
    message: "쉼표(,)로 구분된 키워드를 최소 1개 이상 입력해 주세요.",
  }),
});

// -------------------------------------------------------------------
// Confetti 동적 비동기 로딩 래퍼 (SSR 안정성 확보)
// -------------------------------------------------------------------
const triggerConfetti = async (options?: any) => {
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti(options);
  } catch (err) {
    console.error("Failed to launch confetti:", err);
  }
};

export function useYadamState() {
  // -------------------------------------------------------------------
  // 애플리케이션 생성 파이프라인 상태
  // -------------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState(1); // 1~7 필수 화면
  const [maxReachedStep, setMaxReachedStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 실패 막 개별 재시도 목록 상태
  const [failedActs, setFailedActs] = useState<number[]>([]);

  // 입력 데이터
  const [topic, setTopic] = useState("욕심쟁이 김대감과 밤안개 도깨비의 황금 계약");
  const [keywordsString, setKeywordsString] = useState("황금, 주막, 밤안개, 도깨비, 궤짝, 인과응보");
  const [scriptLength, setScriptLength] = useState<ScriptLength>("long");
  const [customCharacters, setCustomCharacters] = useState<CustomCharacter[]>([]);
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
  const [synthProgress] = useState({ current: 0, total: 0 });

  // 웹뷰어 전용 상태들
  const [showFullViewer, setShowFullViewer] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------
  // 프로젝트 데이터 로드 핸들러 (useYadamProjects에 주입)
  // -------------------------------------------------------------------
  const handleLoadProjectData = useCallback((data: any) => {
    setCurrentStep(data.currentStep || 1);
    setMaxReachedStep(data.maxReachedStep || 1);
    setTopic(data.topic || "");
    setKeywordsString(data.keywordsString || "");
    setScriptLength(data.scriptLength || "long");
    setCustomCharacters(data.customCharacters || []);
    setAnalysis(data.analysis || null);
    setRecommendedTypes(data.recommendedTypes || []);
    setSelectedType(data.selectedType || null);
    setHookCandidates(data.hookCandidates || []);
    setSelectedHook(data.selectedHook || null);
    setPlotPlan(data.plotPlan || null);
    setActScripts(data.actScripts || {});
    setFailedActs(data.failedActs || []);
    setFinalScript(data.finalScript || "");
    setValidationResult(data.validationResult || null);
    setTtsSegments(data.ttsSegments || []);
    setSsmlList(data.ssmlList || []);
    setCsvContent(data.csvContent || "");
    setAudioManifest(data.audioManifest || []);
  }, []);

  // -------------------------------------------------------------------
  // 프로젝트 관리 및 설정 전담 서브 훅 호출
  // -------------------------------------------------------------------
  const projects = useYadamProjects(handleLoadProjectData);

  // -------------------------------------------------------------------
  // 프로젝트 자동저장 로직
  // -------------------------------------------------------------------
  const saveCurrentProject = useCallback(() => {
    if (!projects.projectName || loading || synthesizing) return;
    projects.setSaveStatus("saving");
    const data = {
      currentStep, maxReachedStep, topic, keywordsString,
      scriptLength, customCharacters,
      analysis, recommendedTypes, selectedType,
      hookCandidates, selectedHook,
      plotPlan, actScripts, failedActs,
      finalScript, validationResult,
      ttsSegments, ssmlList, csvContent, audioManifest,
      savedAt: new Date().toISOString(),
    };
    projects.saveProject(projects.projectName, data);
  }, [
    projects, loading, synthesizing,
    currentStep, maxReachedStep, topic, keywordsString,
    scriptLength, customCharacters,
    analysis, recommendedTypes, selectedType,
    hookCandidates, selectedHook,
    plotPlan, actScripts, failedActs,
    finalScript, validationResult,
    ttsSegments, ssmlList, csvContent, audioManifest,
  ]);

  // 핵심 상태 변경 시 자동저장 (디바운스 500ms)
  useEffect(() => {
    if (!projects.projectLoaded || !projects.projectName) return;
    const timer = setTimeout(() => saveCurrentProject(), 500);
    return () => clearTimeout(timer);
  }, [saveCurrentProject, projects.projectLoaded, projects.projectName]);

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
          llmConfig: projects.llmConfig,
          projectName: projects.projectName,
          topic,
          keywords,
          scriptLength,
          customCharacters: customCharacters.filter(c => c.name.trim()),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "입력 분석 중 서버 오류가 발생했습니다.");
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setRecommendedTypes(data.recommendedTypes);
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
          llmConfig: projects.llmConfig,
          projectName: projects.projectName,
          topic,
          keywords,
          selectedType,
          analysis,
          scriptLength,
          customCharacters: customCharacters.filter(c => c.name.trim()),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "후킹 후보 생성 중 오류가 발생했습니다.");
      }

      const data = await res.json();
      setHookCandidates(data.hookCandidates);
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
          llmConfig: projects.llmConfig,
          projectName: projects.projectName,
          topic,
          selectedType,
          selectedHook,
          analysis,
          scriptLength,
          customCharacters: customCharacters.filter(c => c.name.trim()),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "플롯 수립 중 오류가 발생했습니다.");
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
  // 단계 4: 대본 순차 생성 및 최종 병합/윤색 (동적 막 수)
  // -------------------------------------------------------------------
  const handleGenerateFullScript = async () => {
    if (!plotPlan) return;
    setErrorMsg("");
    setLoading(true);
    setFailedActs([]);
    
    const tempScripts = { ...actScripts };
    let hasError = false;

    const totalActs = SCRIPT_LENGTH_OPTIONS[scriptLength].acts;
    for (let act = 1; act <= totalActs; act++) {
      if (tempScripts[act]) continue;

      setGeneratingActNum(act);
      setActGenProgress(`제 ${act}막 대본을 생성하고 있습니다...`);

      const previousScripts = Object.entries(tempScripts)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([num, txt]) => `[제 ${num}막 대본]\n${txt}`)
        .join("\n\n");

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "generateAct",
            llmConfig: projects.llmConfig,
            projectName: projects.projectName,
            actNumber: act,
            topic,
            selectedType,
            plotPlan,
            previousScripts,
            scriptLength,
            customCharacters: customCharacters.filter(c => c.name.trim()),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "오류 발생");
        }

        const data = await res.json();
        tempScripts[act] = data.actScript;
        setActScripts({ ...tempScripts });
      } catch (err) {
        console.error(`[제 ${act}막] 생성 실패:`, err);
        setFailedActs(prev => Array.from(new Set([...prev, act])));
        setErrorMsg(`[제 ${act}막] 대본 생성 도중 실패했습니다. 아래 패널에서 실패한 막만 재시도하실 수 있습니다.`);
        hasError = true;
        break;
      }
    }

    if (hasError) {
      setLoading(false);
      setGeneratingActNum(0);
      setActGenProgress("");
      return;
    }

    const allCompleted = Array.from({ length: totalActs }, (_, i) => i + 1).every(act => tempScripts[act]);
    if (!allCompleted) {
      setLoading(false);
      setGeneratingActNum(0);
      setActGenProgress("");
      return;
    }

    setGeneratingActNum(totalActs + 1);
    setActGenProgress(`${totalActs}개 막의 대본 병합 완료. '미리내야담' 톤과 사극 윤색 조율 작업을 진행 중입니다...`);

    try {
      const polishRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "polishScript",
          llmConfig: projects.llmConfig,
          projectName: projects.projectName,
          topic,
          selectedType,
          actScripts: tempScripts,
        }),
      });

      if (!polishRes.ok) {
        const data = await polishRes.json();
        throw new Error(data.error || "오류 발생");
      }

      const polishData = await polishRes.json();
      setFinalScript(polishData.polishedScript);

      setGeneratingActNum(totalActs + 2);
      setActGenProgress("최종 대본 품질 검수를 진행 중입니다...");

      const valRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "validateScript",
          llmConfig: projects.llmConfig,
          projectName: projects.projectName,
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
      
      triggerConfetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setErrorMsg(`대본 병합/윤색/검수 중 오류가 발생했습니다: ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setGeneratingActNum(0);
      setActGenProgress("");
    }
  };

  // 실패한 막 개별 재시도 핸들러
  const handleRetryAct = async (actNumber: number) => {
    if (!plotPlan) return;
    setErrorMsg("");
    setLoading(true);
    setGeneratingActNum(actNumber);
    setActGenProgress(`제 ${actNumber}막 대본을 단독 재집필하고 있습니다...`);

    const tempScripts = { ...actScripts };
    const previousScripts = Object.entries(tempScripts)
      .filter(([num]) => parseInt(num) < actNumber)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([num, txt]) => `[제 ${num}막 대본]\n${txt}`)
      .join("\n\n");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "generateAct",
          llmConfig: projects.llmConfig,
          projectName: projects.projectName,
          actNumber,
          topic,
          selectedType,
          plotPlan,
          previousScripts,
          scriptLength,
          customCharacters: customCharacters.filter(c => c.name.trim()),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "오류 발생");
      }

      const data = await res.json();
      tempScripts[actNumber] = data.actScript;
      setActScripts(tempScripts);

      setFailedActs(prev => prev.filter(a => a !== actNumber));

      const totalActs = SCRIPT_LENGTH_OPTIONS[scriptLength].acts;
      const allCompleted = Array.from({ length: totalActs }, (_, i) => i + 1).every(act => tempScripts[act]);
      if (allCompleted) {
        setGeneratingActNum(6);
        setActGenProgress("모든 막 집필 성공! 전체 대본 병합 및 사극 윤색 작업을 이어서 진행합니다...");

        const polishRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "polishScript",
            llmConfig: projects.llmConfig,
            projectName: projects.projectName,
            topic,
            selectedType,
            actScripts: tempScripts,
          }),
        });

        if (!polishRes.ok) {
          const data = await polishRes.json();
          throw new Error(data.error || "윤색 중 오류 발생");
        }

        const polishData = await polishRes.json();
        setFinalScript(polishData.polishedScript);

        setGeneratingActNum(7);
        setActGenProgress("최종 대본 6대 품질 검수를 진행 중입니다...");

        const valRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "validateScript",
            llmConfig: projects.llmConfig,
            projectName: projects.projectName,
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

        triggerConfetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      setErrorMsg(`[제 ${actNumber}막] 재시도 중 오류가 발생했습니다: ${(err as Error).message}`);
      setFailedActs(prev => Array.from(new Set([...prev, actNumber])));
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
          llmConfig: projects.llmConfig,
          projectName: projects.projectName,
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
      
      triggerConfetti({
        particleCount: 50,
        spread: 40,
      });
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // 단계 5-B: 대본 자동 개선 (검수에서 감지된 문제를 LLM으로 교정)
  // -------------------------------------------------------------------
  const handleRefineScript = async () => {
    if (!validationResult || !finalScript) return;

    // 감지된 문제를 자동 수집
    const issues: string[] = [];

    if (!validationResult.isTranslationToneClean && validationResult.translationToneDetails) {
      issues.push(`[AI 번역투] ${validationResult.translationToneDetails}`);
    }
    if (!validationResult.isCrueltyMinimized && validationResult.crueltyDetails) {
      issues.push(`[잔혹 표현] ${validationResult.crueltyDetails}`);
    }
    if (!validationResult.hasHook) {
      issues.push(`[후킹 누락] 대본 도입부에 채널명 '미리내야담'이 포함된 오프닝 멘트가 감지되지 않았습니다. 1막 첫 부분에 자연스러운 채널 오프닝을 삽입해 주세요.`);
    }

    if (issues.length === 0) {
      setErrorMsg("감지된 개선 항목이 없습니다. 이미 양호한 대본입니다.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setActGenProgress("대본 교정 중입니다... (대본 분량에 따라 1~3분 소요될 수 있습니다)");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "refineScript",
          llmConfig: projects.llmConfig,
          projectName: projects.projectName,
          script: finalScript,
          issues,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "대본 개선 중 오류가 발생했습니다.");
      }

      const data = await res.json();
      setFinalScript(data.refinedScript);

      triggerConfetti({
        particleCount: 80,
        spread: 60,
      });

      // ★ 교정 성공 → 즉시 로딩 해제 (사용자가 멈춘 것처럼 느끼지 않도록)
      setLoading(false);
      setActGenProgress("");

      // 백그라운드에서 자동 재검수 (별도 로딩 표시)
      setValidationResult(null);
      setActGenProgress("교정 완료! 자동 재검수를 진행합니다...");
      try {
        const valRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "validateScript",
            llmConfig: projects.llmConfig,
            projectName: projects.projectName,
            script: data.refinedScript,
            plotPlan,
          }),
        });
        if (valRes.ok) {
          const valData = await valRes.json();
          setValidationResult(valData.validationResult);
        }
      } catch (e) {
        console.warn("자동 재검수 실패:", e);
      } finally {
        setActGenProgress("");
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
      setLoading(false);
      setActGenProgress("");
    }
  };

  const handleGoToTtsStep = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse",
          script: finalScript,
          projectName: projects.projectName,
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
          projectName: projects.projectName,
          ttsConfig: {
            apiKey: projects.ttsConfig.isSimulation ? "" : projects.ttsConfig.apiKey,
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

      triggerConfetti({
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

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";

    const voices = window.speechSynthesis.getVoices();
    const krVoices = voices.filter(v => v.lang.includes("ko-KR"));

    if (krVoices.length > 0) {
      if (speakerId.includes("female") || speakerId === "ghost_1") {
        const femaleVoice = krVoices.find(v => v.name.includes("혜경") || v.name.includes("Google") || v.name.includes("Female"));
        if (femaleVoice) utterance.voice = femaleVoice;
      } else {
        const maleVoice = krVoices.find(v => v.name.includes("민상") || v.name.includes("Google") || v.name.includes("Male"));
        if (maleVoice) utterance.voice = maleVoice;
      }
    }

    if (speakerId === "elder_1") utterance.rate = 0.75;
    else if (speakerId === "ghost_1") utterance.rate = 0.7;
    else utterance.rate = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  return {
    // states from projects
    llmConfig: projects.llmConfig,
    setLlmConfig: projects.setLlmConfig,
    ttsConfig: projects.ttsConfig,
    setTtsConfig: projects.setTtsConfig,
    projectName: projects.projectName,
    setProjectName: projects.setProjectName,
    projectList: projects.projectList,
    setProjectList: projects.setProjectList,
    serverProjects: projects.serverProjects,
    setServerProjects: projects.setServerProjects,
    showSettings: projects.showSettings,
    setShowSettings: projects.setShowSettings,
    showSettingsWarning: projects.showSettingsWarning,
    setShowSettingsWarning: projects.setShowSettingsWarning,
    showProjectPanel: projects.showProjectPanel,
    setShowProjectPanel: projects.setShowProjectPanel,
    projectLoaded: projects.projectLoaded,
    setProjectLoaded: projects.setProjectLoaded,
    saveStatus: projects.saveStatus,
    setSaveStatus: projects.setSaveStatus,

    // pipeline states
    currentStep,
    setCurrentStep,
    maxReachedStep,
    setMaxReachedStep,
    loading,
    setLoading,
    errorMsg,
    setErrorMsg,
    failedActs,
    setFailedActs,
    topic, setTopic,
    keywordsString, setKeywordsString,
    scriptLength, setScriptLength,
    customCharacters, setCustomCharacters,
    validationErrors,
    setValidationErrors,
    analysis,
    setAnalysis,
    recommendedTypes,
    setRecommendedTypes,
    selectedType,
    setSelectedType,
    hookCandidates,
    setHookCandidates,
    selectedHook,
    setSelectedHook,
    plotPlan,
    setPlotPlan,
    actScripts,
    setActScripts,
    generatingActNum,
    setGeneratingActNum,
    actGenProgress,
    setActGenProgress,
    finalScript,
    setFinalScript,
    validationResult,
    setValidationResult,
    ttsSegments,
    setTtsSegments,
    ssmlList,
    setSsmlList,
    csvContent,
    setCsvContent,
    audioManifest,
    setAudioManifest,
    synthesizing,
    setSynthesizing,
    synthProgress,
    showFullViewer,
    setShowFullViewer,
    terminalEndRef,

    // handlers
    handleAnalyzeInput,
    handleGenerateHooks,
    handleSelectHookAndCreatePlot,
    handleGenerateFullScript,
    handleRetryAct,
    handleReValidate,
    handleRefineScript,
    handleGoToTtsStep,
    handleSynthesizeTts,
    playPreview,

    // project list CRUD
    createNewProject: projects.createNewProject,
    loadProject: projects.loadProject,
    deleteProject: projects.deleteProject,
    loadProjectFromServer: projects.loadProjectFromServer,
    syncServerProjects: projects.syncServerProjects,
  };
}
