import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import * as modelsApi from "@features/models/api";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

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

export function ModelDetailPage() {
  const { modelId } = useParams({ from: "/app/models/$modelId" });
  const decodedModelId = decodeURIComponent(modelId);
  const { data, error, loading, reload } = useAsyncData(async () => {
    const response = await modelsApi.getUserModels();
    return response.data;
  }, []);
  const available = data?.includes(decodedModelId) ?? false;

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-[#655b50] hover:text-[#2d2926]"
        to="/models"
      >
        <ArrowLeft className="size-4" />
        Back to models
      </Link>
      <PageTitle
        description="Inspect model availability and integration posture from the commercial model catalog."
        title={decodedModelId}
      />

      {loading && <LoadingBlock title="Loading model detail" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Model detail unavailable"
        />
      )}

      {!loading && !error && (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <p className="text-sm text-[#837462]">Capability</p>
            <strong className="mt-3 block text-3xl font-semibold">
              {inferCapability(decodedModelId)}
            </strong>
            <p className="mt-5 text-sm leading-6 text-[#655b50]">
              {available
                ? "This model is available to the current account group."
                : "This model is not included in the current account model list."}
            </p>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Commercial detail status</h2>
            <div className="mt-5 grid gap-3 text-sm text-[#655b50]">
              <p>Availability: {available ? "Available" : "Unavailable"}</p>
              <p>Pricing: pending model pricing contract extraction.</p>
              <p>Context and rate limits: pending backend capability contract.</p>
              <p>Recommended use: derived independently from model naming only.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
