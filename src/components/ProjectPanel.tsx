"use client";

import React from "react";
import { PackageOpen, Server, HardDriveDownload } from "lucide-react";

interface ServerProject {
  name: string;
  hasStoryJson: boolean;
  hasScriptMd: boolean;
  actCount: number;
  updatedAt: string | null;
}

interface ProjectPanelProps {
  projectName: string;
  projectList: string[];
  serverProjects: ServerProject[];
  setShowProjectPanel: (show: boolean) => void;
  createNewProject: (name: string) => void;
  loadProject: (name: string) => boolean;
  deleteProject: (name: string) => void;
  loadProjectFromServer: (name: string) => Promise<boolean>;
}

export default function ProjectPanel({
  projectName,
  projectList,
  serverProjects,
  setShowProjectPanel,
  createNewProject,
  loadProject,
  deleteProject,
  loadProjectFromServer,
}: ProjectPanelProps) {
  
  const getProjectStorageKey = (name: string) => {
    return `yadam_proj_${name}`;
  };

  return (
    <section className="glass-panel p-6 z-25 relative mb-2 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between border-b border-amber-600/20 pb-3 mb-4">
        <h2 className="text-lg font-semibold text-amber-500 flex items-center gap-2">
          <PackageOpen className="w-5 h-5" />
          프로젝트 관리
        </h2>
        <button onClick={() => setShowProjectPanel(false)} className="text-neutral-400 hover:text-white text-sm">닫기</button>
      </div>

      {/* 새 프로젝트 생성 */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="새 프로젝트 이름 (예: 도깨비편, 구미호전설)"
          id="new-project-input"
          className="flex-1 bg-[#12100e] border border-amber-600/20 rounded px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const input = e.target as HTMLInputElement;
              createNewProject(input.value);
              input.value = "";
            }
          }}
        />
        <button
          onClick={() => {
            const input = document.getElementById("new-project-input") as HTMLInputElement;
            if (input?.value) {
              createNewProject(input.value);
              input.value = "";
            }
          }}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm rounded transition"
        >
          새 프로젝트
        </button>
      </div>

      {/* 저장된 프로젝트 목록 */}
      {projectList.length > 0 || serverProjects.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {projectList.map((name) => {
            let savedAt = "";
            let step = 0;
            if (typeof window !== "undefined") {
              const raw = localStorage.getItem(getProjectStorageKey(name));
              if (raw) {
                try {
                  const d = JSON.parse(raw);
                  savedAt = d.savedAt ? new Date(d.savedAt).toLocaleString("ko-KR") : "";
                  step = d.currentStep || 0;
                } catch { /* */ }
              }
            }
            // 서버 정보 찾기
            const serverInfo = serverProjects.find(p => p.name === name);
            const isActive = projectName === name;
            
            // localstorage에 있는지 판별
            let hasLocal = false;
            if (typeof window !== "undefined") {
              hasLocal = localStorage.getItem(getProjectStorageKey(name)) !== null;
            }

            return (
              <div key={name} className={`flex items-center justify-between p-3 rounded-lg border transition ${
                isActive ? "border-amber-500 bg-amber-950/20" : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-700"
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-200 truncate">{name}</span>
                    {serverInfo && (
                      <span className="text-[10px] text-cyan-500 flex items-center gap-1 shrink-0" title="서버에 저장된 프로젝트">
                        <Server className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    {step > 0 && `${step}단계`}
                    {serverInfo && serverInfo.actCount > 0 && ` · ${serverInfo.actCount}막 생성됨`}
                    {savedAt && ` · ${savedAt}`}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {hasLocal ? (
                    <>
                      <button
                        onClick={() => { loadProject(name); setShowProjectPanel(false); }}
                        className="px-3 py-1 text-xs font-semibold rounded bg-amber-600/20 text-amber-500 hover:bg-amber-600/40 transition"
                      >
                        불러오기
                      </button>
                      <button
                        onClick={() => { if (confirm(`"${name}" 프로젝트를 삭제할까요?`)) deleteProject(name); }}
                        className="px-2 py-1 text-xs rounded text-red-400 hover:bg-red-950/40 transition"
                      >
                        삭제
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={async () => {
                        const ok = await loadProjectFromServer(name);
                        if (ok) setShowProjectPanel(false);
                        else alert("서버에서 프로젝트를 불러오지 못했습니다.");
                      }}
                      className="px-3 py-1 text-xs font-semibold rounded bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40 transition flex items-center gap-1"
                    >
                      <HardDriveDownload className="w-3 h-3" />
                      서버에서 불러오기
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-neutral-500 text-center py-4">저장된 프로젝트가 없습니다. 위에서 새 프로젝트를 생성해 주세요.</p>
      )}
    </section>
  );
}
