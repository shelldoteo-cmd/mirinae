import { LlmAdapter } from "./types";

export class OllamaAdapter implements LlmAdapter {
  private endpoint: string;
  private model: string;

  constructor(endpoint: string = "http://localhost:11434", model: string = "deepseek-v4-pro:cloud") {
    // 끝의 슬래시 제거
    this.endpoint = endpoint.replace(/\/$/, "");
    this.model = model;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const url = `${this.endpoint}/api/generate`;
    const response = await fetch(url, {
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
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.response || "";
  }

  async generateJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const url = `${this.endpoint}/api/generate`;
    const response = await fetch(url, {
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
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API JSON error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const cleanText = (data.response || "").trim();

    try {
      return JSON.parse(cleanText) as T;
    } catch (err) {
      console.error("Failed to parse Ollama JSON response. Raw output:", cleanText);
      throw new Error(`Ollama JSON parsing error: ${(err as Error).message}`);
    }
  }
}
