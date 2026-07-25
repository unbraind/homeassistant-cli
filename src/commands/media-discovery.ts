/**
 * Defines typed, bounded Home Assistant media discovery commands.
 */
import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { parseLimit, resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type MediaBrowseOptions = {
  entityId?: string;
  mediaContentId?: string;
  mediaContentType?: string;
  limit: string;
  count?: boolean;
};

type MediaSearchOptions = MediaBrowseOptions & {
  mediaClass?: string;
};

const MEDIA_CLASSES = new Set([
  "album",
  "app",
  "artist",
  "channel",
  "composer",
  "contributing_artist",
  "directory",
  "episode",
  "game",
  "genre",
  "image",
  "movie",
  "music",
  "playlist",
  "podcast",
  "season",
  "track",
  "tv_show",
  "url",
  "video",
]);

function parseMediaClasses(value?: string): string[] | undefined {
  if (value === undefined) return undefined;
  const classes = [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))];
  if (classes.length === 0) {
    throw new Error("--media-class must contain at least one media class");
  }
  const unsupported = classes.filter((mediaClass) => !MEDIA_CLASSES.has(mediaClass));
  if (unsupported.length > 0) {
    throw new Error(`Unsupported media class: ${unsupported.join(", ")}`);
  }
  return classes;
}

function mediaRequest(
  options: MediaBrowseOptions,
  operation: "browse_media" | "search_media",
  payload: Record<string, unknown>,
): { type: string; scope: string; payload: Record<string, unknown> | undefined } {
  if (options.entityId) {
    if (Boolean(options.mediaContentId) !== Boolean(options.mediaContentType)) {
      throw new Error("--media-content-id and --media-content-type must be provided together for a media player");
    }
    payload["entity_id"] = options.entityId;
    if (options.mediaContentId) {
      payload["media_content_id"] = options.mediaContentId;
      payload["media_content_type"] = options.mediaContentType;
    }
    return { type: `media_player/${operation}`, scope: "media_player", payload };
  }

  if (options.mediaContentType) {
    throw new Error("--media-content-type is only valid with --entity-id");
  }
  if (options.mediaContentId) payload["media_content_id"] = options.mediaContentId;
  return {
    type: `media_source/${operation}`,
    scope: "media_source",
    payload: Object.keys(payload).length ? payload : undefined,
  };
}

async function outputMediaCall(
  command: Command,
  type: string,
  payload: Record<string, unknown> | undefined,
  project: (result: unknown) => Record<string, unknown>,
): Promise<void> {
  const { config, format } = resolveCommandOptions(command.optsWithGlobals());
  const client = new HomeAssistantWebSocketClient(config);
  try {
    console.log(formatOutput(project(await client.call(type, payload)), format));
  } finally {
    await client.close();
  }
}

function createMediaBrowseCommand(): Command {
  const command = new Command("browse")
    .description("Browse a media source or media player with bounded output")
    .option("--entity-id <id>", "Browse a media player instead of the shared media-source tree")
    .option("--media-content-id <id>", "Media node to browse")
    .option("--media-content-type <type>", "Media node type; requires --entity-id and --media-content-id")
    .option("--limit <n>", "Maximum child rows to return", "50")
    .option("--count", "Return only the number of immediate children");

  command.action(withExit(async (options: MediaBrowseOptions, cmd) => {
    const limit = parseLimit(options.limit) as number;
    const { type, scope, payload } = mediaRequest(options, "browse_media", {});

    await outputMediaCall(cmd as Command, type, payload, (result) => {
      const media = result && typeof result === "object" && !Array.isArray(result)
        ? result as Record<string, unknown>
        : {};
      const children = Array.isArray(media["children"]) ? media["children"] : [];
      if (options.count) return { scope, count: children.length };
      return {
        scope,
        count: children.length,
        media: { ...media, children: children.slice(0, limit) },
      };
    });
  }));
  return command;
}

function createMediaSearchCommand(): Command {
  const command = new Command("search")
    .description("Search a media source or media player with bounded output")
    .argument("<query>", "Non-empty media search text")
    .option("--entity-id <id>", "Search one media player instead of a media source")
    .option("--media-content-id <id>", "Media source or player node to search")
    .option("--media-content-type <type>", "Player media type; requires --entity-id and --media-content-id")
    .option("--media-class <classes>", "Comma-separated result classes such as artist,album,track")
    .option("--limit <n>", "Maximum result rows to return", "50")
    .option("--count", "Return only the result count");

  command.action(withExit(async (queryValue: string, options: MediaSearchOptions, cmd) => {
    const query = queryValue.trim();
    if (!query) throw new Error("Search query must not be empty");
    const limit = parseLimit(options.limit) as number;
    const mediaClasses = parseMediaClasses(options.mediaClass);
    const payload: Record<string, unknown> = { search_query: query };
    if (mediaClasses) payload["media_filter_classes"] = mediaClasses;
    const request = mediaRequest(options, "search_media", payload);

    await outputMediaCall(cmd as Command, request.type, request.payload, (result) => {
      const response = result && typeof result === "object" && !Array.isArray(result)
        ? result as Record<string, unknown>
        : {};
      const rows = Array.isArray(response["result"]) ? response["result"] : [];
      if (options.count) return { scope: request.scope, count: rows.length };
      return { scope: request.scope, count: rows.length, results: rows.slice(0, limit) };
    });
  }));
  return command;
}

function createMediaResolveCommand(): Command {
  const command = new Command("resolve")
    .description("Resolve a media-source ID to a playable URL")
    .argument("<media-content-id>", "Media source ID to resolve")
    .option("--metadata-only", "Omit the short-lived authenticated URL");

  command.action(withExit(async (
    mediaContentIdValue: string,
    options: { metadataOnly?: boolean },
    cmd,
  ) => {
    const mediaContentId = mediaContentIdValue.trim();
    if (!mediaContentId) throw new Error("Media content ID must not be empty");
    await outputMediaCall(
      cmd as Command,
      "media_source/resolve_media",
      { media_content_id: mediaContentId },
      (result) => {
        const resolved = result && typeof result === "object" && !Array.isArray(result)
          ? result as Record<string, unknown>
          : {};
        if (options.metadataOnly) {
          return { scope: "media_source", resolved: true, mime_type: resolved["mime_type"] };
        }
        return { scope: "media_source", media_content_id: mediaContentId, result };
      },
    );
  }));
  return command;
}

/** Build the typed Home Assistant media discovery command group. */
export function createMediaDiscoveryCommand(): Command {
  return new Command("media")
    .description("Browse, search, and resolve Home Assistant media (read-only)")
    .addHelpText("after", `
Examples:
  hassio media browse --limit 20
  hassio media browse --entity-id media_player.living_room --count
  hassio media search "ambient" --media-class artist,album --limit 10
  hassio media search "news" --entity-id media_player.living_room --count
  hassio media resolve "media-source://provider/item" --metadata-only

Media-source search requires a Home Assistant version that registers
media_source/search_media. Resolve output may contain a short-lived credential;
use --metadata-only when an agent only needs capability and MIME metadata.
`)
    .addCommand(createMediaBrowseCommand())
    .addCommand(createMediaSearchCommand())
    .addCommand(createMediaResolveCommand());
}
