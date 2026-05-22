"use client";

import React, { useState } from "react";
import { Settings, Loader2 } from "lucide-react";

interface SettingsPanelProps {
  llmConfig: {
    type: string;
    endpoint: string;
    apiKey: string;
    model: string;
  };
  setLlmConfig: React.Dispatch<React.SetStateAction<{
    type: string;
    endpoint: string;
    apiKey: string;
    model: string;
  }>>;
  ttsConfig: {
    apiKey: string;
    isSimulation: boolean;
  };
  setTtsConfig: React.Dispatch<React.SetStateAction<{
    apiKey: string;
    isSimulation: boolean;
  }>>;
  showSettingsWarning: boolean;
  setShowSettingsWarning: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  projectName: string;
}

export default function SettingsPanel({
  llmConfig,
  setLlmConfig,
  ttsConfig,
  setTtsConfig,
  showSettingsWarning,
  setShowSettingsWarning,
  setShowSettings,
  projectName,
}: SettingsPanelProps) {
  // 로컬 편집용 상태
  const [localLlm, setLocalLlm] = useState(llmConfig);
  const [localTts, setLocalTts] = useState(ttsConfig);
  
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "testConnection",
          llmConfig: localLlm,
          projectName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "연결 테스트 실패");
      }
      setConnectionTestResult({ success: true, message: data.message });
    } catch (err) {
      setConnectionTestResult({ success: false, message: (err as Error).message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = () => {
    setLlmConfig(localLlm);
    setTtsConfig(localTts);
    localStorage.setItem("yadam_llm_config", JSON.stringify(localLlm));
    localStorage.setItem("yadam_tts_config", JSON.stringify(localTts));
    setShowSettingsWarning(false);
    setShowSettings(false);
  };

  const handleRestoreDefaults = () => {
    const defaultLlm = {
      type: "ollama",
      endpoint: "http://localhost:11434",
      apiKey: "",
      model: "deepseek-v4-pro:cloud",
    };
    const defaultTts = { apiKey: "", isSimulation: true };
    setLocalLlm(defaultLlm);
    setLocalTts(defaultTts);
  };

  return (
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
                value={localLlm.type}
                onChange={(e) => setLocalLlm({ ...localLlm, type: e.target.value })}
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
                value={localLlm.endpoint}
                onChange={(e) => setLocalLlm({ ...localLlm, endpoint: e.target.value })}
                placeholder={localLlm.type === "ollama" ? "http://localhost:11434" : "https://api.deepseek.com/v1"}
                className="w-full bg-[#12100e] border border-amber-600/20 rounded px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {localLlm.type === "deepseek" && (
              <div>
                <label className="block text-xs text-neutral-400 mb-1">DeepSeek API Key</label>
                <input
                  type="password"
                  value={localLlm.apiKey}
                  onChange={(e) => setLocalLlm({ ...localLlm, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-[#12100e] border border-amber-600/20 rounded px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-neutral-400 mb-1">모델 이름</label>
              <input
                type="text"
                value={localLlm.model}
                onChange={(e) => setLocalLlm({ ...localLlm, model: e.target.value })}
                placeholder={localLlm.type === "ollama" ? "deepseek-v4-pro:cloud" : "deepseek-chat"}
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
                checked={localTts.isSimulation}
                onChange={(e) => setLocalTts({ ...localTts, isSimulation: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500 text-black border-amber-600/30"
              />
              <label htmlFor="isSim" className="text-xs text-neutral-300 font-medium select-none cursor-pointer">
                시뮬레이션 모드 활성화 (구글 API 비용 차단, 더미 무음 MP3 생성)
              </label>
            </div>

            {!localTts.isSimulation && (
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Google Cloud API Key</label>
                <input
                  type="password"
                  value={localTts.apiKey}
                  onChange={(e) => setLocalTts({ ...localTts, apiKey: e.target.value })}
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 border-t border-amber-600/10 pt-4">
        <div className="flex items-center gap-3">
          <button
            disabled={testingConnection}
            onClick={handleTestConnection}
            className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-amber-600/50 hover:bg-neutral-850 rounded text-xs font-semibold text-amber-500 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {testingConnection && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            연결 테스트
          </button>
          {connectionTestResult && (
            <span className={`text-xs ${connectionTestResult.success ? "text-emerald-400" : "text-red-400"}`}>
              {connectionTestResult.success ? `✓ ${connectionTestResult.message}` : `✗ ${connectionTestResult.message}`}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRestoreDefaults}
            className="px-4 py-2 rounded text-xs text-neutral-400 hover:text-white"
          >
            기본값 복원
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold text-black transition"
          >
            설정 저장 완료
          </button>
        </div>
      </div>
    </section>
  );
}
