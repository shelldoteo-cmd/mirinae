export interface TtsVoiceMapping {
  voiceName: string;
  speakingRate: number;
  pitch: number;
}

export const G_TTS_VOICES: Record<string, TtsVoiceMapping> = {
  narrator_main: { voiceName: "ko-KR-Neural2-C", speakingRate: 1.03, pitch: -0.5 },
  male_1: { voiceName: "ko-KR-Wavenet-C", speakingRate: 1.0, pitch: 0.5 },
  male_2: { voiceName: "ko-KR-Wavenet-I", speakingRate: 0.95, pitch: -2.0 },
  female_1: { voiceName: "ko-KR-Neural2-A", speakingRate: 1.0, pitch: 0.0 },
  female_2: { voiceName: "ko-KR-Neural2-B", speakingRate: 0.98, pitch: -1.0 },
  elder_1: { voiceName: "ko-KR-Wavenet-D", speakingRate: 0.85, pitch: -3.0 },
  ghost_1: { voiceName: "ko-KR-Wavenet-B", speakingRate: 0.8, pitch: -5.0 }, // 극적인 귀신 소리
};

/** 등록된 화자 ID 목록 */
export const KNOWN_SPEAKER_IDS = Object.keys(G_TTS_VOICES);

/** Google TTS SSML 입력 최대 바이트 한도 (안전 마진 포함) */
const SSML_MAX_BYTES = 4800; // 5000 - 200 바이트 안전 마진 (SSML 태그 오버헤드)

// 1초 분량의 무음 MP3 파일 Base64 데이터 (시뮬레이션 모드용)
const DUMMY_SILENT_MP3_BASE64 =
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGFtZTMuMTAwZXJyb3IAAAAAAAAAAAAA//MUxAAAAAAAAS1AIAAAAAAxNTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//MUxAcAAAAAAAS1AIAAAAAAxNTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//MUxAsAAAAAAAS1AIAAAAAAxNTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/**
 * XML/SSML 특수문자 이스케이프
 * Google TTS SSML에서 &, <, >, ", ' 이 이스케이프 없이 들어가면 파싱 에러 발생
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * UTF-8 바이트 길이를 계산합니다.
 */
function getUtf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * 텍스트를 문장 경계에서 분할하여 각 조각이 maxBytes 이하가 되도록 합니다.
 * Google TTS의 5,000 bytes 제한을 준수하기 위해 사용됩니다.
 */
export function splitTextByBytes(text: string, maxBytes: number): string[] {
  if (getUtf8ByteLength(text) <= maxBytes) {
    return [text];
  }

  const chunks: string[] = [];
  // 문장 경계로 분할: 마침표, 느낌표, 물음표, ~다, ~요 뒤의 공백
  const sentences = text.split(/(?<=[.!?~。]\s*)/);

  let current = "";
  for (const sentence of sentences) {
    const candidate = current + sentence;
    if (getUtf8ByteLength(candidate) > maxBytes) {
      if (current.trim()) {
        chunks.push(current.trim());
      }
      // 단일 문장이 maxBytes를 초과하는 극단적 경우: 강제 분할
      if (getUtf8ByteLength(sentence) > maxBytes) {
        const forceSplit = forceChunkByBytes(sentence, maxBytes);
        chunks.push(...forceSplit);
        current = "";
      } else {
        current = sentence;
      }
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * 문장 분할이 불가능한 긴 단일 문장을 바이트 단위로 강제 분할합니다.
 */
function forceChunkByBytes(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = text.length;
    while (end > start + 1 && getUtf8ByteLength(text.substring(start, end)) > maxBytes) {
      end = Math.floor((start + end) / 2);
    }
    // 정밀 조정: 한 글자씩 줄여서 정확한 경계 찾기
    while (end < text.length && getUtf8ByteLength(text.substring(start, end + 1)) <= maxBytes) {
      end++;
    }
    chunks.push(text.substring(start, end).trim());
    start = end;
  }

  return chunks.filter(c => c.length > 0);
}

export class GoogleTtsAdapter {
  private apiKey: string;
  private isSimulation: boolean;

  constructor(apiKey: string = "") {
    this.apiKey = apiKey;
    this.isSimulation = !apiKey;
  }

  /**
   * 일반 텍스트 또는 SSML을 음성 데이터로 합성합니다.
   * 5,000 bytes를 초과하는 세그먼트는 자동 분할하여 개별 합성 후 결합합니다.
   * @returns Base64 인코딩된 MP3 바이너리 문자열
   */
  async synthesize(
    text: string,
    speakerId: string,
    emotion: string = "neutral",
    pauseAfterMs: number = 500,
    useSsml: boolean = true
  ): Promise<string> {
    if (this.isSimulation) {
      // 0.2초 정도 인위적인 네트워크 딜레이 생성하여 현실감 부여
      await new Promise((resolve) => setTimeout(resolve, 200));
      return DUMMY_SILENT_MP3_BASE64;
    }

    const voiceConfig = G_TTS_VOICES[speakerId] || G_TTS_VOICES.narrator_main;

    // 텍스트가 바이트 한도 초과 시 분할 처리
    const textChunks = splitTextByBytes(text, SSML_MAX_BYTES);

    const audioPartsBase64: string[] = [];

    for (const chunk of textChunks) {
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;

      let requestInput: Record<string, string> = {};
      if (useSsml) {
        const ssmlContent = this.buildSsml(chunk, speakerId, emotion, pauseAfterMs);
        requestInput = { ssml: ssmlContent };
      } else {
        requestInput = { text: chunk };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: requestInput,
          voice: {
            languageCode: "ko-KR",
            name: voiceConfig.voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: voiceConfig.speakingRate,
            pitch: voiceConfig.pitch,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Cloud TTS API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      if (data.audioContent) {
        audioPartsBase64.push(data.audioContent);
      }
    }

    // 여러 청크로 분할된 경우 Base64 오디오를 결합
    if (audioPartsBase64.length === 1) {
      return audioPartsBase64[0];
    }

    // 여러 MP3 청크를 바이너리 결합 (단순 연결 — MP3는 프레임 기반이므로 연결 가능)
    const buffers = audioPartsBase64.map(b64 => Buffer.from(b64, "base64"));
    const combined = Buffer.concat(buffers);
    return combined.toString("base64");
  }

  /**
   * 화자, 감정, 포즈 정보를 반영하여 SSML 문자열을 설계합니다.
   * 특수문자는 자동으로 XML 이스케이프됩니다.
   */
  buildSsml(text: string, speakerId: string, emotion: string, pauseAfterMs: number): string {
    const voiceConfig = G_TTS_VOICES[speakerId] || G_TTS_VOICES.narrator_main;
    let rate = voiceConfig.speakingRate;
    let pitch = voiceConfig.pitch;

    // 감정에 따른 목소리 미세 튜닝
    switch (emotion) {
      case "angry":
        rate += 0.15;
        pitch += 1.0;
        break;
      case "sad":
        rate -= 0.1;
        pitch -= 1.0;
        break;
      case "fear":
        rate += 0.1;
        pitch += 1.5;
        break;
      case "happy":
        rate += 0.05;
        pitch += 0.5;
        break;
      case "dynamic":
        rate += 0.08;
        break;
      case "neutral":
      default:
        break;
    }

    // pitch 수치 포맷팅 (st 단위)
    const pitchStr = pitch >= 0 ? `+${pitch}st` : `${pitch}st`;

    // SSML 구조 빌드 — text는 반드시 XML 이스케이프 적용
    const escapedText = escapeXml(text);

    let ssml = `<speak>`;
    ssml += `<prosody pitch="${pitchStr}" rate="${rate}">`;
    ssml += escapedText;
    ssml += `</prosody>`;
    if (pauseAfterMs > 0) {
      ssml += `<break time="${pauseAfterMs}ms"/>`;
    }
    ssml += `</speak>`;

    return ssml;
  }
}
