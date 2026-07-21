/**
 * Implements typed Home Assistant media API transport operations.
 */
import type { Config } from "../types/options.js";
import { HomeAssistantClient } from "./client.js";

export interface MediaPlayerState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface MediaSeekData {
  seek_position: number;
}

export interface MediaPlayPauseResult {
  success: boolean;
  entity_id: string;
  new_state?: string;
}

export class MediaPlayerClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async mediaPlay(entityId: string): Promise<void> {
    await this.callService("media_player", "media_play", { entity_id: entityId });
  }

  async mediaPause(entityId: string): Promise<void> {
    await this.callService("media_player", "media_pause", { entity_id: entityId });
  }

  async mediaPlayPause(entityId: string): Promise<void> {
    await this.callService("media_player", "media_play_pause", { entity_id: entityId });
  }

  async mediaStop(entityId: string): Promise<void> {
    await this.callService("media_player", "media_stop", { entity_id: entityId });
  }

  async mediaNextTrack(entityId: string): Promise<void> {
    await this.callService("media_player", "media_next_track", { entity_id: entityId });
  }

  async mediaPreviousTrack(entityId: string): Promise<void> {
    await this.callService("media_player", "media_previous_track", { entity_id: entityId });
  }

  async mediaSeek(entityId: string, seekPosition: number): Promise<void> {
    await this.callService("media_player", "media_seek", {
      entity_id: entityId,
      seek_position: seekPosition,
    });
  }

  async volumeSet(entityId: string, volumeLevel: number): Promise<void> {
    await this.callService("media_player", "volume_set", {
      entity_id: entityId,
      volume_level: volumeLevel,
    });
  }

  async volumeMute(entityId: string, isVolumeMuted: boolean): Promise<void> {
    await this.callService("media_player", "volume_mute", {
      entity_id: entityId,
      is_volume_muted: isVolumeMuted,
    });
  }

  async volumeUp(entityId: string): Promise<void> {
    await this.callService("media_player", "volume_up", { entity_id: entityId });
  }

  async volumeDown(entityId: string): Promise<void> {
    await this.callService("media_player", "volume_down", { entity_id: entityId });
  }

  async selectSource(entityId: string, source: string): Promise<void> {
    await this.callService("media_player", "select_source", {
      entity_id: entityId,
      source,
    });
  }

  async selectSoundMode(entityId: string, soundMode: string): Promise<void> {
    await this.callService("media_player", "select_sound_mode", {
      entity_id: entityId,
      sound_mode: soundMode,
    });
  }

  async shuffleSet(entityId: string, shuffle: boolean): Promise<void> {
    await this.callService("media_player", "shuffle_set", {
      entity_id: entityId,
      shuffle,
    });
  }

  async repeatSet(entityId: string, repeat: "off" | "all" | "one"): Promise<void> {
    await this.callService("media_player", "repeat_set", {
      entity_id: entityId,
      repeat,
    });
  }

  async playMedia(
    entityId: string,
    mediaContentId: string,
    mediaContentType: string
  ): Promise<void> {
    await this.callService("media_player", "play_media", {
      entity_id: entityId,
      media_content_id: mediaContentId,
      media_content_type: mediaContentType,
    });
  }

  async join(groupMembers: string[], entityId?: string): Promise<void> {
    await this.callService("media_player", "join", {
      entity_id: entityId,
      group_members: groupMembers,
    });
  }

  async unjoin(entityId: string): Promise<void> {
    await this.callService("media_player", "unjoin", { entity_id: entityId });
  }

  async browseMedia(entityId: string, mediaContentId?: string, mediaContentType?: string): Promise<unknown> {
    const data: Record<string, unknown> = { entity_id: entityId };
    if (mediaContentId) data["media_content_id"] = mediaContentId;
    if (mediaContentType) data["media_content_type"] = mediaContentType;
    
    return this.callService("media_player", "browse_media", data);
  }
}
