const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { connectToMongoDB, addPlayerLog } = require('../utility/utilFunctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfer_account')
    .setDescription('Transfer a registered account to another Discord user')
    .addUserOption(option =>
      option.setName('source_user')
        .setDescription('Select the source user (registered user)')
        .setRequired(true)
    )
    .addUserOption(option =>
      option.setName('target_user')
        .setDescription('Select the target user (must not be registered)')
        .setRequired(true)
    ),
  com_staff_only: true,
  parent: 'staff',

  execute: async (client, interaction) => {
        await interaction.deferReply();

        const sourceUserId = interaction.options.getUser('source_user').id;
        const targetUserId = interaction.options.getUser('target_user').id;
        const sourceUserTag = interaction.options.getUser('source_user').tag;
        const targetUserTag = interaction.options.getUser('target_user').tag; 

        const db = await connectToMongoDB();
        const collection = db.collection('register');

     
        const sourceUser = await collection.findOne({ discord_id: sourceUserId });

        if (!sourceUser) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('Error')
                    .setDescription('The source user is not registered.')
                    .setColor('#ff0557')
                           .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ]
            });
        }

      
        const targetUser = await collection.findOne({ discord_id: targetUserId });

        if (targetUser) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('Error')
                    .setDescription('The target user is already registered.')
                    .setColor('#ff0557')
                           .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ]
            });
        }

       
        await collection.updateOne(
            { discord_id: sourceUserId },
            { $set: { discord_id: targetUserId } }
        );

     
        await addPlayerLog(
            `${sourceUserTag} (${sourceUserId}) transferred to ${targetUserTag} (${targetUserId}) by ${interaction.user.tag} (${interaction.user.id})`
        );

        const successEmbed = new EmbedBuilder()
            .setTitle('Success')
            .setDescription(`Account has been transferred from <@${sourceUserId}> to <@${targetUserId}>.`)
            .setColor('#ff0557')
                   .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ;

        await interaction.editReply({ embeds: [successEmbed] });
    }
};