import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export interface ProjectSummary {
  name: string;
  hasStoryJson: boolean;
  hasScriptMd: boolean;
  actCount: number;
  updatedAt: string | null;
}

export async function GET() {
  try {
    const outputDir = path.join(process.cwd(), "output");

    if (!fs.existsSync(outputDir)) {
      return NextResponse.json({ projects: [] });
    }

    const entries = fs.readdirSync(outputDir, { withFileTypes: true });
    const projects: ProjectSummary[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectDir = path.join(outputDir, entry.name);
      const storyJsonPath = path.join(projectDir, "story.json");
      const scriptMdPath = path.join(projectDir, "script.md");

      let hasStoryJson = false;
      let updatedAt: string | null = null;
      let actCount = 0;

      if (fs.existsSync(storyJsonPath)) {
        hasStoryJson = true;
        try {
          const stat = fs.statSync(storyJsonPath);
          updatedAt = stat.mtime.toISOString();
        } catch { /* ignore */ }
      }

      // Count act files
      const projectFiles = fs.readdirSync(projectDir);
      actCount = projectFiles.filter(f => /^act_\d+\.md$/.test(f)).length;

      projects.push({
        name: entry.name,
        hasStoryJson,
        hasScriptMd: fs.existsSync(scriptMdPath),
        actCount,
        updatedAt,
      });
    }

    // Sort by updatedAt descending (newest first)
    projects.sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Projects API Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "프로젝트 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
