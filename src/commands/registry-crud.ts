/**
 * Defines the registry crud command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { RegistryCrudClient } from "../api/registries-crud.js";
import { formatOutput } from "../formatters/index.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createAreaCreateCommand(): Command {
  const cmd = new Command("area-create");

  cmd
    .description("Create a new area")
    .requiredOption("--name <name>", "Area name")
    .option("--icon <icon>", "Area icon")
    .option("--floor-id <floorId>", "Floor ID to associate")
    .option("--labels <labels>", "Comma-separated list of label IDs")
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new RegistryCrudClient(config);
      const params = {
        name: options.name as string,
        ...(options.icon && { icon: options.icon as string }),
        ...(options.floorId && { floor_id: options.floorId as string }),
        ...(options.labels && { labels: (options.labels as string).split(",") }),
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
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new RegistryCrudClient(config);
      const params = {
        area_id: options.areaId as string,
        ...(options.name && { name: options.name as string }),
        ...(options.icon && { icon: options.icon as string }),
        ...(options.floorId !== undefined && {
          floor_id: options.floorId === "null" ? null : options.floorId as string
        }),
        ...(options.labels && { labels: (options.labels as string).split(",") }),
        ...(options.aliases && { aliases: (options.aliases as string).split(",") }),
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
      if (!options.yes) {
        console.error("Use --yes to confirm deletion");
        process.exit(1);
      }
      const globalOpts = cmd.optsWithGlobals();
      const { config } = resolveCommandOptions(globalOpts);
      const client = new RegistryCrudClient(config);
      await client.deleteArea(options.areaId as string);
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
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new RegistryCrudClient(config);
      const params = {
        name: options.name as string,
        ...(options.icon && { icon: options.icon as string }),
        ...(options.level && { level: parseInt(options.level as string, 10) }),
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
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new RegistryCrudClient(config);
      const params = {
        floor_id: options.floorId as string,
        ...(options.name && { name: options.name as string }),
        ...(options.icon && { icon: options.icon as string }),
        ...(options.level !== undefined && {
          level: options.level === "null" ? null : parseInt(options.level as string, 10)
        }),
        ...(options.aliases && { aliases: (options.aliases as string).split(",") }),
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
      if (!options.yes) {
        console.error("Use --yes to confirm deletion");
        process.exit(1);
      }
      const globalOpts = cmd.optsWithGlobals();
      const { config } = resolveCommandOptions(globalOpts);
      const client = new RegistryCrudClient(config);
      await client.deleteFloor(options.floorId as string);
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
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new RegistryCrudClient(config);
      const params = {
        name: options.name as string,
        ...(options.icon && { icon: options.icon as string }),
        ...(options.color && { color: options.color as string }),
        ...(options.description && { description: options.description as string }),
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
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new RegistryCrudClient(config);
      const params = {
        label_id: options.labelId as string,
        ...(options.name && { name: options.name as string }),
        ...(options.icon && { icon: options.icon as string }),
        ...(options.color !== undefined && {
          color: options.color === "null" ? null : options.color as string
        }),
        ...(options.description !== undefined && {
          description: options.description === "null" ? null : options.description as string
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
      if (!options.yes) {
        console.error("Use --yes to confirm deletion");
        process.exit(1);
      }
      const globalOpts = cmd.optsWithGlobals();
      const { config } = resolveCommandOptions(globalOpts);
      const client = new RegistryCrudClient(config);
      await client.deleteLabel(options.labelId as string);
      console.log("Label deleted successfully");
    });

  return cmd;
}
