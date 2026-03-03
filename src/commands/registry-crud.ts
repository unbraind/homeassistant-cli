import { Command } from "commander";
import type { Config, OutputFormat } from "../types/options.js";
import { RegistryCrudClient } from "../api/registries-crud.js";
import { formatOutput } from "../formatters/index.js";

function getClient(config: Config): RegistryCrudClient {
  return new RegistryCrudClient(config);
}

export function createAreaCreateCommand(): Command {
  const cmd = new Command("area-create");

  cmd
    .description("Create a new area")
    .requiredOption("--name <name>", "Area name")
    .option("--icon <icon>", "Area icon")
    .option("--floor-id <floorId>", "Floor ID to associate")
    .option("--labels <labels>", "Comma-separated list of label IDs")
    .option("--format <format>", "Output format")
    .action(async (options, cmd) => {
      const config = cmd.optsWithGlobals().config as Config;
      const format = (options.format || config.outputFormat) as OutputFormat;
      
      const client = getClient(config);
      const params = {
        name: options.name,
        ...(options.icon && { icon: options.icon }),
        ...(options.floorId && { floor_id: options.floorId }),
        ...(options.labels && { labels: options.labels.split(",") }),
      };
      
      const result = await client.createArea(params);
      console.log(formatOutput(result, format));
    });

  return cmd;
}

export function createAreaUpdateCommand(): Command {
  const cmd = new Command("area-update");

  cmd
    .description("Update an existing area")
    .requiredOption("--area-id <areaId>", "Area ID to update")
    .option("--name <name>", "New area name")
    .option("--icon <icon>", "New icon")
    .option("--floor-id <floorId>", "New floor ID (use 'null' to clear)")
    .option("--labels <labels>", "Comma-separated list of label IDs")
    .option("--aliases <aliases>", "Comma-separated list of aliases")
    .option("--format <format>", "Output format")
    .action(async (options, cmd) => {
      const config = cmd.optsWithGlobals().config as Config;
      const format = (options.format || config.outputFormat) as OutputFormat;
      
      const client = getClient(config);
      const params = {
        area_id: options.areaId,
        ...(options.name && { name: options.name }),
        ...(options.icon && { icon: options.icon }),
        ...(options.floorId !== undefined && { 
          floor_id: options.floorId === "null" ? null : options.floorId 
        }),
        ...(options.labels && { labels: options.labels.split(",") }),
        ...(options.aliases && { aliases: options.aliases.split(",") }),
      };
      
      const result = await client.updateArea(params);
      console.log(formatOutput(result, format));
    });

  return cmd;
}

export function createAreaDeleteCommand(): Command {
  const cmd = new Command("area-delete");

  cmd
    .description("Delete an area")
    .requiredOption("--area-id <areaId>", "Area ID to delete")
    .option("--yes", "Skip confirmation")
    .action(async (options, cmd) => {
      const config = cmd.optsWithGlobals().config as Config;
      
      if (!options.yes) {
        console.error("Use --yes to confirm deletion");
        process.exit(1);
      }
      
      const client = getClient(config);
      await client.deleteArea(options.areaId);
      console.log("Area deleted successfully");
    });

  return cmd;
}

export function createFloorCreateCommand(): Command {
  const cmd = new Command("floor-create");

  cmd
    .description("Create a new floor")
    .requiredOption("--name <name>", "Floor name")
    .option("--icon <icon>", "Floor icon")
    .option("--level <level>", "Floor level (number)")
    .option("--format <format>", "Output format")
    .action(async (options, cmd) => {
      const config = cmd.optsWithGlobals().config as Config;
      const format = (options.format || config.outputFormat) as OutputFormat;
      
      const client = getClient(config);
      const params = {
        name: options.name,
        ...(options.icon && { icon: options.icon }),
        ...(options.level && { level: parseInt(options.level, 10) }),
      };
      
      const result = await client.createFloor(params);
      console.log(formatOutput(result, format));
    });

  return cmd;
}

export function createFloorUpdateCommand(): Command {
  const cmd = new Command("floor-update");

  cmd
    .description("Update an existing floor")
    .requiredOption("--floor-id <floorId>", "Floor ID to update")
    .option("--name <name>", "New floor name")
    .option("--icon <icon>", "New icon")
    .option("--level <level>", "New level (number, use 'null' to clear)")
    .option("--aliases <aliases>", "Comma-separated list of aliases")
    .option("--format <format>", "Output format")
    .action(async (options, cmd) => {
      const config = cmd.optsWithGlobals().config as Config;
      const format = (options.format || config.outputFormat) as OutputFormat;
      
      const client = getClient(config);
      const params = {
        floor_id: options.floorId,
        ...(options.name && { name: options.name }),
        ...(options.icon && { icon: options.icon }),
        ...(options.level !== undefined && { 
          level: options.level === "null" ? null : parseInt(options.level, 10) 
        }),
        ...(options.aliases && { aliases: options.aliases.split(",") }),
      };
      
      const result = await client.updateFloor(params);
      console.log(formatOutput(result, format));
    });

  return cmd;
}

export function createFloorDeleteCommand(): Command {
  const cmd = new Command("floor-delete");

  cmd
    .description("Delete a floor")
    .requiredOption("--floor-id <floorId>", "Floor ID to delete")
    .option("--yes", "Skip confirmation")
    .action(async (options, cmd) => {
      const config = cmd.optsWithGlobals().config as Config;
      
      if (!options.yes) {
        console.error("Use --yes to confirm deletion");
        process.exit(1);
      }
      
      const client = getClient(config);
      await client.deleteFloor(options.floorId);
      console.log("Floor deleted successfully");
    });

  return cmd;
}

export function createLabelCreateCommand(): Command {
  const cmd = new Command("label-create");

  cmd
    .description("Create a new label")
    .requiredOption("--name <name>", "Label name")
    .option("--icon <icon>", "Label icon")
    .option("--color <color>", "Label color")
    .option("--description <description>", "Label description")
    .option("--format <format>", "Output format")
    .action(async (options, cmd) => {
      const config = cmd.optsWithGlobals().config as Config;
      const format = (options.format || config.outputFormat) as OutputFormat;
      
      const client = getClient(config);
      const params = {
        name: options.name,
        ...(options.icon && { icon: options.icon }),
        ...(options.color && { color: options.color }),
        ...(options.description && { description: options.description }),
      };
      
      const result = await client.createLabel(params);
      console.log(formatOutput(result, format));
    });

  return cmd;
}

export function createLabelUpdateCommand(): Command {
  const cmd = new Command("label-update");

  cmd
    .description("Update an existing label")
    .requiredOption("--label-id <labelId>", "Label ID to update")
    .option("--name <name>", "New label name")
    .option("--icon <icon>", "New icon")
    .option("--color <color>", "New color (use 'null' to clear)")
    .option("--description <description>", "New description (use 'null' to clear)")
    .option("--format <format>", "Output format")
    .action(async (options, cmd) => {
      const config = cmd.optsWithGlobals().config as Config;
      const format = (options.format || config.outputFormat) as OutputFormat;
      
      const client = getClient(config);
      const params = {
        label_id: options.labelId,
        ...(options.name && { name: options.name }),
        ...(options.icon && { icon: options.icon }),
        ...(options.color !== undefined && { 
          color: options.color === "null" ? null : options.color 
        }),
        ...(options.description !== undefined && { 
          description: options.description === "null" ? null : options.description 
        }),
      };
      
      const result = await client.updateLabel(params);
      console.log(formatOutput(result, format));
    });

  return cmd;
}

export function createLabelDeleteCommand(): Command {
  const cmd = new Command("label-delete");

  cmd
    .description("Delete a label")
    .requiredOption("--label-id <labelId>", "Label ID to delete")
    .option("--yes", "Skip confirmation")
    .action(async (options, cmd) => {
      const config = cmd.optsWithGlobals().config as Config;
      
      if (!options.yes) {
        console.error("Use --yes to confirm deletion");
        process.exit(1);
      }
      
      const client = getClient(config);
      await client.deleteLabel(options.labelId);
      console.log("Label deleted successfully");
    });

  return cmd;
}
