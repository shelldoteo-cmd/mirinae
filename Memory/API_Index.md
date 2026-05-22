# 미리내야담 대본 생성기 API Index

- **최종 업데이트**: 2026-05-22
- **목적**: 대규모 코드베이스의 효율적 탐색을 위한 진입점 및 호출 구조 색인 정보 보존

---

## 1. 아키텍처 개요 및 폴더 구조

```text
c:\Users\Owner\Desktop\2026 청년월세지원사업\yadam\
├── Memory/                          # [NEW] 영구 메모리 수록 디렉토리
├── public/                          # 정적 리소스 및 폰트
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── api/                     # 백엔드 API Routes
│   │   │   ├── generate/route.ts    # 대본 생성/윤색/검수 API
│   │   │   ├── projects/            # 프로젝트 보존 API
│   │   │   └── tts/route.ts         # TTS 세그먼트 생성 및 Google Cloud TTS 합성 API
│   │   ├── globals.css              # 동양풍 비주얼/디자인 시스템 테마 CSS
│   │   ├── layout.tsx               # 루트 레이아웃 & 테마 공급자
│   │   └── page.tsx                 # [리팩토링] 메인 대시보드 코디네이터
│   ├── components/                  # 재사용 및 격리 컴포넌트
│   │   ├── steps/                   # [NEW] 1~7단계 독립 작업 컴포넌트
│   │   ├── OrientalProvider.tsx     # 고풍스러운 조선시대 설화 테마 래퍼
│   │   ├── SettingsPanel.tsx        # [NEW] AI 엔진/TTS 연동 설정 카드
│   │   ├── ProjectPanel.tsx         # [NEW] 프로젝트 전환/싱크 컨트롤러
│   │   └── WebViewerModal.tsx       # [NEW] 깨끗한 대본 본문 오리엔탈 뷰어 모달
│   ├── hooks/                       # [NEW] 커스텀 훅 및 상태 위임
│   │   ├── useYadamState.ts         # 핵심 생성 파이프라인 관리 훅
│   │   └── useYadamProjects.ts      # [NEW] 프로젝트 관리 & 설정 보존 훅
│   └── lib/                         # 비즈니스 로직 및 외부 어댑터
│       ├── generators/              # [NEW] 대본 생성 비즈니스 엔진 모듈화 폴더
│       │   ├── types.ts             # 데이터 타입 및 스키마 인터페이스
│       │   ├── pureTextCounter.ts   # 순수 한글 글자수 정밀 카운터
│       │   └── YadamGenerator.ts    # 핵심 YadamGenerator 클래스
│       ├── generators.ts            # 하위 호환 re-export용 프록시 모듈
│       ├── llm/                     # 대형언어모델(LLM) 연동 어댑터
│       │   ├── jsonRepair.ts        # JSON 포맷 복구 및 물리적 개행 보정 유틸
│       │   ├── OllamaAdapter.ts     # 로컬 Ollama 호출 및 재시도 어댑터
│       │   ├── DeepSeekDirectAdapter.ts # DeepSeek API 호출 및 재시도 어댑터
│       │   └── types.ts             # 어댑터 추상화 인터페이스
│       └── tts/                     # 구글 텍스트 음성합성(TTS) 어댑터
│           └── GoogleTtsAdapter.ts  # SSML 이스케이프, 5천 바이트 분할/조립 및 합성 어댑터
```

---

## 2. 핵심 비즈니스 엔진 (`src/lib/generators/`)

### YadamGenerator
- **목적**: 조선시대 야담 대본 작성을 7단계 파이프라인으로 순차 처리하는 생성 엔진
- **진입점**: `src/lib/generators/YadamGenerator.ts`
- **주요 함수**:
  1. `analyzeInput(topic, keywords)`: 1단계 - 키워드 분석 및 기획 요소 정의
  2. `recommendYadamTypes(analysis)`: 2단계 - 어울리는 야담 유형 3대 추천
  3. `generateHookCandidates(topic, keywords, type, analysis)`: 3단계 - 미스터리/반전/감성 1분 후킹 3대 초안 작성
  4. `generatePlotPlan(topic, type, hook, analysis)`: 4단계 - 장편 5막 플롯 시놉시스 및 복선/교훈 상세 기획
  5. `generateActScript(actNumber, topic, type, plotPlan, previousScripts)`: 4단계 - 특정 막 대본 2,000자 점진적 수동/자동 단독 생성
  6. `mergeAndPolishScript(topic, type, actScripts)`: 4단계 - 연결부 윤색 병합
  7. `validateScript(script, plotPlan)`: 5단계 - 순수 글자수, 후킹 여부, 잔혹도(0회), 복선 회수 의미론적 분석 검수
- **탐색 키워드**: `YadamGenerator`, `validateScript`, `generateActScript`

### countPureTextChars
- **목적**: 마크다운 헤더, 효과음, TTS 메타데이터를 정규식으로 차단하고 오직 "들리는 소리"에 해당하는 순수 글자수만 계수
- **진입점**: `src/lib/generators/pureTextCounter.ts`

---

## 3. 백엔드 API 라우트 (`src/app/api/`)

### /api/generate
- **진입점**: `src/app/api/generate/route.ts`
- **역할**: 프론트엔드와 LLM 어댑터(Ollama/DeepSeek) 간의 중간 기착지. `step` 파라미터 분기에 따라 `YadamGenerator` 객체를 인스턴스화하고 해당하는 비즈니스 함수를 구동함.

### /api/tts
- **진입점**: `src/app/api/tts/route.ts`
- **역할**: 대본을 TTS 세그먼트로 파싱하는 `action: "parse"` 기능과 `action: "synthesize"` 실서버/시뮬레이션 TTS 오디오 청크 합성 기능 제공.

---

## 4. 프론트엔드 UI 및 상태 구조

### useYadamProjects (Project & Config Manager Custom Hook)
- **진입점**: `src/hooks/useYadamProjects.ts`
- **역할**: 프로젝트 CRUD(생성, 로컬/서버 동기화 로드, 삭제), `localStorage` 저장 및 자동 저장 감시, AI(LLM)와 TTS 엔진 설정 관리를 전담하는 독립적 훅.
- **탐색 키워드**: `useYadamProjects`, `saveProject`, `loadProjectFromServer`, `createNewProject`

### useYadamState (Core Pipeline Custom Hook)
- **진입점**: `src/hooks/useYadamState.ts`
- **역할**: 7개 단계별 생성 파이프라인 상태 관리, 비동기 `canvas-confetti` 동적 로딩, 백엔드 API 연동 집필 액션 총괄 제어 훅. 내부적으로 `useYadamProjects`를 수혈받아 프로젝트 영구 저장을 유기적으로 처리함.
- **탐색 키워드**: `useYadamState`, `handleGenerateFullScript`, `triggerConfetti`

### YadamDashboard (Dashboard Coordinator View)
- **진입점**: `src/app/page.tsx`
- **역할**: 오직 최상위 레이아웃(헤더, 설정 패널, 단계별 탭 바, 단계별 격리 컴포넌트 마크업)만을 렌더링하고 상태와 이벤트 콜백은 `useYadamState`를 통해 수혈받는 극소형(350 LOC 미만) 코디네이터 뷰.
- **탐색 키워드**: `YadamDashboard`, `stepsMenu`, `useYadamState`
