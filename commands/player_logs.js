const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
  description: "View the warnings and bans of a specified user",
  data: new SlashCommandBuilder()
    .setName('player_logs')
    .setDescription('View the warnings and bans of a specified user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose records you want to view')
        .setRequired(true)
    ),
  com_staff_only: true,

  execute: async (client, interaction) => {
    await interaction.deferReply();

    const user = interaction.options.getUser("user");
    const db = await connectToMongoDB();
    const collection = db.collection("register");

    const player = await collection.findOne({ discord_id: user.id });

    if (!player) {
      return interaction.editReply({ content: "❌ User not found!", ephemeral: true });
    }

    const warnings = player.matchmaking?.warnings || [];
    const bans = player.matchmaking?.bans || [];
    const pastBans = player.matchmaking?.pastBans || [];

   
    const logs = [
      ...warnings.map(warn => ({
        type: "Warning",
        reason: warn.reason,
        author: warn.author,
        date: warn.date
      })),
      ...pastBans.map(ban => ({
        type: "Ban",
        reason: ban.reason,
        author: ban.author,
        startDate: ban.start,
        endDate: ban.end
      }))
    ]  .sort((a, b) => {
        const aDate = a.date || a.startDate;
        const bDate = b.date || b.startDate;
        return bDate - aDate; 
      });

    if (logs.length === 0) {
      return interaction.editReply({ content: "✅ The user has no warnings or bans." });
    }

    const pageSize = 5;
    let page = 1;
    const pageCount = Math.ceil(logs.length / pageSize);

    function generateEmbed(currentLogs, page) {
      const embed = new EmbedBuilder()
            .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
        .setTitle(`${user.tag} - Modlogs`)
        .setColor('#ff0038')
        .setFooter({ text: `Page ${page} / ${pageCount}`, iconURL: client.user.displayAvatarURL() })

        .setThumbnail(user.displayAvatarURL());

        currentLogs.forEach((log, index) => {
          if (log.type === "Ban") {
            embed.addFields(
              { name: `🚫 Ban #${(page - 1) * pageSize + index + 1}`, value: `**Reason:** ${log.reason}\n**Author:** <@${log.author}>\n**Start Date:** <t:${Math.floor(log.startDate / 1000)}:R>\n**End Date:** <t:${Math.floor(log.endDate / 1000)}:R>`, inline: false }
            );
          } else {
            embed.addFields(
              { name: `⚠️ Warning #${(page - 1) * pageSize + index + 1}`, value: `**Reason:** ${log.reason}\n**Author:** <@${log.author}>\n**Date:** <t:${Math.floor(log.date / 1000)}:R>`, inline: false }
            );
          }
        });
        

      return embed;
    }

    let currentLogs = logs.slice(0, pageSize);
    let modlogEmbed = generateEmbed(currentLogs, page);

    const previousButton = new ButtonBuilder()
      .setCustomId("previous")
      .setStyle("Primary")
      .setLabel("Previous");

    const nextButton = new ButtonBuilder()
      .setCustomId("next")
      .setStyle("Primary")
      .setLabel("Next");

    const row = new ActionRowBuilder().addComponents(previousButton, nextButton);
    const msg = await interaction.editReply({ embeds: [modlogEmbed], components: [row] });

    const filter = i => i.user.id === interaction.user.id && (i.customId === "previous" || i.customId === "next");
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async i => {
      if (i.customId === "previous") {
        page = page > 1 ? page - 1 : pageCount;
      } else if (i.customId === "next") {
        page = page < pageCount ? page + 1 : 1;
      }

      currentLogs = logs.slice((page - 1) * pageSize, page * pageSize);
      modlogEmbed = generateEmbed(currentLogs, page);
      await i.update({ embeds: [modlogEmbed] });
    });

    collector.on("end", () => {
      row.components.forEach(button => button.setDisabled(true));
      interaction.editReply({ components: [row] });
    });
  }
};
