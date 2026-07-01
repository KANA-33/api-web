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

export interface PlaygroundChatStreamHandlers {
  onAnswerDelta?: (value: string) => void;
  onThinkingDelta?: (value: string) => void;
  signal?: AbortSignal;
}

function buildUrl(path: string) {
  const baseUrl = import.meta.env.PUBLIC_API_BASE_URL ?? "";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return new URL(`${normalizedBase}${path}`, window.location.origin);
}

function getStringField(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") {
    return "";
  }

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value) {
      return value;
    }
  }

  return "";
}

function getObjectField(source: unknown, key: string) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return value && typeof value === "object" ? value : undefined;
}

function getFirstChoice(source: unknown) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const choices = (source as Record<string, unknown>).choices;
  return Array.isArray(choices) ? choices[0] : undefined;
}

function readStreamDelta(payload: unknown) {
  const choice = getFirstChoice(payload);
  const delta = getObjectField(choice, "delta");
  const message = getObjectField(choice, "message");
  const thinking =
    getStringField(delta, [
      "reasoning_content",
      "reasoningContent",
      "reasoning",
      "thinking",
      "think",
    ]) ||
    getStringField(message, [
      "reasoning_content",
      "reasoningContent",
      "reasoning",
      "thinking",
      "think",
    ]);
  const answer =
    getStringField(delta, ["content", "text", "answer"]) ||
    getStringField(message, ["content", "text", "answer"]);

  return { answer, thinking };
}

export function runPlaygroundChat(request: PlaygroundChatRequest) {
  return apiClient<PlaygroundChatResponse, PlaygroundChatRequest>({
    method: "POST",
    path: "/pg/chat/completions",
    body: request,
  });
}

export async function runPlaygroundChatStream(
  request: PlaygroundChatRequest,
  handlers: PlaygroundChatStreamHandlers = {},
): Promise<PlaygroundChatResponse> {
  const token = localStorage.getItem("commercial_console_api_key");
  const userId = localStorage.getItem("commercial_console_user_id");
  const response = await fetch(buildUrl("/pg/chat/completions"), {
    body: JSON.stringify({ ...request, stream: true }),
    credentials: "include",
    headers: {
      Accept: "text/event-stream, application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userId ? { "New-Api-User": userId } : {}),
    },
    method: "POST",
    signal: handlers.signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as unknown;
    const message =
      getStringField(payload, ["message", "error"]) || response.statusText || "Request failed";
    throw new Error(message);
  }

  if (!response.body || response.headers.get("content-type")?.includes("application/json")) {
    return (await response.json()) as PlaygroundChatResponse;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let thinking = "";
  let lastPayload: unknown;

  function consumeLine(line: string) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith(":")) {
      return;
    }

    if (!trimmed.startsWith("data:")) {
      return;
    }

    const data = trimmed.slice(5).trim();

    if (!data || data === "[DONE]") {
      return;
    }

    try {
      const payload = JSON.parse(data) as unknown;
      lastPayload = payload;
      const delta = readStreamDelta(payload);

      if (delta.thinking) {
        thinking += delta.thinking;
        handlers.onThinkingDelta?.(delta.thinking);
      }

      if (delta.answer) {
        answer += delta.answer;
        handlers.onAnswerDelta?.(delta.answer);
      }
    } catch {
      // Ignore malformed keep-alive lines from upstream providers.
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    lines.forEach(consumeLine);

    if (done) {
      if (buffer.trim()) {
        consumeLine(buffer);
      }
      break;
    }
  }

  const base = lastPayload && typeof lastPayload === "object" ? lastPayload : {};

  return {
    ...(base as PlaygroundChatResponse),
    choices: [
      {
        index: 0,
        message: {
          content: answer,
          reasoning_content: thinking,
          role: "assistant",
        },
      },
    ],
  };
}
