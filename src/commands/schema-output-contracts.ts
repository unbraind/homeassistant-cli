export interface OutputContractSpec {
  media_type: string;
  parseability: "strict" | "best_effort";
  parser_hint: string;
  schema: Record<string, unknown>;
}

interface OutputContractsPayload {
  version: string;
  formats: Record<string, OutputContractSpec>;
  recommendations: {
    default_for_agents: string;
    stable_for_ci: string[];
    human_friendly: string[];
  };
}

const GENERIC_TREE_SCHEMA = {
  type: "object",
  additionalProperties: true,
} as const;

const TABLE_LIKE_SCHEMA = {
  type: "string",
  minLength: 1,
  description: "Human-readable tabular text; use json/yaml/toon for strict parsing.",
} as const;

export function getOutputContractsPayload(): OutputContractsPayload {
  return {
    version: "1.0.0",
    formats: {
      toon: {
        media_type: "text/toon",
        parseability: "best_effort",
        parser_hint: "line-oriented key:value parser with nested blocks",
        schema: GENERIC_TREE_SCHEMA,
      },
      json: {
        media_type: "application/json",
        parseability: "strict",
        parser_hint: "JSON.parse",
        schema: GENERIC_TREE_SCHEMA,
      },
      "json-compact": {
        media_type: "application/json",
        parseability: "strict",
        parser_hint: "JSON.parse",
        schema: GENERIC_TREE_SCHEMA,
      },
      yaml: {
        media_type: "application/yaml",
        parseability: "strict",
        parser_hint: "YAML.parse",
        schema: GENERIC_TREE_SCHEMA,
      },
      table: {
        media_type: "text/plain",
        parseability: "best_effort",
        parser_hint: "table parser or fallback line parser",
        schema: TABLE_LIKE_SCHEMA,
      },
      markdown: {
        media_type: "text/markdown",
        parseability: "best_effort",
        parser_hint: "markdown table parser",
        schema: TABLE_LIKE_SCHEMA,
      },
    },
    recommendations: {
      default_for_agents: "toon",
      stable_for_ci: ["json", "json-compact", "yaml"],
      human_friendly: ["table", "markdown"],
    },
  };
}
