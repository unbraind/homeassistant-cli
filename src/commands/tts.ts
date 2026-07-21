/**
 * Defines the tts command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { TtsApiClient } from "../api/tts.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createTtsCommand(): Command {
  const command = new Command("tts")
    .description("Text-to-Speech operations")
    .option("--engines", "List available TTS engines")
    .option("--list-engines", "Alias for --engines")
    .option("-m, --message <message>", "Message to speak")
    .option("-e, --engine <engine>", "TTS engine ID")
    .option("-p, --player <entity>", "Media player entity ID")
    .option("-l, --language <lang>", "Language code")
    .option("--clear-cache", "Clear TTS cache");

  command.action(withExit(async (options: {
    engines?: boolean;
    listEngines?: boolean;
    message?: string;
    engine?: string;
    player?: string;
    language?: string;
    clearCache?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new TtsApiClient(config);

    if (options.engines || options.listEngines) {
      try {
        const engines = await client.getTtsEngines();
        console.log(formatOutput({ tts_engines: engines }, format));
      } catch {
        console.log(formatOutput({ tts_engines: [], message: "No TTS engines available" }, format));
      }
      return;
    }

    if (options.clearCache) {
      await client.clearTtsCache();
      console.log(formatOutput({ success: true, message: "TTS cache cleared" }, format));
      return;
    }

    if (options.message && options.player) {
      const speakOptions: { engineId?: string; language?: string } = {};
      if (options.engine) speakOptions.engineId = options.engine;
      if (options.language) speakOptions.language = options.language;
      await client.speak(options.player, options.message, speakOptions);
      console.log(formatOutput({ 
        success: true, 
        message: "TTS message sent",
        player: options.player,
      }, format));
      return;
    }

    if (options.message && options.engine) {
      const ttsOptions: { language?: string } = {};
      if (options.language) ttsOptions.language = options.language;
      const url = await client.getTtsUrl(options.engine, options.message, ttsOptions);
      console.log(formatOutput({ url }, format));
      return;
    }

    command.help();
  }));

  return command;
}

export function createSayCommand(): Command {
  const command = new Command("say")
    .description("Speak text through a media player (shortcut for TTS)")
    .argument("<message>", "Message to speak")
    .requiredOption("-p, --player <entity>", "Media player entity ID")
    .option("-e, --engine <engine>", "TTS engine ID");

  command.action(withExit(async (message: string, options: { player: string; engine?: string }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new TtsApiClient(config);

    const speakOptions: { engineId?: string } = {};
    if (options.engine) speakOptions.engineId = options.engine;
    await client.speak(options.player, message, speakOptions);
    
    console.log(formatOutput({ 
      success: true, 
      message: "Spoken",
      player: options.player,
    }, format));
  }));

  return command;
}
