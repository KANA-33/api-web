export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export interface ApiRequestOptions<TBody = unknown> {
  method?: HttpMethod;
  path: string;
  query?: object;
  body?: TBody;
  signal?: AbortSignal;
}

export interface ApiClientOptions {
  baseUrl: string;
  getBearerToken?: () => string | null;
  getUserId?: () => string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
  }
}

export class ApiNetworkError extends Error {
  constructor(
    message: string,
    readonly cause: unknown,
  ) {
    super(message);
  }
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function buildUrl(baseUrl: string, path: string, query?: object) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const url = new URL(`${normalizedBase}${path}`, window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

function isApiEnvelope(payload: unknown): payload is ApiEnvelope<unknown> {
  return (
    typeof payload === "object" && payload !== null && "success" in payload && "message" in payload
  );
}

export function createApiClient(options: ApiClientOptions) {
  return async function request<TResponse, TBody = unknown>({
    method = "GET",
    path,
    query,
    body,
    signal,
  }: ApiRequestOptions<TBody>): Promise<TResponse> {
    const token = options.getBearerToken?.();
    const userId = options.getUserId?.();
    const response = await fetch(buildUrl(options.baseUrl, path, query), {
      method,
      credentials: "include",
      signal,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(userId ? { "New-Api-User": userId } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }).catch((caught: unknown) => {
      throw new ApiNetworkError(
        "Network request failed. Check backend origin, dev proxy, CORS, and cookie settings.",
        caught,
      );
    });

    const payload = (await response.json().catch(() => undefined)) as unknown;

    if (!response.ok) {
      throw new ApiError(response.statusText, response.status, payload);
    }

    if (isApiEnvelope(payload) && !payload.success) {
      throw new ApiError(payload.message || "Request failed", response.status, payload);
    }

    return payload as TResponse;
  };
}
