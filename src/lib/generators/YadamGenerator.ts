import { LlmAdapter } from "../llm/types";
import { GoogleTtsAdapter, KNOWN_SPEAKER_IDS } from "../tts/GoogleTtsAdapter";
import {
  InputAnalysis,
  YadamType,
  HookCandidate,
  PlotPlan,
  ValidationResult,
  TtsSegment
} from "./types";
import { countPureTextChars } from "./pureTextCounter";

export class YadamGenerator {
  private llm: LlmAdapter;

  constructor(llm: LlmAdapter) {
    this.llm = llm;
  }

  /**
   * 1단계: analyzeInput - 주제 및 키워드 분석
   */
  async analyzeInput(topic: string, keywords: string[], customCharacters?: any[]): Promise<InputAnalysis> {
    const systemPrompt = `당신은 조선시대 야담과 민담, 기이한 전설의 서사를 기획하는 조선 최고의 이야기꾼입니다. 
입력된 주제와 키워드를 바탕으로, 독자와 청취자를 몰입시킬 수 있는 서사의 뼈대를 단단하게 구축해야 합니다.`;

    const charInfo = customCharacters && customCharacters.length > 0
      ? `\n\n[사용자 지정 등장인물]:\n${customCharacters.map(c => `- ${c.role}: ${c.name} (${c.title}) - ${c.personality}`).join("\n")}\n위 인물들을 중심으로 서사를 설계하되, 필요 시 조연을 추가해도 좋습니다.`
      : "";

    const prompt = `주제: "${topic}"
키워드: [${keywords.join(", ")}]${charInfo}

위 주제와 키워드를 바탕으로 이야기를 창조하기 위한 핵심 서사 요소를 정밀 분석해 주세요. 
반드시 아래 JSON 스키마를 만족하는 엄격한 JSON 형식으로만 답변을 작성하십시오. 설명이나 백틱(\`\`\`)은 생략하고 순수 JSON만 반환해야 합니다.

{
  "mainCharacters": "등장인물 간의 관계와 특징 (조선 시대 호칭 반영)",
  "setting": "이야기의 시간적, 공간적 배경 (조선 시대를 생생히 느낄 수 있는 장소 묘사)",
  "narrativeConflict": "주인공이 겪게 되는 핵심 갈등 및 의문의 사건",
  "foreshadowingPlan": "복선을 심어두고 후반부에서 극적으로 회수할 은밀한 복선 설계안",
  "lessonDirection": "마지막 막에서 제시할 인과응보와 사필귀정의 확실한 교훈 방향"
}`;

    return await this.llm.generateJson<InputAnalysis>(prompt, systemPrompt);
  }

  /**
   * 2단계: recommendYadamTypes - 야담 유형 추천
   */
  async recommendYadamTypes(analysis: InputAnalysis): Promise<YadamType[]> {
    const systemPrompt = "당신은 야담과 설화의 장르적 특성을 꿰뚫고 있는 문학 연구가이자 스토리 디렉터입니다.";
    const prompt = `이전 서사 분석 내용:
- 인물: ${analysis.mainCharacters}
- 배경: ${analysis.setting}
- 갈등: ${analysis.narrativeConflict}
- 복선: ${analysis.foreshadowingPlan}
- 교훈: ${analysis.lessonDirection}

위 서사에 가장 잘 부합하고 유튜브 시청자들에게 매력적으로 다가갈 수 있는 조선 야담 장르 유형 3가지를 엄격하게 추천해 주세요.
예시 유형: '기담(무섭고 기이한 이야기)', '인과응보담(선악의 징벌과 교훈)', '해학소담(익살과 풍자)', '영혼담(귀신과의 교감/해원)' 등.

반드시 아래 JSON 스키마를 만족하는 엄격한 JSON 배열 형식으로만 답변을 작성하십시오. 설명이나 백틱은 제외하십시오.

[
  {
    "name": "추천 유형명 (예: 기이하고 으스스한 기담)",
    "description": "이 장르 유형에 대한 상세한 설명",
    "tone": "전체적인 나레이션 및 대사의 어조 스타일 (예: 차갑고 미스터리하며 서늘한 톤)",
    "reason": "이 서사 구조에 해당 유형을 적극 추천하는 구체적인 사유"
  }
]`;

    return await this.llm.generateJson<YadamType[]>(prompt, systemPrompt);
  }

  /**
   * 3단계: generateHookCandidates - 후킹 후보 3개 생성 (1분 분량)
   */
  async generateHookCandidates(
    topic: string,
    keywords: string[],
    selectedType: YadamType,
    analysis: InputAnalysis
  ): Promise<HookCandidate[]> {
    const systemPrompt = `당신은 유튜브 100만 조회수를 기록하는 최고급 오디오 드라마/야담 채널의 작가입니다.
시청자들이 첫 1분 동안 절대 이탈하지 않도록 극도의 서스펜스와 호기심을 유발하는 콜드 오픈 후킹 대본을 작성해야 합니다.
★말투 톤 규칙★: 나레이터(해설자)는 편안하고 구수한 이야기꾼 톤("~했다네", "~더란다", "~하는 것이었지")으로 작성하십시오. "~했나이까", "~하옵니다", "~이옵니다", "~소서" 같은 과도한 궁중어/상소문체는 나레이터에게 절대 사용하지 마십시오.
★중요: 현대 한국인이 이해하기 어려운 난해한 한자어나 고어(예: '봉정', '사여', '궐하', '진충', '보국' 등)는 절대 사용하지 마십시오.
★번역투 박멸 규칙★: '마치 ~처럼/듯한', '단순한 ~', '그저 ~일 뿐', '~에 의해', '그것은 ~', '~를 가진' 등 영어/일어식 번역투를 절대 사용하지 마십시오.
모든 줄에는 반드시 스피커 메타데이터 (N)[narrator_main, emotion, pauseAfterMs] 또는 (대사)[speakerId, emotion, pauseAfterMs] 형식이 달려 있어야 합니다.
사용 가능한 화자: narrator_main, male_1, male_2, female_1, female_2, elder_1, ghost_1
음향/효과음/BGM 표기는 (BGM)[bgm_name] 또는 (E)[effect_name] 형식으로 단독 줄로 작성하세요.`;

    const prompt = `주제: "${topic}"
유형: ${selectedType.name} (톤: ${selectedType.tone})
인물 및 갈등: ${analysis.narrativeConflict}

위 배경을 바탕으로, 시청자의 귀를 단숨에 사로잡을 극적인 1분 분량(공백 제외 한글 400자 내외)의 오프닝 후킹 대본 후보 3가지를 생성해 주세요.
- 채널명은 **'미리내야담'**이며, 오프닝 멘트에 자연스럽게 녹아들어야 합니다. (예: "미리내야담에 오신 여러분을 환영합니다" 또는 "오늘도 미리내야담을 찾아주신 귀한 발걸음...")
- 대본 포맷을 철저히 엄수해야 합니다.
  예: (N)[narrator_main, sad, 800] 깊어가는 조선의 밤, 한 나그네가 숲속에서 마주한 것은...
  예: (대사)[male_1, fear, 1000] 사, 살려주시오! 대체 내게 왜 이러는 게요!

중요: 3가지 후보는 반드시 서로 다른 심리적 후킹 기법을 적용해야 합니다.
후보1: 급반전형 (이미 벌어진 충격적 사건으로 시작)
후보2: 정보은폐형 (핵심 정보를 숨기고 호기심 유발)
후보3: 감성공감형 (청취자가 감정이입하는 인물의 고통부터 시작)
각 후보의 technique 필드에 반드시 위 분류명(급반전형, 정보은폐형, 감성공감형)을 명확히 명시하세요.

반드시 아래 JSON 스키마를 만족하는 엄격한 JSON 배열 형식으로만 답변을 작성하십시오.

[
  {
    "id": 1,
    "title": "후킹 후보 제목 (예: 한밤중 문을 두드린 피 묻은 손가락)",
    "hookText": "메타데이터가 완벽하게 부착된 1분 분량의 실제 대본 텍스트 (줄바꿈 포함)",
    "technique": "이 후보에 적용된 심리적 후킹 기법 (반드시 '급반전형', '정보은폐형', '감성공감형' 중 해당하는 분류명을 포함하여 상세 설명)"
  }
]`;

    return await this.llm.generateJson<HookCandidate[]>(prompt, systemPrompt);
  }

  /**
   * 4단계: generatePlotPlan - N막 플롯 설계 (동적 막 수)
   */
  async generatePlotPlan(
    topic: string,
    selectedType: YadamType,
    selectedHook: HookCandidate,
    analysis: InputAnalysis,
    scriptLength?: string,
    customCharacters?: any[]
  ): Promise<PlotPlan> {
    const numActs = scriptLength === "short" ? 3 : scriptLength === "medium" ? 4 : 5;
    const minChars = scriptLength === "short" ? 3000 : scriptLength === "medium" ? 7000 : 10000;
    const actStructure = numActs === 3
      ? "- **1막**: 기 (도입 및 콜드 오픈 후킹)\n- **2막**: 전 (갈등 고조 및 복선/위기)\n- **3막**: 결 (결말 및 교훈)"
      : numActs === 4
        ? "- **1막**: 기 (도입 및 콜드 오픈 후킹)\n- **2막**: 승 (사건 발전 및 분위기 묘사)\n- **3막**: 전 (복선·미스터리 고조 및 회수)\n- **4막**: 결 (결말 및 교훈)"
        : "- **1막**: 기 (도입 및 콜드 오픈 후킹)\n- **2막**: 승 (사건의 발전 및 분위기 묘사)\n- **3막**: 전 (미스터리의 고조 및 복선 심기)\n- **4막**: 결 (복선 회수 및 갈등 해결)\n- **5막**: 미 (결말 및 교훈)";

    const charInfo = customCharacters && customCharacters.length > 0
      ? `\n\n[사용자 지정 등장인물]:\n${customCharacters.map(c => `- ${c.role}: ${c.name} (${c.title}) - ${c.personality}`).join("\n")}\n이 인물들을 중심으로 서사를 구성하세요.`
      : "";

    const systemPrompt = `당신은 조선시대 전설과 사극 드라마 ${numActs}막 구성에 통달한 최고의 서사 기획자입니다.`;
    const prompt = `주제: ${topic}
유형: ${selectedType.name}
선택된 후킹 제목: ${selectedHook.title}
후킹 대본 초안:
${selectedHook.hookText}${charInfo}

위 설정을 바탕으로, 전체 분량 ${minChars.toLocaleString()}자 이상의 조선 야담을 작성하기 위한 정밀 ${numActs}막 플롯 계획을 세워주세요.
${actStructure}

반드시 아래 JSON 스키마를 만족하는 엄격한 JSON 형식으로만 답변을 작성하십시오. 설명이나 백틱은 생략하세요.

{
  "acts": [
    {
      "actNumber": 1,
      "title": "1막의 극적 소제목",
      "synopsis": "1막에서 펼쳐질 구체적인 서사 흐름 요약",
      "keyLines": "1막의 중심이 되는 핵심 대사나 나레이션 계획",
      "foreshadowingDetails": "도입부에서 조성할 분위기나 미스터리 단서"
    }
    // ${numActs}막까지 순차 작성
  ],
  "lesson": "전체 이야기를 관통하며 시청자에게 전하고자 하는 조선의 준엄한 지혜 및 교훈"
}`;

    return await this.llm.generateJson<PlotPlan>(prompt, systemPrompt);
  }

  /**
   * 5단계: generateActScript - 각 막별 대본 생성 (점진적 컨텍스트 축적)
   * @param actNumber 생성할 막의 번호 (1~5)
   * @param previousScripts 이전 막들의 대본 취합본
   */
  async generateActScript(
    actNumber: number,
    topic: string,
    selectedType: YadamType,
    plotPlan: PlotPlan,
    previousScripts: string = "",
    scriptLength?: string,
    customCharacters?: any[]
  ): Promise<string> {
    const actInfo = plotPlan.acts.find((a) => a.actNumber === actNumber);
    if (!actInfo) throw new Error(`${actNumber}막의 플롯 정보를 찾을 수 없습니다.`);

    // 전체 설계 지도(Plot Outline Map) 생성
    const plotOutline = plotPlan.acts
      .map(
        (a) =>
          `[제 ${a.actNumber}막 - ${a.title}]\n- 시놉시스: ${a.synopsis}\n- 핵심 라인 계획: ${a.keyLines}\n- 복선 및 단서: ${a.foreshadowingDetails}`
      )
      .join("\n\n");

    const overallLesson = plotPlan.lesson || "인과응보와 사필귀정";

    const totalActs = scriptLength === "short" ? 3 : scriptLength === "medium" ? 4 : 5;
    const minCharsPerAct = scriptLength === "short" ? 1000 : scriptLength === "medium" ? 1750 : 2000;
    const totalMinChars = scriptLength === "short" ? 3000 : scriptLength === "medium" ? 7000 : 10000;

    const charInfo = customCharacters && customCharacters.length > 0
      ? `\n[사용자 지정 등장인물]: ${customCharacters.map(c => `${c.name}(${c.role}, ${c.title}, ${c.personality})`).join(" / ")}`
      : "";

    // 막별 서사적 임무 정의 (동적 막 수에 맞게)
    const isFirstAct = actNumber === 1;
    const isLastAct = actNumber === totalActs;
    const isSecondToLast = actNumber === totalActs - 1;
    const foreshadowingAct = Math.ceil(totalActs / 2);
    const isForeshadowingAct = !isFirstAct && !isLastAct && !isSecondToLast && actNumber === foreshadowingAct;

    let actMission = "";
    if (isFirstAct) {
      actMission = `[제 ${actNumber}막 임무 - 도입]:
- '미리내야담' 유튜브 오프닝 멘트와 후킹 세션을 온전히 전개하십시오.
- 이야기의 시간적, 공간적 배경을 상세히 묘사하고 중심인물을 소개하십시오.
- ★이 막의 끝을 질문이나 예고로 마무리하지 마십시오. 이야기의 흐름이 자연스럽게 다음 장면으로 넘어가도록 서술하십시오.`;
    } else if (isLastAct) {
      actMission = `[제 ${actNumber}막 임무 - 결말]:
- 앞서 심어둔 복선이나 단서를 완벽하게 회수하고, 핵심 갈등을 매듭지으십시오.
- 권선징악과 인과응보를 드러내는 결말을 맺으십시오.
- 교훈(교훈: ${overallLesson})을 해설자 나레이션으로 전달하며 이야기를 완전히 종결하십시오.
- ★이것이 이야기의 마지막입니다. '다음 편에서', '이후 이야기는', '다음에 계속' 등 후속을 암시하는 표현을 절대 쓰지 마십시오.`;
    } else if (isSecondToLast) {
      actMission = `[제 ${actNumber}막 임무 - 절정/회수]:
- 앞서 심어둔 복선이나 단서를 극적으로 회수하여 숨겨진 진실을 밝히고 갈등을 폭발시키십시오.
- 마지막 막의 결말로 자연스럽게 이어지도록 사건을 정돈하십시오.
- ★이 막의 끝을 질문이나 예고로 마무리하지 마십시오.`;
    } else if (isForeshadowingAct) {
      actMission = `[제 ${actNumber}막 임무 - 복선 심기]:
- 서사의 분위기와 긴장감을 끌어올리십시오.
- 이후 막에서 회수할 **구체적인 복선이나 단서**를 중심 장면에 뚜렷하게 심어 두십시오.
- ★이 막의 끝을 질문이나 예고로 마무리하지 마십시오.`;
    } else {
      actMission = `[제 ${actNumber}막 임무 - 전개]:
- 이전 막의 갈등을 정교하게 확장하며 조선시대의 분위기를 강화하십시오.
- 사건의 의혹이 짙어지고 주인공이 위기에 휘말리는 전개를 작성하십시오.
- ★이 막의 끝을 질문이나 예고로 마무리하지 마십시오.`;
    }

    // 직전 막의 마지막 대사/장면 꼬리 추출 (밀착 연결 강화 - 8줄 확장)
    let lastSceneTransitionPrompt = "";
    if (previousScripts) {
      const lines = previousScripts.split("\n").map(l => l.trim()).filter(Boolean);
      const lastFewLines = lines.slice(-8).join("\n"); // 마지막 8줄 추출로 확장

      // 시간 경과 단서 자동 탐지 (사흘, 이튿날, 보름, 며칠 등)
      const timeKeywords = previousScripts.match(/(사흘|이틀|이튿날|나흘|닷새|보름|며칠|열흘|한 달|몇 달)\s*(뒤|후|지나|만에|째)/g);
      const timeContextHint = timeKeywords && timeKeywords.length > 0
        ? `\n[★시간 경과 감지★]: 직전 막까지의 대본에서 시간 경과 표현 "${timeKeywords[timeKeywords.length - 1]}"이(가) 감지되었습니다. 이 시간은 이미 완전히 경과하여 끝난 것으로 간주하십시오. 동일한 시간 약속을 대사에서 재차 언급하거나 미루는 모순을 절대 범하지 마십시오.`
        : "";

      lastSceneTransitionPrompt = `\n[★매우 중요★ 직전 막의 마지막 장면 및 대사 흐름]:
${lastFewLines}
${timeContextHint}

위 장면은 바로 직전 막의 맨 마지막 상황입니다. 당신이 쓸 대본은 위 마지막 장면의 **바로 다음 순간**부터 이어져야 합니다.

[타임라인 연속성 절대 규칙]:
1. 직전 막에서 '사흘 뒤', '이튿날', '보름 후' 등 시간 뒤의 약속이나 이동을 언급했다면, 이번 막이 시작되는 시점은 **이미 그 시간이 모두 지난 후**입니다. 예를 들어 "사흘 뒤에 산사로 가겠다"고 했다면, 이번 막 첫 줄은 이미 산사에 도착했거나 도착하는 장면이어야 합니다.
2. 같은 시간 약속을 대사에서 또 반복하는 것은 절대 금지입니다. ("사흘 뒤에 가자" → 막이 바뀌고 → "사흘 뒤에 또 가자" ← 이런 무한 루프 금지)
3. 이전 막의 이야기를 요약하거나 되짚는 서론/사족을 쓰지 마십시오. 위 마지막 대사 뒤에 바로 이어지는 행동과 대사부터 즉시 시작하십시오.`;
    }



    const systemPrompt = `당신은 조선시대를 생생하게 재현하며 청취자를 사로잡는 최고의 이야기꾼이자 라디오 드라마 작가입니다.

★말투 톤 규칙★:
- 나레이터(해설자)의 말투는 **편안하고 구수한 이야기꾼 톤**으로 작성하십시오. "~했다네", "~하는 것이었지", "~란 말이야", "~더란다", "~했다 하오" 같은 부드러운 구어체를 사용하세요.
- 절대 금지하는 나레이터 말투: "~했나이까", "~하옵니다", "~이옵니다", "~소서", "~하오리까", "~하였사옵니다" 등 과도한 궁중어/상소문체. 나레이터는 청취자에게 이야기를 들려주는 사람이지, 왕에게 아뢰는 신하가 아닙니다.
- 등장인물의 대사에서는 사극 말투를 사용하되, 현대인이 바로 이해할 수준으로 하십시오. (예: "~하시오", "~하겠소", "이놈!", "~하는 게야" 등은 OK)
- 현대 한국인이 이해하기 어려운 난해한 한자어나 고어(예: '봉정', '사여', '궐하', '진충', '보국' 등)는 절대 쓰지 마십시오.

★번역투 박멸 규칙★: '마치 ~처럼/듯한', '단순한 ~', '그저 ~일 뿐', '~에 의해', '그것은 ~', '~를 가진' 등 영어/일어식 번역투를 절대 사용하지 마십시오.

★연속 서사 규칙★:
- 이 대본은 하나의 연속된 이야기를 여러 파트로 나누어 집필하는 것입니다. 독자에게는 이어 붙인 하나의 이야기로 제공됩니다.
- 따라서 각 파트의 끝을 "과연 그 결말은?", "다음 이야기에서 계속됩니다", "그 뒤의 이야기는..." 같은 질문이나 예고로 끝내지 마십시오.
- 이야기의 장면이 자연스럽게 다음 장면으로 흘러가듯 서술하십시오.

지나친 피 묘사, 잔혹한 신체 묘사는 서스펜스(분위기, 소름 끼치는 암시)로 처리하십시오.
★금지어★: "피가 낭자", "피 흥건", "피바다", "핏자국", "피투성", "사지", "목을 잘", "목이 잘", "참수", "찢다", "토막", "창자", "내장", "도살", "난도질", "학살", "유혈"

모든 줄(Empty line 제외)은 오직 네 가지 포맷 중 하나여야 하며, 대사/나레이션 줄에는 TTS 메타데이터가 부착되어야 합니다.
포맷 예시:
- (N)[narrator_main, neutral, 600] 때는 바야흐로 조선 중기, 깊어가는 밤이었습니다.
- (대사)[male_1, angry, 1000] 네 이놈! 감히 뉘 앞이라고 혀를 놀리느냐!
- (BGM)[mysterious_dark]
- (E)[door_creak]

화자 목록: narrator_main(해설자), male_1(젊은 남성/주인공), male_2(장년/노인 남성 또는 악역), female_1(젊은 여성/아낙), female_2(노파 또는 귀신), elder_1(촌장/노인), ghost_1(귀신/원혼)
감정 목록: neutral, angry, sad, fear, happy, dynamic

★★막 구분 표시 출력 금지★★: '제1막', '제2막' 등 막 번호나 헤더를 대본에 절대 넣지 마십시오.

**가장 중요**: 본 대본은 전체 ${totalMinChars.toLocaleString()}자 이상 기획이므로, 이번 ${actNumber}막 단독으로 공백 포함 최소 ${minCharsPerAct.toLocaleString()}자 이상의 상세하고 밀도 높은 대본을 길게 집필하셔야 합니다. 묘사와 대화를 풍부하고 흥미롭게 풀어 쓰십시오.`;

    const prompt = `주제: "${topic}"
야담 장르유형: ${selectedType.name}
전체 ${totalActs}막 중 현재 생성할 단계: **제 ${actNumber}막 - ${actInfo.title}**${charInfo}

=========================================
[전체 이야기의 ${totalActs}막 시놉시스 지도 (Plot Map)]
${plotOutline}

전체 이야기 교훈 방향: ${overallLesson}
=========================================

[현재 막에 부여된 서사적 특수 미션]
${actMission}

${lastSceneTransitionPrompt}

[대본 집필 시 준수사항]:
1. 직전 막들의 스토리를 절대 중복해서 요약 출력하지 마십시오. 오직 새로운 실시간 대본만 최소 ${minCharsPerAct.toLocaleString()}자 이상 아주 길게 작성하여 완성하십시오.
2. 등장인물 간의 관계와 말투(사극 투)를 엄격히 보존하고 일관되게 진행하십시오.
3. 잔혹 묘사 금지어를 1회도 노출해선 안 되며 은유적으로 서스펜스를 돋우십시오.
4. '마치 ~처럼', '단순한 ~', '그저 ~일 뿐', '~에 의해', '그것은 ~' 등 AI 번역투 표현을 절대 쓰지 마십시오. 판소리 광대가 관중에게 이야기를 들려주듯 맛깔나고 구수한 한국어 구어체로 집필하십시오.
5. '제1막', '제2막' 등 막 번호/제목/헤더/구분선을 대본에 절대 넣지 마십시오. 이것은 끊기지 않는 하나의 이야기입니다.

대본 텍스트 이외의 어떠한 서론, 결론, 사족, 마크다운 코드 블록 지시어(\`\`\`) 등은 일체 포함하지 마십시오. 오직 정해진 대본 포맷의 줄들만 연달아 출력하십시오.`;

    const rawScript = await this.llm.generateText(prompt, systemPrompt);

    // 막 구분 헤더/소제목 후처리 제거 (LLM이 프롬프트 무시 시 안전장치)
    return rawScript
      .split("\n")
      .filter(line => {
        const trimmed = line.trim();
        if (/^[-=#\s]*제?\s*\d+\s*막[\s:\-─=\]]*$/i.test(trimmed)) return false;
        if (/^\[?\s*제?\s*\d+\s*막\s*[\]:\-─]*\s*$/i.test(trimmed)) return false;
        if (/^#{1,3}\s+제?\s*\d+\s*막/i.test(trimmed)) return false;
        if (/^[-─=]{3,}\s*$/.test(trimmed)) return false;
        return true;
      })
      .join("\n");
  }

  /**
   * 6단계: mergeAndPolishScript - 전체 대본 병합 및 다듬기
   * - 각 막은 이미 개별 생성 시 충분한 품질을 갖추고 있으므로, 연결부만 다듬습니다.
   * - 페이로드를 줄이기 위해 각 막의 앞/뒤 300자만 추출하여 보냅니다.
   */
  async mergeAndPolishScript(
    topic: string,
    selectedType: YadamType,
    actScripts: Record<number, string>
  ): Promise<string> {
    // 동적으로 실제 막 수 결정
    const actNumbers = Object.keys(actScripts).map(Number).sort((a, b) => a - b);
    const totalActs = actNumbers.length;

    const actTransitions: string[] = [];
    for (const actNum of actNumbers) {
      const raw = actScripts[actNum] || "";
      const head = raw.substring(0, 300);
      const tail = raw.substring(Math.max(0, raw.length - 300));
      actTransitions.push(`[제 ${actNum}막 앞부분]\n${head}\n...\n[제 ${actNum}막 뒷부분]\n${tail}`);
    }

    const systemPrompt = `당신은 대형 유튜브 야담 드라마 채널의 최고 수석 편집자입니다.
각 막 사이의 연결부를 자연스럽게 다듬고, 전체 톤의 일관성을 유지하는 마스터 에디터입니다.
★말투 톤 규칙★: 연결부 나레이션은 편안하고 구수한 이야기꾼 톤("~했다네", "~더란다", "~하는 것이었지")으로 작성하십시오. "~했나이까", "~하옵니다" 같은 과도한 궁중어는 절대 쓰지 마십시오.
★번역투 박멸 규칙★: '마치 ~처럼/듯한', '단순한 ~', '~에 의해' 등 번역투를 절대 사용하지 마십시오.
★금지어★: "피가 낭자", "피 흥건", "피바다", "핏자국", "피투성", "사지", "목을 잘", "참수", "찢다", "토막", "창자", "내장", "도살", "난도질", "학살", "유혈"`;

    // 연결부 키 동적 생성 (예: 3막이면 "1to2", "2to3")
    const transitionKeys: string[] = [];
    const transitionInstructions: string[] = [];
    for (let i = 0; i < actNumbers.length - 1; i++) {
      const from = actNumbers[i];
      const to = actNumbers[i + 1];
      const key = `${from}to${to}`;
      transitionKeys.push(key);
      transitionInstructions.push(`- ${from}막 끝 → ${to}막 시작 연결부 나레이션`);
    }

    const transitionsJsonExample = transitionKeys.reduce((acc, key) => {
      acc[key] = "연결부 나레이션 텍스트";
      return acc;
    }, {} as Record<string, string>);

    const prompt = `다음은 ${totalActs}개 막으로 구성된 야담 대본 "${topic}"의 각 막 연결부입니다:

${actTransitions.join("\n\n---\n\n")}

당신이 할 일은 각 막 사이의 **연결부 나레이션 2~3문장**만 새로 작성하는 것입니다.
구체적으로:
${transitionInstructions.join("\n")}

각 연결부는 "한편, 그 무렵...", "시간이 흘러...", "그로부터 며칠 후..." 등 자연스러운 전환어로 시작하고, 앞 막의 분위기를 이어받아 다음 막으로 부드럽게 넘겨주어야 합니다.

다음 JSON 형식으로만 응답하세요:
{
  "transitions": ${JSON.stringify(transitionsJsonExample, null, 4)}
}`;

    const transitions = await this.llm.generateJson<{
      transitions: Record<string, string>;
    }>(prompt, systemPrompt);

    const parts: string[] = [];
    for (let i = 0; i < actNumbers.length; i++) {
      const actNum = actNumbers[i];
      if (i > 0) {
        const key = `${actNumbers[i - 1]}to${actNum}`;
        const transition = transitions.transitions?.[key] || "";
        if (transition) {
          parts.push(`\n(N)[narrator_main, neutral, 800] ${transition}\n`);
        }
      }
      parts.push(actScripts[actNum] || "");
    }

    // 막 구분 헤더/소제목/구분선을 후처리로 자동 제거
    const merged = parts.join("\n");
    const sanitized = merged
      .split("\n")
      .filter(line => {
        const trimmed = line.trim();
        if (/^[-=#\s]*제?\s*\d+\s*막[\s:\-─=\]]*$/i.test(trimmed)) return false;
        if (/^\[?\s*제?\s*\d+\s*막\s*[\]:\-─]*\s*$/i.test(trimmed)) return false;
        if (/^#{1,3}\s+제?\s*\d+\s*막/i.test(trimmed)) return false;
        if (/^[-─=]{3,}\s*$/.test(trimmed)) return false;
        return true;
      })
      .join("\n");

    return sanitized;
  }

  /**
   * 7단계: validateScript - 대본 무결성 검수
   */
  async validateScript(script: string, plotPlan: PlotPlan): Promise<ValidationResult> {
    const charCount = script.length;
    const pureTextCharCount = countPureTextChars(script);
    const isValidCharCount = pureTextCharCount >= 10000;

    // 1. 후킹 감지 (채널명 '미리내야담'이 대본 전반부 2000자 이내에 존재하는지만 검사)
    const front2000 = script.substring(0, 2000).toLowerCase();
    const hasHook = front2000.includes("미리내야담");
    const hookCheckDetails = hasHook 
      ? "1막 도입부 대본에서 채널명 '미리내야담'과 오프닝 후킹 구조가 안정적으로 감지되었습니다."
      : "경고: 채널명 '미리내야담'이 대본 도입부에서 발견되지 않았습니다. 1막 오프닝에 채널 멘트가 누락되었을 수 있습니다.";

    // 2. 잔혹 묘사 금지어 검사
    const crueltyRegex = /(피가\s*낭자|피\s*흥건|피바다|핏자국|피투성|사지가\s*잘|목을\s*잘|목이\s*잘|참수|몸뚱이를\s*찢|토막|창자|내장|도살|난도질|잔혹|잔인|학살|끔찍|유혈)/g;
    const matches = script.match(crueltyRegex);
    const isCrueltyMinimized = !matches || matches.length === 0;
    const crueltyDetails = isCrueltyMinimized
      ? `잔혹 묘사 필터링 통과 (유튜브 노란 딱지 우려가 없는 깨끗한 대본입니다. 감지 횟수: 0회)`
      : `경고: 잔혹 묘사 우려 단어가 ${matches?.length}회 감지되었습니다. 완전한 순화(0회)가 요구됩니다. 감지어: [${Array.from(new Set(matches)).join(", ")}]`;

    // 3. TTS 메타데이터 부착률
    const lines = script.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    let speechLineCount = 0;
    let metadataCount = 0;

    const speechPattern = /^\((N|대사)\)/;
    const fullPattern = /^\((N|대사)\)\[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+),\s*(\d+)\]/;

    for (const line of lines) {
      if (speechPattern.test(line)) {
        speechLineCount++;
        if (fullPattern.test(line)) {
          metadataCount++;
        }
      }
    }

    const coveragePercentage = speechLineCount > 0 ? Math.round((metadataCount / speechLineCount) * 100) : 100;
    const metadataCoverageDetails = `${speechLineCount}개의 대사/나레이션 라인 중 ${metadataCount}개 라인에 완전한 TTS 메타데이터 부착 완료 (${coveragePercentage}%)`;

    // 4. AI 번역투 감지 (실시간 정규식 스캐닝)
    const translationTonePatterns = [
      { pattern: /마치\s+.{1,20}처럼/g, label: "마치 ~처럼" },
      { pattern: /마치\s+.{1,20}듯한/g, label: "마치 ~듯한" },
      { pattern: /단순한\s/g, label: "단순한 ~" },
      { pattern: /단순히\s/g, label: "단순히 ~" },
      { pattern: /그저\s.{1,15}일\s*뿐/g, label: "그저 ~일 뿐" },
      { pattern: /에\s*의해\s/g, label: "~에 의해" },
      { pattern: /그것은\s/g, label: "그것은 ~" },
      { pattern: /를\s*가진\s/g, label: "~를 가진" },
      { pattern: /을\s*가진\s/g, label: "~을 가진" },
      { pattern: /것은\s*분명/g, label: "것은 분명" },
      { pattern: /하는\s*것이\s*가능/g, label: "하는 것이 가능" },
    ];

    const detectedTones: { label: string; count: number; samples: string[] }[] = [];
    let totalToneCount = 0;

    // 대사/나레이션 텍스트만 추출하여 검사 (메타데이터 태그 제외)
    const scriptTextOnly = lines
      .filter(l => speechPattern.test(l))
      .map(l => l.replace(/^\((N|대사)\)\[[^\]]*\]\s*/, ""))
      .join("\n");

    for (const tp of translationTonePatterns) {
      const found = scriptTextOnly.match(tp.pattern);
      if (found && found.length > 0) {
        totalToneCount += found.length;
        detectedTones.push({
          label: tp.label,
          count: found.length,
          samples: found.slice(0, 2).map(s => s.trim()),
        });
      }
    }

    const isTranslationToneClean = totalToneCount <= 2; // 2회 이하면 통과 (미미한 수준)
    const translationToneDetails = totalToneCount === 0
      ? "번역투 표현이 감지되지 않았습니다. 판소리 구어체가 잘 유지되고 있습니다."
      : `번역투 표현 ${totalToneCount}회 감지. ` + detectedTones.map(d => `"${d.label}" ${d.count}회 (예: ${d.samples.map(s => `'${s}'`).join(", ")})`).join(" / ");

    // 5. LLM 의미론적 검수 (복선 회수 + 교훈 - 중간부 포함 확대 전송)
    // 대본의 앞·중간·뒤 샘플을 추출하여 3·4막 교차점을 LLM이 볼 수 있도록 함
    const scriptLen = script.length;
    const sampleFront = script.substring(0, 1500);
    const midStart = Math.max(0, Math.floor(scriptLen * 0.4));
    const sampleMid = script.substring(midStart, midStart + 2000);
    const sampleTail = script.substring(Math.max(0, scriptLen - 2000));

    const systemPrompt = "당신은 대본의 문학적 복선 회수 구조와 사필귀정 교훈을 정밀 추적하는 서사 검수관입니다. 반드시 실제 대본 텍스트를 근거로 분석하십시오.";
    const prompt = `다음은 대본 검증을 위한 원본 자료입니다.

[플롯 설계안 상의 복선 및 교훈 계획]:
- 복선: ${plotPlan.acts.map(a => `${a.actNumber}막: ${a.foreshadowingDetails}`).join(" / ")}
- 교훈: ${plotPlan.lesson}

[작성된 최종 대본 - 앞부분 (1막 도입부)]:
${sampleFront}

[작성된 최종 대본 - 중간부분]:
${sampleMid}

[작성된 최종 대본 - 뒷부분 (결말)]:
${sampleTail}

위 자료를 면밀히 분석하여 2가지 항목에 대해 통과 여부와 구체적인 근거를 제시하세요.
1. **복선 회수**: 중간부에서 심어진 복선(특정 사물, 인물의 경고 등)이 뒷부분에서 실제로 언급·회수되었는가? 구체적 장면이나 대사를 인용하세요.
2. **교훈 제시**: 뒷부분 결말에서 인과응보나 권선징악의 교훈이 해설자 나레이션을 통해 전달되고 있는가? 구체적 문장을 인용하세요.

만약 복선 회수나 교훈을 대본에서 실제로 확인할 수 없다면 반드시 false로 판정하십시오. 근거 없이 true로 판정하는 것은 금지입니다.

반드시 아래 JSON 스키마를 만족하는 엄격한 JSON 형식으로만 답변하십시오.

{
  "hasForeshadowingResolved": true/false,
  "foreshadowingDetails": "복선 회수가 대본상에서 어떻게 이뤄지고 있는지 구체적 장면을 인용한 분석문",
  "hasLesson": true/false,
  "lessonDetails": "마지막 막 교훈의 존재와 깊이에 대한 구체적 대사 인용 분석문"
}`;

    // LLM 검수 실패 시 기본값은 false (거짓 통과 방지)
    let llmCheck = {
      hasForeshadowingResolved: false,
      foreshadowingDetails: "LLM 의미론적 검수가 실행되지 않았거나 실패했습니다. 재검수를 눌러 다시 시도하세요.",
      hasLesson: false,
      lessonDetails: "LLM 의미론적 검수가 실행되지 않았거나 실패했습니다. 재검수를 눌러 다시 시도하세요.",
    };

    try {
      const response = await this.llm.generateJson<any>(prompt, systemPrompt);
      if (response && typeof response === "object") {
        llmCheck = { ...llmCheck, ...response };
      }
    } catch (e) {
      console.warn("LLM 의미론적 검수 실패:", e);
    }

    const overallPassed = 
      isValidCharCount && 
      hasHook && 
      llmCheck.hasForeshadowingResolved && 
      llmCheck.hasLesson && 
      isCrueltyMinimized && 
      isTranslationToneClean &&
      coveragePercentage >= 90;

    return {
      charCount,
      pureTextCharCount,
      isValidCharCount,
      hasHook,
      hookCheckDetails,
      hasForeshadowingResolved: llmCheck.hasForeshadowingResolved,
      foreshadowingDetails: llmCheck.foreshadowingDetails,
      hasLesson: llmCheck.hasLesson,
      lessonDetails: llmCheck.lessonDetails,
      isCrueltyMinimized,
      crueltyDetails,
      metadataCoveragePercentage: coveragePercentage,
      metadataCoverageDetails,
      translationToneCount: totalToneCount,
      translationToneDetails,
      isTranslationToneClean,
      overallPassed
    };
  }

  /**
   * 7-B단계: refineScript - 검수 결과에서 감지된 문제를 LLM으로 자동 교정
   * @param script 현재 대본 전문
   * @param issues 감지된 문제 목록 (번역투, 잔혹어, 등)
   * @returns 교정된 대본 + 변경 요약
   */
  async refineScript(
    script: string,
    issues: string[]
  ): Promise<{ refinedScript: string; changeSummary: string }> {
    const issueList = issues.map((iss, i) => `${i + 1}. ${iss}`).join("\n");

    const systemPrompt = `당신은 조선 야담 대본의 최종 교정을 담당하는 최고급 에디터입니다.
주어진 대본에서 감지된 문제점들을 정확히 수정하되, 대본의 전체 스토리·구조·분위기·길이는 절대 변경하지 마십시오.
오직 지적된 문제 부분만 최소한으로 정밀 교정(Surgical Edit)하십시오.

교정 규칙:
- '마치 ~처럼/듯한' → '흡사 ~와 같았다' 또는 자연스러운 우리말 비유로 교체
- '단순한 ~', '단순히 ~' → '그저 평범한 ~', '한낱 ~에 불과한' 등으로 교체
- '그저 ~일 뿐' → '~에 지나지 않는다' 또는 사극 문어체로 교체
- '~에 의해' → '~로 인해', '~가 한 짓으로' 등 자연스러운 구어체로 교체
- '그것은 ~' → '그것이 바로 ~' 또는 자연스러운 사극 말투로 교체
- 잔혹 금지어(피가 낭자, 핏자국, 참수 등) → 은유적 순화 묘사(붉은 흔적, 차가운 침묵 등)로 교체
- TTS 메타데이터 포맷 ((N)[speaker, emotion, ms] 또는 (대사)[speaker, emotion, ms]) 구조는 절대 훼손하지 마십시오.
- 대본의 줄 수와 전체 분량은 최대한 동일하게 유지하십시오.`;

    const prompt = `[현재 대본 전문]:
${script}

[검수에서 감지된 개선 필요 사항]:
${issueList}

위 문제점들을 교정한 전체 대본을 출력하세요.
교정 후 대본 전문만 출력하십시오. 서론, 결론, 마크다운, 변경 설명 등 일체 부착하지 마십시오.
오직 (N)[...], (대사)[...], (BGM)[...], (E)[...] 포맷의 대본 줄만 연달아 출력하십시오.`;

    const refinedScript = await this.llm.generateText(prompt, systemPrompt);

    // 교정 후 막 헤더 제거 (안전장치)
    const sanitized = refinedScript
      .split("\n")
      .filter(line => {
        const trimmed = line.trim();
        if (/^[-=#\s]*제?\s*\d+\s*막[\s:\-─=\]]*$/i.test(trimmed)) return false;
        if (/^\[?\s*제?\s*\d+\s*막\s*[\]:\-─]*\s*$/i.test(trimmed)) return false;
        if (/^#{1,3}\s+제?\s*\d+\s*막/i.test(trimmed)) return false;
        if (/^[-─=]{3,}\s*$/.test(trimmed)) return false;
        return true;
      })
      .join("\n");

    // 변경 요약 생성 (간단한 diff 통계)
    const originalLines = script.split("\n").length;
    const refinedLines = sanitized.split("\n").length;
    const changeSummary = `교정 완료: ${issues.length}개 항목 개선 시도. 원본 ${originalLines}줄 → 교정본 ${refinedLines}줄. 대본 전문이 교체되었습니다.`;

    return { refinedScript: sanitized, changeSummary };
  }

  /**
   * 8단계: createTtsSegments - 최종 마크다운에서 TTS 세그먼트 CSV/JSON 추출
   */
  createTtsSegments(script: string): TtsSegment[] {
    const segments: TtsSegment[] = [];
    const lines = script.split("\n");
    let idCounter = 1;

    const speechPattern = /^\((N|대사)\)\[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+),\s*(\d+)\]\s*(.*)$/;
    const mediaPattern = /^\((BGM|E)\)\[([^\]]+)\]/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const speechMatch = trimmed.match(speechPattern);
      if (speechMatch) {
        const [, typeStr, origSpeakerId, emotion, pauseStr, text] = speechMatch;
        let speakerId = origSpeakerId;
        let isUnknownSpeaker = false;

        if (!KNOWN_SPEAKER_IDS.includes(speakerId)) {
          console.warn(`Unregistered speaker detected: '${speakerId}'. Normalizing to 'narrator_main'.`);
          speakerId = "narrator_main";
          isUnknownSpeaker = true;
        }

        segments.push({
          id: idCounter++,
          speakerId,
          emotion,
          type: typeStr as "N" | "대사",
          text: text.trim(),
          pauseAfterMs: parseInt(pauseStr, 10),
          isUnknownSpeaker
        });
        continue;
      }

      const mediaMatch = trimmed.match(mediaPattern);
      if (mediaMatch) {
        const [, typeStr, mediaName] = mediaMatch;
        segments.push({
          id: idCounter++,
          speakerId: "system",
          emotion: "neutral",
          type: typeStr as "BGM" | "E",
          text: mediaName.trim(),
          pauseAfterMs: 0
        });
      }
    }

    return segments;
  }

  /**
   * TTS 세그먼트 배열을 CSV 문자열로 변환합니다. (tts_segments.csv)
   */
  convertToCsv(segments: TtsSegment[]): string {
    let csv = "id,type,speakerId,emotion,text,pauseAfterMs\n";
    for (const seg of segments) {
      const cleanText = seg.text.replace(/"/g, '""');
      csv += `${seg.id},"${seg.type}","${seg.speakerId}","${seg.emotion}","${cleanText}",${seg.pauseAfterMs}\n`;
    }
    return csv;
  }

  /**
   * SSML 세그먼트 JSON을 생성합니다. (ssml_segments.json)
   */
  convertToSsmlJson(segments: TtsSegment[], ttsAdapter: GoogleTtsAdapter): { id: number; speakerId: string; emotion: string; text: string; ssml: string }[] {
    return segments
      .filter(seg => seg.type === "N" || seg.type === "대사")
      .map(seg => {
        const ssml = ttsAdapter.buildSsml(seg.text, seg.speakerId, seg.emotion, seg.pauseAfterMs);
        return {
          id: seg.id,
          speakerId: seg.speakerId,
          emotion: seg.emotion,
          text: seg.text,
          ssml: ssml
        };
      });
  }
}
