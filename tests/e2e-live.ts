import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";

const required = ["HASSIO_URL", "HASSIO_TOKEN"] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const repoRoot = process.cwd();
const cliPath = join(repoRoot, "dist", "cli.js");
const configDir = mkdtempSync(join(tmpdir(), "hassio-cli-e2e-"));
const configPath = join(configDir, "settings.json");
process.once("exit", () => rmSync(configDir, { recursive: true, force: true }));

function run(args: string[], env?: NodeJS.ProcessEnv, safeLabel?: string): string {
  try {
    return execFileSync("node", [cliPath, "--config", configPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    }).trim();
  } catch (error) {
    const typed = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    console.error(`Command failed: hassio ${safeLabel ?? args.join(" ")}`);
    if (typed.stdout) console.error(typed.stdout);
    if (typed.stderr) console.error(typed.stderr);
    process.exit(typed.status ?? 1);
  }
}

function runOutcome(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync("node", [cliPath, "--config", configPath, ...args], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function parseJson(out: string): unknown {
  return JSON.parse(out);
}

function parseToon(out: string): Record<string, string> {
  const lines = out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const pairs = lines
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx < 0) {
        return undefined;
      }
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()] as const;
    })
    .filter((value): value is readonly [string, string] => value !== undefined);
  return Object.fromEntries(pairs);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

const setupReceipt = parseJson(run([
  "settings",
  "wizard",
  "--non-interactive",
  "--default-format",
  "toon",
  "--default-timeout",
  "30000",
  "--skip-test",
  "--format",
  "json-compact",
], {
  HASSIO_URL: process.env.HASSIO_URL,
  HASSIO_TOKEN: process.env.HASSIO_TOKEN,
  HASSIO_READONLY: "true",
})) as Record<string, unknown>;
const setupDefaults = setupReceipt["defaults"] as Record<string, unknown> | undefined;
assert(setupReceipt["setup"] === "complete", "non-interactive setup receipt is not valid JSON");
assert(setupDefaults?.["format"] === "toon", "setup receipt omitted saved default format");
assert(setupDefaults?.["read_only"] === true, "setup receipt omitted read-only safety mode");

const paths = parseJson(run(["settings", "path"])) as Record<string, string>;
assert(Boolean(paths["settings"] && paths["auth"] && paths["data"]), "settings path output is incomplete");

const settingsFile = parseJson(readFileSync(configPath, "utf8") || "{}") as Record<string, unknown>;
assert(!("token" in settingsFile), "token must not be stored in settings.json");

run(["settings", "validate"], {
  HASSIO_URL: process.env.HASSIO_URL,
  HASSIO_TOKEN: process.env.HASSIO_TOKEN,
});

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const statusOut = run(["status", "--format", format]);
  if (format === "toon") {
    const parsed = parseToon(statusOut);
    assert(parsed["message"] === "API running.", "invalid status TOON shape");
  }
  if (format === "json" || format === "json-compact") {
    parseJson(statusOut);
  }
  if (format === "yaml") {
    parseYaml(statusOut);
  }
  assert(statusOut.length > 0, `empty output for format ${format}`);
}

const services = parseJson(run(["services", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof services["total_services"] === "number", "invalid services --count JSON shape");

const entities = parseJson(run(["entities", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof entities["count"] === "number", "invalid entities --count JSON shape");

const displayCount = parseJson(
  run(["registries", "--display", "--count", "--format", "json"])
) as Record<string, unknown>;
assert(
  typeof displayCount["entity_registry_display_count"] === "number",
  "invalid compact registry count shape",
);

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const compactOut = run(["registries", "--display", "--limit", "1", "--format", format]);
  if (format === "json" || format === "json-compact") {
    const compactDisplay = parseJson(compactOut) as Record<string, unknown>;
    assert(Array.isArray(compactDisplay["entity_registry_display"]), "invalid compact registry rows");
    assert(typeof compactDisplay["entity_categories"] === "object", "invalid compact registry categories");
  }
  if (format === "yaml") {
    assert(typeof parseYaml(compactOut) === "object", "invalid compact registry YAML");
  }
  assert(compactOut.length > 0, `empty compact registry output for format ${format}`);
}

const decodedDisplay = parseJson(
  run(["registries", "--decode-display", "--limit", "1", "--format", "json"])
) as Record<string, unknown>;
const decodedRows = decodedDisplay["entity_registry_display"] as Array<Record<string, unknown>> | undefined;
assert(Array.isArray(decodedRows), "invalid decoded compact registry rows");
assert(typeof decodedRows[0]?.["entity_id"] === "string", "invalid decoded compact registry entity ID");
assert(typeof decodedRows[0]?.["platform"] === "string", "invalid decoded compact registry platform");

const proposedEntityId = "sensor.hassio_cli_contract_probe";
for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const automaticIds = run([
    "registries", "automatic-entity-ids", proposedEntityId, "--format", format,
  ]);
  if (format === "json" || format === "json-compact") {
    const parsed = parseJson(automaticIds) as Record<string, unknown>;
    const rows = parsed["entity_ids"] as Array<Record<string, unknown>> | undefined;
    assert(parsed["count"] === 1, "invalid automatic entity-ID count");
    assert(rows?.[0]?.["entity_id"] === proposedEntityId, "invalid automatic entity-ID row");
  }
  if (format === "yaml") {
    assert(typeof parseYaml(automaticIds) === "object", "invalid automatic entity-ID YAML");
  }
  assert(automaticIds.length > 0, `empty automatic entity-ID output for format ${format}`);
}

const compositeSplits = runOutcome([
  "registries", "composite-splits", "--count", "--format", "json",
]);
if (compositeSplits.status === 0) {
  const parsed = parseJson(compositeSplits.stdout) as Record<string, unknown>;
  assert(typeof parsed["count"] === "number", "invalid composite split count");
} else {
  assert(
    compositeSplits.stderr.includes("unknown_command"),
    "composite split discovery failed without compatibility classification",
  );
}

const entityIdSettings = runOutcome([
  "registries", "entity-id-settings", "get", "--format", "json",
]);
if (entityIdSettings.status === 0) {
  const parsed = parseJson(entityIdSettings.stdout) as Record<string, unknown>;
  assert(typeof parsed["uses_default"] === "boolean", "invalid entity-ID settings shape");
  assert(
    parsed["entity_id_parts"] === null || Array.isArray(parsed["entity_id_parts"]),
    "invalid entity-ID naming parts",
  );
} else {
  assert(
    entityIdSettings.stderr.includes("unknown_command"),
    "entity-ID settings failed without compatibility classification",
  );
}

const configEntries = parseJson(run(["config-entries", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof configEntries["count"] === "number", "invalid config-entries --count JSON shape");

const config = parseJson(run(["config", "--format", "json"])) as Record<string, unknown>;
assert(typeof config["version"] === "string", "invalid config JSON shape");

const events = parseJson(run(["events", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof events["events_count"] === "number", "invalid events --count JSON shape");

const components = parseJson(run(["components", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof components["components_count"] === "number", "invalid components --count JSON shape");

const states = parseJson(run(["states", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof states["states_count"] === "number", "invalid states --count JSON shape");
const sampleEntityId = "sensor.does_not_exist";

const flatServices = parseJson(run(["services", "--flat", "--format", "json"])) as Record<string, unknown>[];
assert(Array.isArray(flatServices), "invalid services --flat JSON shape");
assert(flatServices.length > 0, "services --flat returned no rows");
assert(typeof flatServices[0]?.["domain"] === "string", "invalid services --flat domain field");
assert(typeof flatServices[0]?.["service"] === "string", "invalid services --flat service field");

const serviceSchema = parseJson(run(["services", "--schema", "--format", "json"])) as Record<string, unknown>[];
assert(Array.isArray(serviceSchema), "invalid services --schema JSON shape");
assert(serviceSchema.length > 0, "services --schema returned no rows");
assert(Array.isArray(serviceSchema[0]?.["required_fields"]), "invalid services --schema required_fields");
assert(Array.isArray(serviceSchema[0]?.["optional_fields"]), "invalid services --schema optional_fields");

const actionPlan = parseJson(run([
  "call-service", "light", "turn_on",
  "--entity-id", sampleEntityId,
  "--response", "never",
  "--dry-run",
  "--format", "json",
])) as Record<string, unknown>;
assert(actionPlan["operation"] === "service_action_plan", "invalid service action plan operation");
assert(actionPlan["read_only"] === true, "service action plan did not preserve read-only mode");
assert(actionPlan["executable"] === false, "read-only service action plan was marked executable");
assert(typeof actionPlan["validation"] === "object", "service action plan omitted validation evidence");

const weatherEntities = parseJson(
  run(["entities", "--domain", "weather", "--limit", "1", "--format", "json"])
) as Record<string, unknown>[];
const weatherEntityId = weatherEntities[0]?.["entity_id"];
const supportsForecastResponse = flatServices.some(
  (row) => row["domain"] === "weather" && row["service"] === "get_forecasts",
);
if (supportsForecastResponse && typeof weatherEntityId === "string") {
  const action = parseJson(run([
    "call-service", "weather", "get_forecasts",
    "--entity-id", weatherEntityId,
    "--data", '{"type":"daily"}',
    "--format", "json",
  ], {
    HASSIO_READONLY: "false",
  }, "call-service weather get_forecasts --entity-id <redacted> --data <redacted> --format json")) as Record<string, unknown>;
  assert(action["operation"] === "service_action", "invalid executed service action operation");
  assert(action["transport"] === "rest", "invalid executed service action transport");
  assert(action["response_capability"] === "required", "response capability was not detected");
  assert(action["response_requested"] === true, "required service response was not requested");
  assert(Array.isArray(action["changed_states"]), "service action omitted changed states");
  assert("service_response" in action, "service action omitted response data");
}

const wsConnect = parseJson(run(["websocket", "--connect-test", "--format", "json"])) as Record<string, unknown>;
assert(wsConnect["connected"] === true, "invalid websocket --connect-test connected field");
assert(wsConnect["auth"] === "ok", "invalid websocket --connect-test auth field");

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const mediaBrowse = run(["media", "browse", "--count", "--format", format]);
  if (format === "json" || format === "json-compact") {
    const parsed = parseJson(mediaBrowse) as Record<string, unknown>;
    assert(parsed["scope"] === "media_source", "invalid media browse scope");
    assert(typeof parsed["count"] === "number", "invalid media browse count");
  }
  if (format === "yaml") {
    assert(typeof parseYaml(mediaBrowse) === "object", "invalid media browse YAML");
  }
  assert(mediaBrowse.length > 0, `empty media browse output for format ${format}`);
}

const mediaSearch = runOutcome([
  "media", "search", "__hassio_cli_contract_probe__", "--count", "--format", "json",
]);
if (mediaSearch.status === 0) {
  const parsed = parseJson(mediaSearch.stdout) as Record<string, unknown>;
  assert(parsed["scope"] === "media_source", "invalid media search scope");
  assert(typeof parsed["count"] === "number", "invalid media search count");
} else {
  assert(
    mediaSearch.stderr.includes("unknown_command"),
    "media-source search failed with an unexpected compatibility classification",
  );
}

const wsValidation = parseJson(
  run(["ws", "validate-config", "--action", "[]", "--format", "json"])
) as Record<string, unknown>;
const validatedActions = wsValidation["actions"] as Record<string, unknown> | undefined;
assert(validatedActions?.["valid"] === true, "invalid ws validate-config actions result");

const wsTriggerSubscription = parseJson(
  run([
    "ws", "subscribe-trigger",
    "--trigger", '{"trigger":"event","event_type":"hassio_cli_contract_probe"}',
    "--wait-ms", "1",
    "--max-events", "1",
    "--format", "json",
  ])
) as Record<string, unknown>;
assert(wsTriggerSubscription["subscription"] === "trigger", "invalid ws trigger subscription type");
assert(wsTriggerSubscription["event_count"] === 0, "unexpected ws trigger subscription event");
assert(Array.isArray(wsTriggerSubscription["events"]), "invalid ws trigger subscription events shape");

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const conditionOutput = run([
    "ws", "automation-runtime", "test-condition",
    "--condition", '{"condition":"template","value_template":"{{ true }}"}',
    "--format", format,
  ]);
  if (format === "json" || format === "json-compact") {
    const evaluation = parseJson(conditionOutput) as Record<string, unknown>;
    assert(evaluation["evaluation"] === "condition", "invalid condition evaluation envelope");
    const result = evaluation["result"] as Record<string, unknown> | undefined;
    assert(result?.["result"] === true, "condition evaluation did not return true");
  }
  if (format === "yaml") {
    assert(typeof parseYaml(conditionOutput) === "object", "invalid condition evaluation YAML");
  }
  assert(conditionOutput.length > 0, `empty condition evaluation output for format ${format}`);
}

const wsConditionObservation = parseJson(run([
  "ws", "automation-runtime", "observe-condition",
  "--condition", '{"condition":"template","value_template":"{{ true }}"}',
  "--wait-ms", "1", "--max-events", "1", "--format", "json",
])) as Record<string, unknown>;
assert(wsConditionObservation["subscription"] === "condition", "invalid condition subscription type");
assert(wsConditionObservation["event_count"] === 1, "condition subscription missed initial result");
assert(Array.isArray(wsConditionObservation["events"]), "invalid condition subscription events shape");

const wsSequenceWrite = runOutcome([
  "ws", "automation-runtime", "execute-sequence", "--sequence", '{"delay":0}',
]);
assert(wsSequenceWrite.status !== 0, "read-only sequence execution unexpectedly succeeded");
assert(wsSequenceWrite.stderr.includes("Read-only mode blocked"), "sequence execution lacked read-only classification");

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const traceOutput = run(["ws", "traces", "list", "--domain", "automation", "--limit", "1", "--format", format]);
  const contextOutput = run(["ws", "traces", "contexts", "--count", "--format", format]);
  if (format === "json" || format === "json-compact") {
    const traces = parseJson(traceOutput) as Record<string, unknown>;
    const contexts = parseJson(contextOutput) as Record<string, unknown>;
    assert(traces["domain"] === "automation", "invalid automation trace domain");
    assert(typeof traces["count"] === "number", "invalid automation trace count");
    assert(Array.isArray(traces["traces"]), "invalid automation trace rows");
    assert(typeof contexts["count"] === "number", "invalid trace context count");
    assert(!("contexts" in contexts), "trace context count exposed private identifiers");
  }
  if (format === "yaml") {
    assert(typeof parseYaml(traceOutput) === "object", "invalid automation trace YAML");
    assert(typeof parseYaml(contextOutput) === "object", "invalid trace context YAML");
  }
  assert(traceOutput.length > 0, `empty automation trace output for format ${format}`);
  assert(contextOutput.length > 0, `empty trace context output for format ${format}`);
}

const traceList = parseJson(
  run(["ws", "traces", "list", "--domain", "automation", "--limit", "1", "--format", "json"])
) as Record<string, unknown>;
const traceRows = traceList["traces"] as Array<Record<string, unknown>> | undefined;
const traceItemId = traceRows?.[0]?.["item_id"];
const traceRunId = traceRows?.[0]?.["run_id"];
if (typeof traceItemId === "string" && typeof traceRunId === "string") {
  const traceDetail = parseJson(run([
    "ws", "traces", "get", "--domain", "automation",
    "--item-id", traceItemId, "--run-id", traceRunId, "--format", "json",
  ], undefined, "ws traces get --domain automation --item-id <redacted> --run-id <redacted> --format json")) as Record<string, unknown>;
  assert(traceDetail["domain"] === "automation", "invalid exact trace domain");
  assert(typeof traceDetail["trace"] === "object", "exact trace omitted step details");
}

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const observationOutput = run([
    "ws", "observe-entities", "--domain", "sun", "--wait-ms", "1", "--max-events", "1", "--format", format,
  ]);
  if (format === "json" || format === "json-compact") {
    const observation = parseJson(observationOutput) as Record<string, unknown>;
    assert(observation["subscription"] === "entities", "invalid ws entity subscription type");
    assert(typeof observation["initial_count"] === "number", "invalid ws entity initial count");
    assert(Array.isArray(observation["initial"]), "invalid ws entity initial rows");
    assert(Array.isArray(observation["changes"]), "invalid ws entity change rows");
  }
  if (format === "yaml") {
    assert(typeof parseYaml(observationOutput) === "object", "invalid ws entity observation YAML");
  }
  assert(observationOutput.length > 0, `empty ws entity observation output for format ${format}`);
}

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const bootstrapOutput = run([
    "ws", "bootstrap-integrations", "--wait-ms", "1", "--max-events", "1", "--count", "--format", format,
  ]);
  if (format === "json" || format === "json-compact") {
    const bootstrap = parseJson(bootstrapOutput) as Record<string, unknown>;
    assert(bootstrap["subscription"] === "bootstrap_integrations", "invalid bootstrap subscription type");
    assert(typeof bootstrap["event_count"] === "number", "invalid bootstrap event count");
    assert(typeof bootstrap["count"] === "number", "invalid bootstrap integration count");
  }
  if (format === "yaml") {
    assert(typeof parseYaml(bootstrapOutput) === "object", "invalid bootstrap integration YAML");
  }
  assert(bootstrapOutput.length > 0, `empty bootstrap integration output for format ${format}`);
}

const wsAutomationPlatforms = parseJson(
  run(["ws", "automation-platforms", "--kind", "all", "--format", "json"])
) as Record<string, unknown>;
assert(wsAutomationPlatforms["subscription"] === "automation_platforms", "invalid automation platform subscription type");
assert(typeof wsAutomationPlatforms["triggers"] === "object", "invalid trigger platform catalog");
assert(typeof wsAutomationPlatforms["conditions"] === "object", "invalid condition platform catalog");

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const integrationsOutput = run(["ws", "integrations", "list", "--limit", "1", "--format", format]);
  const sourcesOutput = run(["ws", "entity-sources", "--count", "--format", format]);
  if (format === "json" || format === "json-compact") {
    const integrations = parseJson(integrationsOutput) as Record<string, unknown>;
    const sources = parseJson(sourcesOutput) as Record<string, unknown>;
    assert(typeof integrations["count"] === "number", "invalid integration manifest count");
    assert(typeof integrations["returned_count"] === "number", "invalid returned integration count");
    assert(typeof integrations["truncated"] === "boolean", "invalid integration truncation flag");
    assert(Array.isArray(integrations["integrations"]), "invalid integration manifest rows");
    assert(typeof sources["count"] === "number", "invalid entity source count");
  }
  if (format === "yaml") {
    assert(typeof parseYaml(integrationsOutput) === "object", "invalid integrations YAML");
    assert(typeof parseYaml(sourcesOutput) === "object", "invalid entity sources YAML");
  }
  assert(integrationsOutput.length > 0, `empty integrations output for format ${format}`);
  assert(sourcesOutput.length > 0, `empty entity sources output for format ${format}`);
}

const integrationManifest = parseJson(
  run(["ws", "integrations", "get", "homeassistant", "--format", "json"])
) as Record<string, unknown>;
assert(typeof integrationManifest["integration"] === "object", "invalid integration manifest shape");

const integrationSetup = parseJson(
  run(["ws", "integrations", "setup", "--count", "--format", "json"])
) as Record<string, unknown>;
assert(typeof integrationSetup["count"] === "number", "invalid integration setup count");

const integrationDescriptions = parseJson(
  run(["ws", "integrations", "descriptions", "--count", "--format", "json"])
) as Record<string, unknown>;
assert(typeof integrationDescriptions["count"] === "number", "invalid integration description count");

const integrationReady = parseJson(
  run(["ws", "integrations", "wait", "homeassistant", "--format", "json"])
) as Record<string, unknown>;
assert(integrationReady["integration_loaded"] === true, "homeassistant integration did not report ready");

const frontendVersion = parseJson(
  run(["ws", "frontend", "version", "--format", "json"])
) as Record<string, unknown>;
assert(typeof frontendVersion["version"] === "string", "invalid frontend version shape");

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const themesOutput = run(["ws", "frontend", "themes", "--count", "--format", format]);
  const iconsOutput = run([
    "ws", "frontend", "icons", "--category", "services", "--integration", "light",
    "--limit", "1", "--format", format,
  ]);
  const translationsOutput = run([
    "ws", "frontend", "translations", "--language", "en", "--category", "services",
    "--integration", "light", "--count", "--format", format,
  ]);
  if (format === "json" || format === "json-compact") {
    const themes = parseJson(themesOutput) as Record<string, unknown>;
    const icons = parseJson(iconsOutput) as Record<string, unknown>;
    const translations = parseJson(translationsOutput) as Record<string, unknown>;
    assert(typeof themes["count"] === "number", "invalid frontend theme count");
    assert(typeof icons["count"] === "number", "invalid frontend icon count");
    assert(Array.isArray(icons["icons"]), "invalid frontend icon rows");
    assert(typeof translations["count"] === "number", "invalid frontend translation count");
  }
  if (format === "yaml") {
    assert(typeof parseYaml(themesOutput) === "object", "invalid frontend themes YAML");
    assert(typeof parseYaml(iconsOutput) === "object", "invalid frontend icons YAML");
    assert(typeof parseYaml(translationsOutput) === "object", "invalid frontend translations YAML");
  }
  assert(themesOutput.length > 0, `empty frontend themes output for format ${format}`);
  assert(iconsOutput.length > 0, `empty frontend icons output for format ${format}`);
  assert(translationsOutput.length > 0, `empty frontend translations output for format ${format}`);
}

const slugOutcome = runOutcome(["ws", "slugify", "Kitchen Ceiling Light", "--format", "json"]);
if (slugOutcome.status === 0) {
  const slug = parseJson(slugOutcome.stdout) as Record<string, unknown>;
  const slugResult = slug["result"] as Record<string, unknown> | undefined;
  assert(slugResult?.["slug"] === "kitchen_ceiling_light", "invalid canonical slug result");
} else {
  assert(slugOutcome.stderr.includes("unknown_command"), "slugify failed without compatibility classification");
}

const wsTargetExtract = parseJson(
  run(["ws", "target", "extract", "--entity-id", sampleEntityId, "--format", "json"])
) as Record<string, unknown>;
assert(typeof wsTargetExtract["target"] === "object", "invalid ws target extract target shape");
assert(typeof wsTargetExtract["result"] === "object", "invalid ws target extract result shape");

const wsTargetServices = parseJson(
  run(["ws", "target", "services", "--entity-id", sampleEntityId, "--format", "json"])
) as Record<string, unknown>;
assert(typeof wsTargetServices["target"] === "object", "invalid ws target services target shape");
assert(typeof wsTargetServices["result"] === "object", "invalid ws target services result shape");

for (const discovery of ["triggers", "conditions"] as const) {
  const response = parseJson(
    run(["ws", "target", discovery, "--entity-id", sampleEntityId, "--format", "json"])
  ) as Record<string, unknown>;
  assert(Array.isArray(response["result"]), `invalid ws target ${discovery} result shape`);
}

const wsTargetRelated = parseJson(
  run(["ws", "target", "related", "--entity-id", sampleEntityId, "--format", "json"])
) as Record<string, unknown>;
const related = wsTargetRelated["related"] as Record<string, unknown> | undefined;
assert(Array.isArray(related?.["entities"]), "invalid ws target related entity shape");
assert(Array.isArray(related?.["devices"]), "invalid ws target related device shape");

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const repairsOutput = run(["repairs", "list", "--count", "--format", format]);
  const relatedOutput = run(["related", "entity", "sun.sun", "--count", "--format", format]);
  if (format === "json" || format === "json-compact") {
    const repairs = parseJson(repairsOutput) as Record<string, unknown>;
    const topology = parseJson(relatedOutput) as Record<string, unknown>;
    assert(typeof repairs["count"] === "number", "invalid repairs count shape");
    assert(Array.isArray(repairs["by_severity"]), "invalid repairs severity summary");
    assert(typeof topology["count"] === "number", "invalid related count shape");
    assert(Array.isArray(topology["by_type"]), "invalid related type summary");
    assert(!("related" in topology), "related --count exposed private identifiers");
  }
  if (format === "yaml") {
    assert(typeof parseYaml(repairsOutput) === "object", "invalid repairs YAML");
    assert(typeof parseYaml(relatedOutput) === "object", "invalid related YAML");
  }
  assert(repairsOutput.length > 0, `empty repairs output for format ${format}`);
  assert(relatedOutput.length > 0, `empty related output for format ${format}`);
}

for (const args of [
  ["repairs", "ignore", "contract-probe", "contract-probe", "--yes"],
  ["repairs", "fix", "start", "contract-probe", "contract-probe", "--yes"],
]) {
  const outcome = runOutcome(args);
  assert(outcome.status !== 0, "read-only repair write unexpectedly succeeded");
  assert(outcome.stderr.includes("Read-only mode blocked"), "repair write lacked read-only classification");
}

const doctor = parseJson(run(["settings", "doctor", "--format", "json"])) as Record<string, unknown>;
assert(typeof doctor["healthy"] === "boolean", "invalid settings doctor JSON shape");

const capabilitiesProfile = parseJson(run(["capabilities", "--refresh", "--agent-profile", "--format", "json"])) as Record<string, unknown>;
assert(typeof capabilitiesProfile["source"] === "string", "invalid capabilities --agent-profile source");
const profile = capabilitiesProfile["profile"] as Record<string, unknown> | undefined;
assert(typeof profile?.["preferred_output_format"] === "string", "invalid capabilities --agent-profile output shape");

const capabilitiesContext = parseJson(
  run(["capabilities", "--refresh", "--agent-context", "--redact-private", "--format", "json"])
) as Record<string, unknown>;
assert(typeof capabilitiesContext["source"] === "string", "invalid capabilities --agent-context source");
const contextSummary = capabilitiesContext["summary"] as Record<string, unknown> | undefined;
assert(typeof contextSummary?.["entity_count"] === "number", "invalid capabilities --agent-context summary shape");
const contextProfile = capabilitiesContext["profile"] as Record<string, unknown> | undefined;
assert(contextProfile?.["preferred_output_format"] === "toon", "invalid capabilities --agent-context profile shape");

const apiMatrixCount = parseJson(run(["capabilities", "--api-matrix", "--count", "--format", "json"])) as Record<string, unknown>;
const apiMatrixSummary = apiMatrixCount["summary"] as Record<string, unknown> | undefined;
assert(typeof apiMatrixSummary?.["total"] === "number", "invalid capabilities --api-matrix --count summary shape");
assert(typeof apiMatrixCount["recommendation_count"] === "number", "invalid capabilities --api-matrix --count recommendation_count shape");

const schemaCount = parseJson(run(["schema", "--count", "--full", "--format", "json"])) as Record<string, unknown>;
assert(typeof schemaCount["command_count"] === "number", "invalid schema --count output shape");
assert(typeof schemaCount["output_contract_count"] === "number", "invalid schema --count output_contract_count shape");

const outputContracts = parseJson(run(["schema", "--output-contracts", "--format", "json"])) as Record<string, unknown>;
const contracts = outputContracts["output_contracts"] as Record<string, unknown> | undefined;
const contractFormats = contracts?.["formats"] as Record<string, unknown> | undefined;
assert(typeof contracts?.["version"] === "string", "invalid schema --output-contracts version shape");
assert(typeof contractFormats?.["toon"] === "object", "missing toon output contract");
assert(typeof contractFormats?.["json"] === "object", "missing json output contract");

console.log("Live e2e smoke test passed");
console.log("binary:node dist/cli.js");
console.log(`config:${configPath}`);
