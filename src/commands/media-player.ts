import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createMediaPlayerCommand(): Command {
  const command = new Command("media-player")
    .description("Control Home Assistant media_player entities")
    .option("--on <entityId>", "Turn on a media player")
    .option("--off <entityId>", "Turn off a media player")
    .option("--toggle <entityId>", "Toggle a media player on/off")
    .option("--play <entityId>", "Start media playback")
    .option("--pause <entityId>", "Pause media playback")
    .option("--stop <entityId>", "Stop media playback")
    .option("--play-pause <entityId>", "Toggle play/pause")
    .option("--next <entityId>", "Skip to next track")
    .option("--prev <entityId>", "Skip to previous track")
    .option("--mute <entityId>", "Mute a media player")
    .option("--unmute <entityId>", "Unmute a media player")
    .option("--volume-up <entityId>", "Increase volume")
    .option("--volume-down <entityId>", "Decrease volume")
    .option("-e, --entity-id <entityId>", "Target media player for further options")
    .option("--volume <0-1>", "Set volume level 0.0–1.0 (use with --entity-id)")
    .option("--seek <seconds>", "Seek to position in seconds (use with --entity-id)")
    .option("--source <source>", "Select input source (use with --entity-id)")
    .option("--sound-mode <mode>", "Select sound mode (use with --entity-id)")
    .option("--shuffle", "Enable shuffle (use with --entity-id)")
    .option("--no-shuffle", "Disable shuffle (use with --entity-id)")
    .option("--repeat <off|one|all>", "Set repeat mode: off, one, all (use with --entity-id)")
    .option("--play-media", "Play media content (use with --entity-id, --media-url, --media-type)")
    .option("--media-url <url>", "Media content URL/ID for --play-media")
    .option("--media-type <type>", "Media content type for --play-media (e.g. music, video, tvshow)")
    .option("--join <entityIds...>", "Join media players into group (use with --entity-id as leader)")
    .option("--unjoin <entityId>", "Remove a media player from group")
    .option("--count", "Only return count of media player entities")
    .option("-s, --state <state>", "Filter by state (playing, paused, idle, off, on, unavailable)");

  command.action(withExit(async (options: {
    on?: string;
    off?: string;
    toggle?: string;
    play?: string;
    pause?: string;
    stop?: string;
    playPause?: string;
    next?: string;
    prev?: string;
    mute?: string;
    unmute?: string;
    volumeUp?: string;
    volumeDown?: string;
    entityId?: string;
    volume?: string;
    seek?: string;
    source?: string;
    soundMode?: string;
    shuffle?: boolean;
    noShuffle?: boolean;
    repeat?: string;
    playMedia?: boolean;
    mediaUrl?: string;
    mediaType?: string;
    join?: string[];
    unjoin?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.on) {
      await client.callService("media_player", "turn_on", { entity_id: options.on });
      console.log(formatOutput({ success: true, action: "turned_on", entity_id: options.on }, format));
      return;
    }

    if (options.off) {
      await client.callService("media_player", "turn_off", { entity_id: options.off });
      console.log(formatOutput({ success: true, action: "turned_off", entity_id: options.off }, format));
      return;
    }

    if (options.toggle) {
      await client.callService("media_player", "toggle", { entity_id: options.toggle });
      console.log(formatOutput({ success: true, action: "toggled", entity_id: options.toggle }, format));
      return;
    }

    if (options.play) {
      await client.callService("media_player", "media_play", { entity_id: options.play });
      console.log(formatOutput({ success: true, action: "playing", entity_id: options.play }, format));
      return;
    }

    if (options.pause) {
      await client.callService("media_player", "media_pause", { entity_id: options.pause });
      console.log(formatOutput({ success: true, action: "paused", entity_id: options.pause }, format));
      return;
    }

    if (options.stop) {
      await client.callService("media_player", "media_stop", { entity_id: options.stop });
      console.log(formatOutput({ success: true, action: "stopped", entity_id: options.stop }, format));
      return;
    }

    if (options.playPause) {
      await client.callService("media_player", "media_play_pause", { entity_id: options.playPause });
      console.log(formatOutput({ success: true, action: "play_pause_toggled", entity_id: options.playPause }, format));
      return;
    }

    if (options.next) {
      await client.callService("media_player", "media_next_track", { entity_id: options.next });
      console.log(formatOutput({ success: true, action: "next_track", entity_id: options.next }, format));
      return;
    }

    if (options.prev) {
      await client.callService("media_player", "media_previous_track", { entity_id: options.prev });
      console.log(formatOutput({ success: true, action: "previous_track", entity_id: options.prev }, format));
      return;
    }

    if (options.mute) {
      await client.callService("media_player", "volume_mute", { entity_id: options.mute, is_volume_muted: true });
      console.log(formatOutput({ success: true, action: "muted", entity_id: options.mute }, format));
      return;
    }

    if (options.unmute) {
      await client.callService("media_player", "volume_mute", { entity_id: options.unmute, is_volume_muted: false });
      console.log(formatOutput({ success: true, action: "unmuted", entity_id: options.unmute }, format));
      return;
    }

    if (options.volumeUp) {
      await client.callService("media_player", "volume_up", { entity_id: options.volumeUp });
      console.log(formatOutput({ success: true, action: "volume_up", entity_id: options.volumeUp }, format));
      return;
    }

    if (options.volumeDown) {
      await client.callService("media_player", "volume_down", { entity_id: options.volumeDown });
      console.log(formatOutput({ success: true, action: "volume_down", entity_id: options.volumeDown }, format));
      return;
    }

    if (options.unjoin) {
      await client.callService("media_player", "unjoin", { entity_id: options.unjoin });
      console.log(formatOutput({ success: true, action: "unjoined", entity_id: options.unjoin }, format));
      return;
    }

    if (options.entityId) {
      if (options.volume !== undefined) {
        await client.callService("media_player", "volume_set", {
          entity_id: options.entityId,
          volume_level: parseFloat(options.volume),
        });
        console.log(formatOutput({ success: true, action: "volume_set", entity_id: options.entityId, volume_level: parseFloat(options.volume) }, format));
        return;
      }

      if (options.seek !== undefined) {
        await client.callService("media_player", "media_seek", {
          entity_id: options.entityId,
          seek_position: parseFloat(options.seek),
        });
        console.log(formatOutput({ success: true, action: "seeked", entity_id: options.entityId, seek_position: parseFloat(options.seek) }, format));
        return;
      }

      if (options.source) {
        await client.callService("media_player", "select_source", {
          entity_id: options.entityId,
          source: options.source,
        });
        console.log(formatOutput({ success: true, action: "source_selected", entity_id: options.entityId, source: options.source }, format));
        return;
      }

      if (options.soundMode) {
        await client.callService("media_player", "select_sound_mode", {
          entity_id: options.entityId,
          sound_mode: options.soundMode,
        });
        console.log(formatOutput({ success: true, action: "sound_mode_set", entity_id: options.entityId, sound_mode: options.soundMode }, format));
        return;
      }

      if (options.shuffle !== undefined) {
        await client.callService("media_player", "shuffle_set", {
          entity_id: options.entityId,
          shuffle: options.shuffle,
        });
        console.log(formatOutput({ success: true, action: "shuffle_set", entity_id: options.entityId, shuffle: options.shuffle }, format));
        return;
      }

      if (options.repeat) {
        await client.callService("media_player", "repeat_set", {
          entity_id: options.entityId,
          repeat: options.repeat,
        });
        console.log(formatOutput({ success: true, action: "repeat_set", entity_id: options.entityId, repeat: options.repeat }, format));
        return;
      }

      if (options.playMedia && options.mediaUrl) {
        await client.callService("media_player", "play_media", {
          entity_id: options.entityId,
          media_content_id: options.mediaUrl,
          media_content_type: options.mediaType ?? "music",
        });
        console.log(formatOutput({ success: true, action: "play_media", entity_id: options.entityId, media_content_id: options.mediaUrl, media_content_type: options.mediaType ?? "music" }, format));
        return;
      }

      if (options.join && options.join.length > 0) {
        await client.callService("media_player", "join", {
          entity_id: options.entityId,
          group_members: options.join,
        });
        console.log(formatOutput({ success: true, action: "joined", entity_id: options.entityId, group_members: options.join }, format));
        return;
      }
    }

    // List media players
    const states = await client.getStates();
    let players = states.filter(s => s.entity_id.startsWith("media_player."));
    if (options.state) players = players.filter(p => p.state === options.state);

    const simplified = players.map(p => ({
      entity_id: p.entity_id,
      state: p.state,
      friendly_name: p.attributes["friendly_name"],
      media_title: p.attributes["media_title"],
      media_artist: p.attributes["media_artist"],
      source: p.attributes["source"],
      volume_level: p.attributes["volume_level"],
      is_volume_muted: p.attributes["is_volume_muted"],
      shuffle: p.attributes["shuffle"],
      repeat: p.attributes["repeat"],
      device_class: p.attributes["device_class"],
    }));

    if (options.count) {
      console.log(formatOutput({ media_players_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ media_players: simplified }, format));
  }));

  return command;
}
