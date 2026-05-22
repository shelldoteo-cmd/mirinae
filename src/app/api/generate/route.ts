import { NextResponse } from "next/server";
import { OllamaAdapter } from "@/lib/llm/OllamaAdapter";
import { DeepSeekDirectAdapter } from "@/lib/llm/DeepSeekDirectAdapter";
import { YadamGenerator } from "@/lib/generators";
import * as fs from "fs";
import * as path from "path";

// output/{projectName}/ 폴더와 public/output/{projectName}/ 폴더에 산출물을 동시 저장하는 헬퍼 함수
function saveOutputFile(projectName: string, filename: string, content: string, isBinary: boolean = false) {
  const rootOutputDir = path.join(process.cwd(), "output", projectName);
  const publicOutputDir = path.join(process.cwd(), "public", "output", projectName);

  // 디렉토리 자동 생성
  if (!fs.existsSync(rootOutputDir)) fs.mkdirSync(rootOutputDir, { recursive: true });
  if (!fs.existsSync(publicOutputDir)) fs.mkdirSync(publicOutputDir, { recursive: true });

  const rootPath = path.join(rootOutputDir, filename);
  const publicPath = path.join(publicOutputDir, filename);

  if (isBinary) {
    const buffer = Buffer.from(content, "base64");
    fs.writeFileSync(rootPath, buffer);
    fs.writeFileSync(publicPath, buffer);
  } else {
    fs.writeFileSync(rootPath, content, "utf-8");
    fs.writeFileSync(publicPath, content, "utf-8");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { step, llmConfig, projectName, ...payload } = body;

    // 프로젝트명이 없으면 기본값 사용
    const safeProjectName = projectName || "기본 프로젝트";

    // 1. LLM 어댑터 동적 생성
    const { type, endpoint, apiKey, model } = llmConfig || { type: "ollama" };
    let llmAdapter;

    if (type === "deepseek") {
      llmAdapter = new DeepSeekDirectAdapter(
        apiKey,
        endpoint || "https://api.deepseek.com/v1",
        model || "deepseek-chat"
      );
    } else {
      llmAdapter = new OllamaAdapter(
        endpoint || "http://localhost:11434",
        model || "deepseek-v4-pro:cloud"
      );
    }

    const generator = new YadamGenerator(llmAdapter);

    // 2. 단계별 생성 로직 분기
    switch (step) {
      case "testConnection": {
        try {
          if (type === "deepseek") {
            if (!apiKey) {
              return NextResponse.json({ error: "DeepSeek API Key가 입력되지 않았습니다." }, { status: 400 });
            }
            await llmAdapter.generateText("연결 확인을 위한 1글자 응답 요청: '1'", "당신은 AI 엔진 테스터입니다.");
            return NextResponse.json({ success: true, message: "DeepSeek API 연결 성공!" });
          } else {
            const pingUrl = `${endpoint || "http://localhost:11434"}/api/tags`;
            const pingRes = await fetch(pingUrl, { method: "GET" });
            if (!pingRes.ok) {
              throw new Error(`Ollama 서버 응답 에러: ${pingRes.status}`);
            }
            return NextResponse.json({ success: true, message: "Ollama 서버 연결 성공!" });
          }
        } catch (err) {
          return NextResponse.json({ error: `연결 테스트 실패: ${(err as Error).message}` }, { status: 500 });
        }
      }

      case "analyzeInput": {
        const { topic, keywords, customCharacters } = payload;
        if (!topic || !keywords) {
          return NextResponse.json({ error: "주제와 키워드가 누락되었습니다." }, { status: 400 });
        }
        const analysis = await generator.analyzeInput(topic, keywords, customCharacters);
        const recommendedTypes = await generator.recommendYadamTypes(analysis);

        // 중간 상태 파일로 기록 (story.json)
        const storyMetadata = {
          topic,
          keywords,
          analysis,
          recommendedTypes,
          updatedAt: new Date().toISOString(),
        };
        saveOutputFile(safeProjectName, "story.json", JSON.stringify(storyMetadata, null, 2));

        return NextResponse.json({ analysis, recommendedTypes });
      }

      case "generateHook": {
        const { topic, keywords, selectedType, analysis } = payload;
        const hookCandidates = await generator.generateHookCandidates(
          topic,
          keywords,
          selectedType,
          analysis
        );

        // story.json 갱신
        const storyPath = path.join(process.cwd(), "output", safeProjectName, "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        existingStory.selectedType = selectedType;
        existingStory.hookCandidates = hookCandidates;
        saveOutputFile(safeProjectName, "story.json", JSON.stringify(existingStory, null, 2));

        return NextResponse.json({ hookCandidates });
      }

      case "generatePlot": {
        const { topic, selectedType, selectedHook, analysis, scriptLength, customCharacters } = payload;
        const plotPlan = await generator.generatePlotPlan(
          topic,
          selectedType,
          selectedHook,
          analysis,
          scriptLength,
          customCharacters
        );

        // story.json 갱신
        const storyPath = path.join(process.cwd(), "output", safeProjectName, "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        existingStory.selectedHook = selectedHook;
        existingStory.plotPlan = plotPlan;
        saveOutputFile(safeProjectName, "story.json", JSON.stringify(existingStory, null, 2));

        return NextResponse.json({ plotPlan });
      }

      case "generateAct": {
        const { actNumber, topic, selectedType, plotPlan, previousScripts, scriptLength, customCharacters } = payload;
        const actScript = await generator.generateActScript(
          actNumber,
          topic,
          selectedType,
          plotPlan,
          previousScripts,
          scriptLength,
          customCharacters
        );

        // story.json 갱신
        const storyPath = path.join(process.cwd(), "output", safeProjectName, "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        if (!existingStory.actScripts) existingStory.actScripts = {};
        existingStory.actScripts[actNumber] = actScript;
        saveOutputFile(safeProjectName, "story.json", JSON.stringify(existingStory, null, 2));

        // 각 막별 개별 .md 파일로 즉시 저장 (초안 보존)
        saveOutputFile(safeProjectName, `act_${actNumber}.md`, actScript);

        return NextResponse.json({ actScript });
      }

      case "polishScript": {
        const { topic, selectedType, actScripts } = payload;
        const polishedScript = await generator.mergeAndPolishScript(
          topic,
          selectedType,
          actScripts
        );

        // story.json 및 script.md 기록
        const storyPath = path.join(process.cwd(), "output", safeProjectName, "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        existingStory.polishedScript = polishedScript;
        saveOutputFile(safeProjectName, "story.json", JSON.stringify(existingStory, null, 2));
        saveOutputFile(safeProjectName, "script.md", polishedScript);

        return NextResponse.json({ polishedScript });
      }

      case "validateScript": {
        const { script, plotPlan } = payload;
        const validationResult = await generator.validateScript(script, plotPlan);

        // story.json 갱신
        const storyPath = path.join(process.cwd(), "output", safeProjectName, "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        existingStory.validationResult = validationResult;
        saveOutputFile(safeProjectName, "story.json", JSON.stringify(existingStory, null, 2));

        return NextResponse.json({ validationResult });
      }

      case "refineScript": {
        const { script, issues } = payload;
        if (!script || !issues || !Array.isArray(issues) || issues.length === 0) {
          return NextResponse.json({ error: "대본과 개선 항목이 필요합니다." }, { status: 400 });
        }
        const result = await generator.refineScript(script, issues);

        // 교정된 대본을 파일로 즉시 저장
        saveOutputFile(safeProjectName, "script.md", result.refinedScript);

        // story.json 갱신
        const storyPath = path.join(process.cwd(), "output", safeProjectName, "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        existingStory.polishedScript = result.refinedScript;
        existingStory.lastRefinement = {
          issues,
          changeSummary: result.changeSummary,
          timestamp: new Date().toISOString(),
        };
        saveOutputFile(safeProjectName, "story.json", JSON.stringify(existingStory, null, 2));

        return NextResponse.json({ refinedScript: result.refinedScript, changeSummary: result.changeSummary });
      }

      default:
        return NextResponse.json({ error: "올바르지 않은 생성 단계입니다." }, { status: 400 });
    }
  } catch (error) {
    console.error("Generate API Route Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
