import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-shared";
import {
  buildDoubaoSeedModelDefinition,
  DOUBAO_SEED_BASE_URL,
  DOUBAO_SEED_MODEL_CATALOG,
} from "./models.js";

export function buildDoubaoSeedProvider(baseUrl?: string): ModelProviderConfig {
  return {
    baseUrl: baseUrl || DOUBAO_SEED_BASE_URL,
    api: "openai-completions",
    models: DOUBAO_SEED_MODEL_CATALOG.map(buildDoubaoSeedModelDefinition),
  };
}
