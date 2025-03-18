const { ActionRowBuilder, SlashCommandBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');
const { connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_reports')
    .setDescription('Check reports for a player')
    .addUserOption(option => 
      option.setName('player')
        .setDescription('Select Player')
        .setRequired(true)
    ),
  staff_only: false,
  parent: "staff",
  com_staff_only: true,

 execute: async (client, interaction) => {
    const target_user = interaction.options.getUser('player') || interaction.user;
    let page = 1;
    const logsPerPage = 2;

    const db = await connectToMongoDB();
    const collection = db.collection('register');
    const comPlayer = await collection.findOne({ discord_id: target_user.id });

    if (!comPlayer || !comPlayer.reports || comPlayer.reports.length === 0) {
        return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription('❗ This player has no reports.')
                            .setColor('#ff0557')
                                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                          
                    ]
                })

    
    }

    const totalReports = comPlayer.reports.length;
    const totalPages = Math.ceil(totalReports / logsPerPage);

    if (totalReports === 0) {
      return interaction.reply('No reports found for this player.');
    }

    // Sort reports by date in descending order (most recent first)
    comPlayer.reports.sort((a, b) => b.date - a.date);

    const getReports = (page) => {
      return comPlayer.reports.slice((page - 1) * logsPerPage, page * logsPerPage);
    };

    const reports = getReports(page);

    const embed = new EmbedBuilder()
      .setTitle(`Reports for ${target_user.tag}`)
          .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
      .setColor('#ff0557')
      .setDescription(
        reports.map(
          (report, index) => `
            **Report #${(page - 1) * logsPerPage + index + 1}**
            **Reported By:** <@${report.reported_by}> (\`${report.reported_by}\`)
            **Report Type:** \`${report.report_type}\`
            **Evidence** \`\`\`${report.evidence || 'None'}\`\`\`
            **Date:** <t:${Math.floor(report.date / 1000)}:R>
          `
        ).join('\n')
      )
      .setFooter({ text: `Page ${page} of ${totalPages}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('Previous')
        .setStyle('Primary'),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle('Primary')
        .setDisabled(page === totalPages)
    );

    await interaction.reply({ embeds: [embed], components: [row] });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (i) => {
      if (i.customId === 'prev') {
        page = page > 1 ? page - 1 : totalPages;
      } else if (i.customId === 'next') {
        page = page < totalPages ? page + 1 : 1;
      }

      const updatedReports = getReports(page);
      const updatedEmbed = new EmbedBuilder()
        .setTitle(`Reports for ${target_user.tag}`)
            .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
        .setColor('#ff0557')
        .setDescription(
          updatedReports.map(
            (report, index) => `
              **Report #${(page - 1) * logsPerPage + index + 1}**
              **Reported By:** <@${report.reported_by}> (\`${report.reported_by}\`)
              **Report Type:** \`${report.report_type}\`
              **Evidence:** \`\`\`${report.evidence || 'None'}\`\`\`
              **Date:** <t:${Math.floor(report.date / 1000)}:R>
            `
          ).join('\n\n')
        )
        .setFooter({ text: `Page ${page} of ${totalPages}` });

      await i.update({ embeds: [updatedEmbed], components: [row] });
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({ components: [] });
      }
    });
  },
};
