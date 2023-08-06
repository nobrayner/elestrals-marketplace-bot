import {
  Client,
  Routes,
  Events,
  GatewayIntentBits,
  Collection,
} from "discord.js";

import config from "../config.json";

import { logger } from "./logger";

import { loadCommands, type Command } from "./commands";

export const client = new Client({ intents: [GatewayIntentBits.Guilds] });

(async function main() {
  const commandCollection = new Collection<string, Command>();

  client.once(Events.ClientReady, (c) => {
    logger.info(`Ready! Logged in as ${c.user.tag}`);
  });

  // Log in to Discord with your client's token
  const commands = await loadCommands();

  commands.forEach((c) => {
    commandCollection.set(c.data.name, c);
  });

  client.once(Events.GuildCreate, async (g) => {
    const childLogger = logger.child({ guildId: g.id });

    childLogger.info("Bot added to new server");

    childLogger.info(
      {
        commands,
      },
      "Registering commands"
    );

    const data: any = await client.rest.put(
      Routes.applicationGuildCommands(config.clientId, g.id),
      { body: commands.map((c) => c.data.toJSON()) }
    );

    childLogger.info(`Successfully registered ${data.length} slash commands`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const childLogger = logger.child({
      guildId: interaction.guildId,
      interactionId: interaction.id,
      commandName: interaction.commandName,
    });

    const command = commandCollection.get(interaction.commandName);

    if (!command) {
      childLogger.warn("Command not found");
      return;
    }

    try {
      childLogger.info("Executing command");

      await command.execute(interaction, childLogger);
    } catch (e) {
      childLogger.error(e);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          ephemeral: true,
          content: "There was an error while executing this command!",
        });
      } else {
        await interaction.reply({
          ephemeral: true,
          content: "There was an error while executing this command!",
        });
      }
    }
  });

  await client.login(config.token);
})();
