import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConfigEntriesApiClient } from "../src/api/config-entries.js";

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
  },
});

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

describe("ConfigEntriesApiClient", () => {
  let client: ConfigEntriesApiClient;

  beforeEach(() => {
    client = new ConfigEntriesApiClient({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "toon",
      timeout: 30000,
      readOnly: false,
    });
    mockRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists config entries", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([
      {
        entry_id: "entry-1",
        domain: "mqtt",
        title: "MQTT",
        source: "user",
        state: "loaded",
        supports_options: true,
        supports_remove_device: true,
        supports_unload: true,
        supports_reconfigure: true,
        disabled_by: null,
        reason: null,
        pref_disable_new_entities: false,
        pref_disable_polling: false,
        created_at: 1,
        modified_at: 2,
      },
    ]));

    const result = await client.getConfigEntries();
    expect(result).toHaveLength(1);
    expect(result[0]?.entry_id).toBe("entry-1");
    expect(result[0]?.domain).toBe("mqtt");
  });

  it("deletes a config entry", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ ok: true }));
    await client.deleteConfigEntry("entry-1");
    const firstCall = mockRequest.mock.calls[0];
    expect(firstCall?.[0]).toContain("/api/config/config_entries/entry/entry-1");
    expect((firstCall?.[1] as { method?: string })?.method).toBe("DELETE");
  });
});
