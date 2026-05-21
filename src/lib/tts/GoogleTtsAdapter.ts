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

// 1초 분량의 무음 MP3 파일 Base64 데이터 (시뮬레이션 모드용)
const DUMMY_SILENT_MP3_BASE64 = 
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGFtZTMuMTAwZXJyb3IAAAAAAAAAAAAA//MUxAAAAAAAAS1AIAAAAAAxNTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//MUxAcAAAAAAAS1AIAAAAAAxNTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//MUxAsAAAAAAAS1AIAAAAAAxNTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export class GoogleTtsAdapter {
  private apiKey: string;
  private isSimulation: boolean;

  constructor(apiKey: string = "") {
    this.apiKey = apiKey;
    this.isSimulation = !apiKey;
  }

  /**
   * 일반 텍스트 또는 SSML을 음성 데이터로 합성합니다.
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
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;

    let requestInput: any = {};
    if (useSsml) {
      const ssmlContent = this.buildSsml(text, speakerId, emotion, pauseAfterMs);
      requestInput = { ssml: ssmlContent };
    } else {
      requestInput = { text: text };
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
    return data.audioContent || "";
  }

  /**
   * 화자, 감정, 포즈 정보를 반영하여 SSML 문자열을 설계합니다.
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

    // SSML 구조 빌드
    let ssml = `<speak>`;
    ssml += `<prosody pitch="${pitchStr}" rate="${rate}">`;
    ssml += text;
    ssml += `</prosody>`;
    if (pauseAfterMs > 0) {
      ssml += `<break time="${pauseAfterMs}ms"/>`;
    }
    ssml += `</speak>`;

    return ssml;
  }
}
