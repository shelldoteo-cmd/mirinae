import { NextResponse } from "next/server";
import { OllamaAdapter } from "@/lib/llm/OllamaAdapter";
import { DeepSeekDirectAdapter } from "@/lib/llm/DeepSeekDirectAdapter";
import { YadamGenerator } from "@/lib/generators";
import * as fs from "fs";
import * as path from "path";

// output 폴더와 public/output 폴더에 산출물을 동시 저장하는 헬퍼 함수
function saveOutputFile(filename: string, content: string, isBinary: boolean = false) {
  const rootOutputDir = path.join(process.cwd(), "output");
  const publicOutputDir = path.join(process.cwd(), "public", "output");

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
    const { step, llmConfig, ...payload } = body;

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
      case "analyzeInput": {
        const { topic, keywords } = payload;
        if (!topic || !keywords) {
          return NextResponse.json({ error: "주제와 키워드가 누락되었습니다." }, { status: 400 });
        }
        const analysis = await generator.analyzeInput(topic, keywords);
        const recommendedTypes = await generator.recommendYadamTypes(analysis);

        // 중간 상태 파일로 기록 (story.json)
        const storyMetadata = {
          topic,
          keywords,
          analysis,
          recommendedTypes,
          updatedAt: new Date().toISOString(),
        };
        saveOutputFile("story.json", JSON.stringify(storyMetadata, null, 2));

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
        const storyPath = path.join(process.cwd(), "output", "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        existingStory.selectedType = selectedType;
        existingStory.hookCandidates = hookCandidates;
        saveOutputFile("story.json", JSON.stringify(existingStory, null, 2));

        return NextResponse.json({ hookCandidates });
      }

      case "generatePlot": {
        const { topic, selectedType, selectedHook, analysis } = payload;
        const plotPlan = await generator.generatePlotPlan(
          topic,
          selectedType,
          selectedHook,
          analysis
        );

        // story.json 갱신
        const storyPath = path.join(process.cwd(), "output", "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        existingStory.selectedHook = selectedHook;
        existingStory.plotPlan = plotPlan;
        saveOutputFile("story.json", JSON.stringify(existingStory, null, 2));

        return NextResponse.json({ plotPlan });
      }

      case "generateAct": {
        const { actNumber, topic, selectedType, plotPlan, previousScripts } = payload;
        const actScript = await generator.generateActScript(
          actNumber,
          topic,
          selectedType,
          plotPlan,
          previousScripts
        );

        // story.json 갱신
        const storyPath = path.join(process.cwd(), "output", "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        if (!existingStory.actScripts) existingStory.actScripts = {};
        existingStory.actScripts[actNumber] = actScript;
        saveOutputFile("story.json", JSON.stringify(existingStory, null, 2));

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
        const storyPath = path.join(process.cwd(), "output", "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        existingStory.polishedScript = polishedScript;
        saveOutputFile("story.json", JSON.stringify(existingStory, null, 2));
        saveOutputFile("script.md", polishedScript);

        return NextResponse.json({ polishedScript });
      }

      case "validateScript": {
        const { script, plotPlan } = payload;
        const validationResult = await generator.validateScript(script, plotPlan);

        // story.json 갱신
        const storyPath = path.join(process.cwd(), "output", "story.json");
        let existingStory: any = {};
        if (fs.existsSync(storyPath)) {
          existingStory = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
        }
        existingStory.validationResult = validationResult;
        saveOutputFile("story.json", JSON.stringify(existingStory, null, 2));

        return NextResponse.json({ validationResult });
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
