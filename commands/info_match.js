const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { connectToMongoDB, handleError, getPlayer } = require('../utility/utilFunctions');
const { matchDesignGenerator } = require('../utility/matchDesignGenerator');

module.exports = {
    description: 'Get Match Info',
    data: new SlashCommandBuilder()
        .setName('info_match')
        .setDescription('Fetch information about a specific match')
        .addIntegerOption(option =>
            option.setName('match_id')
                .setDescription('The ID of the match')
                .setRequired(true)),
    staff_only: false,
    async execute(client, interaction) {
        try {
            const matchId = interaction.options.getInteger('match_id');
            const db = await connectToMongoDB();
            const completedMatchesCollection = db.collection('completedMatches');
            const matchesCollection = db.collection('matches');
            const reportsCollection = db.collection('matchReports');

            const reports = await reportsCollection.find({ match_id: matchId }).toArray();

            let match = await completedMatchesCollection.findOne({ match_id: matchId });

            if (!match) {
                match = await matchesCollection.findOne({ match_id: matchId });
            }

            if (!match) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription(`Match ID: ${matchId} not found`)
                        .setColor('#ff0557')
                        .setAuthor({
                            name: 'Critical Ops Esports', 
                            iconURL: client.user.displayAvatarURL() 
                        })
                    ]
                });
            }

            await interaction.deferReply();

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

            const winner = match.winner === null ? 'N/A' : (match.winner === 'team_a' ? 'Team A won' : 'Team B won');
            const embedColor = match.winner === null ? '#ff0557' : '#00ff51';

            const matchEmbed = new EmbedBuilder()
            .setTitle(`Match ID: ${match.match_id}`)
            .addFields(
                { name: `Team A${match.winner === 'team_a' ? ' (Winner)' : ''}`, value: teamAPlayers.join('\n') || 'No players' },
                { name: `Team B${match.winner === 'team_b' ? ' (Winner)' : ''}`, value: teamBPlayers.join('\n') || 'No players' },
                { name: 'Results', value: 
                    `${(match.team_a_results || []).join('\n') || 'Match not finished yet'}\n\n` + 
                    `${(match.team_b_results || []).join('\n') || ''}` 
                }
            )
            .setColor('#ff0038')
            .setFooter({
                text: `Match Date: ${match.creation_date}${match.isDouble ? ' - ⚡ Double Points' : ''}`,
                iconURL: client.user.displayAvatarURL()
            })
            .setAuthor({
                name: 'Critical Ops Esports',
                iconURL: client.user.displayAvatarURL()
            });

            let attachment = '';

            if (match.map) {
                attachment = await matchDesignGenerator(client, interaction, match.match_id, match.map);
            } else {
                attachment = await matchDesignGenerator(client, interaction, match.match_id, 'no_map_info');
            }

            let components = [];

            if (reports.length > 0) {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId('screenshot_select')
                    .setPlaceholder('Reported screenshots')
                    .addOptions(reports.map((report, index) => ({
                        label: `Reported Screenshot by ${client.users.cache.get(report.reported_by)?.tag || 'Unknown'}`,
                        value: `screenshot_${index + 1}`,
                        description: `Screenshot ${index + 1}`
                    })));

                components.push(new ActionRowBuilder().addComponents(menu));
            }

            const message = await interaction.editReply({
                embeds: [matchEmbed.setImage('attachment://match_design.png')],
                files: [attachment],
                components
            });

            const filter = i => i.customId === 'screenshot_select' && i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                const selectedIndex = parseInt(i.values[0].split('_')[1]) - 1;
                if (reports[selectedIndex]) {
                    await i.update({
                        embeds: [matchEmbed.setImage(reports[selectedIndex].screenshot_url).setDescription(`**Reported Screenshot by** <@${reports[selectedIndex].reported_by}>\n**Comments:** ${reports[selectedIndex].comments}`)],
                        files: [],
                        components
                    });
                }
            });
        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};
