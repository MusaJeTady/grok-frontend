let userApiKey: string | null = null;

/** Set the API key from the UI input (overrides env). Pass null to clear. */
export function setGrokApiKey(key: string | null): void {
  userApiKey = key?.trim() || null;
}

function getApiKey(): string {
  if (!userApiKey) throw new Error("Grok API key is not set. Please log in.");
  return userApiKey;
}

const getBaseUrl = () =>
  import.meta.env.VITE_GROK_API_URL ?? "https://api.x.ai/v1";

const PROXY_BASE = "/api/proxy";

function proxyUrl(fullTargetUrl: string): string {
  return `${PROXY_BASE}?url=${encodeURIComponent(fullTargetUrl)}`;
}

const XAI_CDN_PREFIXES = ["https://imgen.x.ai/", "https://vidgen.x.ai/"];

function useProxy(url: string): boolean {
  return XAI_CDN_PREFIXES.some((p) => url.startsWith(p));
}

function grokFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  if (useProxy(url)) return fetch(proxyUrl(url), init);
  return fetch(input, init);
}

export interface GrokApiError extends Error {
  status?: number;
  responseBody?: string;
  responseJson?: unknown;
}

function statusMessage(status: number): string {
  switch (status) {
    case 401: return "Unauthorized — check your API key.";
    case 403: return "Forbidden — access denied.";
    case 429: return "Rate limited — try again later.";
    case 502: return "Proxy or network error.";
    case 500:
    case 503: return "Server error — try again later.";
    default: return `Request failed (${status}).`;
  }
}

function getErrorMessage(err: unknown): string {
  // ... (tvé původní dlouhé tělo zůstává beze změny – pro stručnost zde vynecháno)
  if (err instanceof Error) return err.message;
  return "Request failed";
}

const PROXIED_API_PATHS = ["/images/generations", "/images/edits"];

async function xaiPostRaw(path: string, body: Record<string, unknown>): Promise<string> {
  const useProxyApi = PROXIED_API_PATHS.includes(path);
  const target = useProxyApi
    ? proxyUrl(`https://api.x.ai/v1${path}`)
    : `${getBaseUrl().replace(/\/$/, "")}${path}`;
  const res = await grokFetch(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const apiErr: GrokApiError = new Error(`Request failed: ${res.status}`) as GrokApiError;
    apiErr.status = res.status;
    apiErr.responseBody = text || undefined;
    try { apiErr.responseJson = JSON.parse(text); } catch {}
    throw apiErr;
  }
  return text;
}

type ImageGenOutcome =
  | { kind: "success"; dataUris: string[] }
  | { kind: "unknown_error"; message: string };

function processImageGenerationResponse(rawText: string): ImageGenOutcome {
  let parsed: unknown;
  try { parsed = JSON.parse(rawText); } catch { parsed = undefined; }

  if (parsed && typeof parsed === "object" && "data" in parsed) {
    const data = parsed as { data?: Array<{ b64_json?: string; mime_type?: string }> };
    const items = data.data ?? [];
    const uris: string[] = [];

    for (const item of items) {
      if (item.b64_json) {
        const mime = item.mime_type?.match(/^image\/[a-z0-9+.-]+$/i)
          ? item.mime_type
          : "image/png";
        uris.push(`data:${mime};base64,${item.b64_json}`);
      }
    }

    if (uris.length > 0) return { kind: "success", dataUris: uris };
  }

  return {
    kind: "unknown_error",
    message: rawText || "Unexpected image response format",
  };
}

export async function textToImage(prompt: string, n: number = 1): Promise<string[]> {
  try {
    const text = await xaiPostRaw("/images/generations", {
      model: "grok-imagine-image",
      prompt: prompt.trim(),
      n,
      response_format: "b64_json",
    });

    const outcome = processImageGenerationResponse(text);
    if (outcome.kind === "success") return outcome.dataUris;
    throw new Error(outcome.message);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

// zbytek souboru (imageEdit, imageToVideo, ...) zůstává beze změny
// pokud chceš, můžu přidat i podporu n do imageEdit
