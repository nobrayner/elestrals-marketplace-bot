import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageActionRowComponentBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { registerCommand } from "../commands";

const SOLD_CHANNEL_NAME = "『💰』sold-items";
const ALLOWED_CHANNEL_NAMES = [
  "『🪙』elestrals-marketplace",
  "『💱』other-tcg-marketplace",
];
const MAIN_MARKETPLACE_CHANNEL_NAME = ALLOWED_CHANNEL_NAMES[0];

registerCommand({
  name: "sold",
  description: "Mark a listing as sold",
  execute: async (interaction, logger) => {
    const currentChannel = interaction.guild?.channels.cache.find(
      (c) => c.id === interaction.channelId
    );

    if (!currentChannel) {
      logger.error(
        interaction,
        "How did you even do this without a channel???"
      );

      await interaction.reply({
        ephemeral: true,
        content: "This command can only be used in a marketplace channel!",
      });

      return;
    }

    if (
      !currentChannel.isThread() ||
      !ALLOWED_CHANNEL_NAMES.includes(currentChannel.parent?.name ?? "")
    ) {
      logger.info(
        {
          currentChannel: currentChannel.name,
        },
        `Current channel was not a post in one of: ${ALLOWED_CHANNEL_NAMES.join(
          ", "
        )}`
      );

      await interaction.reply({
        ephemeral: true,
        content: `This command can only be used in a post in: ${ALLOWED_CHANNEL_NAMES.join(
          ", "
        )}`,
      });
      return;
    }

    if (interaction.user.id !== currentChannel.ownerId) {
      await interaction.reply({
        ephemeral: true,
        content: "Only the OP can mark a listing as sold!",
      });

      return;
    }

    logger.info(
      {
        post: currentChannel.name,
        op: interaction.user.username,
      },
      "Locking, archiving, and marking listing as sold"
    );

    const response = await interaction.reply({
      ephemeral: true,
      content: "Listing has been sold",
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("close")
            .setLabel("Close Listing")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("sendSoldMessage")
            .setLabel("Close with Sold Message")
            .setStyle(ButtonStyle.Success)
        ),
      ],
    });

    const confirmationFilter = (i: any) => i.user.id === interaction.user.id;

    try {
      const confirmation = await response.awaitMessageComponent({
        filter: confirmationFilter,
        time: 60_000,
      });

      switch (confirmation.customId) {
        case "sendSoldMessage":
          const soldModal = createSoldModal();

          logger.info("Showing sold modal");

          await confirmation.showModal(soldModal);

          const modalResponse = await confirmation.awaitModalSubmit({
            time: 600_000,
            filter: (i) =>
              i.customId === "sold-modal" && i.user.id === interaction.user.id,
          });

          logger.info("Received modal response");

          const soldMessage =
            modalResponse.fields.getTextInputValue("soldMessage");
          const wasMainMarketplace =
            currentChannel.parent?.name === MAIN_MARKETPLACE_CHANNEL_NAME;

          // Add to sold items
          const soldItemsChannel = interaction.guild?.channels.cache.find(
            (c) =>
              c.name === SOLD_CHANNEL_NAME && c.type === ChannelType.GuildText
          );

          if (soldItemsChannel?.type === ChannelType.GuildText) {
            logger.info({ soldMessage }, "Sending sold item message");

            await soldItemsChannel.send(
              `${
                wasMainMarketplace ? "" : `(${currentChannel.parent?.name})`
              } ${interaction.user} sold:\n\n${soldMessage}`
            );
          } else {
            logger.error(
              "Could not find sold items channel, or it wasn't a text channel"
            );
          }

          await modalResponse.reply({
            ephemeral: true,
            content: "Sold message sent!",
          });

          break;

        default:
          logger.info("nothing");
      }
    } catch (e) {
      logger.error(e);

      await interaction.editReply({
        content: "Timed out, or something went wrong",
        components: [],
      });
    }

    await interaction.editReply({
      content: "Listing has been sold",
      components: [],
    });

    await currentChannel.setName(`[SOLD] ${currentChannel.name}`);
    await currentChannel.setLocked(true);
    await currentChannel.setArchived(true);
  },
});

function createSoldModal() {
  const modal = new ModalBuilder()
    .setCustomId("sold-modal")
    .setTitle("Sold Items");

  const soldItemsInput = new TextInputBuilder()
    .setCustomId("soldMessage")
    .setLabel("Sold items and their value:")
    .setValue("")
    .setPlaceholder("e.g. BS1-081 Demeter - $150")
    .setStyle(TextInputStyle.Paragraph);

  modal.addComponents(
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      soldItemsInput
    )
  );

  return modal;
}
