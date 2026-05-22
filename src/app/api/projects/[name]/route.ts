import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const storyJsonPath = path.join(process.cwd(), "output", decodedName, "story.json");

    if (!fs.existsSync(storyJsonPath)) {
      return NextResponse.json(
        { error: `프로젝트 '${decodedName}'의 story.json을 찾을 수 없습니다.` },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(storyJsonPath, "utf-8");
    const storyData = JSON.parse(raw);

    // Also read individual act files if actScripts is not in story.json
    if (!storyData.actScripts || Object.keys(storyData.actScripts).length === 0) {
      const projectDir = path.join(process.cwd(), "output", decodedName);
      const actScripts: Record<string, string> = {};
      for (let i = 1; i <= 5; i++) {
        const actPath = path.join(projectDir, `act_${i}.md`);
        if (fs.existsSync(actPath)) {
          actScripts[String(i)] = fs.readFileSync(actPath, "utf-8");
        }
      }
      if (Object.keys(actScripts).length > 0) {
        storyData.actScripts = actScripts;
      }
    }

    // Read script.md if polishedScript is not in story.json
    if (!storyData.polishedScript) {
      const scriptMdPath = path.join(process.cwd(), "output", decodedName, "script.md");
      if (fs.existsSync(scriptMdPath)) {
        storyData.polishedScript = fs.readFileSync(scriptMdPath, "utf-8");
      }
    }

    return NextResponse.json(storyData);
  } catch (error) {
    console.error("Project Detail API Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "프로젝트를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
