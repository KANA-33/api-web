import { useState, type FormEvent } from "react";
import { Play, RefreshCw } from "lucide-react";
import * as modelsApi from "@features/models/api";
import * as playgroundApi from "@features/playground/api";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

function getAssistantText(response: playgroundApi.PlaygroundChatResponse | null) {
  if (!response) {
    return "Response preview will appear here.";
  }

  if (response.error) {
    return response.error.message ?? "The model returned an error.";
  }

  const message = response.choices?.[0]?.message;
  return (
    message?.content || message?.reasoning_content || message?.reasoning || "No content returned."
  );
}

export function PlaygroundPage() {
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are a concise assistant.");
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [topP, setTopP] = useState("1");
  const [maxTokens, setMaxTokens] = useState("1024");
  const [response, setResponse] = useState<playgroundApi.PlaygroundChatResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

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

  async function handleRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunError(null);
    setResponse(null);

    if (!model) {
      setRunError("Select a model before running the request.");
      return;
    }

    if (!prompt.trim()) {
      setRunError("Write a prompt before running the request.");
      return;
    }

    setRunning(true);

    try {
      const result = await playgroundApi.runPlaygroundChat({
        model,
        messages: [
          ...(systemPrompt.trim()
            ? [{ role: "system" as const, content: systemPrompt.trim() }]
            : []),
          { role: "user", content: prompt.trim() },
        ],
        temperature: Number(temperature),
        top_p: Number(topP),
        max_tokens: Number(maxTokens),
        stream: false,
      });
      setResponse(result);
    } catch (caught) {
      setRunError(caught instanceof Error ? caught.message : "Playground request failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle
          description="A new testing surface for prompts, model options, and response inspection."
          title="Playground"
        />
        <Button className="gap-2" onClick={() => void reloadModels()} variant="secondary">
          <RefreshCw className="size-4" />
          Refresh models
        </Button>
      </div>

      {modelsLoading && <LoadingBlock title="Loading model options" />}

      {modelsError && (
        <ErrorBlock
          actionLabel="Retry"
          description={modelsError}
          onAction={() => void reloadModels()}
          title="Models unavailable"
        />
      )}

      <form className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]" onSubmit={handleRun}>
        <Card className="grid gap-5">
          <label className="grid gap-2 text-sm font-medium">
            Model
            <select
              className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
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
          </label>

          <label className="grid gap-2 text-sm font-medium">
            System
            <textarea
              className="min-h-24 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] p-4 text-sm outline-none focus:border-[#8b765e]"
              onChange={(event) => setSystemPrompt(event.target.value)}
              value={systemPrompt}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Prompt
            <textarea
              className="min-h-64 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] p-4 text-sm outline-none focus:border-[#8b765e]"
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Write a request..."
              value={prompt}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium">
              Temperature
              <input
                className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                max={2}
                min={0}
                onChange={(event) => setTemperature(event.target.value)}
                step={0.1}
                type="number"
                value={temperature}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Top P
              <input
                className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                max={1}
                min={0}
                onChange={(event) => setTopP(event.target.value)}
                step={0.05}
                type="number"
                value={topP}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Max tokens
              <input
                className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                min={1}
                onChange={(event) => setMaxTokens(event.target.value)}
                step={1}
                type="number"
                value={maxTokens}
              />
            </label>
          </div>

          {runError && (
            <p className="rounded-md border border-[#d9bfa7] bg-[#f7eadb] px-3 py-2 text-sm text-[#6a4e38]">
              {runError}
            </p>
          )}

          <Button className="gap-2 justify-self-start" disabled={running} type="submit">
            <Play className="size-4" />
            {running ? "Running..." : "Run request"}
          </Button>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Response</h2>
              <p className="mt-2 text-sm text-[#655b50]">
                Non-streaming chat completion through the session playground endpoint.
              </p>
            </div>
          </div>
          <pre className="mt-6 min-h-96 whitespace-pre-wrap rounded-md border border-[#d8cbb8] bg-[#efe5d6] p-4 text-sm leading-6 text-[#3f3933]">
            {getAssistantText(response)}
          </pre>
          {response?.usage && (
            <div className="mt-4 grid gap-3 text-sm text-[#655b50] sm:grid-cols-3">
              <span>
                Prompt: {response.usage.prompt_tokens ?? response.usage.input_tokens ?? 0}
              </span>
              <span>
                Completion: {response.usage.completion_tokens ?? response.usage.output_tokens ?? 0}
              </span>
              <span>Total: {response.usage.total_tokens ?? 0}</span>
            </div>
          )}
        </Card>
      </form>
    </div>
  );
}
