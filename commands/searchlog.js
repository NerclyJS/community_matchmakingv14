const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { connectToMongoDB } = require('../utility/utilFunctions');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('searchlogs')
    .setDescription('Search logs and display results in an embed.')
    .addStringOption(option =>
      option.setName('search_term')
        .setDescription('Search term')
        .setRequired(true)
    ),
  com_staff_only: true,
  parent: "staff",

  execute: async (client, interaction) => {
  
    const searchTerm = interaction.options.getString('search_term');
    let page = 1;
    const logsPerPage = 7;

    const db = await connectToMongoDB();
    const collection = db.collection('playerlogs');

    const countLogs = await collection
      .find({ message: { $regex: searchTerm, $options: 'i' } })
      .count(); 

    const totalPages = Math.ceil(countLogs / logsPerPage);

    if (countLogs === 0) {
      return interaction.reply('No logs matching the search criteria were found.');
    }

    const getLogs = async (page) => {
      return collection
        .find({ message: { $regex: searchTerm, $options: 'i' } })
        .sort({ timestamp: -1 })
        .skip((page - 1) * logsPerPage)
        .limit(logsPerPage)
        .toArray();
    };

    const logs = await getLogs(page);

    const embed = new EmbedBuilder()
            .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
        .setColor('#ff0557')
      .setTitle(`Search result for '${searchTerm}'`)
      .setDescription(
        logs.map(
          (log) => `${log.message}\n <t:${Math.floor(log.timestamp / 1000)}:R>`
        ).join('\n\n')
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
    );

    await interaction.reply({ embeds: [embed], components: [row] }).catch(() => {
      interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row]}).catch(console.error);
  });
    
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (i) => {
      if (i.customId === 'prev') {
        if (page > 1) {
          page--;
        } else {
          page = totalPages;  
        }
      } else if (i.customId === 'next') {
        if (page < totalPages) {
          page++;
        } else {
          page = 1;  
        }
      }

      const updatedLogs = await getLogs(page);
      const updatedEmbed = new EmbedBuilder()
          .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
        .setColor('#ff0557')
        .setTitle(`Search result for '${searchTerm}'`)
        .setDescription(
          updatedLogs.map(
           (log) => `${log.message}\n <t:${Math.floor(log.timestamp / 1000)}:R>`
          ).join('\n\n')
        )
        .setFooter({ text: `Page ${page} of ${totalPages}` });

      await i.update({ embeds: [updatedEmbed] });
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({ components: [] });
      }
    });
  },
};

function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);

  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
}
