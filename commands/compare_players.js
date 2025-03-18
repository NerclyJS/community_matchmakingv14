const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
    description: 'Check the stats of a target player against other players in both the same team and opponent team.',
    data: new SlashCommandBuilder()
        .setName('compare_players')
        .setDescription('Compare the stats of a target player with another player.')
        .addUserOption(option =>
            option.setName('target_player')
                .setDescription('Select the target player')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('other_player')
                .setDescription('Select the other player')
                .setRequired(true)),
    com_staff_only: true,
    parent: "staff",
    async execute(client, interaction) {
        try {


      try {
            await interaction.deferReply();
        } catch (error) {
            console.error('Defer reply failed:', error);
        
        }
            const targetPlayerId = interaction.options.getUser('target_player').id;
            const otherPlayerId = interaction.options.getUser('other_player').id;
         

            const { connectToMongoDB } = require('../utility/utilFunctions');
            const mdb = await connectToMongoDB();
            const completedMatches = mdb.collection('completedMatches');

         
            async function fetchDiscordName(userId) {
                const mdb = await connectToMongoDB(); 
                const registerCollection = mdb.collection('register'); 
            
                // artık discord değil
                const user = await registerCollection.findOne({ discord_id: userId }).catch(() => null);
                return user ? user.ign : "Unknown"; 
            }
            

      
            const matches = await completedMatches.find({
                $or: [{ team_a_players: targetPlayerId }, { team_b_players: targetPlayerId }]
            }).toArray();

            let sameTeamMatches = [];
            let opponentStats = {};
            let playerStats = {};

          
            opponentStats[otherPlayerId] = { matches: 0, wins: 0, losses: 0 };
            playerStats[targetPlayerId] = { sameTeamMatches: 0, wins: 0, losses: 0, opponentMatches: 0, opponentWins: 0, opponentLosses: 0 };

            for (let m of matches) {
                const isTeamA = m.team_a_players.includes(targetPlayerId); 
                const sameTeam = isTeamA ? m.team_a_players : m.team_b_players; 

               
                if (sameTeam.includes(otherPlayerId)) {
                    playerStats[targetPlayerId].sameTeamMatches++;
                    const isWinner = m.winner === (isTeamA ? "team_a" : "team_b");
                    if (isWinner) playerStats[targetPlayerId].wins++;
                    else playerStats[targetPlayerId].losses++;

                    sameTeamMatches.push({
                        matchId: m.match_id,
                        players: await Promise.all(sameTeam.map(fetchDiscordName)),
                        result: isWinner ? "Win" : "Loss"
                    });
                }

         
                const opponentTeam = isTeamA ? m.team_b_players : m.team_a_players;
                if (opponentTeam.includes(otherPlayerId)) {
                    playerStats[targetPlayerId].opponentMatches++;
                    const isWinner = m.winner === (isTeamA ? "team_a" : "team_b");
                    if (isWinner) playerStats[targetPlayerId].opponentWins++;
                    else playerStats[targetPlayerId].opponentLosses++;

                    opponentStats[otherPlayerId].matches++;
                    if (isWinner) opponentStats[otherPlayerId].wins++;
                    else opponentStats[otherPlayerId].losses++;
                }
            }

            let statsText = `Target Player: ${await fetchDiscordName(targetPlayerId)}\n\n`;
            statsText += `${await fetchDiscordName(targetPlayerId)} played with ${await fetchDiscordName(otherPlayerId)} in the same team: ${playerStats[targetPlayerId].sameTeamMatches} Times, ${playerStats[targetPlayerId].wins} Win, ${playerStats[targetPlayerId].losses} Lose\n`;
            statsText += `${await fetchDiscordName(targetPlayerId)} played against ${await fetchDiscordName(otherPlayerId)}: ${opponentStats[otherPlayerId].matches} Times, ${opponentStats[otherPlayerId].wins} Win, ${opponentStats[otherPlayerId].losses} Lose\n`;

         
            interaction.editReply({ content: `\`\`\`\n${statsText}\n\`\`\`` })
    .catch(() => {
        interaction.channel.send({ content: `<@${interaction.user.id}>\n\`\`\`\n${statsText}\n\`\`\`` });
    });


   

        } catch (err) {
            console.error("Error in command execution:", err);

        }
    }
};
