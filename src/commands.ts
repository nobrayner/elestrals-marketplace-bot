import fs from "node:fs";
import path from "node:path";

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";

import { logger, type Logger } from "./logger";

export type Command = {
  data: SlashCommandBuilder;
  execute: (
    interaction: ChatInputCommandInteraction<CacheType>,
    logger: Logger
  ) => Promise<void>;
};

const commands: Command[] = [];

type RegisterCommandArgs = {
  name: string;
  description: string;
  execute: Command["execute"];
};

export function registerCommand(args: RegisterCommandArgs) {
  commands.push({
    data: new SlashCommandBuilder()
      .setName(args.name)
      .setDescription(args.description),
    execute: args.execute,
  });
}

export async function loadCommands() {
  logger.info("Loading commands");

  const foldersPath = path.join(__dirname, "cmds");
  const commandFolders = fs.readdirSync(foldersPath);

  logger.info(`Found ${commandFolders.length} commands`);

  for (const file of commandFolders) {
    logger.info(`Loading command from ${file}`);

    const filePath = path.join(foldersPath, file);

    await import(filePath);
  }

  logger.info(`Loaded ${commands.length} commands`);

  return commands;
}
