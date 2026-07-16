import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMediaPlayerCommand } from "../src/commands/media-player.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
}));

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";
const mockRequest = request as ReturnType<typeof vi.fn>;

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

const mediaPlayerStates = [
  {
    entity_id: "media_player.living_room_tv",
    state: "playing",
    attributes: {
      friendly_name: "Living Room TV",
      media_title: "My Movie",
      media_artist: null,
      source: "Netflix",
      volume_level: 0.5,
      is_volume_muted: false,
      shuffle: false,
      repeat: "off",
      device_class: "tv",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "media_player.bedroom_speaker",
    state: "paused",
    attributes: {
      friendly_name: "Bedroom Speaker",
      media_title: "My Song",
      media_artist: "Artist",
      source: "Spotify",
      volume_level: 0.3,
      is_volume_muted: false,
      shuffle: true,
      repeat: "all",
      device_class: "speaker",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "switch.unrelated",
    state: "on",
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  }).catch((err) => {
    console.log = originalLog;
    throw err;
  });
}

describe("media-player command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all media players", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(mediaPlayerStates));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );
    expect(result).toContain("media_player.living_room_tv");
    expect(result).toContain("media_player.bedroom_speaker");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(mediaPlayerStates));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.media_players_count).toBe(2);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(mediaPlayerStates));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "playing"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.media_players).toHaveLength(1);
    expect(parsed.media_players[0].entity_id).toBe("media_player.living_room_tv");
  });

  it("turns on a media player", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--on", "media_player.living_room_tv"], { from: "user" })
    );
    expect(result).toContain("turned_on");
    expect(result).toContain("media_player.living_room_tv");
  });

  it("turns off a media player", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--off", "media_player.bedroom_speaker"], { from: "user" })
    );
    expect(result).toContain("turned_off");
  });

  it("toggles a media player", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--toggle", "media_player.living_room_tv"], { from: "user" })
    );
    expect(result).toContain("toggled");
  });

  it("plays media", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--play", "media_player.bedroom_speaker"], { from: "user" })
    );
    expect(result).toContain("playing");
  });

  it("pauses media", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--pause", "media_player.living_room_tv"], { from: "user" })
    );
    expect(result).toContain("paused");
  });

  it("stops media", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--stop", "media_player.living_room_tv"], { from: "user" })
    );
    expect(result).toContain("stopped");
  });

  it("play-pause toggles media", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--play-pause", "media_player.living_room_tv"], { from: "user" })
    );
    expect(result).toContain("play_pause_toggled");
  });

  it("skips to next track", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--next", "media_player.bedroom_speaker"], { from: "user" })
    );
    expect(result).toContain("next_track");
  });

  it("goes to previous track", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--prev", "media_player.bedroom_speaker"], { from: "user" })
    );
    expect(result).toContain("previous_track");
  });

  it("mutes a media player", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--mute", "media_player.living_room_tv"], { from: "user" })
    );
    expect(result).toContain("muted");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.is_volume_muted).toBe(true);
  });

  it("unmutes a media player", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--unmute", "media_player.living_room_tv"], { from: "user" })
    );
    expect(result).toContain("unmuted");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.is_volume_muted).toBe(false);
  });

  it("volume up", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--volume-up", "media_player.bedroom_speaker"], { from: "user" })
    );
    expect(result).toContain("volume_up");
  });

  it("volume down", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--volume-down", "media_player.bedroom_speaker"], { from: "user" })
    );
    expect(result).toContain("volume_down");
  });

  it("sets volume level via --entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "media_player.living_room_tv", "--volume", "0.7"], { from: "user" })
    );
    expect(result).toContain("volume_set");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.volume_level).toBe(0.7);
  });

  it("seeks to position via --entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "media_player.living_room_tv", "--seek", "120"], { from: "user" })
    );
    expect(result).toContain("seeked");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.seek_position).toBe(120);
  });

  it("selects source via --entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "media_player.living_room_tv", "--source", "HDMI 1"], { from: "user" })
    );
    expect(result).toContain("source_selected");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.source).toBe("HDMI 1");
  });

  it("sets sound mode via --entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "media_player.bedroom_speaker", "--sound-mode", "Music"], { from: "user" })
    );
    expect(result).toContain("sound_mode_set");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.sound_mode).toBe("Music");
  });

  it("sets shuffle via --entity-id --shuffle", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "media_player.bedroom_speaker", "--shuffle"], { from: "user" })
    );
    expect(result).toContain("shuffle_set");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.shuffle).toBe(true);
  });

  it("sets repeat mode via --entity-id --repeat", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "media_player.bedroom_speaker", "--repeat", "all"], { from: "user" })
    );
    expect(result).toContain("repeat_set");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.repeat).toBe("all");
  });

  it("plays media content via --entity-id --play-media", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "media_player.living_room_tv", "--play-media", "--media-url", "https://example.com/video.mp4", "--media-type", "video"], { from: "user" })
    );
    expect(result).toContain("play_media");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.media_content_id).toBe("https://example.com/video.mp4");
    expect(body.media_content_type).toBe("video");
  });

  it("joins media players", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "media_player.living_room_tv", "--join", "media_player.bedroom_speaker"], { from: "user" })
    );
    expect(result).toContain("joined");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.group_members).toContain("media_player.bedroom_speaker");
  });

  it("unjoins a media player", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMediaPlayerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--unjoin", "media_player.bedroom_speaker"], { from: "user" })
    );
    expect(result).toContain("unjoined");
  });
});
