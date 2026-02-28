import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { SystemApiClient } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";
import { writeFileSync } from "node:fs";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new SystemApiClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createPersonsCommand(): Command {
  return new Command("persons")
    .description("List all persons")
    .option("--count", "Only return count")
    .action(async (options: { count?: boolean }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);

      const persons = await client.getPersons();

      if (options.count) {
        console.log(formatOutput({ persons_count: persons.length }, format));
      } else {
        console.log(formatOutput({ persons }, format));
      }
    });
}

export function createZonesCommand(): Command {
  return new Command("zones")
    .description("List all zones")
    .option("--count", "Only return count")
    .action(async (options: { count?: boolean }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);

      const zones = await client.getZones();

      if (options.count) {
        console.log(formatOutput({ zones_count: zones.length }, format));
      } else {
        console.log(formatOutput({ zones }, format));
      }
    });
}

export function createAnalyticsCommand(): Command {
  return new Command("analytics")
    .description("Get Home Assistant analytics data")
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);

      const analytics = await client.getAnalytics();
      console.log(formatOutput(analytics, format));
    });
}

export function createBackupsCommand(): Command {
  const command = new Command("backups")
    .description("Manage Home Assistant backups")
    .option("--list", "List all backups")
    .option("-c, --create <name>", "Create a new backup")
    .option("-r, --restore <id>", "Restore a backup")
    .option("-d, --delete <id>", "Delete a backup")
    .option("--download <id>", "Download a backup")
    .option("-o, --output <file>", "Output file for download")
    .option("--compressed", "Create compressed backup", true)
    .option("--password <password>", "Password for backup (restore/create)")
    .option("--count", "Only return count");

  command.action(async (options: {
    list?: boolean;
    create?: string;
    restore?: string;
    delete?: string;
    download?: string;
    output?: string;
    compressed?: boolean;
    password?: string;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.create) {
      const backupOptions: { compressed?: boolean; password?: string } = {};
      if (options.compressed !== undefined) backupOptions.compressed = options.compressed;
      if (options.password) backupOptions.password = options.password;
      const backup = await client.createBackup(options.create, backupOptions);
      console.log(formatOutput({ created: backup }, format));
      return;
    }

    if (options.restore) {
      const restoreOptions: { password?: string } = {};
      if (options.password) restoreOptions.password = options.password;
      await client.restoreBackup(options.restore, restoreOptions);
      console.log(formatOutput({ restored: options.restore }, format));
      return;
    }

    if (options.delete) {
      await client.deleteBackup(options.delete);
      console.log(formatOutput({ deleted: options.delete }, format));
      return;
    }

    if (options.download) {
      const buffer = await client.downloadBackup(options.download);
      if (options.output) {
        writeFileSync(options.output, buffer);
        console.log(formatOutput({ downloaded: options.output, size: buffer.length }, format));
      } else {
        // Output to stdout as binary
        process.stdout.write(buffer);
      }
      return;
    }

    // Default: list backups
    const backups = await client.getBackups();

    if (options.count) {
      console.log(formatOutput({ backups_count: backups.length }, format));
    } else {
      console.log(formatOutput({ backups }, format));
    }
  });

  return command;
}
