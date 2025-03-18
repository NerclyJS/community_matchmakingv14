const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { connectToMongoDB, warnPlayer, handleError } = require('../utility/utilFunctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a player')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('send_dm')
        .setDescription('Send a DM to the user?')
        .setRequired(true)
        .addChoices(
          { name: 'Yes', value: 'yes' },
          { name: 'No', value: 'no' }
        )
    ),
  staff_only: false,
  parent: "staff",
  com_staff_only: true,

execute: async (client, interaction) => {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const sendDM = interaction.options.getString('send_dm');

    try {
      await interaction.deferReply();
    } catch (error) {
      console.error('Defer reply failed:', error);
    }

    try {
      const db = await connectToMongoDB();
      const usersCollection = db.collection('register');

      const userData = await usersCollection.findOne({ discord_id: user.id });

      if (!userData) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('Player is not registered.')
          .setColor('#ff0557')
          .setAuthor({
            name: 'Critical Ops Esports',
            iconURL: client.user.displayAvatarURL()
          });

        try {
          await interaction.editReply({ embeds: [errorEmbed] });
        } catch (editError) {
          console.error('Edit reply failed:', editError);
          await interaction.channel.send({ embeds: [errorEmbed] });
        }
        return;
      }

      await warnPlayer(user.id, reason, interaction.user.id);

      let dmStatus = "DM Not Sent";

      if (sendDM === 'yes') {
        const dmEmbed = new EmbedBuilder()
          .setTitle('You have been warned')
          .setDescription(`You have received a warning.`)
          .addFields({ name: 'Reason', value: reason })
          .setColor('#ffdf00')
          .setTimestamp();

        try {
          await user.send({ embeds: [dmEmbed] });
          dmStatus = "DM Sent Successfully";
        } catch (dmError) {
          console.error(`Failed to send DM to ${user.tag}:`, dmError);
          dmStatus = "Failed to send DM";
        }
      }

      const successEmbed = new EmbedBuilder()
        .setTitle('Player Warned')
        .setDescription(`${user.tag} has been warned`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'DM Status', value: dmStatus }
        )
        .setColor('#ffdf00')
        .setTimestamp();

      try {
        await interaction.editReply({ embeds: [successEmbed] });
      } catch (editError) {
        console.error('Edit reply failed:', editError);
        await interaction.channel.send({ embeds: [successEmbed] });
      }

      const { addPlayerLog } = require('../utility/utilFunctions');
      await addPlayerLog(`${user.username}(${user.id}) was warned by ${interaction.user.username}(${interaction.user.id}) for "${reason}"`);

    } catch (error) {
      const embed = await handleError(error, interaction, client);

      try {
        await interaction.editReply({ embeds: [embed] });
      } catch (editError) {
        console.error('Edit reply failed:', editError);
        await interaction.channel.send({ embeds: [embed] });
      }
    }
  }
};
