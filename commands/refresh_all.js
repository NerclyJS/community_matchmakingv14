const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { fetchPlayerData, refreshPlayer, connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('refresh_all')
        .setDescription('Refresh all registered players'),

    owner_only: true,
    parent: "staff",

    async execute(client, interaction) {
    try {
        interaction.reply({ embeds: [new EmbedBuilder().setColor(client.nercly.color).setDescription('<a:loading:1179059484509884476> `...`')] });

      
      const db = await connectToMongoDB();  
      const collection = db.collection('register');

    
      const players = await collection.find().toArray();

      
      for (const player of players) {
        const userId = player.discord_id;
        await refreshPlayer(client, interaction.guild.id, userId);
      }

    
      const successEmbed = new EmbedBuilder()
        .setTitle('Success')
        .setDescription('All player profiles have been refreshed.')
        .setColor('#ff0557')
    

      setTimeout(() => interaction.editReply({ embeds: [successEmbed] }), 3000);
      
    } catch (error) {
      console.error('Error refreshing players:', error);
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('An error occurred while refreshing player profiles.')
        .setColor('#ff0000')
    

      setTimeout(() => interaction.editReply({ embeds: [errorEmbed] }), 3000);
    }
  }
};
