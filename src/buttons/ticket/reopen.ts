import { Button } from '~/types/objects';
import prisma, { getSettings } from '~/functions/database';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CategoryChannel, EmbedBuilder, GuildMember, Message, PermissionsBitField, TextChannel } from 'discord.js';

export const reopen: Button = {
  deferReply: true,
  ephemeral: true,
  execute: async function (interaction, args) {

    const settings = await getSettings(interaction.guild!.id);

    let ticketInfo = await prisma.ticketdata.findUnique({
      where: {
        channelID: interaction.channel!.id
      }
    });

    if (!ticketInfo) {
      interaction.editReply({
        content: 'This channel is not a ticket!'
      });
      return;
    }

    if (ticketInfo.open) {
      interaction.editReply({
        content: 'This ticket is already open!'
      });
      return;
    }

    const users = JSON.parse(ticketInfo.users);

    const supportRole = await interaction.guild!.roles.fetch(settings.ticketdata.supportRole);
    const member = interaction.member as GuildMember;
    const isSupport = supportRole?.members.some(member => member.id === interaction.user.id) || member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!isSupport) {
      interaction.editReply({
        content: 'You cannot reopen this ticket!'
      });
      return;
    }

    ticketInfo = await prisma.ticketdata.update({
      where: {
        channelID: interaction.channel!.id
      },
      data: {
        open: true
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('Ticket Reopened')
      .setDescription(`Ticket reopened by ${interaction.user.tag}`)
      .setColor('#00ff00')
      .setTimestamp();

    const ogmsgRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents([
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Close Ticket')
          .setEmoji({ name: '🔒' })
          .setStyle(ButtonStyle.Danger)
          .setDisabled(false)
      ])
    const originalMessage = await interaction.channel!.messages.fetch(ticketInfo.originalMessage) as Message;
    await originalMessage.edit({
      components: [ogmsgRow]
    });

    await interaction.channel!.send({
      embeds: [embed],
      components: [ogmsgRow]
    });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents([
        new ButtonBuilder()
          .setCustomId('ticket_del')
          .setLabel('Delete Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('ticket_reopen')
          .setLabel('Reopen Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔓')
          .setDisabled(true)
      ])

    await interaction.message.delete();

    const channel = interaction.guild!.channels.cache.get(ticketInfo.channelID) as TextChannel;

    let parent = null;
    if (settings.ticketdata.categories.open == "false") {
      parent = null
    } else {
      parent = interaction.guild!.channels.cache.get(settings.ticketdata.categories.open) as CategoryChannel | undefined;
    }

    await channel.edit({
      parent: parent ? parent.id : null,
    });

    let LogChannel = null;
    if (settings.ticketdata.logChannel == "false") {
      LogChannel = null
    } else {
      LogChannel = interaction.guild!.channels.cache.get(settings.ticketdata.logChannel) as TextChannel;
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('Ticket Reopened')
      .addFields(
        {
          name: 'Ticket',
          value: `<#${ticketInfo.channelID}>`
        },
        {
          name: 'Reopened By',
          value: `<@${interaction.user.id}>`
        },
        {
          name: 'Ticket ID',
          value: `${ticketInfo.id}`
        }
      )
      .setColor('#00ff00')
      .setTimestamp();

    users.push(ticketInfo.userId);

    const everyonePermissions = {
      id: interaction.guild?.roles.everyone,
      deny: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
      ],
  };
  
  const userPermissions = users.map((user: string) => ({
      id: user,
      allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
      ],
  }));
  
  // Combine everyonePermissions with userPermissions
  const permissionOverwrites = [everyonePermissions, ...userPermissions];
  
  await channel.permissionOverwrites.set(permissionOverwrites);

    await LogChannel?.send({
      embeds: [logEmbed]
    });

  }
}
