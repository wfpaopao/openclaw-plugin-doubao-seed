import { isProviderApiKeyConfigured } from "openclaw/plugin-sdk/provider-auth";
import { resolveApiKeyForProvider } from "openclaw/plugin-sdk/provider-auth-runtime";
import {
  assertOkOrThrowHttpError,
  createProviderOperationDeadline,
  fetchWithTimeout,
  postJsonRequest,
  resolveProviderOperationTimeoutMs,
  resolveProviderHttpRequestConfig,
  waitProviderOperationPollInterval,
} from "openclaw/plugin-sdk/provider-http";
import { normalizeOptionalString } from "openclaw/plugin-sdk/text-runtime";
import type { GeneratedVideoAsset, VideoGenerationProvider } from "openclaw/plugin-sdk/video-generation";
import {
  DOUBAO_SEED_BASE_URL,
  DOUBAO_SEED_PROVIDER_ID,
  DOUBAO_SEEDANCE_FAST_MODEL_ID,
  DOUBAO_SEEDANCE_DEFAULT_MODEL_ID,
} from "./models.js";

const DEFAULT_TIMEOUT_MS = 300_000;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 120;

type SeedTaskCreateResponse = {
  id?: string;
};

type SeedTaskResponse = {
  id?: string;
  model?: string;
  status?: "running" | "failed" | "queued" | "succeeded" | "cancelled";
  error?: { message?: string };
  content?: { video_url?: string };
};

type DoubaoSeedPluginConfig = {
  seedanceModel?: string;
  seedanceAspectRatio?: string;
  seedanceResolution?: string;
  seedanceDurationSeconds?: number;
  seedanceAudio?: boolean;
  seedanceWatermark?: boolean;
  seedanceTimeoutMs?: number;
};

function readDoubaoSeedPluginConfig(
  req: Parameters<VideoGenerationProvider["generateVideo"]>[0],
): DoubaoSeedPluginConfig {
  const raw = req.cfg?.plugins?.entries?.[DOUBAO_SEED_PROVIDER_ID]?.config;
  if (!raw || typeof raw !== "object") return {};
  return raw as DoubaoSeedPluginConfig;
}

function resolveDoubaoSeedVideoBaseUrl(req: Parameters<VideoGenerationProvider["generateVideo"]>[0]): string {
  const cfgBaseUrl = normalizeOptionalString(req.cfg?.models?.providers?.[DOUBAO_SEED_PROVIDER_ID]?.baseUrl);
  return cfgBaseUrl || DOUBAO_SEED_BASE_URL;
}

function isDoubaoSeedVideoGenerationConfigured(params: {
  cfg?: Parameters<VideoGenerationProvider["isConfigured"]>[0]["cfg"];
  agentDir?: string;
}): boolean {
  const cfgApiKey = normalizeOptionalString(
    params.cfg?.models?.providers?.[DOUBAO_SEED_PROVIDER_ID]?.apiKey as string | undefined,
  );
  if (cfgApiKey) {
    return true;
  }
  const pluginApiKey = normalizeOptionalString(
    params.cfg?.plugins?.entries?.[DOUBAO_SEED_PROVIDER_ID]?.config?.apiKey as string | undefined,
  );
  if (pluginApiKey) {
    return true;
  }
  return isProviderApiKeyConfigured({
    provider: DOUBAO_SEED_PROVIDER_ID,
    agentDir: params.agentDir,
  });
}

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function resolveAssetUrl(
  asset: { url?: string; buffer?: Buffer; mimeType?: string } | undefined,
  fallbackMime: string,
  missingMsg: string,
): string {
  if (!asset) throw new Error(missingMsg);
  const inputUrl = normalizeOptionalString(asset.url);
  if (inputUrl) return inputUrl;
  if (!asset.buffer) throw new Error(missingMsg);
  return toDataUrl(asset.buffer, normalizeOptionalString(asset.mimeType) || fallbackMime);
}

function buildSeedanceContent(req: Parameters<VideoGenerationProvider["generateVideo"]>[0]): Array<Record<string, unknown>> {
  const content: Array<Record<string, unknown>> = [{ type: "text", text: req.prompt }];
  for (const image of req.inputImages ?? []) {
    content.push({
      type: "image_url",
      image_url: { url: resolveAssetUrl(image, "image/png", "Seedance reference image is missing image data.") },
      role: normalizeOptionalString(image.role) || "reference_image",
    });
  }
  for (const video of req.inputVideos ?? []) {
    content.push({
      type: "video_url",
      video_url: { url: resolveAssetUrl(video, "video/mp4", "Seedance reference video is missing data.") },
      role: normalizeOptionalString(video.role) || "reference_video",
    });
  }
  for (const audio of req.inputAudios ?? []) {
    content.push({
      type: "audio_url",
      audio_url: { url: resolveAssetUrl(audio, "audio/mpeg", "Seedance reference audio is missing data.") },
      role: normalizeOptionalString(audio.role) || "reference_audio",
    });
  }
  return content;
}

async function pollTask(params: {
  taskId: string;
  headers: Headers;
  timeoutMs?: number;
  baseUrl: string;
  fetchFn: typeof fetch;
}): Promise<SeedTaskResponse> {
  const deadline = createProviderOperationDeadline({
    timeoutMs: params.timeoutMs,
    label: `Seedance video generation task ${params.taskId}`,
  });
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const response = await fetchWithTimeout(
      `${params.baseUrl}/contents/generations/tasks/${params.taskId}`,
      { method: "GET", headers: params.headers },
      resolveProviderOperationTimeoutMs({ deadline, defaultTimeoutMs: DEFAULT_TIMEOUT_MS }),
      params.fetchFn,
    );
    await assertOkOrThrowHttpError(response, "Seedance video status request failed");
    const payload = (await response.json()) as SeedTaskResponse;
    const status = normalizeOptionalString(payload.status);
    if (status === "succeeded") return payload;
    if (status === "failed" || status === "cancelled") {
      throw new Error(normalizeOptionalString(payload.error?.message) || "Seedance video generation failed");
    }
    await waitProviderOperationPollInterval({ deadline, pollIntervalMs: POLL_INTERVAL_MS });
  }
  throw new Error(`Seedance video generation task ${params.taskId} did not finish in time`);
}

async function downloadVideo(params: {
  url: string;
  timeoutMs?: number;
  fetchFn: typeof fetch;
}): Promise<GeneratedVideoAsset> {
  const response = await fetchWithTimeout(
    params.url,
    { method: "GET" },
    params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    params.fetchFn,
  );
  await assertOkOrThrowHttpError(response, "Seedance generated video download failed");
  const mimeType = normalizeOptionalString(response.headers.get("content-type")) || "video/mp4";
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
    fileName: `video-1.${mimeType.includes("webm") ? "webm" : "mp4"}`,
  };
}

export function buildDoubaoSeedVideoGenerationProvider(): VideoGenerationProvider {
  return {
    id: DOUBAO_SEED_PROVIDER_ID,
    label: "Doubao Seed",
    defaultModel: DOUBAO_SEEDANCE_DEFAULT_MODEL_ID,
    models: [DOUBAO_SEEDANCE_DEFAULT_MODEL_ID, DOUBAO_SEEDANCE_FAST_MODEL_ID],
    isConfigured: ({ cfg, agentDir }) =>
      isDoubaoSeedVideoGenerationConfigured({
        cfg,
        agentDir,
      }),
    capabilities: {
      generate: {
        maxVideos: 1,
        maxDurationSeconds: 15,
        supportsAspectRatio: true,
        supportsResolution: true,
        supportsAudio: true,
        supportsWatermark: true,
      },
      imageToVideo: {
        enabled: true,
        maxVideos: 1,
        maxInputImages: 1,
        maxDurationSeconds: 15,
        supportsAspectRatio: true,
        supportsResolution: true,
        supportsAudio: true,
        supportsWatermark: true,
      },
      videoToVideo: {
        enabled: false,
      },
    },
    async generateVideo(req) {
      const pluginCfg = readDoubaoSeedPluginConfig(req);
      const configuredTimeoutMs =
        typeof pluginCfg.seedanceTimeoutMs === "number" && Number.isFinite(pluginCfg.seedanceTimeoutMs)
          ? Math.max(30_000, Math.round(pluginCfg.seedanceTimeoutMs))
          : undefined;
      const operationTimeoutMs = req.timeoutMs ?? configuredTimeoutMs ?? DEFAULT_TIMEOUT_MS;
      const auth = await resolveApiKeyForProvider({
        provider: DOUBAO_SEED_PROVIDER_ID,
        cfg: req.cfg,
        agentDir: req.agentDir,
        store: req.authStore,
      });
      if (!auth.apiKey) throw new Error("Doubao Seed API key missing");

      const fetchFn = fetch;
      const deadline = createProviderOperationDeadline({
        timeoutMs: operationTimeoutMs,
        label: "Seedance video generation",
      });
      const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig({
        baseUrl: resolveDoubaoSeedVideoBaseUrl(req),
        defaultBaseUrl: DOUBAO_SEED_BASE_URL,
        allowPrivateNetwork: false,
        defaultHeaders: {
          Authorization: `Bearer ${auth.apiKey}`,
          "Content-Type": "application/json",
        },
        provider: DOUBAO_SEED_PROVIDER_ID,
        capability: "video",
        transport: "http",
      });

      const body: Record<string, unknown> = {
        model:
          normalizeOptionalString(req.model) ||
          normalizeOptionalString(pluginCfg.seedanceModel) ||
          DOUBAO_SEEDANCE_DEFAULT_MODEL_ID,
        content: buildSeedanceContent(req),
      };
      const aspectRatio =
        normalizeOptionalString(req.aspectRatio) || normalizeOptionalString(pluginCfg.seedanceAspectRatio);
      if (aspectRatio) body.ratio = aspectRatio;
      const resolution = (
        normalizeOptionalString(req.resolution) || normalizeOptionalString(pluginCfg.seedanceResolution)
      )?.toLowerCase();
      if (resolution) body.resolution = resolution;
      const durationSeconds =
        typeof req.durationSeconds === "number" && Number.isFinite(req.durationSeconds)
          ? req.durationSeconds
          : typeof pluginCfg.seedanceDurationSeconds === "number" &&
              Number.isFinite(pluginCfg.seedanceDurationSeconds)
            ? pluginCfg.seedanceDurationSeconds
            : undefined;
      if (typeof durationSeconds === "number") {
        body.duration = Math.max(1, Math.round(durationSeconds));
      }
      const generateAudio = typeof req.audio === "boolean" ? req.audio : pluginCfg.seedanceAudio;
      if (typeof generateAudio === "boolean") body.generate_audio = generateAudio;
      const watermark = typeof req.watermark === "boolean" ? req.watermark : pluginCfg.seedanceWatermark;
      if (typeof watermark === "boolean") body.watermark = watermark;

      const { response, release } = await postJsonRequest({
        url: `${baseUrl}/contents/generations/tasks`,
        headers,
        body,
        timeoutMs: resolveProviderOperationTimeoutMs({ deadline, defaultTimeoutMs: DEFAULT_TIMEOUT_MS }),
        fetchFn,
        allowPrivateNetwork,
        dispatcherPolicy,
      });

      try {
        await assertOkOrThrowHttpError(response, "Seedance video generation failed");
        const submitted = (await response.json()) as SeedTaskCreateResponse;
        const taskId = normalizeOptionalString(submitted.id);
        if (!taskId) throw new Error("Seedance response missing task id");
        const completed = await pollTask({
          taskId,
          headers,
          timeoutMs: resolveProviderOperationTimeoutMs({ deadline, defaultTimeoutMs: DEFAULT_TIMEOUT_MS }),
          baseUrl,
          fetchFn,
        });
        const videoUrl = normalizeOptionalString(completed.content?.video_url);
        if (!videoUrl) throw new Error("Seedance task completed without video URL");
        const video = await downloadVideo({
          url: videoUrl,
          timeoutMs: resolveProviderOperationTimeoutMs({ deadline, defaultTimeoutMs: DEFAULT_TIMEOUT_MS }),
          fetchFn,
        });
        return {
          videos: [video],
          model:
            completed.model ||
            normalizeOptionalString(req.model) ||
            normalizeOptionalString(pluginCfg.seedanceModel) ||
            DOUBAO_SEEDANCE_DEFAULT_MODEL_ID,
          metadata: { taskId, status: completed.status, videoUrl },
        };
      } finally {
        await release();
      }
    },
  };
}
