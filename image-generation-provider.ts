import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
import type { ImageGenerationProvider } from "openclaw/plugin-sdk/image-generation";
import { isProviderApiKeyConfigured } from "openclaw/plugin-sdk/provider-auth";
import { resolveApiKeyForProvider } from "openclaw/plugin-sdk/provider-auth-runtime";
import {
  assertOkOrThrowHttpError,
  postJsonRequest,
  resolveProviderHttpRequestConfig,
} from "openclaw/plugin-sdk/provider-http";
import { normalizeOptionalString } from "openclaw/plugin-sdk/text-runtime";
import {
  DOUBAO_SEED_BASE_URL,
  DOUBAO_SEED_PROVIDER_ID,
  DOUBAO_SEEDREAM_DEFAULT_MODEL_ID,
} from "./models.js";

const DEFAULT_IMAGE_OUTPUT_MIME = "image/png";
const DEFAULT_IMAGE_SIZE = "1024x1024";

type ResponsesImageApiResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

type DoubaoSeedPluginConfig = {
  seedreamModel?: string;
  seedreamSize?: string;
  seedreamResponseFormat?: string;
  seedreamSequentialImageGeneration?: string;
  seedreamStream?: boolean;
  seedreamWatermark?: boolean;
};

function readDoubaoSeedPluginConfig(cfg: OpenClawConfig | undefined): DoubaoSeedPluginConfig {
  const raw = cfg?.plugins?.entries?.[DOUBAO_SEED_PROVIDER_ID]?.config;
  if (!raw || typeof raw !== "object") return {};
  return raw as DoubaoSeedPluginConfig;
}

async function downloadImageFromUrl(
  url: string,
  timeoutMs: number | undefined,
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  const res = await fetch(url, { method: "GET" });
  await assertOkOrThrowHttpError(res, "Doubao Seed image download failed");
  const mimeType = normalizeOptionalString(res.headers.get("content-type")) || DEFAULT_IMAGE_OUTPUT_MIME;
  const arrayBuffer = await res.arrayBuffer();
  const ext = mimeType.includes("jpeg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
  const _ = timeoutMs; // keep signature aligned for future timeout plumbing
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
    fileName: `image-1.${ext}`,
  };
}

function resolveConfiguredDoubaoSeedBaseUrl(cfg: OpenClawConfig | undefined): string {
  const baseUrl = normalizeOptionalString(cfg?.models?.providers?.[DOUBAO_SEED_PROVIDER_ID]?.baseUrl);
  return baseUrl || DOUBAO_SEED_BASE_URL;
}

function isDoubaoSeedImageGenerationConfigured(params: {
  cfg?: OpenClawConfig;
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

export function buildDoubaoSeedImageGenerationProvider(): ImageGenerationProvider {
  return {
    id: DOUBAO_SEED_PROVIDER_ID,
    label: "Doubao Seed",
    defaultModel: DOUBAO_SEEDREAM_DEFAULT_MODEL_ID,
    models: [DOUBAO_SEEDREAM_DEFAULT_MODEL_ID],
    isConfigured: ({ cfg, agentDir }) =>
      isDoubaoSeedImageGenerationConfigured({
        cfg,
        agentDir,
      }),
    capabilities: {
      generate: {
        maxCount: 4,
        supportsSize: true,
        supportsAspectRatio: false,
        supportsResolution: false,
      },
      edit: {
        enabled: false,
        maxCount: 0,
        maxInputImages: 0,
        supportsSize: false,
        supportsAspectRatio: false,
        supportsResolution: false,
      },
    },
    async generateImage(req) {
      const pluginCfg = readDoubaoSeedPluginConfig(req.cfg);
      const auth = await resolveApiKeyForProvider({
        provider: DOUBAO_SEED_PROVIDER_ID,
        cfg: req.cfg,
        agentDir: req.agentDir,
        store: req.authStore,
      });
      if (!auth.apiKey) {
        throw new Error("Doubao Seed API key missing");
      }

      const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig(
        {
          baseUrl: resolveConfiguredDoubaoSeedBaseUrl(req.cfg),
          defaultBaseUrl: DOUBAO_SEED_BASE_URL,
          allowPrivateNetwork: false,
          defaultHeaders: {
            Authorization: `Bearer ${auth.apiKey}`,
          },
          provider: DOUBAO_SEED_PROVIDER_ID,
          capability: "image",
          transport: "http",
        },
      );

      const model =
        normalizeOptionalString(req.model) ||
        normalizeOptionalString(pluginCfg.seedreamModel) ||
        DOUBAO_SEEDREAM_DEFAULT_MODEL_ID;
      const count = req.count ?? 1;
      const size = normalizeOptionalString(req.size) || normalizeOptionalString(pluginCfg.seedreamSize) || DEFAULT_IMAGE_SIZE;
      const responseFormat =
        normalizeOptionalString(req.providerOptions?.response_format as string) ||
        normalizeOptionalString(pluginCfg.seedreamResponseFormat) ||
        "b64_json";
      const sequentialImageGeneration =
        normalizeOptionalString(req.providerOptions?.sequential_image_generation as string) ||
        normalizeOptionalString(pluginCfg.seedreamSequentialImageGeneration) ||
        "disabled";
      const stream = req.providerOptions?.stream === true || (req.providerOptions?.stream == null && pluginCfg.seedreamStream === true);
      const watermark =
        typeof req.watermark === "boolean"
          ? req.watermark
          : typeof pluginCfg.seedreamWatermark === "boolean"
            ? pluginCfg.seedreamWatermark
            : true;
      const jsonHeaders = new Headers(headers);
      jsonHeaders.set("Content-Type", "application/json");

      const { response, release } = await postJsonRequest({
        url: `${baseUrl}/images/generations`,
        headers: jsonHeaders,
        body: {
          model,
          prompt: req.prompt,
          n: count,
          size,
          response_format: responseFormat,
          sequential_image_generation: sequentialImageGeneration,
          stream,
          watermark,
        },
        timeoutMs: req.timeoutMs,
        fetchFn: fetch,
        allowPrivateNetwork,
        dispatcherPolicy,
      });

      try {
        await assertOkOrThrowHttpError(response, "Doubao Seed image generation failed");
        const payload = (await response.json()) as ResponsesImageApiResponse;
        const images = [];
        for (const [index, entry] of (payload.data ?? []).entries()) {
          if (entry.b64_json) {
            images.push({
              buffer: Buffer.from(entry.b64_json, "base64"),
              mimeType: DEFAULT_IMAGE_OUTPUT_MIME,
              fileName: `image-${index + 1}.png`,
            });
            continue;
          }
          if (entry.url) {
            const downloaded = await downloadImageFromUrl(entry.url, req.timeoutMs);
            images.push({
              buffer: downloaded.buffer,
              mimeType: downloaded.mimeType,
              fileName: downloaded.fileName.replace("image-1", `image-${index + 1}`),
            });
          }
        }
        return { images, model };
      } finally {
        await release();
      }
    },
  };
}
