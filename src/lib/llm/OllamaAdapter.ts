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

export class OllamaAdapter implements LlmAdapter {
  private endpoint: string;
  private model: string;
  private maxRetries: number;
  private requestTimeoutMs: number;

  constructor(
    endpoint: string = "http://localhost:11434",
    model: string = "deepseek-v4-pro:cloud",
    maxRetries: number = 5,
    requestTimeoutMs: number = 300_000,
  ) {
    // 끝의 슬래시 제거
    this.endpoint = endpoint.replace(/\/$/, "");
    this.model = model;
    this.maxRetries = maxRetries;
    this.requestTimeoutMs = requestTimeoutMs;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `${this.endpoint}/api/generate`;
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            prompt: prompt,
            system: systemPrompt,
            stream: false,
            options: {
              temperature: 0.7,
            },
          }),
        }, this.requestTimeoutMs);

        if (!response.ok) {
          const errText = await response.text();
          const err = new Error(`Ollama API error: ${response.status} - ${errText}`);
          if (attempt < this.maxRetries && isRetryableError(err)) {
            const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s, 16s, 32s
            console.warn(`[Ollama generateText] ${response.status} 오류, ${delay / 1000}s 후 재시도 (${attempt + 1}/${this.maxRetries + 1})...`);
            await sleep(delay);
            continue;
          }
          throw err;
        }

        const data = await response.json();
        return data.response || "";
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries && isRetryableError(err)) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          console.warn(`[Ollama generateText] 네트워크 오류, ${delay / 1000}s 후 재시도 (${attempt + 1}/${this.maxRetries + 1}): ${(err as Error).message}`);
          await sleep(delay);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("Ollama generateText 재시도 횟수 초과");
  }

  async generateJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `${this.endpoint}/api/generate`;
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            prompt: prompt,
            system: systemPrompt,
            stream: false,
            format: "json", // Ollama에 JSON 모드를 적용
            options: {
              temperature: 0.3, // 일관된 출력을 위해 온도를 낮춤
            },
          }),
        }, this.requestTimeoutMs);

        if (!response.ok) {
          const errText = await response.text();
          const err = new Error(`Ollama API JSON error: ${response.status} - ${errText}`);
          if (attempt < this.maxRetries && isRetryableError(err)) {
            const delay = Math.pow(2, attempt + 1) * 1000;
            console.warn(`[Ollama generateJson] ${response.status} 오류, ${delay / 1000}s 후 재시도 (${attempt + 1}/${this.maxRetries + 1})...`);
            await sleep(delay);
            continue;
          }
          throw err;
        }

        const data = await response.json();
        const cleanText = (data.response || "").trim();

        try {
          return parseJsonSafe<T>(cleanText);
        } catch (parseErr) {
          if (attempt < this.maxRetries) {
            const delay = Math.pow(2, attempt + 1) * 1000;
            console.warn(`[Ollama generateJson] JSON 파싱 실패, ${delay / 1000}s 후 재시도 (${attempt + 1}/${this.maxRetries + 1}). 원문 일부: ${cleanText.substring(0, 100)}`);
            await sleep(delay);
            continue;
          }
          console.error("Ollama JSON 파싱 최종 실패. Raw output:", cleanText);
          throw new Error(`Ollama JSON parsing error: ${(parseErr as Error).message}`);
        }
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries && isRetryableError(err)) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          console.warn(`[Ollama generateJson] 네트워크 오류, ${delay / 1000}s 후 재시도 (${attempt + 1}/${this.maxRetries + 1}): ${(err as Error).message}`);
          await sleep(delay);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("Ollama JSON 생성 재시도 횟수 초과");
  }
}
