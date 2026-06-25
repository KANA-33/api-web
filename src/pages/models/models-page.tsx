import * as modelsApi from "@features/models/api";
import { Link } from "@tanstack/react-router";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

function inferCapability(model: string) {
  const lower = model.toLowerCase();

  if (lower.includes("embedding")) {
    return "Embedding";
  }

  if (lower.includes("image") || lower.includes("mj") || lower.includes("dall")) {
    return "Image";
  }

  if (lower.includes("audio") || lower.includes("tts") || lower.includes("whisper")) {
    return "Audio";
  }

  return "Chat";
}

export function ModelsPage() {
  const { data, error, loading, reload } = useAsyncData(async () => {
    const response = await modelsApi.getUserModels();
    return response.data;
  }, []);

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <PageTitle
        description="Browse available models, compare usage posture, and prepare integration choices without leaving the console."
        title="Models"
      />

      {loading && <LoadingBlock title="Loading models" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Models unavailable"
        />
      )}

      {!loading && !error && data?.length === 0 && (
        <EmptyBlock
          description="No models are enabled for your current account group."
          title="No models available"
        />
      )}

      {!loading && !error && data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((model) => (
            <Card key={model}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold">{model}</h2>
                <span className="rounded-md bg-[#efe5d6] px-2.5 py-1 text-xs font-medium text-[#6d6256]">
                  {inferCapability(model)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#655b50]">
                Available for your current backend group. Pricing and runtime limits should be shown
                after the commercial model detail contract is defined.
              </p>
              <Link
                className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-[#c9baa4] bg-[#efe5d6] px-4 text-sm font-medium text-[#2d2926] transition-colors hover:bg-[#e5d8c5]"
                params={{ modelId: encodeURIComponent(model) }}
                to="/models/$modelId"
              >
                View detail
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
