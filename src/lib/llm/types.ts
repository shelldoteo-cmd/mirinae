export interface LlmAdapter {
  /**
   * 일반 텍스트 기반 답변을 생성합니다.
   */
  generateText(prompt: string, systemPrompt?: string): Promise<string>;

  /**
   * JSON 구조로 포맷팅된 답변을 생성하고 파싱하여 반환합니다.
   */
  generateJson<T>(prompt: string, systemPrompt?: string): Promise<T>;
}
