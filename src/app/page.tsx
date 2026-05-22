"use client";

import React from "react";
import {
  Sparkles,
  Settings,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  PackageOpen,
} from "lucide-react";

import SettingsPanel from "@/components/SettingsPanel";
import ProjectPanel from "@/components/ProjectPanel";
import WebViewerModal from "@/components/WebViewerModal";
import Step1ThemeInput from "@/components/steps/Step1ThemeInput";
import Step2YadamTypeSelection from "@/components/steps/Step2YadamTypeSelection";
import Step3HookSelection from "@/components/steps/Step3HookSelection";
import Step4PlotPlanCreation from "@/components/steps/Step4PlotPlanCreation";
import Step5ScriptValidation from "@/components/steps/Step5ScriptValidation";
import Step6TtsSynthesis from "@/components/steps/Step6TtsSynthesis";
import Step7FinalDownloads from "@/components/steps/Step7FinalDownloads";
import { useYadamState } from "@/hooks/useYadamState";

export default function YadamDashboard() {
  const {
    llmConfig, setLlmConfig,
    ttsConfig, setTtsConfig,
    projectName,
    projectList,
    serverProjects,
    currentStep, setCurrentStep,
    maxReachedStep, setMaxReachedStep,
    loading,
    errorMsg, setErrorMsg,
    failedActs,
    topic, setTopic,
    keywordsString, setKeywordsString,
    scriptLength, setScriptLength,
    customCharacters, setCustomCharacters,
    validationErrors,
    analysis,
    recommendedTypes,
    selectedType, setSelectedType,
    hookCandidates,
    selectedHook, setSelectedHook,
    plotPlan, setPlotPlan,
    actScripts, setActScripts,
    generatingActNum,
    actGenProgress,
    finalScript, setFinalScript,
    validationResult, setValidationResult,
    ttsSegments, setTtsSegments,
    ssmlList,
    csvContent,
    audioManifest,
    synthesizing,
    synthProgress,
    showSettings, setShowSettings,
    showSettingsWarning, setShowSettingsWarning,
    showProjectPanel, setShowProjectPanel,
    showFullViewer, setShowFullViewer,
    projectLoaded,
    saveStatus,
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

    // projects
    createNewProject,
    loadProject,
    deleteProject,
    loadProjectFromServer,
  } = useYadamState();

  const stepsMenu = [
    { num: 1, name: "대본 기획" },
    { num: 2, name: "야담 유형" },
    { num: 3, name: "1분 후킹" },
    { num: 4, name: "대본 생성" },
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
          <div className="text-left">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight serif-title text-amber-500">
              미리내야담 대본 생성기
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              유튜브 야담 채널용 AI 대본 & TTS 음성 제작 도구
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* 프로젝트 관리 버튼 */}
          <button
            onClick={() => setShowProjectPanel(!showProjectPanel)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-600/50 transition duration-300 text-sm font-medium"
          >
            <PackageOpen className="w-4 h-4 text-amber-500" />
            {projectName ? `📁 ${projectName}` : "프로젝트 선택"}
          </button>

          {/* 저장 상태 표시기 */}
          {projectLoaded && projectName && (
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-neutral-900/80 border border-neutral-800">
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-400">저장됨</span>
                </>
              )}
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                  <span className="text-amber-400">저장 중...</span>
                </>
              )}
              {saveStatus === "unsaved" && (
                <>
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span className="text-red-400">저장 안 됨</span>
                </>
              )}
              {!saveStatus && (
                <>
                  <CheckCircle2 className="w-3 h-3 text-neutral-600" />
                  <span className="text-neutral-500">자동저장 대기</span>
                </>
              )}
            </div>
          )}

          {/* 엔진 설정 토글 */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-600/50 transition duration-300 text-sm font-medium relative"
          >
            <Settings className="w-4 h-4 text-amber-500" />
            엔진 설정
            {showSettingsWarning && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1" />
            )}
          </button>

          {/* TTS 모드 표시 */}
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-amber-900/20 border border-amber-500/30">
            <span className={`w-2 h-2 rounded-full ${ttsConfig.isSimulation ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            {ttsConfig.isSimulation ? "TTS 시뮬레이션" : "구글 TTS 실서버"}
          </div>
        </div>
      </header>

      {/* 프로젝트 관리 패널 */}
      {showProjectPanel && (
        <ProjectPanel
          projectName={projectName}
          projectList={projectList}
          serverProjects={serverProjects}
          setShowProjectPanel={setShowProjectPanel}
          createNewProject={createNewProject}
          loadProject={loadProject}
          deleteProject={deleteProject}
          loadProjectFromServer={loadProjectFromServer}
        />
      )}

      {/* 설정 팝업 패널 */}
      {showSettings && (
        <SettingsPanel
          llmConfig={llmConfig}
          setLlmConfig={setLlmConfig}
          ttsConfig={ttsConfig}
          setTtsConfig={setTtsConfig}
          showSettingsWarning={showSettingsWarning}
          setShowSettingsWarning={setShowSettingsWarning}
          setShowSettings={setShowSettings}
          projectName={projectName}
        />
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
          <div className="flex-1 text-left">
            <strong>오류 발생:</strong> {errorMsg}
          </div>
          <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-white text-xs px-2 py-1">
            닫기
          </button>
        </div>
      )}

      {/* 7대 메인 작업 화면 영역 */}
      <main className="flex-1 w-full z-10 flex flex-col min-h-[450px]">
        {loading && currentStep !== 4 && (
          <div className="glass-panel p-16 flex flex-col items-center justify-center gap-4 flex-1 text-center animate-pulse">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
            <div>
              <p className="text-lg font-semibold text-amber-400 serif-title">AI가 대본을 작성하고 있습니다...</p>
              <p className="text-xs text-neutral-400 mt-1">LLM 엔진이 응답을 생성 중입니다. 잠시만 기다려 주세요.</p>
            </div>
          </div>
        )}

        <>
          {/* 1. 입력 화면 */}
          {currentStep === 1 && !loading && (
            <Step1ThemeInput
              topic={topic}
              setTopic={setTopic}
              keywordsString={keywordsString}
              setKeywordsString={setKeywordsString}
              validationErrors={validationErrors}
              handleAnalyzeInput={handleAnalyzeInput}
              scriptLength={scriptLength}
              setScriptLength={setScriptLength}
              customCharacters={customCharacters}
              setCustomCharacters={setCustomCharacters}
            />
          )}

          {/* 2. 야담 유형 추천 화면 */}
          {currentStep === 2 && !loading && (
            <Step2YadamTypeSelection
              setCurrentStep={setCurrentStep}
              analysis={analysis}
              recommendedTypes={recommendedTypes}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              handleGenerateHooks={handleGenerateHooks}
            />
          )}

          {/* 3. 후킹 후보 3개 선택 화면 */}
          {currentStep === 3 && !loading && (
            <Step3HookSelection
              setCurrentStep={setCurrentStep}
              hookCandidates={hookCandidates}
              selectedHook={selectedHook}
              setSelectedHook={setSelectedHook}
              playPreview={playPreview}
              handleSelectHookAndCreatePlot={handleSelectHookAndCreatePlot}
            />
          )}

          {/* 4. 단계별 대본 생성 화면 */}
          {currentStep === 4 && (
            <Step4PlotPlanCreation
              setCurrentStep={setCurrentStep}
              plotPlan={plotPlan}
              setPlotPlan={setPlotPlan}
              loading={loading}
              actScripts={actScripts}
              failedActs={failedActs}
              generatingActNum={generatingActNum}
              actGenProgress={actGenProgress}
              llmConfig={llmConfig}
              handleRetryAct={handleRetryAct}
              handleGenerateFullScript={handleGenerateFullScript}
              terminalEndRef={terminalEndRef}
              scriptLength={scriptLength}
            />
          )}

          {/* 5. 검수 결과 화면 */}
          {currentStep === 5 && !loading && (
            <Step5ScriptValidation
              setCurrentStep={setCurrentStep}
              loading={loading}
              finalScript={finalScript}
              validationResult={validationResult}
              handleReValidate={handleReValidate}
              handleRefineScript={handleRefineScript}
              setShowFullViewer={setShowFullViewer}
              topic={topic}
              selectedType={selectedType}
              handleGoToTtsStep={handleGoToTtsStep}
              actGenProgress={actGenProgress}
            />
          )}

          {/* 6. TTS 세그먼트 화면 */}
          {currentStep === 6 && !loading && (
            <Step6TtsSynthesis
              setCurrentStep={setCurrentStep}
              ttsSegments={ttsSegments}
              synthesizing={synthesizing}
              synthProgress={synthProgress}
              ttsConfig={ttsConfig}
              playPreview={playPreview}
              handleSynthesizeTts={handleSynthesizeTts}
            />
          )}

          {/* 7. 다운로드 화면 */}
          {currentStep === 7 && !loading && (
            <Step7FinalDownloads
              setCurrentStep={setCurrentStep}
              setMaxReachedStep={setMaxReachedStep}
              topic={topic}
              keywordsString={keywordsString}
              analysis={analysis}
              selectedType={selectedType}
              selectedHook={selectedHook}
              plotPlan={plotPlan}
              validationResult={validationResult}
              finalScript={finalScript}
              csvContent={csvContent}
              ssmlList={ssmlList}
              audioManifest={audioManifest}
              ttsConfig={ttsConfig}
              playPreview={playPreview}
              setActScripts={setActScripts}
              setFinalScript={setFinalScript}
              setValidationResult={setValidationResult}
              setTtsSegments={setTtsSegments}
            />
          )}
        </>
      </main>

      {/* 전체화면 고품격 대본 웹뷰어 모달 */}
      {showFullViewer && (
        <WebViewerModal
          setShowFullViewer={setShowFullViewer}
          topic={topic}
          selectedType={selectedType}
          finalScript={finalScript}
          validationResult={validationResult}
        />
      )}

      {/* 푸터 영역 */}
      <footer className="mt-auto border-t border-amber-600/10 py-6 text-center text-xs text-neutral-500 z-10 select-none">
        <p>© 2026 미리내야담 대본 생성기. All rights reserved.</p>
        <p className="mt-1 text-[10px] text-neutral-600">
          Powered by Next.js, Tailwind v4, Zod and Google Cloud Text-to-Speech API
        </p>
      </footer>
    </div>
  );
}
