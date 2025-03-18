const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { connectToMongoDB, refreshPlayer, addPlayerLog } = require('../utility/utilFunctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update_player_stats')
    .setDescription('Update player statistics')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Select the type of statistic to update')
        .setRequired(true)
        .addChoices(
          { name: 'Elo', value: 'elo' },
          { name: 'Wins', value: 'wins' },
          { name: 'Losses', value: 'losses' }
        )
    )
    .addUserOption(option =>
      option.setName('player')
        .setDescription('Select a player')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Select the action')
        .setRequired(true)
        .addChoices(
          { name: 'Set', value: 'set' },
          { name: 'Remove', value: 'remove' },
          { name: 'Add', value: 'add' }
        )
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Enter the amount')
        .setRequired(true)
    ),
  com_staff_only: true,
  parent: "staff",

  execute: async (client, interaction) => {
    await interaction.deferReply();

    const type = interaction.options.getString('type');
    const targetUser = interaction.options.getUser('player');
    const userId = targetUser.id;
    const action = interaction.options.getString('action');
    const amount = interaction.options.getInteger('amount');

    const db = await connectToMongoDB();
    const collection = db.collection('register');

    let player = await collection.findOne({ discord_id: userId });

    if (!player) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('Error')
          .setDescription('This player is not registered.')
          .setColor('#ff0557')
          .setAuthor({
            name: 'Critical Ops Esports',
            iconURL: client.user.displayAvatarURL()
          })]
      });
    }

 
    switch (action) {
      case 'set':
        player.matchmaking[type] = amount;
        break;
      case 'add':
        player.matchmaking[type] += amount;
        break;
      case 'remove':
        player.matchmaking[type] -= amount;
        break;
    }


    await collection.updateOne(
      { discord_id: userId },
      { $set: { [`matchmaking.${type}`]: player.matchmaking[type] } }
    );


    await refreshPlayer(client, interaction.guild.id, userId);

    
    const successEmbed = new EmbedBuilder()
      .setTitle('Success')
      .setDescription(`The ${type} for <@${userId}> has been successfully updated.`)
      .addFields({ name: 'New Value', value: player.matchmaking[type].toString()})
      .setColor('#ff0557')
      .setAuthor({
        name: 'Critical Ops Esports',
        iconURL: client.user.displayAvatarURL()
      });

 
    await addPlayerLog(`${interaction.user.username}(${interaction.user.id}) applied '${action}' action on ${type} for player ${targetUser.username}(${targetUser.id}). Amount: ${amount}`);

   
    setTimeout(() => {
      interaction.editReply({ embeds: [successEmbed] });
    }, 3000);
  }
};
