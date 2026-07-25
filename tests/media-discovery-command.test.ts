import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMediaDiscoveryCommand } from "../src/commands/media-discovery.js";

const close = vi.fn(async () => undefined);
const call = vi.fn(async (): Promise<unknown> => ({ result: [] }));

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () {
    return { close, call };
  }),
}));

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: true,
  })),
}));

describe("media discovery commands", () => {
  const output: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    call.mockReset();
    call.mockResolvedValue({ result: [] });
    close.mockClear();
    output.length = 0;
    console.log = (message: string) => output.push(message);
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it("browses and bounds the shared media-source tree", async () => {
    call.mockResolvedValue({
      title: "Media",
      children: [{ title: "one" }, { title: "two" }, { title: "three" }],
    });

    await createMediaDiscoveryCommand().parseAsync(["browse", "--limit", "2"], { from: "user" });

    expect(call).toHaveBeenCalledWith("media_source/browse_media", undefined);
    expect(JSON.parse(output.join("\n"))).toEqual({
      scope: "media_source",
      count: 3,
      media: { title: "Media", children: [{ title: "one" }, { title: "two" }] },
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("counts a selected media-source node", async () => {
    call.mockResolvedValue({ children: [{ title: "one" }] });
    await createMediaDiscoveryCommand().parseAsync([
      "browse", "--media-content-id", "media-source://provider/root", "--count",
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("media_source/browse_media", {
      media_content_id: "media-source://provider/root",
    });
    expect(JSON.parse(output.join("\n"))).toEqual({ scope: "media_source", count: 1 });
  });

  it("browses a media-player node with paired media identifiers", async () => {
    call.mockResolvedValue({ children: [] });
    await createMediaDiscoveryCommand().parseAsync([
      "browse",
      "--entity-id", "media_player.living_room",
      "--media-content-id", "library",
      "--media-content-type", "music",
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("media_player/browse_media", {
      entity_id: "media_player.living_room",
      media_content_id: "library",
      media_content_type: "music",
    });
  });

  it("normalizes a non-object browse response", async () => {
    call.mockResolvedValue(null);
    await createMediaDiscoveryCommand().parseAsync(["browse"], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({
      scope: "media_source",
      count: 0,
      media: { children: [] },
    });
  });

  it.each([
    [
      ["browse", "--entity-id", "media_player.living_room", "--media-content-id", "library"],
      "--media-content-id and --media-content-type must be provided together",
    ],
    [
      ["browse", "--media-content-type", "music"],
      "--media-content-type is only valid with --entity-id",
    ],
    [
      ["browse", "--limit", "1.5"],
      "Must be a positive integer",
    ],
  ])("rejects invalid browse options before connecting", async (args, message) => {
    await expect(createMediaDiscoveryCommand().parseAsync(args, { from: "user" }))
      .rejects.toThrow(message);
    expect(call).not.toHaveBeenCalled();
  });

  it("searches a media source with deduplicated current media classes", async () => {
    call.mockResolvedValue({
      result: [{ title: "one" }, { title: "two" }, { title: "three" }],
    });
    await createMediaDiscoveryCommand().parseAsync([
      "search", "ambient",
      "--media-content-id", "media-source://provider/root",
      "--media-class", "artist,album,artist",
      "--limit", "2",
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("media_source/search_media", {
      search_query: "ambient",
      media_content_id: "media-source://provider/root",
      media_filter_classes: ["artist", "album"],
    });
    expect(JSON.parse(output.join("\n"))).toEqual({
      scope: "media_source",
      count: 3,
      results: [{ title: "one" }, { title: "two" }],
    });
  });

  it("supports count-only media-source search", async () => {
    call.mockResolvedValue({ result: [{ title: "one" }] });
    await createMediaDiscoveryCommand().parseAsync(["search", "news", "--count"], { from: "user" });
    expect(call).toHaveBeenCalledWith("media_source/search_media", { search_query: "news" });
    expect(JSON.parse(output.join("\n"))).toEqual({ scope: "media_source", count: 1 });
  });

  it("searches a media player without an optional media node", async () => {
    await createMediaDiscoveryCommand().parseAsync([
      "search", "news", "--entity-id", "media_player.living_room",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("media_player/search_media", {
      search_query: "news",
      entity_id: "media_player.living_room",
    });
  });

  it("searches a selected media-player node", async () => {
    await createMediaDiscoveryCommand().parseAsync([
      "search", "news",
      "--entity-id", "media_player.living_room",
      "--media-content-id", "library",
      "--media-content-type", "music",
      "--media-class", "track",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("media_player/search_media", {
      search_query: "news",
      entity_id: "media_player.living_room",
      media_content_id: "library",
      media_content_type: "music",
      media_filter_classes: ["track"],
    });
  });

  it("normalizes a non-object search response", async () => {
    call.mockResolvedValue([]);
    await createMediaDiscoveryCommand().parseAsync(["search", "news"], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({
      scope: "media_source",
      count: 0,
      results: [],
    });
  });

  it.each([
    [
      ["search", "news", "--entity-id", "media_player.living_room", "--media-content-type", "music"],
      "--media-content-id and --media-content-type must be provided together",
    ],
    [
      ["search", "news", "--media-content-type", "music"],
      "--media-content-type is only valid with --entity-id",
    ],
    [
      ["search", "   "],
      "Search query must not be empty",
    ],
    [
      ["search", "news", "--media-class", ","],
      "--media-class must contain at least one media class",
    ],
    [
      ["search", "news", "--media-class", "track,unknown"],
      "Unsupported media class: unknown",
    ],
  ])("rejects invalid search options before connecting", async (args, message) => {
    await expect(createMediaDiscoveryCommand().parseAsync(args, { from: "user" }))
      .rejects.toThrow(message);
    expect(call).not.toHaveBeenCalled();
  });

  it("resolves a media source ID", async () => {
    call.mockResolvedValue({ url: "/api/media?authSig=secret", mime_type: "audio/mpeg" });
    await createMediaDiscoveryCommand().parseAsync([
      "resolve", "media-source://provider/item",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("media_source/resolve_media", {
      media_content_id: "media-source://provider/item",
    });
    expect(JSON.parse(output.join("\n"))).toEqual({
      scope: "media_source",
      media_content_id: "media-source://provider/item",
      result: { url: "/api/media?authSig=secret", mime_type: "audio/mpeg" },
    });
  });

  it("omits the signed URL in metadata-only resolve output", async () => {
    call.mockResolvedValue({ url: "/api/media?authSig=secret", mime_type: "audio/mpeg" });
    await createMediaDiscoveryCommand().parseAsync([
      "resolve", "media-source://provider/item", "--metadata-only",
    ], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({
      scope: "media_source",
      resolved: true,
      mime_type: "audio/mpeg",
    });
  });

  it("normalizes non-object metadata-only resolve output", async () => {
    call.mockResolvedValue(null);
    await createMediaDiscoveryCommand().parseAsync([
      "resolve", "media-source://provider/item", "--metadata-only",
    ], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({ scope: "media_source", resolved: true });
  });

  it("rejects an empty media source ID", async () => {
    await expect(createMediaDiscoveryCommand().parseAsync(["resolve", "  "], { from: "user" }))
      .rejects.toThrow("Media content ID must not be empty");
    expect(call).not.toHaveBeenCalled();
  });

  it("closes the WebSocket when a media call fails", async () => {
    call.mockRejectedValue(new Error("unsupported"));
    await expect(createMediaDiscoveryCommand().parseAsync(["browse"], { from: "user" }))
      .rejects.toThrow("unsupported");
    expect(close).toHaveBeenCalledOnce();
  });
});
