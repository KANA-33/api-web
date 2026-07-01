import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronDown,
  Copy,
  Edit3,
  Paperclip,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import gsap from "gsap";
import { create } from "zustand";
import * as modelsApi from "@features/models/api";
import * as playgroundApi from "@features/playground/api";
import { cn } from "@shared/lib/cn";
import { useAsyncData } from "@shared/lib/use-async-data";
import { ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

interface CodeSegment {
  code: string;
  language: string;
  type: "code";
}

interface TextSegment {
  text: string;
  type: "text";
}

type AssistantSegment = CodeSegment | TextSegment;

interface AssistantMessageParts {
  answer: string;
  thinking: string;
}

interface PlaygroundTurn {
  error: string | null;
  id: string;
  prompt: string;
  response: playgroundApi.PlaygroundChatResponse | null;
  streamingAnswer: string;
  streamingThinking: string;
}

interface PlaygroundSessionState {
  runningTurnId: string | null;
  turns: PlaygroundTurn[];
  appendTurn: (turn: PlaygroundTurn) => void;
  deleteTurn: (turnId: string) => void;
  finishRunning: () => void;
  setRunningTurnId: (turnId: string | null) => void;
  truncateFromTurn: (turnId: string) => void;
  updateTurn: (turnId: string, patch: Partial<PlaygroundTurn>) => void;
  updateTurnWith: (
    turnId: string,
    updater: (turn: PlaygroundTurn) => Partial<PlaygroundTurn>,
  ) => void;
}

const usePlaygroundSession = create<PlaygroundSessionState>((set) => ({
  runningTurnId: null,
  turns: [],
  appendTurn: (turn) => set((state) => ({ turns: [...state.turns, turn] })),
  deleteTurn: (turnId) =>
    set((state) => ({ turns: state.turns.filter((turn) => turn.id !== turnId) })),
  finishRunning: () => set({ runningTurnId: null }),
  setRunningTurnId: (turnId) => set({ runningTurnId: turnId }),
  truncateFromTurn: (turnId) =>
    set((state) => {
      const index = state.turns.findIndex((turn) => turn.id === turnId);
      return { turns: index >= 0 ? state.turns.slice(0, index) : state.turns };
    }),
  updateTurn: (turnId, patch) =>
    set((state) => ({
      turns: state.turns.map((turn) => (turn.id === turnId ? { ...turn, ...patch } : turn)),
    })),
  updateTurnWith: (turnId, updater) =>
    set((state) => ({
      turns: state.turns.map((turn) =>
        turn.id === turnId ? { ...turn, ...updater(turn) } : turn,
      ),
    })),
}));

function splitThinkTags(value: string) {
  const thinkPattern = /<think>([\s\S]*?)<\/think>/gi;
  const thinking: string[] = [];
  const answer = value
    .replace(thinkPattern, (_match, content: string) => {
      if (content.trim()) {
        thinking.push(content.trim());
      }
      return "";
    })
    .trim();

  return {
    answer,
    thinking: thinking.join("\n\n"),
  };
}

function getStringField(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") {
    return "";
  }

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
}

function getAssistantMessageParts(
  response: playgroundApi.PlaygroundChatResponse | null,
): AssistantMessageParts {
  if (!response) {
    return { answer: "", thinking: "" };
  }

  if (response.error) {
    return { answer: response.error.message ?? "The model returned an error.", thinking: "" };
  }

  const choice = response.choices?.[0] as Record<string, unknown> | undefined;
  const message = choice?.message as Record<string, unknown> | undefined;
  const delta = choice?.delta as Record<string, unknown> | undefined;
  const content =
    getStringField(message, ["content", "text", "answer"]) ||
    getStringField(choice, ["content", "text", "answer"]) ||
    getStringField(response, ["output_text", "content", "text", "answer"]);
  const contentParts = splitThinkTags(content);
  const explicitThinking = [
    getStringField(message, [
      "reasoning_content",
      "reasoningContent",
      "reasoning",
      "thinking",
      "think",
    ]),
    getStringField(delta, [
      "reasoning_content",
      "reasoningContent",
      "reasoning",
      "thinking",
      "think",
    ]),
    getStringField(choice, [
      "reasoning_content",
      "reasoningContent",
      "reasoning",
      "thinking",
      "think",
    ]),
    getStringField(response, [
      "reasoning_content",
      "reasoningContent",
      "reasoning",
      "thinking",
      "think",
    ]),
  ]
    .filter(Boolean)
    .join("\n\n");
  const thinking = [explicitThinking.trim(), contentParts.thinking].filter(Boolean).join("\n\n");

  return {
    answer: contentParts.answer || (!thinking ? "No content returned." : ""),
    thinking,
  };
}

function buildContextMessages(turns: PlaygroundTurn[]): playgroundApi.PlaygroundMessage[] {
  return turns.flatMap((turn) => {
    const assistant = getAssistantMessageParts(turn.response);
    const messages: playgroundApi.PlaygroundMessage[] = [
      { role: "user", content: turn.prompt },
    ];

    if (assistant.answer.trim()) {
      messages.push({ role: "assistant", content: assistant.answer.trim() });
    }

    return messages;
  });
}

function parseAssistantSegments(value: string): AssistantSegment[] {
  if (!value.trim()) {
    return [];
  }

  const segments: AssistantSegment[] = [];
  const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockPattern.exec(value)) !== null) {
    const textBefore = value.slice(lastIndex, match.index).trim();

    if (textBefore) {
      segments.push({ text: textBefore, type: "text" });
    }

    segments.push({
      code: match[2]?.trimEnd() ?? "",
      language: match[1] || "text",
      type: "code",
    });
    lastIndex = match.index + match[0].length;
  }

  const textAfter = value.slice(lastIndex).trim();

  if (textAfter) {
    segments.push({ text: textAfter, type: "text" });
  }

  return segments;
}

function renderInlineMarkdown(value: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    const before = value.slice(lastIndex, match.index);

    if (before) {
      nodes.push(before);
    }

    const token = match[0];

    if (token.startsWith("`")) {
      nodes.push(
        <code
          className="border border-[#d8d2d2] bg-[#efeded] px-1.5 py-0.5 text-[0.9em] font-semibold text-black"
          key={`${token}-${match.index}`}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      nodes.push(
        <a
          className="font-semibold underline decoration-[#9b9696] underline-offset-4 transition-colors hover:text-black"
          href={linkMatch?.[2] ?? "#"}
          key={`${token}-${match.index}`}
          rel="noreferrer"
          target="_blank"
        >
          {linkMatch?.[1] ?? token}
        </a>,
      );
    }

    lastIndex = match.index + token.length;
  }

  const after = value.slice(lastIndex);

  if (after) {
    nodes.push(after);
  }

  return nodes;
}

function MarkdownText({ value }: { value: string }) {
  const blocks = value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const heading = /^(#{1,3})\s+(.+)$/.exec(block);

        if (heading) {
          const level = heading[1].length;
          const className =
            level === 1
              ? "text-[28px] font-bold leading-tight"
              : level === 2
                ? "text-[23px] font-bold leading-tight"
                : "text-[19px] font-bold leading-tight";

          return (
            <h3 className={className} key={`heading-${index}`}>
              {renderInlineMarkdown(heading[2])}
            </h3>
          );
        }

        if (block.startsWith(">")) {
          return (
            <blockquote
              className="border-l border-[#9b9696] pl-4 text-[#5d5f5f]"
              key={`quote-${index}`}
            >
              {renderInlineMarkdown(block.replace(/^>\s?/gm, ""))}
            </blockquote>
          );
        }

        const lines = block.split("\n");
        const unorderedLines = lines.filter((line) => /^[-*]\s+/.test(line.trim()));

        if (unorderedLines.length > 0 && unorderedLines.length === lines.length) {
          return (
            <ul className="list-disc space-y-2 pl-6" key={`list-${index}`}>
              {unorderedLines.map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>
                  {renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        const orderedLines = lines.filter((line) => /^\d+\.\s+/.test(line.trim()));

        if (orderedLines.length > 0 && orderedLines.length === lines.length) {
          return (
            <ol className="list-decimal space-y-2 pl-6" key={`ordered-${index}`}>
              {orderedLines.map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>
                  {renderInlineMarkdown(line.replace(/^\d+\.\s+/, ""))}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p className="whitespace-pre-wrap" key={`paragraph-${index}`}>
            {renderInlineMarkdown(block)}
          </p>
        );
      })}
    </div>
  );
}

function AssistantIcon() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#d8d2d2] bg-[#fbfaf8] text-[#201f1e] shadow-[0_8px_22px_rgba(74,65,57,0.08)]">
      <Sparkles className="size-3.5" />
    </span>
  );
}

function AssistantRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full items-start gap-4">
      <AssistantIcon />
      <div className="min-w-0 flex-1 pt-0.5 text-[16px] leading-7 text-[#242220] md:text-[17px]">
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  async function copyCode() {
    await navigator.clipboard?.writeText(code);
  }

  return (
    <div className="mt-6 overflow-hidden border border-[#cfc4c5] bg-black">
      <div className="flex h-11 items-center justify-between border-b border-[#cfc4c5] bg-[#e9e8e7] px-5 text-sm font-semibold text-black">
        <span>{language}</span>
        <button
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#4c4546] transition-colors hover:text-black"
          onClick={() => void copyCode()}
          type="button"
        >
          <Copy className="size-4" />
          Copy
        </button>
      </div>
      <pre className="max-h-[520px] overflow-auto p-5 text-[15px] font-semibold leading-7 text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ThinkBlock({
  defaultOpen,
  thinking,
}: {
  defaultOpen: boolean;
  thinking: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!thinking.trim()) {
    return null;
  }

  return (
    <section className="border-l border-[#cfc4c5] pl-4">
      <button
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8a8585] transition-colors hover:text-[#5d5f5f]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <ChevronDown
          className={cn("size-4 transition-transform", open ? "rotate-0" : "-rotate-90")}
        />
        Think
      </button>
      {open && (
        <p className="mt-3 whitespace-pre-wrap text-[15px] font-medium leading-7 text-[#9b9696]">
          {thinking}
        </p>
      )}
    </section>
  );
}

function AssistantContent({ answer, thinking }: AssistantMessageParts) {
  const hasAnswer = answer.trim() !== "";

  if (!hasAnswer && !thinking.trim()) {
    return (
      <p>
        TEST API Playground initialized. Core systems operational. How can I assist with your
        infrastructure today?
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ThinkBlock defaultOpen={!hasAnswer} thinking={thinking} />
      {hasAnswer &&
        parseAssistantSegments(answer).map((segment, index) =>
          segment.type === "code" ? (
            <CodeBlock
              code={segment.code}
              key={`${segment.type}-${index}`}
              language={segment.language}
            />
          ) : (
            <MarkdownText key={`${segment.type}-${index}`} value={segment.text} />
          ),
        )}
    </div>
  );
}

function StreamingThinkProgress({
  answer,
  thinking,
}: {
  answer: string;
  thinking: string;
}) {
  const answerParts = splitThinkTags(answer);
  const visibleThinking = [thinking.trim(), answerParts.thinking].filter(Boolean).join("\n\n");
  const visibleAnswer = answerParts.answer.trim();
  const hasLiveText = Boolean(visibleThinking || visibleAnswer);

  return (
    <div className="space-y-4">
      <section className="border-l border-[#cfc4c5] pl-4">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8a8585]">
          <ChevronDown className="size-4" />
          Think
        </div>
        {hasLiveText ? (
          <p className="mt-3 whitespace-pre-wrap text-[15px] font-medium leading-7 text-[#9b9696]">
            {visibleThinking || visibleAnswer}
          </p>
        ) : (
          <p className="mt-3 text-[15px] font-medium leading-7 text-[#9b9696]">
            Waiting for reasoning tokens...
          </p>
        )}
      </section>
    </div>
  );
}

function TurnActions({
  answer,
  disabled,
  onDelete,
  onEdit,
  onRegenerate,
}: {
  answer: string;
  disabled: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
}) {
  async function copyAnswer() {
    await navigator.clipboard?.writeText(answer);
  }

  const actionClass =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-[#736d68] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ede8e3] hover:text-black disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-1 opacity-75 transition-opacity duration-200 hover:opacity-100">
      <button
        className={actionClass}
        disabled={!answer.trim()}
        onClick={() => void copyAnswer()}
        type="button"
      >
        <Copy className="size-3.5" />
        Copy
      </button>
      <button className={actionClass} disabled={disabled} onClick={onRegenerate} type="button">
        <RefreshCw className="size-3.5" />
        Regenerate
      </button>
      <button className={actionClass} disabled={disabled} onClick={onEdit} type="button">
        <Edit3 className="size-3.5" />
        Edit
      </button>
      <button className={actionClass} disabled={disabled} onClick={onDelete} type="button">
        <Trash2 className="size-3.5" />
        Delete
      </button>
    </div>
  );
}

export function PlaygroundPage() {
  const [model, setModel] = useState("");
  const [systemPrompt] = useState("You are a concise assistant.");
  const [prompt, setPrompt] = useState("");
  const [temperature] = useState("0.7");
  const [topP] = useState("1");
  const [maxTokens] = useState("1024");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const {
    appendTurn,
    deleteTurn,
    finishRunning,
    runningTurnId,
    setRunningTurnId,
    truncateFromTurn,
    turns,
    updateTurn,
    updateTurnWith,
  } = usePlaygroundSession();
  const scrollSignature = useMemo(
    () =>
      turns
        .map(
          (turn) =>
            `${turn.id}:${turn.prompt.length}:${turn.streamingAnswer.length}:${turn.streamingThinking.length}:${Boolean(turn.response)}:${turn.error ?? ""}`,
        )
        .join("|"),
    [turns],
  );

  const {
    data: models,
    error: modelsError,
    loading: modelsLoading,
    reload: reloadModels,
  } = useAsyncData(async () => {
    const modelResponse = await modelsApi.getUserModels();
    const items = modelResponse.data;
    setModel((current) => current || items[0] || "");
    return items;
  }, []);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      behavior: "smooth",
      top: container.scrollHeight,
    });
  }, [scrollSignature, runningTurnId]);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-playground-chrome]",
        { opacity: 0, y: -10 },
        { duration: 0.45, ease: "power3.out", opacity: 1, stagger: 0.08, y: 0 },
      );
      gsap.fromTo(
        "[data-playground-composer]",
        { opacity: 0, scale: 0.98, y: 16 },
        { delay: 0.1, duration: 0.5, ease: "power3.out", opacity: 1, scale: 1, y: 0 },
      );
    }, shellRef);

    return () => context.revert();
  }, []);

  useEffect(() => {
    const latestTurn = turns.at(-1);

    if (!latestTurn || !shellRef.current) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        `[data-playground-turn="${latestTurn.id}"] > *`,
        { opacity: 0, y: 18 },
        { duration: 0.42, ease: "power3.out", opacity: 1, stagger: 0.08, y: 0 },
      );
    }, shellRef);

    return () => context.revert();
  }, [turns.length]);

  async function runTurn({
    contextTurns,
    promptValue,
    turnId,
  }: {
    contextTurns: PlaygroundTurn[];
    promptValue: string;
    turnId: string;
  }) {
    const contextMessages = buildContextMessages(contextTurns);
    setRunningTurnId(turnId);
    updateTurn(turnId, {
      error: null,
      response: null,
      streamingAnswer: "",
      streamingThinking: "",
    });
    try {
      const result = await playgroundApi.runPlaygroundChatStream(
        {
          model,
          messages: [
            ...(systemPrompt.trim()
              ? [{ role: "system" as const, content: systemPrompt.trim() }]
              : []),
            ...contextMessages,
            { role: "user", content: promptValue },
          ],
          temperature: Number(temperature),
          top_p: Number(topP),
          max_tokens: Number(maxTokens),
          stream: true,
        },
        {
          onAnswerDelta: (value) => {
            updateTurnWith(turnId, (turn) => ({
              streamingAnswer: `${turn.streamingAnswer}${value}`,
            }));
          },
          onThinkingDelta: (value) => {
            updateTurnWith(turnId, (turn) => ({
              streamingThinking: `${turn.streamingThinking}${value}`,
            }));
          },
        },
      );
      updateTurn(turnId, { response: result });
    } catch (caught) {
      const error = caught instanceof Error ? caught.message : "Playground request failed";
      updateTurn(turnId, { error });
    } finally {
      finishRunning();
    }
  }

  async function handleRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextPrompt = prompt.trim();

    if (!model) {
      const turnId = crypto.randomUUID();
      appendTurn({
        error: "Select a model before running the request.",
        id: turnId,
        prompt: nextPrompt || "Run request",
        response: null,
        streamingAnswer: "",
        streamingThinking: "",
      });
      return;
    }

    if (!nextPrompt) {
      return;
    }

    const turnId = crypto.randomUUID();
    appendTurn({
      error: null,
      id: turnId,
      prompt: nextPrompt,
      response: null,
      streamingAnswer: "",
      streamingThinking: "",
    });
    setPrompt("");
    await runTurn({ contextTurns: turns, promptValue: nextPrompt, turnId });
  }

  function handleRegenerate(turn: PlaygroundTurn) {
    if (running) {
      return;
    }

    const turnIndex = turns.findIndex((item) => item.id === turn.id);
    const contextTurns = turnIndex >= 0 ? turns.slice(0, turnIndex) : turns;
    void runTurn({ contextTurns, promptValue: turn.prompt, turnId: turn.id });
  }

  function handleEdit(turn: PlaygroundTurn) {
    if (running) {
      return;
    }

    setPrompt(turn.prompt);
    truncateFromTurn(turn.id);
  }

  const running = runningTurnId !== null;

  return (
    <div
      className="relative -mx-5 -my-9 flex h-[calc(100dvh-72px)] flex-col overflow-hidden bg-[#f8f6f3] text-[#242220] md:-mx-10 lg:-my-12 xl:-mx-12"
      ref={shellRef}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.95),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.5),rgba(226,220,214,0.34))]" />
      <div
        className="relative z-10 flex h-14 shrink-0 items-center justify-center border-b border-[#ddd6cf]/80 bg-[#fbfaf8]/82 backdrop-blur-xl"
        data-playground-chrome
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <label className="sr-only" htmlFor="playground-model">
              Model
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 size-2 -translate-y-1/2 rounded-full bg-black" />
            <select
              className="h-9 max-w-[280px] rounded-full border border-[#d8d2cc] bg-[#f1eeeb] pl-8 pr-9 text-sm font-semibold text-[#242220] shadow-[0_10px_24px_rgba(74,65,57,0.06)] outline-none transition-colors focus:border-[#242220]"
              id="playground-model"
              onChange={(event) => setModel(event.target.value)}
              value={model}
            >
              {(models ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              {(models ?? []).length === 0 && <option value="">No model loaded</option>}
            </select>
          </div>
          <button
            aria-label="Refresh models"
            className="grid size-9 place-items-center rounded-full border border-[#d8d2cc] bg-[#fbfaf8] text-[#5f5954] shadow-[0_10px_24px_rgba(74,65,57,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#242220] hover:text-[#242220] active:translate-y-0"
            onClick={() => void reloadModels()}
            type="button"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto scroll-smooth" ref={scrollRef}>
        <div className="mx-auto flex w-full max-w-[860px] flex-col gap-8 px-5 pb-40 pt-10 md:px-8">
        {modelsLoading && <LoadingBlock title="Loading model options" />}

        {modelsError && (
          <ErrorBlock
            actionLabel="Retry"
            description={modelsError}
            onAction={() => void reloadModels()}
            title="Models unavailable"
          />
        )}

        <div data-playground-chrome>
        <AssistantRow>
          <p>
            TEST API Playground initialized. Core systems operational. How can I assist with your
            infrastructure today?
          </p>
        </AssistantRow>
        </div>

        {turns.map((turn) => {
          const assistantMessage = getAssistantMessageParts(turn.response);
          const isRunning = runningTurnId === turn.id;
          const assistantAnswer = assistantMessage.answer.trim();

          return (
            <div className="contents" data-playground-turn={turn.id} key={turn.id}>
              <div className="ml-auto max-w-[78%] rounded-[26px] bg-[#242220] px-5 py-3.5 text-[15px] leading-7 text-[#fbfaf8] shadow-[0_18px_40px_rgba(44,38,32,0.14)] md:text-[16px]">
                {turn.prompt}
              </div>

              {(assistantMessage.answer ||
                assistantMessage.thinking ||
                isRunning ||
                turn.error) && (
                <AssistantRow>
                  {isRunning ? (
                    <StreamingThinkProgress
                      answer={turn.streamingAnswer}
                      thinking={turn.streamingThinking}
                    />
                  ) : turn.error ? (
                    <div>
                      <p className="text-[#93000a]">{turn.error}</p>
                      <TurnActions
                        answer=""
                        disabled={running}
                        onDelete={() => deleteTurn(turn.id)}
                        onEdit={() => handleEdit(turn)}
                        onRegenerate={() => handleRegenerate(turn)}
                      />
                    </div>
                  ) : (
                    <div>
                      <AssistantContent
                        answer={assistantMessage.answer}
                        thinking={assistantMessage.thinking}
                      />
                      <TurnActions
                        answer={assistantAnswer}
                        disabled={running}
                        onDelete={() => deleteTurn(turn.id)}
                        onEdit={() => handleEdit(turn)}
                        onRegenerate={() => handleRegenerate(turn)}
                      />
                    </div>
                  )}
                </AssistantRow>
              )}
            </div>
          );
        })}
        </div>
      </div>

      <form
        className="absolute bottom-6 left-1/2 z-30 w-[min(860px,calc(100%-32px))] -translate-x-1/2"
        data-playground-composer
        onSubmit={handleRun}
      >
        <div className="flex min-h-[118px] items-end gap-2 rounded-[30px] border border-[#d8d2cc] bg-[#fbfaf8] px-3 py-3 shadow-[0_22px_70px_rgba(74,65,57,0.18)] backdrop-blur-xl transition-shadow duration-200 focus-within:shadow-[0_26px_80px_rgba(74,65,57,0.22)]">
          <button
            aria-label="Attach file"
            className="grid size-11 shrink-0 place-items-center rounded-full text-[#6f6964] transition-all duration-200 hover:bg-[#eee9e4] hover:text-[#242220] active:scale-95"
            type="button"
          >
            <Paperclip className="size-6" />
          </button>
          <textarea
            className="playground-composer-input h-[84px] min-w-0 flex-1 resize-none appearance-none px-2 py-2 text-[16px] leading-7 text-[#242220] placeholder:text-[#8d8882] md:text-[17px]"
            disabled={running}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Enter instructions or parameters..."
            rows={3}
            value={prompt}
          />
          <button
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#242220] bg-[#242220] text-[#fbfaf8] transition-all duration-200",
              running
                ? "cursor-wait opacity-70"
                : "hover:-translate-y-0.5 hover:bg-[#fbfaf8] hover:text-[#242220] active:translate-y-0 active:scale-95",
            )}
            disabled={running}
            aria-label={running ? "Running" : "Execute"}
            type="submit"
          >
            <ArrowRight className="size-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
