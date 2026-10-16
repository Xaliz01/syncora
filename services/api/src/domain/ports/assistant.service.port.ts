import type { AssistantChatRequest, AssistantChatResponse, AuthUser } from "@planwise/shared";

export abstract class AbstractAssistantService {
  abstract chat(user: AuthUser, request: AssistantChatRequest): Promise<AssistantChatResponse>;
}
