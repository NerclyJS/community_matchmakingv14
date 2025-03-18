const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { fetchPlayerData, refreshPlayer } = require('../utility/utilFunctions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('refresh_player')
        .setDescription('Refresh Player')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Select a user')
                .setRequired(true)
        ),
    staff_only: false,
    com_staff_only: true,
    parent: "staff",
    
    execute: async (client, interaction) => {  

        await interaction.deferReply();

        const userId = interaction.options.getUser('user').id;

        await refreshPlayer(client, interaction.guild.id, userId);

        const successEmbed = new EmbedBuilder()
            .setTitle('Success')
            .setDescription(`The profile of player <@${userId}> has been refreshed.`)
            .setColor('#ff0557')
            .setAuthor({
                name: 'Critical Ops Esports',
                iconURL: client.user.displayAvatarURL() 
            });

        setTimeout(() => interaction.editReply({ embeds: [successEmbed] }), 3000);
    }
};
