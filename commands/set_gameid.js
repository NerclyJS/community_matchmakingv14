
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { fetchPlayerData, refreshPlayer, handleError, updateGoxGameId } = require('../utility/utilFunctions');
const { connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_gameid')
    .setDescription('Set a new game ID for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Select a user')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('new_gameid')
        .setDescription('Enter the new game ID')
        .setRequired(true)
    ),

  com_staff_only: true,
  parent: "staff",


  execute: async (client, interaction) => {
      
      interaction.deferReply();
      const userId = interaction.options.getUser('user').id;
      const targetuser = interaction.options.getUser('user')
      const newGameId = interaction.options.getInteger('new_gameid');

      const db = await connectToMongoDB();
      const collection = db.collection('register');

      const player = await collection.findOne({ discord_id: userId });
      await updateGoxGameId(userId, newGameId)
      if (!player) {
        setTimeout(() => interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This player is not registered.')
            .setColor('#ff0557')
                   .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ]
        }), 3000);
      }

      const playerData = await fetchPlayerData('ids', newGameId);
      if (!playerData) {
        setTimeout(() => interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This player\'s in-game account could not be found.')
            .setColor('#ff0557')
                   .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ]
        }), 3000);
        return;
      }

      await collection.updateOne(
        { discord_id: userId },
        { 
          $set: { ingame_id: newGameId },  
          $push: { pastIds: player.ingame_id }  
        }
      );

   

      await refreshPlayer(client, interaction.guild.id, userId);

      const successEmbed = new EmbedBuilder()
        .setTitle('Success')
        .setDescription(`<@${userId}>’s in-game ID has been successfully updated.`)
        .setColor('#ff0557')
               .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ;


        const { addPlayerLog } = require('../utility/utilFunctions');
         await addPlayerLog(`${targetuser.username}(${targetuser.id})'s in-game ID (${player.ingame_id}) has been updated to ${newGameId} by ${interaction.user.username}(${interaction.user.id})`)


      setTimeout(() => interaction.editReply({ embeds: [successEmbed] }), 3000);



    }
};
