import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";
import { MediaPlayerClient } from "../src/api/media.js";

const mockRequest = request as ReturnType<typeof vi.fn>;

const config = {
  url: "http://localhost:8123",
  token: "test-token",
  outputFormat: "json" as const,
  timeout: 30000,
  readOnly: false,
};

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

describe("MediaPlayerClient", () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it("mediaPlay calls media_player.media_play", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.mediaPlay("media_player.tv");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.tv");
  });

  it("mediaPause calls media_player.media_pause", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.mediaPause("media_player.tv");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.tv");
  });

  it("mediaPlayPause calls media_player.media_play_pause", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.mediaPlayPause("media_player.tv");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.tv");
  });

  it("mediaStop calls media_player.media_stop", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.mediaStop("media_player.tv");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.tv");
  });

  it("mediaNextTrack calls media_player.media_next_track", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.mediaNextTrack("media_player.speaker");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.speaker");
  });

  it("mediaPreviousTrack calls media_player.media_previous_track", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.mediaPreviousTrack("media_player.speaker");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.speaker");
  });

  it("mediaSeek calls media_player.media_seek with position", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.mediaSeek("media_player.tv", 120.5);

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.tv");
    expect(body.seek_position).toBe(120.5);
  });

  it("volumeSet calls media_player.volume_set", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.volumeSet("media_player.speaker", 0.75);

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.volume_level).toBe(0.75);
    expect(body.entity_id).toBe("media_player.speaker");
  });

  it("volumeMute calls media_player.volume_mute (mute)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.volumeMute("media_player.speaker", true);

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.is_volume_muted).toBe(true);
    expect(body.entity_id).toBe("media_player.speaker");
  });

  it("volumeMute calls media_player.volume_mute (unmute)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.volumeMute("media_player.speaker", false);

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.is_volume_muted).toBe(false);
  });

  it("volumeUp calls media_player.volume_up", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.volumeUp("media_player.tv");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.tv");
  });

  it("volumeDown calls media_player.volume_down", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.volumeDown("media_player.tv");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.tv");
  });

  it("selectSource calls media_player.select_source", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.selectSource("media_player.tv", "HDMI 1");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.source).toBe("HDMI 1");
    expect(body.entity_id).toBe("media_player.tv");
  });

  it("selectSoundMode calls media_player.select_sound_mode", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.selectSoundMode("media_player.speaker", "movie");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.sound_mode).toBe("movie");
  });

  it("shuffleSet calls media_player.shuffle_set (on)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.shuffleSet("media_player.speaker", true);

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.shuffle).toBe(true);
  });

  it("shuffleSet calls media_player.shuffle_set (off)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.shuffleSet("media_player.speaker", false);

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.shuffle).toBe(false);
  });

  it("repeatSet calls media_player.repeat_set (all)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.repeatSet("media_player.speaker", "all");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.repeat).toBe("all");
  });

  it("repeatSet calls media_player.repeat_set (one)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.repeatSet("media_player.speaker", "one");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.repeat).toBe("one");
  });

  it("repeatSet calls media_player.repeat_set (off)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.repeatSet("media_player.speaker", "off");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.repeat).toBe("off");
  });

  it("playMedia calls media_player.play_media", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.playMedia("media_player.tv", "http://stream.example.com/audio.mp3", "music");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.media_content_id).toBe("http://stream.example.com/audio.mp3");
    expect(body.media_content_type).toBe("music");
    expect(body.entity_id).toBe("media_player.tv");
  });

  it("join calls media_player.join with group members", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.join(["media_player.speaker1", "media_player.speaker2"], "media_player.speaker1");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.group_members).toEqual(["media_player.speaker1", "media_player.speaker2"]);
    expect(body.entity_id).toBe("media_player.speaker1");
  });

  it("join calls media_player.join without main entity", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.join(["media_player.a", "media_player.b"]);

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.group_members).toEqual(["media_player.a", "media_player.b"]);
  });

  it("unjoin calls media_player.unjoin", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const client = new MediaPlayerClient(config);
    await client.unjoin("media_player.speaker");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.speaker");
  });

  it("browseMedia calls media_player.browse_media without options", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ children: [] }));
    const client = new MediaPlayerClient(config);
    await client.browseMedia("media_player.tv");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("media_player.tv");
    expect(body.media_content_id).toBeUndefined();
  });

  it("browseMedia calls media_player.browse_media with content id and type", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ children: [] }));
    const client = new MediaPlayerClient(config);
    await client.browseMedia("media_player.tv", "library", "library");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.media_content_id).toBe("library");
    expect(body.media_content_type).toBe("library");
  });
});
