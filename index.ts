import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth-api-key";
import { ensureModelAllowlistEntry } from "openclaw/plugin-sdk/provider-onboard";
import { buildDoubaoSeedImageGenerationProvider } from "./image-generation-provider.js";
import { doubaoSeedMediaUnderstandingProvider } from "./media-understanding-provider.js";
import {
  DOUBAO_SEED_DEFAULT_MODEL_REF,
  DOUBAO_SEED_MODEL_CATALOG,
  DOUBAO_SEED_PROVIDER_ID,
} from "./models.js";
import { buildDoubaoSeedProvider } from "./provider-catalog.js";
import { buildDoubaoSeedVideoGenerationProvider } from "./video-generation-provider.js";

export default definePluginEntry({
  id: DOUBAO_SEED_PROVIDER_ID,
  name: "Doubao Seed Provider",
  description: "Seed 2.0 + Seedream 5.0 + Seedance 2.0 plugin for OpenClaw",
  register(api) {
    api.registerProvider({
      id: DOUBAO_SEED_PROVIDER_ID,
      label: "Doubao Seed",
      docsPath: "/providers/volcengine",
      envVars: ["ARK_API_KEY", "VOLCANO_ENGINE_API_KEY"],
      auth: [
        createProviderApiKeyAuthMethod({
          providerId: DOUBAO_SEED_PROVIDER_ID,
          methodId: "api-key",
          label: "ARK API key",
          hint: "API key",
          optionKey: "arkApiKey",
          flagName: "--ark-api-key",
          envVar: "ARK_API_KEY",
          promptMessage: "Enter ARK API key",
          defaultModel: DOUBAO_SEED_DEFAULT_MODEL_REF,
          expectedProviders: [DOUBAO_SEED_PROVIDER_ID],
          applyConfig: (cfg) =>
            ensureModelAllowlistEntry({
              cfg,
              modelRef: DOUBAO_SEED_DEFAULT_MODEL_REF,
            }),
          wizard: {
            choiceId: "doubao-seed-api-key",
            choiceLabel: "ARK API key (Seed)",
            groupId: "volcengine",
            groupLabel: "Volcano Engine",
            groupHint: "API key",
          },
        }),
      ],
      catalog: {
        order: "simple",
        run: async (ctx) => {
          const resolved = ctx.resolveProviderApiKey(DOUBAO_SEED_PROVIDER_ID);
          const apiKey = resolved.apiKey || process.env.ARK_API_KEY || process.env.VOLCANO_ENGINE_API_KEY;
          if (!apiKey) return null;
          return {
            providers: {
              [DOUBAO_SEED_PROVIDER_ID]: {
                ...buildDoubaoSeedProvider(),
                apiKey,
              },
            },
          };
        },
      },
      augmentModelCatalog: () =>
        DOUBAO_SEED_MODEL_CATALOG.map((entry) => ({
          provider: DOUBAO_SEED_PROVIDER_ID,
          id: entry.id,
          name: entry.name,
          reasoning: entry.reasoning,
          input: [...entry.input],
          contextWindow: entry.contextWindow,
        })),
    });

    api.registerMediaUnderstandingProvider(doubaoSeedMediaUnderstandingProvider);
    api.registerImageGenerationProvider(buildDoubaoSeedImageGenerationProvider());
    api.registerVideoGenerationProvider(buildDoubaoSeedVideoGenerationProvider());
  },
});
