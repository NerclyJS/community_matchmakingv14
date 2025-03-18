const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { connectToMongoDB, handleError} = require('../utility/utilFunctions');

module.exports = {
    description: 'Add sub to match',
    data: new SlashCommandBuilder()
        .setName('add_sub')
        .setDescription('Add substitution to match')
        .addIntegerOption(option =>
            option.setName('match_id')
                .setDescription('The match ID')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('current_player')
                .setDescription('The player to be substituted')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('new_player')
                .setDescription('The player to substitute in')
                .setRequired(true)),
    staff_only: false,
    parent: "staff",
    com_staff_only: true,
    async execute(client, interaction) {
        try {
            const matchId = interaction.options.getInteger('match_id');
            const currentPlayer = interaction.options.getUser('current_player');
            const newPlayer = interaction.options.getUser('new_player');

            const db = await connectToMongoDB();
            const matchesCollection = db.collection('matches');
            
            const match = await matchesCollection.findOne({ match_id: matchId });

            if (!match) {
                return interaction.reply({ content: `Match with ID ${matchId} not found`, ephemeral: true });
            }

            const teamAIndex = match.team_a_players.indexOf(currentPlayer.id);
            const teamBIndex = match.team_b_players.indexOf(currentPlayer.id);

            if (teamAIndex === -1 && teamBIndex === -1) {
                return interaction.reply({ content: `Player <@${currentPlayer.id}> not found in match with ID ${matchId}`, ephemeral: true });
            }

            const update = {};
            if (teamAIndex !== -1) {
                update[`team_a_players.${teamAIndex}`] = newPlayer.id;
            } else if (teamBIndex !== -1) {
                update[`team_b_players.${teamBIndex}`] = newPlayer.id;
            }

            await matchesCollection.updateOne(
                { match_id: matchId },
                { $set: update }
            );

            const embed = new EmbedBuilder()
                .setTitle('Player Substitution')
                .setDescription(`In match with ID ${matchId}, <@${currentPlayer.id}> was successfully substituted with <@${newPlayer.id}>.`)
                .setColor('#ff0557')
                .setTimestamp();

            interaction.reply({ embeds: [embed] });

            const { addPlayerLog } = require('../utility/utilFunctions');
            await addPlayerLog(`In match with ID ${matchId}, ${currentPlayer.username}(${currentPlayer.id}) was substituted with ${newPlayer.username}(${newPlayer.id}) by ${interaction.user.username}(${interaction.user.id}) `)

        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};
