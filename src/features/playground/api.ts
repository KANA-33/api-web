import { apiClient } from "@shared/api/client";

export interface PlaygroundMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PlaygroundChatRequest {
  model: string;
  messages: PlaygroundMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface PlaygroundUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
}

export interface PlaygroundChatResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string;
      reasoning_content?: string;
      reasoning?: string;
    };
    finish_reason?: string;
  }>;
  usage?: PlaygroundUsage;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export function runPlaygroundChat(request: PlaygroundChatRequest) {
  return apiClient<PlaygroundChatResponse, PlaygroundChatRequest>({
    method: "POST",
    path: "/pg/chat/completions",
    body: request,
  });
}
