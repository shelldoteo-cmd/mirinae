/**
 * LLM이 출력한 깨진 JSON 문자열을 복구하는 유틸리티.
 *
 * 복구 시나리오:
 * 1. 마크다운 코드펜스(```json ... ```) 제거
 * 2. BOM 및 제로폭 문자 제거
 * 3. trailing comma 제거 (배열/객체 마지막 요소 뒤)
 * 4. 단일 따옴표 → 이중 따옴표 (키/값 바깥에서)
 * 5. 불완전한 JSON 꼬리 잘라내기 (마지막 유효 } 또는 ]까지)
 * 6. 앞뒤 비-JSON 텍스트 제거
 */

/**
 * JSON 문자열 리터럴(큰따옴표 안쪽) 내부에 존재하는 물리적인 제어 문자들(개행, 탭 등)을
 * 문법적으로 안전한 이스케이프 문자(\n, \t)로 변환해 주는 헬퍼 함수입니다.
 */
export function sanitizeStringLiterals(jsonStr: string): string {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
        result += char;
      } else if (char === '"') {
        inString = false;
        result += char;
      } else if (char === "\n") {
        result += "\\n";
      } else if (char === "\r") {
        result += "\\r";
      } else if (char === "\t") {
        result += "\\t";
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }
  return result;
}

/**
 * LLM 응답에서 JSON 문자열을 추출하고 기본 정제를 수행합니다.
 * JSON.parse가 가능한 문자열을 반환합니다.
 * 복구 불가능한 경우 null을 반환합니다.
 */
export function repairJson(raw: string): string | null {
  if (!raw || raw.trim().length === 0) return null;

  let text = raw.trim();

  // 1. BOM 및 제로폭 문자 제거
  text = text.replace(/^\uFEFF/, "");
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // 2. 마크다운 코드펜스 제거
  //    ```json ... ``` 또는 ``` ... ```
  text = text.replace(/^```(?:json|JSON)?\s*\n?/m, "");
  text = text.replace(/\n?\s*```\s*$/m, "");
  text = text.trim();

  // 3. JSON 시작점 찾기 ({ 또는 [)
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");

  let startIdx: number;
  if (firstBrace === -1 && firstBracket === -1) return null;
  if (firstBrace === -1) startIdx = firstBracket;
  else if (firstBracket === -1) startIdx = firstBrace;
  else startIdx = Math.min(firstBrace, firstBracket);

  // JSON 시작 전의 비-JSON 텍스트 제거
  text = text.substring(startIdx);

  // 4. JSON 끝점 찾기 (마지막 유효한 } 또는 ])
  const openChar = text[0]; // '{' or '['
  const closeChar = openChar === "{" ? "}" : "]";

  let lastClose = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === closeChar) {
      lastClose = i;
      break;
    }
  }

  if (lastClose === -1) {
    // 닫는 괄호가 없으면 강제 추가 시도
    text = text + closeChar;
  } else {
    // 닫는 괄호 이후의 쓸모없는 텍스트 제거
    text = text.substring(0, lastClose + 1);
  }

  // [NEW 추가] 4.5. 문자열 리터럴 내 물리적인 개행/탭 문자를 이스케이프 문자로 치환
  text = sanitizeStringLiterals(text);

  // 5. Trailing comma 제거: ,} 또는 ,] 패턴
  text = text.replace(/,\s*([\]}])/g, "$1");

  // 6. 파싱 시도
  try {
    JSON.parse(text);
    return text;
  } catch {
    // 추가 복구 시도: 제어 문자 제거
    const sanitized = text.replace(/[\x00-\x1F\x7F]/g, (ch) => {
      if (ch === "\n" || ch === "\r" || ch === "\t") return ch;
      return "";
    });

    try {
      JSON.parse(sanitized);
      return sanitized;
    } catch {
      return null;
    }
  }
}

/**
 * repairJson을 적용한 후 파싱합니다.
 * 복구 불가능한 경우 원본 텍스트와 함께 에러를 throw합니다.
 */
export function parseJsonSafe<T>(raw: string): T {
  // 먼저 원본 그대로 파싱 시도
  try {
    return JSON.parse(raw) as T;
  } catch {
    // 복구 시도
    const repaired = repairJson(raw);
    if (repaired) {
      try {
        return JSON.parse(repaired) as T;
      } catch (e) {
        throw new Error(
          `JSON 복구 후에도 파싱 실패. 원문 일부: ${raw.substring(0, 200)}... 에러: ${(e as Error).message}`
        );
      }
    }
    throw new Error(
      `JSON 복구 불가. 원문 일부: ${raw.substring(0, 200)}...`
    );
  }
}
