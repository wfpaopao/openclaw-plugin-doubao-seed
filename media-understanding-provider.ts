import {
  buildOpenAiCompatibleVideoRequestBody,
  coerceOpenAiCompatibleVideoText,
  resolveMediaUnderstandingString,
  type ImageDescriptionRequest,
  type ImageDescriptionResult,
  type ImagesDescriptionRequest,
  type ImagesDescriptionResult,
  type MediaUnderstandingProvider,
  type OpenAiCompatibleVideoPayload,
  type VideoDescriptionRequest,
  type VideoDescriptionResult,
} from "openclaw/plugin-sdk/media-understanding";
import {
  assertOkOrThrowHttpError,
  postJsonRequest,
  resolveProviderHttpRequestConfig,
} from "openclaw/plugin-sdk/provider-http";
import { DOUBAO_SEED_DEFAULT_MODEL_ID, DOUBAO_SEED_PROVIDER_ID } from "./models.js";

const DEFAULT_DOUBAO_SEED_VIDEO_PROMPT = "Describe the video.";
const DEFAULT_DOUBAO_SEED_IMAGE_PROMPT = "Describe the image.";
const DEFAULT_DOUBAO_SEED_IMAGE_TIMEOUT_MS = 120_000;
const MIN_DOUBAO_SEED_IMAGE_TIMEOUT_MS = 120_000;

function resolveImageTimeoutMs(timeoutMs: number | undefined): number {
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs)) {
    return DEFAULT_DOUBAO_SEED_IMAGE_TIMEOUT_MS;
  }
  return Math.max(Math.round(timeoutMs), MIN_DOUBAO_SEED_IMAGE_TIMEOUT_MS);
}

function normalizeModelId(model: string): string {
  const prefix = `${DOUBAO_SEED_PROVIDER_ID}/`;
  return model.startsWith(prefix) ? model.slice(prefix.length) : model;
}

function extractResponsesText(payload: any): string {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const outputs = Array.isArray(payload?.output) ? payload.output : [];
  const chunks: string[] = [];
  for (const item of outputs) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === "output_text" && typeof part?.text === "string" && part.text.trim()) {
        chunks.push(part.text.trim());
      }
    }
  }
  return chunks.join("\n").trim();
}

async function describeImagesViaResponsesApi(
  params: ImageDescriptionRequest | ImagesDescriptionRequest,
): Promise<{ text: string; model: string }> {
  const prompt = resolveMediaUnderstandingString(params.prompt, DEFAULT_DOUBAO_SEED_IMAGE_PROMPT);
  const model = normalizeModelId(resolveMediaUnderstandingString(params.model, DOUBAO_SEED_DEFAULT_MODEL_ID));
  const images =
    "images" in params
      ? params.images.map((item) => ({
          mime: resolveMediaUnderstandingString(item.mime, "image/jpeg"),
          buffer: item.buffer,
        }))
      : [
          {
            mime: resolveMediaUnderstandingString(params.mime, "image/jpeg"),
            buffer: params.buffer,
          },
        ];
  const cfgApiKey =
    (params.cfg as any)?.models?.providers?.[DOUBAO_SEED_PROVIDER_ID]?.apiKey ??
    (params.cfg as any)?.plugins?.entries?.[DOUBAO_SEED_PROVIDER_ID]?.config?.apiKey;
  const apiKey = typeof cfgApiKey === "string" && cfgApiKey.trim() ? cfgApiKey.trim() : process.env.ARK_API_KEY;
  const requestBody = {
    model,
    input: [
      {
        role: "user",
        content: [
          ...images.map((item) => ({
            type: "input_image",
            image_url: `data:${item.mime};base64,${item.buffer.toString("base64")}`,
          })),
          {
            type: "input_text",
            text: prompt,
          },
        ],
      },
    ],
  };
  const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig({
    cfg: params.cfg,
    provider: DOUBAO_SEED_PROVIDER_ID,
    modelId: model,
    capability: "media-understanding",
    transport: "media-understanding",
    defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    defaultHeaders: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
  });
  const { response: res, release } = await postJsonRequest({
    url: `${baseUrl}/responses`,
    headers,
    body: requestBody,
    timeoutMs: resolveImageTimeoutMs(params.timeoutMs),
    allowPrivateNetwork,
    dispatcherPolicy,
  });
  try {
    await assertOkOrThrowHttpError(res, "Doubao Seed image description failed");
    const payload = await res.json();
    const text = extractResponsesText(payload);
    if (!text) throw new Error("Doubao Seed image description response missing content");
    return { text, model };
  } finally {
    await release();
  }
}

export async function describeDoubaoSeedImage(
  params: ImageDescriptionRequest,
): Promise<ImageDescriptionResult> {
  return describeImagesViaResponsesApi(params);
}

export async function describeDoubaoSeedImages(
  params: ImagesDescriptionRequest,
): Promise<ImagesDescriptionResult> {
  return describeImagesViaResponsesApi(params);
}

export async function describeDoubaoSeedVideo(
  params: VideoDescriptionRequest,
): Promise<VideoDescriptionResult> {
  const fetchFn = params.fetchFn ?? fetch;
  const model = resolveMediaUnderstandingString(params.model, DOUBAO_SEED_DEFAULT_MODEL_ID);
  const mime = resolveMediaUnderstandingString(params.mime, "video/mp4");
  const prompt = resolveMediaUnderstandingString(params.prompt, DEFAULT_DOUBAO_SEED_VIDEO_PROMPT);
  const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } =
    resolveProviderHttpRequestConfig({
      baseUrl: params.baseUrl,
      defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      headers: params.headers,
      request: params.request,
      defaultHeaders: {
        "content-type": "application/json",
        authorization: `Bearer ${params.apiKey}`,
      },
      provider: DOUBAO_SEED_PROVIDER_ID,
      api: "openai-completions",
      capability: "video",
      transport: "media-understanding",
    });
  const { response: res, release } = await postJsonRequest({
    url: `${baseUrl}/chat/completions`,
    headers,
    body: buildOpenAiCompatibleVideoRequestBody({
      model,
      prompt,
      mime,
      buffer: params.buffer,
    }),
    timeoutMs: params.timeoutMs,
    fetchFn,
    allowPrivateNetwork,
    dispatcherPolicy,
  });

  try {
    await assertOkOrThrowHttpError(res, "Doubao Seed video description failed");
    const payload = (await res.json()) as OpenAiCompatibleVideoPayload;
    const text = coerceOpenAiCompatibleVideoText(payload);
    if (!text) {
      throw new Error("Doubao Seed video description response missing content");
    }
    return { text, model };
  } finally {
    await release();
  }
}

export const doubaoSeedMediaUnderstandingProvider: MediaUnderstandingProvider = {
  id: DOUBAO_SEED_PROVIDER_ID,
  capabilities: ["image", "video"],
  defaultModels: {
    image: DOUBAO_SEED_DEFAULT_MODEL_ID,
    video: DOUBAO_SEED_DEFAULT_MODEL_ID,
  },
  autoPriority: { image: 95, video: 95 },
  describeImage: describeDoubaoSeedImage,
  describeImages: describeDoubaoSeedImages,
  describeVideo: describeDoubaoSeedVideo,
};
