"use client";

import { useState, useEffect, useCallback } from "react";

const PROJECT_LIST_KEY = "yadam_project_list";
const LAST_PROJECT_KEY = "yadam_last_project";

function getProjectStorageKey(name: string) {
  return `yadam_proj_${name}`;
}

function loadProjectList(): string[] {
  try {
    const raw = localStorage.getItem(PROJECT_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProjectList(list: string[]) {
  localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(list));
}

const emptyData = {
  currentStep: 1,
  maxReachedStep: 1,
  topic: "",
  keywordsString: "",
  analysis: null,
  recommendedTypes: [],
  selectedType: null,
  hookCandidates: [],
  selectedHook: null,
  plotPlan: null,
  actScripts: {},
  failedActs: [],
  finalScript: "",
  validationResult: null,
  ttsSegments: [],
  ssmlList: [],
  csvContent: "",
  audioManifest: [],
  savedAt: "",
};

export function useYadamProjects(onLoad: (data: any) => void) {
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
  const [showSettingsWarning, setShowSettingsWarning] = useState(false);

  // -------------------------------------------------------------------
  // 프로젝트 관리 상태
  // -------------------------------------------------------------------
  const [projectName, setProjectName] = useState("");
  const [projectList, setProjectList] = useState<string[]>([]);
  const [serverProjects, setServerProjects] = useState<{ name: string; hasStoryJson: boolean; hasScriptMd: boolean; actCount: number; updatedAt: string | null }[]>([]);
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "">("");

  // -------------------------------------------------------------------
  // 프로젝트 저장 / 불러오기 핸들러
  // -------------------------------------------------------------------
  const saveProject = useCallback((name: string, data: any) => {
    try {
      localStorage.setItem(getProjectStorageKey(name), JSON.stringify(data));
      const list = loadProjectList();
      if (!list.includes(name)) {
        list.unshift(name);
        saveProjectList(list);
        setProjectList(list);
      }
      localStorage.setItem(LAST_PROJECT_KEY, name);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  }, []);

  const loadProject = useCallback((name: string) => {
    const raw = localStorage.getItem(getProjectStorageKey(name));
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      setProjectName(name);
      onLoad(data);
      localStorage.setItem(LAST_PROJECT_KEY, name);
      setProjectLoaded(true);
      return true;
    } catch { return false; }
  }, [onLoad]);

  const deleteProject = useCallback((name: string) => {
    localStorage.removeItem(getProjectStorageKey(name));
    const list = loadProjectList().filter(p => p !== name);
    saveProjectList(list);
    setProjectList(list);
    if (projectName === name) {
      setProjectName("");
      setProjectLoaded(false);
      onLoad(emptyData);
    }
  }, [projectName, onLoad]);

  const createNewProject = useCallback((name: string) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    setProjectName(cleanName);
    onLoad(emptyData);
    setProjectLoaded(true);
    setShowProjectPanel(false);

    localStorage.setItem(getProjectStorageKey(cleanName), JSON.stringify(emptyData));
    const list = loadProjectList();
    if (!list.includes(cleanName)) {
      list.unshift(cleanName);
      saveProjectList(list);
      setProjectList(list);
    }
    localStorage.setItem(LAST_PROJECT_KEY, cleanName);
  }, [onLoad]);

  const syncServerProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) return;
      const data = await res.json();
      setServerProjects(data.projects || []);

      const localList = loadProjectList();
      const serverNames = (data.projects || []).map((p: any) => p.name);
      const merged = [...localList];
      let changed = false;
      for (const name of serverNames) {
        if (!merged.includes(name)) {
          merged.push(name);
          changed = true;
        }
      }
      if (changed) {
        saveProjectList(merged);
        setProjectList(merged);
      }
    } catch { /* ignore */ }
  }, []);

  const loadProjectFromServer = useCallback(async (name: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(name)}`);
      if (!res.ok) return false;
      const storyData = await res.json();

      const hasValidation = storyData.polishedScript && storyData.validationResult;
      const stepFromServer = hasValidation ? 5
        : (storyData.polishedScript || (storyData.actScripts && Object.keys(storyData.actScripts).length > 0)) ? 4
        : storyData.plotPlan ? 3
        : storyData.selectedHook ? 2 : 1;
      const localData = {
        currentStep: stepFromServer,
        maxReachedStep: stepFromServer,
        topic: storyData.topic || "",
        keywordsString: (storyData.keywords || []).join(", "),
        analysis: storyData.analysis || null,
        recommendedTypes: storyData.recommendedTypes || [],
        selectedType: storyData.selectedType || null,
        hookCandidates: storyData.hookCandidates || [],
        selectedHook: storyData.selectedHook || null,
        plotPlan: storyData.plotPlan || null,
        actScripts: storyData.actScripts || {},
        failedActs: [],
        finalScript: storyData.polishedScript || "",
        validationResult: storyData.validationResult || null,
        ttsSegments: [], ssmlList: [], csvContent: "", audioManifest: [],
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(getProjectStorageKey(name), JSON.stringify(localData));

      const list = loadProjectList();
      if (!list.includes(name)) {
        list.unshift(name);
        saveProjectList(list);
        setProjectList(list);
      }

      setProjectName(name);
      onLoad(localData);
      setProjectLoaded(true);
      return true;
    } catch { return false; }
  }, [onLoad]);

  // -------------------------------------------------------------------
  // 초기 설정 및 마지막 프로젝트 복구
  // -------------------------------------------------------------------
  useEffect(() => {
    const savedLlm = localStorage.getItem("yadam_llm_config");
    const savedTts = localStorage.getItem("yadam_tts_config");
    if (savedLlm) {
      setLlmConfig(JSON.parse(savedLlm));
    } else {
      setShowSettings(true);
      setShowSettingsWarning(true);
    }
    if (savedTts) setTtsConfig(JSON.parse(savedTts));

    const list = loadProjectList();
    setProjectList(list);

    syncServerProjects();

    const lastProj = localStorage.getItem(LAST_PROJECT_KEY);
    if (lastProj && list.includes(lastProj)) {
      const raw = localStorage.getItem(getProjectStorageKey(lastProj));
      if (raw) {
        try {
          const data = JSON.parse(raw);
          setProjectName(lastProj);
          onLoad(data);
          setProjectLoaded(true);
        } catch { /* ignore */ }
      }
    } else if (list.length === 0) {
      const defaultName = "기본 프로젝트";
      setProjectName(defaultName);
      setProjectList([defaultName]);
      saveProjectList([defaultName]);
      localStorage.setItem(LAST_PROJECT_KEY, defaultName);
      setProjectLoaded(true);
      
      const initialData = {
        currentStep: 1, maxReachedStep: 1,
        topic: "욕심쟁이 김대감과 밤안개 도깨비의 황금 계약",
        keywordsString: "황금, 주막, 밤안개, 도깨비, 궤짝, 인과응보",
        analysis: null, recommendedTypes: [], selectedType: null,
        hookCandidates: [], selectedHook: null,
        plotPlan: null, actScripts: {}, failedActs: [],
        finalScript: "", validationResult: null,
        ttsSegments: [], ssmlList: [], csvContent: "", audioManifest: [],
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(getProjectStorageKey(defaultName), JSON.stringify(initialData));
      onLoad(initialData);
    }
  }, [syncServerProjects, onLoad]);

  // 설정을 바꿀 때마다 로컬 스토리지에 유지
  useEffect(() => {
    if (llmConfig.apiKey || llmConfig.endpoint) {
      localStorage.setItem("yadam_llm_config", JSON.stringify(llmConfig));
    }
  }, [llmConfig]);

  useEffect(() => {
    if (ttsConfig.apiKey || !ttsConfig.isSimulation) {
      localStorage.setItem("yadam_tts_config", JSON.stringify(ttsConfig));
    }
  }, [ttsConfig]);

  return {
    llmConfig, setLlmConfig,
    ttsConfig, setTtsConfig,
    projectName, setProjectName,
    projectList, setProjectList,
    serverProjects, setServerProjects,
    showSettings, setShowSettings,
    showSettingsWarning, setShowSettingsWarning,
    showProjectPanel, setShowProjectPanel,
    projectLoaded, setProjectLoaded,
    saveStatus, setSaveStatus,

    // handlers
    createNewProject,
    loadProject,
    deleteProject,
    loadProjectFromServer,
    syncServerProjects,
    saveProject,
  };
}
