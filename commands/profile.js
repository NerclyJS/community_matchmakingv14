const fs = require('fs');
const fetch = require('node-fetch');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require('discord.js');
const { fetchPlayerData, getPlayer, banCheck, handleError, refreshPlayer } = require('../utility/utilFunctions');
const { playerCardGeneratorCom } = require('../utility/playerCardGeneratorCom');
const db = require('quick.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your COM stats')
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

            const attachment = await playerCardGeneratorCom(client, interaction, playerData, comPlayer);
            const banInfo = await banCheck(target_user.id);
    
     let components = [];

            if (target_user.id !== interaction.user.id) {
                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`report_player_${target_user.id}`)
                        .setLabel('Report Player')
                        .setStyle('Danger')
                ));
            }


            if (banInfo.length > 0) {
                const now = Math.floor(Date.now() / 1000);
                const endTimestamp = Math.floor(banInfo[0].end / 1000);
                const remainingTime = banInfo[0].end - Date.now();

                let remainingText = remainingTime > 200 * 24 * 60 * 60 * 1000 ? '**PERMANENT**' : `<t:${endTimestamp}:R>`;
                const banEmbed = new EmbedBuilder()
                    .setDescription(`❗ This Player was banned for **${banInfo[0].reason}**. Remaining time: ${remainingText}`)
                    .setColor('#ff0557');

                return interaction.editReply({ files: [attachment], embeds: [banEmbed], components });
            } else {
                interaction.editReply({ embeds: [], files: [attachment], components});
            }
        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed], components });
        }






client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('report_player_')) {
        const targetUserId = interaction.customId.split('_')[2]; 

        await interaction.reply({
            ephemeral: true,
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Report Player')
                    .setDescription('Why do you want to report this player? Please select a reason below. Reports without evidence will not be taken into consideration.')
                    .setFooter({text:`Target User ID: ${targetUserId}` })
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('report_reason')
                        .setPlaceholder('Select a reason')
                        .addOptions([
                            { label: 'Hacking', value: `hacking_${targetUserId}` },
                            { label: 'Toxicity / Racism', value: `toxicity_${targetUserId}` },
                            { label: 'Playing with an unlinked account', value: `unlinked_${targetUserId}` },
                            { label: 'Leaving the game without a sub', value: `leavesub_${targetUserId}` },
                            { label: 'Leaving after players are picked', value: `leavepick_${targetUserId}` },
                            { label: 'Other', value: `other_${targetUserId}` }
                        ])
                )
            ]
        });
    }
});



}
};
