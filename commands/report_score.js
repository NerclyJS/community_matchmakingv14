const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, SlashCommandBuilder  } = require("discord.js");
const { connectToMongoDB, handleError, getPlayer } = require('../utility/utilFunctions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report_score')
        .setDescription('Report Score')
        .addAttachmentOption(option =>
            option.setName('screenshot')
                .setDescription('Upload a screenshot of the match.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('match_id')
                .setDescription('Match ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('comments')
                .setDescription('Any comments or something to mention about the match?')
                .setRequired(true)),

    execute: async (client, interaction) => {
        await interaction.deferReply().catch(() => {});

        const screenshot = interaction.options.getAttachment('screenshot');
        const matchId = interaction.options.getInteger('match_id');
        const comments = interaction.options.getString('comments');

        try {
            const dbMongo = await connectToMongoDB();
            const matchesCollection = dbMongo.collection('matches');
            const reportsCollection = dbMongo.collection('matchReports');

            const match = await matchesCollection.findOne({ match_id: matchId });
            const completedMatchesCollection = dbMongo.collection('completedMatches');

   if (!match) {
    const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(':x: No match found.')
        .setColor('#ff0557')
          .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 

    interaction.editReply({ embeds: [errorEmbed] }).catch(() => {
        interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [errorEmbed] }).catch(console.error);
    });

    return;
}


       
            const completedMatch = await completedMatchesCollection.findOne({ match_id: matchId });

            if (completedMatch) {
setTimeout(() => {
    const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('This match has already been completed.')
        .setColor('#ff0557')
          .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 

    interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {
        interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [errorEmbed] }).catch(console.error);
    });
}, 3000);

return;
            }

            const userId = interaction.user.id;
            const isPlayerInMatch = match.team_a_players.includes(userId) || match.team_b_players.includes(userId);

            if (!isPlayerInMatch) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription(':x: You did not play in this match.')
                        .setColor('#ff0557')
                            .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                    ]
                });
            }



        const existingUserReport = await reportsCollection.findOne({ match_id: matchId, reported_by: interaction.user.id });



            if (existingUserReport) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription(':x: You already have a report for this match. If your report is insufficient, someone else in the match can submit additional screenshots.')
                        .setColor('#ff0557')
                            .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                    ]
                });
            }



            // Rapor Embed'i oluştur
      



            const getPlayerIGN = async (playerId) => {
                const playerData = await getPlayer(playerId);
                return playerData ? `\`${playerData.ign}\`` : '`Unknown IGN`';
            };

            const teamAPlayers = await Promise.all((match.team_a_players || []).map(async (p) => {
                const ign = await getPlayerIGN(p);
                return `<@${p}> // ${ign} ${match.team_a_captain === p ? '(C)' : ''}`;
            }));

            const teamBPlayers = await Promise.all((match.team_b_players || []).map(async (p) => {
                const ign = await getPlayerIGN(p);
                return `<@${p}> // ${ign} ${match.team_b_captain === p ? '(C)' : ''}`;
            }));

            const winner = match.winner === null ? 'N/A' : (match.winner === 'team_a' ? 'Team A Won' : 'Team B Won');
            const embedColor = match.winner === null ? '#ff0557' : '#00ff51';

            const attachment = new AttachmentBuilder(screenshot.url, { name: 'screenshot.png' });


            const embed = new EmbedBuilder()
                .setTitle(`Match ID: ${matchId}`)
                .setDescription(`Comments: ${comments}`)
                .setImage('attachment://screenshot.png') 
                .setColor(embedColor)
                .setAuthor({
                    name: 'Critical Ops Esports',
                    iconURL: client.user.displayAvatarURL()
                })
                .addFields(
                    {
                        name: `Team A${match.winner === 'team_a' ? ' (Winner)' : ''}`,
                        value: teamAPlayers.join('\n') || 'No players',
                        inline: false
                    },
                    {
                        name: `Team B${match.winner === 'team_b' ? ' (Winner)' : ''}`,
                        value: teamBPlayers.join('\n') || 'No players',
                        inline: false
                    }
                )
                .setFooter({ text: `Reported by: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });


         //    const reportChannelId = '975704371654455316';
          const reportChannelId = '1167287805978886294';
            const reportChannel = await client.channels.fetch(reportChannelId);
            if (!reportChannel) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription(':x: Report channel not found.')
                        .setColor('#ff0557')
                            .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                    ]
                });
            }

            async function getEmbedImageUrlByMessageId(client, messageId) {
    try {
   
        const message = await client.channels.cache.get(reportChannelId).messages.fetch(messageId);
        if (message.embeds.length > 0 && message.embeds[0].image) {
            const imageUrl = message.embeds[0].image.url;
            return imageUrl
        } else {
            console.log("No embed or image found in this message.");
        }
    } catch (error) {
        console.error("Error fetching message or embed:", error);
    }
}
const row = new ActionRowBuilder()
.addComponents(
    new ButtonBuilder()
        .setCustomId(`score-${matchId}-team_a`)
        .setLabel('Team A')
        .setStyle('Primary'),
    new ButtonBuilder()
        .setCustomId(`score-${matchId}-team_b`)
        .setLabel('Team B')
        .setStyle('Primary'),
    new ButtonBuilder()
        .setCustomId(`score-${matchId}-void`)
        .setLabel('Void')
        .setStyle('Danger') 
);
     
            const existingReport = await reportsCollection.findOne({ match_id: matchId });

            if (existingReport) {
             
                try {
                    const reportMessage = await reportChannel.messages.fetch(existingReport.report_message_id);
                    if (reportMessage) {
                        const reply = await reportMessage.reply({
                            files: [attachment],
                            embeds: [new EmbedBuilder()
                                .setTitle(`Another Report For Match ID: ${matchId}`)
           .setDescription(`Comments: ${comments}`)
                .setImage('attachment://screenshot.png') 
                .setColor(embedColor)
                .setAuthor({
                    name: 'Critical Ops Esports',
                    iconURL: client.user.displayAvatarURL()
                })
                .addFields(
                    {
                        name: `Team A${match.winner === 'team_a' ? ' (Winner)' : ''}`,
                        value: teamAPlayers.join('\n') || 'No players',
                        inline: false
                    },
                    {
                        name: `Team B${match.winner === 'team_b' ? ' (Winner)' : ''}`,
                        value: teamBPlayers.join('\n') || 'No players',
                        inline: false
                    }
                )
                .setFooter({ text: `Reported by: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                            ]
                        });


                        const attachmentUrl = await getEmbedImageUrlByMessageId(client, reply.id)

             
                        await reportsCollection.insertOne({
                            match_id: matchId,
                            reported_by: interaction.user.id,
                            screenshot_url: attachmentUrl,
                            comments,
                            report_message_id: reply.id,
                            timestamp: new Date()
                        });

                       const successEmbed = new EmbedBuilder()
    .setTitle('Success')
    .setDescription(':white_check_mark: Another report has been added to the existing match report.')
    .setColor('#00ff51')
      .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 

interaction.editReply({ embeds: [successEmbed] }).catch(() => {
    interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [successEmbed] }).catch(console.error);
});

return;
                    }
                } catch (err) {
                    console.error("replying errorı:", err);
                }
            }

        
            const reportMessage = await reportChannel.send({ files: [attachment], embeds: [embed], components: [row] });


 const attachmentUrl = await getEmbedImageUrlByMessageId(client, reportMessage.id)

       
            await reportsCollection.insertOne({
                match_id: matchId,
                reported_by: interaction.user.id,
                screenshot_url: attachmentUrl,
                comments,
                report_message_id: reportMessage.id,
                timestamp: new Date()
            });

          const successEmbed = new EmbedBuilder()
    .setTitle('Success')
    .setDescription(':white_check_mark: Match report has been successfully submitted.')
    .setColor('#00ff51')
      .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 

interaction.editReply({ embeds: [successEmbed] }).catch(() => {
    interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [successEmbed] }).catch(console.error);
});

return;


        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};


