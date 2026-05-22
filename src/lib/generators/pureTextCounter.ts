/**
 * 대본에서 순수 나레이션 및 대사 텍스트의 글자수만 계산하는 헬퍼 함수
 */
export function countPureTextChars(script: string): number {
  if (!script) return 0;
  const lines = script.split("\n");
  let pureText = "";
  const metadataPattern = /^\((N|대사)\)\[[^\]]+\]\s*/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 마크다운 헤더나 수평선 제외
    if (trimmed.startsWith("#") || trimmed.startsWith("---") || trimmed.startsWith("*") || trimmed.startsWith("-")) {
      continue;
    }
    // BGM 이나 E 제외
    if (trimmed.startsWith("(BGM)") || trimmed.startsWith("(E)")) {
      continue;
    }
    // [야담 유형: ...] 과 같은 텍스트 제외
    if (trimmed.startsWith("[야담 유형:") || trimmed.startsWith("[야담유형:")) {
      continue;
    }
    
    // 메타데이터 제거
    const cleaned = trimmed.replace(metadataPattern, "");
    pureText += cleaned + "\n";
  }
  return pureText.trim().length;
}
