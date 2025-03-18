const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder 
} = require('discord.js');

const { QuickDB } = require('quick.db');
const qdb = new QuickDB();
const { connectToMongoDB, handleError } = require('../utility/utilFunctions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart_match')
        .setDescription('Restarts the current match in this channel (Captains Only)'),

    async execute(client, interaction) {
        await interaction.deferReply(); 

        const channelId = interaction.channel.id;
        const requestingCaptain = interaction.user.id;

        try {
            const dbMongo = await connectToMongoDB();
            const matchesCollection = dbMongo.collection('matches');

            const match = await matchesCollection.findOne({ channel_id: channelId, picked: false });

            if (!match) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription('❗ No valid match found for this channel, or the match is already completed.')
                        .setColor('#ff0557')
                        .setAuthor({ name: 'Critical Ops Esports', iconURL: client.user.displayAvatarURL() })
                    ]
                });
            }

            if (requestingCaptain !== match.team_a_captain && requestingCaptain !== match.team_b_captain) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription('❗ You are not a captain.')
                        .setColor('#ff0557')
                        .setAuthor({ name: 'Critical Ops Esports', iconURL: client.user.displayAvatarURL() })
                    ]
                });
            }

            const lastUsed = qdb.get(`restartCooldown_${channelId}`);
            const now = Date.now();

            if (lastUsed && now - lastUsed < 20000) {
                const remainingSeconds = Math.ceil((20000 - (now - lastUsed)) / 1000);

                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setDescription(`❗ You need to wait **${remainingSeconds} seconds** to use this command again.`)
                        .setColor('#ff0557')
                        .setAuthor({ name: 'Critical Ops Esports', iconURL: client.user.displayAvatarURL() })
                    ]
                });
            }

            qdb.set(`restartCooldown_${channelId}`, now);

            const confirmingCaptain = requestingCaptain === match.team_a_captain ? match.team_b_captain : match.team_a_captain;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_restart')
                    .setLabel('Confirm')
                    .setStyle(3), // SUCCESS (Yeşil)
                new ButtonBuilder()
                    .setCustomId('cancel_restart')
                    .setLabel('Cancel')
                    .setStyle(4) // DANGER (Kırmızı)
            );

            const embed = new EmbedBuilder()
                .setTitle('Restart Match?')
                .setDescription(`Match restart request sent by <@${requestingCaptain}>! Waiting for confirmation from <@${confirmingCaptain}>.`)
                .setColor('#ff0557');

            interaction.editReply({ content: `<@${confirmingCaptain}>`, embeds: [embed], components: [row] });

            const filter = i => 
                (i.customId === 'confirm_restart' || i.customId === 'cancel_restart') && i.user.id === confirmingCaptain;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

            collector.on('collect', async i => {
                collector.stop();

                if (i.customId === 'confirm_restart') {
                    const successEmbed = new EmbedBuilder()
                        .setDescription('The match has been restarted by captains!')
                        .setColor('#00ff51');

                    await interaction.editReply({ content: null, embeds: [successEmbed], components: [] });

                    match.players.push(...match.team_a_players, ...match.team_b_players);
                    match.team_a_players = [];
                    match.team_b_players = [];
                    match.team_a_captain = null;
                    match.team_b_captain = null;
                    match.team_a_results = [];
                    match.team_b_results = [];
                    match.picked = false;
                    match.winner = null;
                    match.map = '';
                    match.team_a_captain_picked = false;
                    match.team_b_captain_picked = false;

                    const shuffledPlayers = match.players.sort(() => 0.5 - Math.random());
                    match.team_a_captain = shuffledPlayers.pop();
                    match.team_b_captain = shuffledPlayers.pop();

                    match.team_a_players = [match.team_a_captain];
                    match.team_b_players = [match.team_b_captain];
                    match.players = match.players.filter(p => p !== match.team_a_captain && p !== match.team_b_captain);

                    await matchesCollection.updateOne(
                        { _id: match._id },
                        { $set: { ...match } }
                    );

                    const restartEmbed = new EmbedBuilder()
                        .setTitle('Match Restarted')
                        .setDescription('Waiting for captains to pick players using **/pick**')
                        .addFields([
                            {
                                name: 'Remaining Players',
                                value: match.players.length > 0 
                                    ? match.players.map(p => `<@${p}>`).join('\n') 
                                    : 'No players'
                            },
                            {
                                name: 'Team A',
                                value: match.team_a_players.length > 0 
                                    ? match.team_a_players.map(p => `<@${p}> ${match.team_a_captain === p ? '(C)' : ''}`).join('\n') 
                                    : 'No players'
                            },
                            {
                                name: 'Team B',
                                value: match.team_b_players.length > 0 
                                    ? match.team_b_players.map(p => `<@${p}> ${match.team_b_captain === p ? '(C)' : ''}`).join('\n') 
                                    : 'No players'
                            }
                        ])
                        .setColor('#ff0557');

                    interaction.channel.send({ 
                        content: `Match has been recreated! Captains: <@${match.team_a_captain}> and <@${match.team_b_captain}>`, 
                        embeds: [restartEmbed] 
                    });

                } else {
                    const cancelEmbed = new EmbedBuilder()
                        .setDescription(`Match restart request was cancelled by <@${confirmingCaptain}>`)
                        .setColor('#ff0557');

                    interaction.channel.send({ content: null, embeds: [cancelEmbed], components: [] });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setDescription('Match restart request timed out.')
                        .setColor('#ff0557');

                    interaction.channel.send({ content: null, embeds: [timeoutEmbed], components: [] });
                    collector.stop();
                }
            });

        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};
