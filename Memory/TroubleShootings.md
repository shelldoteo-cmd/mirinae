# 미리내야담 대본 생성기 TroubleShootings

- **최종 업데이트**: 2026-05-22
- **목적**: 시스템 오류 극복 기록 및 반복 재발 방지 지식 보존

---

## [2026-05-22] JSX 괄호 구조 쌍 불일치로 인한 Next.js 빌드 차단 (Unexpected token div)

- **문제 상황**: 프론트엔드 빌드(`npm run build`) 도중 `Unexpected token div. Expected jsx identifier at line 1135` 구문 분석 컴파일 오류 발생 및 프로덕션 번들 샌드박스 크래시.
- **증상**: `YadamDashboard` 컴포넌트의 초입인 1135라인의 리턴 `div`가 에러의 진원지로 지목되었으며, 모든 정적 페이지 생성이 중단됨.
- **원인**: 대형 전체화면 모달 창(`showFullViewer`)을 page.tsx의 2621라인에 탑재하면서, 모달 블록 바로 아래에 중복 삽입된 닫는 React Fragment(`</>`) 및 레이아웃 메인 태그(`</main>`)가 남아있었음. 이로 인해 컴포넌트 함수가 완전히 끝나지 않았거나 태그 쌍 불일치로 컴파일러가 return 문 전체를 비정상 구조로 해석함.
- **해결 방법**: [page.tsx](file:///c:/Users/Owner/Desktop/2026%20청년월세지원사업/yadam/src/app/page.tsx#L2760-L2764) 하단의 닫는 모달 블록 바로 밑에 있는 불필요한 중복 닫는 태그들을 삭제하여 JSX 짝 구조를 올바르게 통일함.
- **검증**: `npm run build`를 실행하여 린트 오류 및 빌드 무결성 100% 통과 완료 (`exit code 0`, 8/8 정적 페이지 빌드 성공).
- **재발 방지**: 한 개의 컴포넌트 파일이 2,000줄을 넘어갈 경우 괄호 구조의 시각적 식별이 불가능해집니다. 따라서 지침에 의거하여 **대화형 컴포넌트의 100% 단계별 모듈 격리**를 리팩토링 목표로 삼아 page.tsx의 코드량을 400줄 미만으로 대폭 삭감합니다.

---

## [2026-05-21] Google Cloud TTS 5,000 bytes 제한 크래시 해결

- **문제 상황**: 야담 채널의 긴 해설 라인(한글 1,500자 이상) 또는 긴 마크다운 대본을 Google Cloud TTS API로 합성하려고 할 때, 서버가 `400 Bad Request` 에러를 반환하며 오디오 합성 실패.
- **원인**: Google TTS API는 한 번의 요청에 대해 텍스트/SSML의 페이로드 바이트 크기를 최대 **5,000 bytes**로 강력하게 제한함. 한글은 UTF-8로 1자당 3bytes를 차지하므로, 특수문자와 SSML 태그를 포함하면 약 1,400자 부근에서 제한을 즉시 초과하게 됨.
- **해결 방법**: [GoogleTtsAdapter.ts](file:///c:/Users/Owner/Desktop/2026%20청년월세지원사업/yadam/src/lib/tts/GoogleTtsAdapter.ts)에 4,800 bytes의 안전 마진을 적용한 자동 문장 분할 및 조립 엔진을 장착함.
  1. `splitTextByBytes()`를 통해 문장 경계 문자(`.`, `!`, `?`, `~`, 개행)를 기준으로 1차 청킹 수행.
  2. 한 문장 자체가 4,800 bytes를 초과하는 비정상적인 극단 사례의 경우 `forceChunkByBytes()`를 이용한 이진 탐색 강제 분할 기법 적용.
  3. 분할 합성된 각각의 임시 `.mp3` 바이너리 청크들을 최종적으로 단일 세그먼트 버퍼로 안전하게 결합하여 반환.
- **검증**: 매우 긴 2,500자 단독 세그먼트에 대한 TTS 합성이 에러 없이 단일 파일로 완벽하게 병렬 합성 보장됨을 확인.

---

## [2026-05-21] SSML 특수문자 이스케이프 및 XML 파싱 크래시 해결

- **문제 상황**: 대본 내에 대사 기호, 반전 식(값 < 100냥), 또는 앰퍼샌드 기호(`&`) 등이 섞여있을 때 TTS API XML 파싱 크래시가 나며 오디오 생성이 비정상 중단됨.
- **원인**: TTS 어댑터가 SSML을 조립하는 과정에서 `text`를 이스케이프 없이 `<prosody>` 태그 안에 직접 주입하여 XML 포맷 규칙이 붕괴함.
- **해결 방법**: `GoogleTtsAdapter.ts` 내에 `escapeXml` 유틸리티 함수를 추가하고 text 삽입 시 이스케이프를 적용함.
  ```typescript
  function escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  ```
- **검증**: 앰퍼샌드나 괄호, 사극 대사에 어포스트로피 기호가 섞여있어도 완벽하게 XML 빌더 파싱을 통과함.
