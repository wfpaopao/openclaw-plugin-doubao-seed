import type { ModelDefinitionConfig } from "openclaw/plugin-sdk/provider-model-shared";
import { buildVolcModelDefinition } from "openclaw/plugin-sdk/volc-model-catalog-shared";

export const DOUBAO_SEED_PROVIDER_ID = "doubao-seed";
export const DOUBAO_SEED_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
export const DOUBAO_SEED_DEFAULT_MODEL_ID = "doubao-seed-2-0-pro-260215";
export const DOUBAO_SEED_DEFAULT_MODEL_REF = `${DOUBAO_SEED_PROVIDER_ID}/${DOUBAO_SEED_DEFAULT_MODEL_ID}`;
export const DOUBAO_SEEDREAM_DEFAULT_MODEL_ID = "doubao-seedream-5-0-260128";
export const DOUBAO_SEEDANCE_DEFAULT_MODEL_ID = "doubao-seedance-2-0-260128";
export const DOUBAO_SEEDANCE_FAST_MODEL_ID = "doubao-seedance-2-0-fast-260128";

export const DOUBAO_SEED_DEFAULT_COST = {
  input: 0.0001,
  output: 0.0002,
  cacheRead: 0,
  cacheWrite: 0,
};

export const DOUBAO_SEED_MODEL_CATALOG = [
  {
    id: "doubao-seed-2-0-pro-260215",
    name: "Doubao Seed 2.0 Pro",
    reasoning: true,
    input: ["text", "image"] as const,
    contextWindow: 256000,
    maxTokens: 128000,
  },
  {
    id: "doubao-seed-2-0-lite-260215",
    name: "Doubao Seed 2.0 Lite",
    reasoning: false,
    input: ["text", "image"] as const,
    contextWindow: 128000,
    maxTokens: 64000,
  },
  {
    id: "doubao-seed-2-0-mini-260215",
    name: "Doubao Seed 2.0 Mini",
    reasoning: false,
    input: ["text", "image"] as const,
    contextWindow: 128000,
    maxTokens: 32000,
  },
  {
    id: "doubao-seed-2-0-code-preview-260215",
    name: "Doubao Seed 2.0 Code Preview",
    reasoning: false,
    input: ["text"] as const,
    contextWindow: 128000,
    maxTokens: 32000,
  },
] as const;

export type DoubaoSeedCatalogEntry = (typeof DOUBAO_SEED_MODEL_CATALOG)[number];

export function buildDoubaoSeedModelDefinition(entry: DoubaoSeedCatalogEntry): ModelDefinitionConfig {
  return buildVolcModelDefinition(entry, DOUBAO_SEED_DEFAULT_COST);
}
