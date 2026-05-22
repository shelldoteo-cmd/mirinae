import { NextResponse } from "next/server";
import { YadamGenerator } from "@/lib/generators";
import { GoogleTtsAdapter } from "@/lib/tts/GoogleTtsAdapter";
import * as fs from "fs";
import * as path from "path";

// output/{projectName}/ 폴더와 public/output/{projectName}/ 폴더에 산출물을 동시 저장하는 헬퍼 함수
function saveOutputFile(projectName: string, filename: string, content: string, isBinary: boolean = false) {
  const rootOutputDir = path.join(process.cwd(), "output", projectName);
  const publicOutputDir = path.join(process.cwd(), "public", "output", projectName);

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

// 오디오 폴더 특화 저장 헬퍼 함수
function saveAudioFile(projectName: string, filename: string, contentBase64: string) {
  const rootAudioDir = path.join(process.cwd(), "output", projectName, "audio");
  const publicAudioDir = path.join(process.cwd(), "public", "output", projectName, "audio");

  if (!fs.existsSync(rootAudioDir)) fs.mkdirSync(rootAudioDir, { recursive: true });
  if (!fs.existsSync(publicAudioDir)) fs.mkdirSync(publicAudioDir, { recursive: true });

  const rootPath = path.join(rootAudioDir, filename);
  const publicPath = path.join(publicAudioDir, filename);

  const buffer = Buffer.from(contentBase64, "base64");
  fs.writeFileSync(rootPath, buffer);
  fs.writeFileSync(publicPath, buffer);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, script, ttsConfig, projectName } = body;

    // 프로젝트명이 없으면 기본값 사용
    const safeProjectName = projectName || "기본 프로젝트";

    // 더미 LLM(파싱 및 세그먼트 가공만 하므로 실제 LLM 쿼리는 안 함)
    const dummyLlmAdapter = {
      generateText: async () => "",
      generateJson: async () => ({} as any),
    };
    const generator = new YadamGenerator(dummyLlmAdapter);

    // 1. 대본에서 세그먼트들 추출
    if (!script) {
      return NextResponse.json({ error: "대본 내용이 누락되었습니다." }, { status: 400 });
    }

    const segments = generator.createTtsSegments(script);
    const csvContent = generator.convertToCsv(segments);

    // 구글 TTS 어댑터 준비
    const apiKey = ttsConfig?.apiKey || "";
    const ttsAdapter = new GoogleTtsAdapter(apiKey);

    const ssmlList = generator.convertToSsmlJson(segments, ttsAdapter);

    // 2. CSV 및 SSML JSON 저장
    saveOutputFile(safeProjectName, "tts_segments.csv", csvContent);
    saveOutputFile(safeProjectName, "ssml_segments.json", JSON.stringify(ssmlList, null, 2));

    // 액션이 단순 'parse'인 경우 파싱 결과만 즉각 리턴
    if (action === "parse") {
      const unregisteredSpeakers = Array.from(
        new Set(
          segments
            .filter(seg => seg.isUnknownSpeaker)
            .map(seg => seg.speakerId)
        )
      );
      return NextResponse.json({
        segments,
        ssmlList,
        csvContent,
        unregisteredSpeakers,
      });
    }

    // 액션이 'synthesize'인 경우 오디오 합성 진행
    if (action === "synthesize") {
      const manifest: any[] = [];
      const speechSegments = segments.filter(seg => seg.type === "N" || seg.type === "대사");

      // 속도 보장 및 Google Cloud Rate Limit 방지를 위해 3개씩 청크단위 병렬처리 수행
      const concurrencyLimit = 3;
      for (let i = 0; i < speechSegments.length; i += concurrencyLimit) {
        const chunk = speechSegments.slice(i, i + concurrencyLimit);
        
        await Promise.all(
          chunk.map(async (seg) => {
            const fileName = `segment_${String(seg.id).padStart(3, "0")}.mp3`;
            try {
              // TTS API 호출 및 파일 저장
              const base64Audio = await ttsAdapter.synthesize(
                seg.text,
                seg.speakerId,
                seg.emotion,
                seg.pauseAfterMs,
                true // SSML 모드로 고품격 음성합색
              );
              
              saveAudioFile(safeProjectName, fileName, base64Audio);

              manifest.push({
                id: seg.id,
                speakerId: seg.speakerId,
                emotion: seg.emotion,
                text: seg.text,
                pauseAfterMs: seg.pauseAfterMs,
                audioPath: `/output/audio/${fileName}`,
                fileName: fileName,
                status: "success",
              });
            } catch (err) {
              console.error(`Error synthesizing segment ${seg.id}:`, err);
              manifest.push({
                id: seg.id,
                speakerId: seg.speakerId,
                emotion: seg.emotion,
                text: seg.text,
                pauseAfterMs: seg.pauseAfterMs,
                audioPath: "",
                fileName: fileName,
                status: "failed",
                error: (err as Error).message,
              });
            }
          })
        );
      }

      // 오디오 매니페스트 저장 (audio_manifest.json)
      // ID 오름차순 정렬하여 출력
      manifest.sort((a, b) => a.id - b.id);
      saveOutputFile(safeProjectName, "audio_manifest.json", JSON.stringify(manifest, null, 2));

      return NextResponse.json({
        success: true,
        manifest,
        segmentsCount: speechSegments.length,
        isSimulation: !apiKey,
      });
    }

    return NextResponse.json({ error: "올바르지 않은 액션입니다." }, { status: 400 });
  } catch (error) {
    console.error("TTS API Route Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
