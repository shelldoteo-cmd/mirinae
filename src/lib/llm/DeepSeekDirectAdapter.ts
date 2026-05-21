import { LlmAdapter } from "./types";

export class DeepSeekDirectAdapter implements LlmAdapter {
  private apiKey: string;
  private endpoint: string;
  private model: string;

  constructor(
    apiKey: string = "",
    endpoint: string = "https://api.deepseek.com/v1",
    model: string = "deepseek-chat"
  ) {
    this.apiKey = apiKey;
    this.endpoint = endpoint.replace(/\/$/, "");
    this.model = model;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("DeepSeek API Key가 입력되지 않았습니다. 설정에서 API Key를 등록해 주세요.");
    }

    const url = `${this.endpoint}/chat/completions`;
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(url, {
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
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async generateJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error("DeepSeek API Key가 입력되지 않았습니다. 설정에서 API Key를 등록해 주세요.");
    }

    const url = `${this.endpoint}/chat/completions`;
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({
      role: "user",
      content: prompt + "\n\n중요: 반드시 유효한 JSON 형식으로만 답변을 작성하세요. 다른 앞뒤 설명이나 마크다운 백틱은 생략해야 합니다.",
    });

    const response = await fetch(url, {
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
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API JSON error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const cleanText = (data.choices?.[0]?.message?.content || "").trim();

    try {
      return JSON.parse(cleanText) as T;
    } catch (err) {
      console.error("Failed to parse DeepSeek JSON response. Raw output:", cleanText);
      throw new Error(`DeepSeek JSON parsing error: ${(err as Error).message}`);
    }
  }
}
