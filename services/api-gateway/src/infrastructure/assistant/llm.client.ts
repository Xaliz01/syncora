import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

export interface LlmCompletionResult {
  content: string;
  provider: "openai" | "anthropic";
}

@Injectable()
export class AssistantLlmClient {
  private readonly logger = new Logger(AssistantLlmClient.name);

  constructor(private readonly http: HttpService) {}

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim());
  }

  async complete(system: string, userMessage: string): Promise<LlmCompletionResult> {
    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    if (openaiKey) {
      return this.completeOpenAi(openaiKey, system, userMessage);
    }
    const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (anthropicKey) {
      return this.completeAnthropic(anthropicKey, system, userMessage);
    }
    throw new ServiceUnavailableException("Aucun prestataire LLM configuré");
  }

  private async completeOpenAi(
    apiKey: string,
    system: string,
    userMessage: string,
  ): Promise<LlmCompletionResult> {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const base = (process.env.OPENAI_API_BASE?.trim() || "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    );
    try {
      const { data } = await firstValueFrom(
        this.http.post<{
          choices?: Array<{ message?: { content?: string } }>;
        }>(
          `${base}/chat/completions`,
          {
            model,
            temperature: 0.2,
            max_tokens: 1200,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: system },
              {
                role: "user",
                content: `Question de l'utilisateur :\n${userMessage}\n\nRéponds uniquement avec l'objet JSON demandé (reply, suggestions, escalateToSupport).`,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 45_000,
          },
        ),
      );
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new ServiceUnavailableException("Réponse LLM vide");
      }
      return { content, provider: "openai" };
    } catch (err) {
      this.logger.warn(`OpenAI completion failed: ${err instanceof Error ? err.message : "error"}`);
      throw new ServiceUnavailableException("Assistant temporairement indisponible");
    }
  }

  private async completeAnthropic(
    apiKey: string,
    system: string,
    userMessage: string,
  ): Promise<LlmCompletionResult> {
    const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-latest";
    try {
      const { data } = await firstValueFrom(
        this.http.post<{
          content?: Array<{ type?: string; text?: string }>;
        }>(
          "https://api.anthropic.com/v1/messages",
          {
            model,
            max_tokens: 1200,
            temperature: 0.2,
            system,
            messages: [
              {
                role: "user",
                content: `Question de l'utilisateur :\n${userMessage}\n\nRéponds uniquement avec un objet JSON { "reply", "suggestions", "escalateToSupport" }.`,
              },
            ],
          },
          {
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            timeout: 45_000,
          },
        ),
      );
      const content = data.content
        ?.filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!content) {
        throw new ServiceUnavailableException("Réponse LLM vide");
      }
      return { content, provider: "anthropic" };
    } catch (err) {
      this.logger.warn(
        `Anthropic completion failed: ${err instanceof Error ? err.message : "error"}`,
      );
      throw new ServiceUnavailableException("Assistant temporairement indisponible");
    }
  }
}
