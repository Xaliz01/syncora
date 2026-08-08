import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  type AssistantChatRequest,
  type AssistantChatResponse,
  type AuthUser,
  type PermissionCode,
  filterAssistantSuggestions,
  suggestionsFromAccessibleRoutes,
} from "@planwise/shared";
import { AbstractAssistantService } from "./ports/assistant.service.port";
import { hasAssignablePermission } from "../infrastructure/permission-checks";
import { retrieveProductChunks } from "../infrastructure/assistant/product-docs.loader";
import {
  buildAssistantSystemPrompt,
  listAccessibleCatalogRoutes,
} from "../infrastructure/assistant/assistant.prompt";
import { AssistantLlmClient } from "../infrastructure/assistant/llm.client";
import { buildOfflineAssistantReply } from "../infrastructure/assistant/offline-reply";
import { formatAssistantReplySteps } from "../infrastructure/assistant/format-reply";

function isAssistantEnabled(): boolean {
  const flag = process.env.ASSISTANT_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  if (flag === "true" || flag === "1" || flag === "on") return true;
  // Sans flag explicite : actif seulement si une clé LLM est présente
  return Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim());
}

@Injectable()
export class AssistantService extends AbstractAssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(private readonly llm: AssistantLlmClient) {
    super();
  }

  async chat(user: AuthUser, request: AssistantChatRequest): Promise<AssistantChatResponse> {
    if (!isAssistantEnabled()) {
      throw new ServiceUnavailableException("Assistant désactivé");
    }

    const conversationId = request.conversationId?.trim() || randomUUID();
    const hasPermission = (code: PermissionCode) => hasAssignablePermission(user, code);
    const docs = retrieveProductChunks(request.message, 6, request.pathname);
    const accessibleRoutes = listAccessibleCatalogRoutes(hasPermission);

    if (!this.llm.isConfigured()) {
      const offline = buildOfflineAssistantReply({
        message: request.message,
        hasPermission,
      });
      return { conversationId, ...offline };
    }

    const system = buildAssistantSystemPrompt({
      user,
      pathname: request.pathname,
      docs,
      accessibleRoutes,
    });

    try {
      const { content } = await this.llm.complete(system, request.message);
      const parsed = parseLlmJson(content);
      const suggestions = filterAssistantSuggestions(parsed.suggestions, hasPermission);
      const reply =
        typeof parsed.reply === "string" && parsed.reply.trim()
          ? formatAssistantReplySteps(parsed.reply.trim().slice(0, 4000))
          : "Voici les écrans susceptibles de vous aider.";

      const offlinePreferred = buildOfflineAssistantReply({
        message: request.message,
        hasPermission,
      }).suggestions.map((s) => s.href);

      return {
        conversationId,
        reply,
        suggestions:
          suggestions.length > 0
            ? suggestions
            : suggestionsFromAccessibleRoutes(hasPermission, offlinePreferred),
        escalateToSupport: Boolean(parsed.escalateToSupport),
      };
    } catch (err) {
      this.logger.warn(`Assistant LLM fallback: ${err instanceof Error ? err.message : "error"}`);
      const offline = buildOfflineAssistantReply({
        message: request.message,
        hasPermission,
      });
      return {
        conversationId,
        reply: `L'assistant IA est momentanément indisponible.\n\n${offline.reply}`,
        suggestions: offline.suggestions,
        escalateToSupport: true,
      };
    }
  }
}

function parseLlmJson(content: string): {
  reply?: unknown;
  suggestions?: unknown;
  escalateToSupport?: unknown;
} {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as {
      reply?: unknown;
      suggestions?: unknown;
      escalateToSupport?: unknown;
    };
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as {
          reply?: unknown;
          suggestions?: unknown;
          escalateToSupport?: unknown;
        };
      } catch {
        /* fall through */
      }
    }
    return { reply: trimmed.slice(0, 2000), suggestions: [], escalateToSupport: false };
  }
}
