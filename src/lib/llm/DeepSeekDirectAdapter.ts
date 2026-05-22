import { LlmAdapter } from "./types";
import { parseJsonSafe } from "./jsonRepair";

/** 재시도 가능한 오류인지 판별 (502, 503, 504, ECONNRESET, EOF, AbortError 등) */
function isRetryableError(err: unknown): boolean {
  const msg = String(err);
  return /502|503|504|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EOF|fetch failed|abort/i.test(msg);
}

/** 지수 백오프 대기 (ms) */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** AbortController로 타임아웃이 적용된 fetch 래퍼 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export class DeepSeekDirectAdapter implements LlmAdapter {
  private apiKey: string;
  private endpoint: string;
  private model: string;
  private maxRetries: number;
  private requestTimeoutMs: number;

  constructor(
    apiKey: string = "",
    endpoint: string = "https://api.deepseek.com/v1",
    model: string = "deepseek-chat",
    maxRetries: number = 5,
    requestTimeoutMs: number = 120_000,
  ) {
    this.apiKey = apiKey;
    this.endpoint = endpoint.replace(/\/$/, "");
    this.model = model;
    this.maxRetries = maxRetries;
    this.requestTimeoutMs = requestTimeoutMs;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("DeepSeek API Key가 입력되지 않았습니다. 설정에서 API Key를 등록해 주세요.");
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `${this.endpoint}/chat/completions`;
        const messages = [];

        if (systemPrompt) {
          messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: messages,
            temperature: 0.7,
            stream: false,
          }),
        }, this.requestTimeoutMs);

        if (!response.ok) {
          const errText = await response.text();
          const err = new Error(`DeepSeek API error: ${response.status} - ${errText}`);
          if (attempt < this.maxRetries && isRetryableError(err)) {
            const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s, 16s, 32s
            console.warn(`[DeepSeek generateText] ${response.status} 오류, ${delay / 1000}s 후 재시도 (${attempt + 1}/${this.maxRetries + 1})...`);
            await sleep(delay);
            continue;
          }
          throw err;
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries && isRetryableError(err)) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          console.warn(`[DeepSeek generateText] 네트워크 오류, ${delay / 1000}s 후 재시도 (${attempt + 1}/${this.maxRetries + 1}): ${(err as Error).message}`);
          await sleep(delay);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("DeepSeek generateText 재시도 횟수 초과");
  }

  async generateJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error("DeepSeek API Key가 입력되지 않았습니다. 설정에서 API Key를 등록해 주세요.");
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `${this.endpoint}/chat/completions`;
        const messages = [];

        if (systemPrompt) {
          messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({
          role: "user",
          content: prompt + "\n\n중요: 반드시 유효한 JSON 형식으로만 답변을 작성하세요. 다른 앞뒤 설명이나 마크다운 백틱은 생략해야 합니다.",
        });

        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: messages,
            temperature: 0.3,
            stream: false,
            response_format: { type: "json_object" }, // JSON Mode 활성화
          }),
        }, this.requestTimeoutMs);

        if (!response.ok) {
          const errText = await response.text();
          const err = new Error(`DeepSeek API JSON error: ${response.status} - ${errText}`);
          if (attempt < this.maxRetries && isRetryableError(err)) {
            const delay = Math.pow(2, attempt + 1) * 1000;
            console.warn(`[DeepSeek generateJson] ${response.status} 오류, ${delay / 1000}s 후 재시도 (${attempt + 1}/${this.maxRetries + 1})...`);
            await sleep(delay);
            continue;
          }
          throw err;
        }

        const data = await response.json();
        const cleanText = (data.choices?.[0]?.message?.content || "").trim();

        try {
          return parseJsonSafe<T>(cleanText);
        } catch (parseErr) {
          if (attempt < this.maxRetries) {
            const delay = Math.pow(2, attempt + 1) * 1000;
            console.warn(`[DeepSeek generateJson] JSON 파싱 실패, ${delay / 1000}s 후 재시도 (${attempt + 1}/${this.maxRetries + 1}). 원문 일부: ${cleanText.substring(0, 100)}`);
            await sleep(delay);
            continue;
          }
          console.error("DeepSeek JSON 파싱 최종 실패. Raw output:", cleanText);
          throw new Error(`DeepSeek JSON parsing error: ${(parseErr as Error).message}`);
        }
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries && isRetryableError(err)) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          console.warn(`[DeepSeek generateJson] 네트워크 오류, ${delay / 1000}s 후 재시도 (${attempt + 1}/${this.maxRetries + 1}): ${(err as Error).message}`);
          await sleep(delay);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("DeepSeek JSON 생성 재시도 횟수 초과");
  }
}
