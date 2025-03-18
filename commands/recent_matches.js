const fs = require('fs');
const fetch = require('node-fetch');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require('discord.js');
const { fetchPlayerData, getPlayer, banCheck, handleError, refreshPlayer } = require('../utility/utilFunctions');
const { recentMatchesGenerator } = require('../utility/recentMatchesGenerator');
const db = require('quick.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recent_matches')
        .setDescription('View your recent matches')
        .addUserOption(option => 
            option.setName('player')
                .setDescription('Select Player')
                .setRequired(false)),
        
    staff_only: false,
    
    async execute(client, interaction) {
        const hata = new EmbedBuilder().setColor('#ff0557');
        const target_user = interaction.options.getUser('player') || interaction.user;
        const comPlayer = await getPlayer(target_user.id);

        if (comPlayer == null) {
            interaction.reply({ embeds: [hata.setDescription('❗ This player is not registered.')] });
            return;
        }

        const usernames = comPlayer.ingame_id;
        let playerData = await fetchPlayerData('ids', usernames);
        interaction.reply({ embeds: [new EmbedBuilder().setColor(client.nercly.color).setDescription('<a:loading:1179059484509884476> `Loading player stats...`')] });

        await refreshPlayer(client, interaction.guild.id, target_user.id);

        try {
            const tokenCheck = await fetchPlayerData('ign', 'nercly');
            if (tokenCheck == null) {
                interaction.editReply({ embeds: [hata.setDescription('❗ The service is currently unavailable. Please try again later.')] });
                return;
            }

            const attachment = await recentMatchesGenerator(client, interaction, playerData, comPlayer);
            const banInfo = await banCheck(target_user.id);
    

            if (banInfo.length > 0) {
                const now = Math.floor(Date.now() / 1000);
                const endTimestamp = Math.floor(banInfo[0].end / 1000);
                const remainingTime = banInfo[0].end - Date.now();

                let remainingText = remainingTime > 200 * 24 * 60 * 60 * 1000 ? '**PERMANENT**' : `<t:${endTimestamp}:R>`;
                const banEmbed = new EmbedBuilder()
                    .setDescription(`❗ This Player was banned for **${banInfo[0].reason}**. Remaining time: ${remainingText}`)
                    .setColor('#ff0557');

                return interaction.editReply({ files: [attachment], embeds: [banEmbed] });
            } else {
                interaction.editReply({ embeds: [], files: [attachment],});
            }
        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }


}
};
