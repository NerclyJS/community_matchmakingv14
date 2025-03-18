const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { connectToMongoDB, handleError } = require('../utility/utilFunctions');

module.exports = {
    description: 'Restarts the current match in the channel',
    data: new SlashCommandBuilder()
        .setName('force_restart_match')
        .setDescription('Restarts the current match in the channel'),
    staff_only: false,
    com_staff_only: true,
    parent: "staff",
    async execute(client, interaction) {
        await interaction.deferReply();

        const channelId = interaction.channel.id;

        try {
            const dbMongo = await connectToMongoDB();
            const matchesCollection = dbMongo.collection('matches');

            const match = await matchesCollection.findOne({ channel_id: channelId, picked: false });

            if (!match) {
                return setTimeout(() => interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription('❗ No valid match found for this channel or the match has already been completed.')
                        .setColor('#ff0557')
                            .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ]
                }), 2000);
            }

            // reset all 
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
            match.team_b_captain_picked = true;

            // shuffle and get new captains
            const shuffledPlayers = match.players.sort(() => 0.5 - Math.random());
            match.team_a_captain = shuffledPlayers.pop();
            match.team_b_captain = shuffledPlayers.pop();

            match.team_a_players = [match.team_a_captain];
            match.team_b_players = [match.team_b_captain];
            match.players = match.players.filter(player => player !== match.team_a_captain && player !== match.team_b_captain);

           
            await matchesCollection.updateOne(
                { _id: match._id },
                { $set: {
                    players: match.players,
                    team_a_players: match.team_a_players,
                    team_b_players: match.team_b_players,
                    team_a_captain: match.team_a_captain,
                    team_b_captain: match.team_b_captain,
                    team_a_results: match.team_a_results,
                    team_b_results: match.team_b_results,
                    picked: match.picked,
                    winner: match.winner,
                    map: match.map,
                    team_a_captain_picked: match.team_a_captain_picked,
                    team_b_captain_picked: match.team_b_captain_picked
                }}
            );

        
            const restartEmbed = new EmbedBuilder()
                .setTitle('Match Restarted')
                .setDescription('Captains are now expected to select players using the **/pick** command.')
                .addFields([
                    {
                        name: 'Remaining Players',
                        value: match.players.length > 0
                            ? match.players.map(p => `<@${p}>`).join('\n')
                            : 'No players available'
                    },
                    {
                        name: 'Team A',
                        value: match.team_a_players.length > 0
                            ? match.team_a_players.map(p => `<@${p}> ${match.team_a_captain === p ? '(C)' : ''}`).join('\n')
                            : 'No players in Team A'
                    },
                    {
                        name: 'Team B',
                        value: match.team_b_players.length > 0
                            ? match.team_b_players.map(p => `<@${p}> ${match.team_b_captain === p ? '(C)' : ''}`).join('\n')
                            : 'No players in Team B'
                    }
                ])
                .setColor('#ff0557');

            const captainsMention = `<@${match.team_a_captain}> and <@${match.team_b_captain}>`;

            setTimeout(() => interaction.editReply({ content: `The match has been restarted! Captains: ${captainsMention}`, embeds: [restartEmbed] }), 2000);

        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};
