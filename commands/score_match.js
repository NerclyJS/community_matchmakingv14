const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { applyWin, applyLose, refreshPlayer, getPlayer, handleError, connectToMongoDB } = require('../utility/utilFunctions');
const { QuickDB } = require('quick.db');
const qdb = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('score_match')
    .setDescription('Score Match')
    .addIntegerOption(option =>
      option.setName('match_id')
        .setDescription('The ID of the match')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('winner')
        .setDescription('The winning team')
        .setRequired(true)
        .addChoices(
          { name: 'Team A', value: 'team_a' },
          { name: 'Team B', value: 'team_b' }
        )
    ),
  
  staff_only: false,
  parent: "staff",
  com_staff_only: true,

  execute: async (client, interaction) => {
        const matchId = interaction.options.getInteger('match_id');
        const channelId = interaction.channel.id;

        const lastUsed = qdb.get(`scoreCooldown_${matchId}`);
        const now = Date.now();

        if (lastUsed && now - lastUsed < 40000) {
            const remainingTime = 40000 - (now - lastUsed);
            const remainingSeconds = Math.ceil(remainingTime / 1000);

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`❗ This match is already being scored`)
                    .setColor('#ff0557')
                        .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ]
            });
        }

      interaction.deferReply().catch(() => {});
       qdb.set(`scoreCooldown_${matchId}`, now);


        try {
            const db = await connectToMongoDB();
            const matchesCollection = db.collection('matches');
            const completedMatchesCollection = db.collection('completedMatches');

            const match = await matchesCollection.findOne({ match_id: matchId });

         if (!match) {
    const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Match not found.')
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
    interaction.editReply({
        embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This match is already in the system.')
            .setColor('#ff0557')
                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ],
        ephemeral: false
    }).catch(() => interaction.channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This match is already in the system.')
            .setColor('#ff0557')
                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ]
    }));
}, 2000);
return;
            }

           

           

            const currentTime = new Date();
            const futureTime = new Date(currentTime.getTime() + 40000);


            const allPlayers = [...match.team_a_players, ...match.team_b_players];
            const invalidPlayers = [];

            for (const player of allPlayers) {
                const playerData = await getPlayer(player);
                if (!playerData) {
                    invalidPlayers.push(player);
                }
            }

            if (invalidPlayers.length > 0) {
                setTimeout(() => {
                    interaction.channel.send({
                        embeds: [new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription(`The following players are not registered: ${invalidPlayers.map(p => `<@${p}>`).join(', ')}`)
                            .setColor('#ff0557')
                                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ],
                        ephemeral: true
                    });
                }, 3000);
            }

           

            let sentMessage; 

            setTimeout(() => {
                const processingEmbed = new EmbedBuilder()
                    .setTitle('Processing')
                    .setDescription(`Results are being processed, please wait...`)
                    .setColor('#ffdf00')
                      .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
            
                interaction.editReply({ embeds: [processingEmbed] }).catch(async () => {
                    try {
                        sentMessage = await interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [processingEmbed] });
                    } catch (error) {
                        console.error("Mesaj gönderilemedi:", error);
                    }
                });
            }, 2000);
            


       

 
                const winningTeam = interaction.options.getString('winner');
                const losingTeam = winningTeam === 'team_a' ? 'team_b' : 'team_a';

         

                const winningPlayers = match[`${winningTeam}_players`];
                const losingPlayers = match[`${losingTeam}_players`];

                let winEmbed = '';
                let loseEmbed = '';

                async function delay(ms) {
                    return new Promise(resolve => setTimeout(resolve, ms));
                }

                        const completedMatch2 = await completedMatchesCollection.findOne({ match_id: matchId });

            if (completedMatch2) {

      setTimeout(() => {
    interaction.editReply({
        embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This match is already in the system.')
            .setColor('#ff0557')
                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ],
        ephemeral: true
    }).catch(() => interaction.channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This match is already in the system.')
            .setColor('#ff0557')
                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ]
    }));
}, 2000);
return
            }

                for (const player of winningPlayers) {
                    try {
                        const oldPlayerData = await getPlayer(player);

                             const alreadyPlayed = oldPlayerData.matchmaking.matches.some(m => m.match_id === matchId);
                         if (alreadyPlayed){ interaction.editReply({
        embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This match is already in the system.')
            .setColor('#ff0557')
                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ],
        ephemeral: false
    }).catch(() => interaction.channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This match is already in the system.')
            .setColor('#ff0557')
                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ]
    }))

                         }

                        if (!oldPlayerData) {
                            throw new Error(`Player data for ${player} not found.`);
                        }

                        await applyWin(player, match.match_id, match.map);
                        await delay(1000);

                        const newPlayerData = await getPlayer(player);

                        winEmbed += `${oldPlayerData.ign} [${oldPlayerData.matchmaking.elo} ➜ ${newPlayerData.matchmaking.elo}]\n`;

                        if (!match.team_a_results) {
                            match.team_a_results = [];
                        }
                        match.team_a_results.push(`${oldPlayerData.ign} [${oldPlayerData.matchmaking.elo} ➜ ${newPlayerData.matchmaking.elo}]`);
                    } catch (error) {
                        interaction.channel.send(`Player not found ${player}:`);
                    }
                }

                for (const player of losingPlayers) {
                    try {
                        const oldPlayerData = await getPlayer(player);
                             const alreadyPlayed = oldPlayerData.matchmaking.matches.some(m => m.match_id === matchId);
                                  if (alreadyPlayed){ interaction.editReply({
        embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This match is already in the system.')
            .setColor('#ff0557')
                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ],
        ephemeral: false
    }).catch(() => interaction.channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This match is already in the system.')
            .setColor('#ff0557')
                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ]
    }))

                         }

                        await applyLose(player, match.match_id, match.map);
                        await delay(1000);

                        const newPlayerData = await getPlayer(player);

                        loseEmbed += `${oldPlayerData.ign} [${oldPlayerData.matchmaking.elo} ➜ ${newPlayerData.matchmaking.elo}]\n`;

                        if (!match.team_b_results) {
                            match.team_b_results = [];
                        }
                        match.team_b_results.push(`${oldPlayerData.ign} [${oldPlayerData.matchmaking.elo} ➜ ${newPlayerData.matchmaking.elo}]`);
                    } catch (error) {
                        interaction.channel.send(`Player not found ${player}:`);
                    }
                }

                match.winner = winningTeam;

                await completedMatchesCollection.insertOne(match);

                const resultEmbed = new EmbedBuilder()
                    .setTitle(`Match ID: ${match.match_id}`)
                    .addFields(
                        { name: 'Winning Team', value: winEmbed || 'No players' },
                        { name: 'Losing Team', value: loseEmbed || 'No players' }
                      )
                    .setColor('#00ff51')
                    .setFooter({
                        text: `Match Date: ${match.creation_date}`,
                        iconURL: client.user.displayAvatarURL() 
                      })
                        .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                    .setDescription(`Result: ${winningTeam === 'team_a' ? 'Team A' : 'Team B'}`);

                                 const doubleEmbed= new EmbedBuilder()

                    .setTitle(`:zap: Double points applied for this match :zap:`)
 .setColor('#ffdf00')





 if (match.isDouble) {
    interaction.editReply({ embeds: [resultEmbed, doubleEmbed], components: [] }).catch(() => {
        interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [resultEmbed, doubleEmbed], components: [] }).catch(console.error);
    });
} else {
    interaction.editReply({ embeds: [resultEmbed], components: [] }).catch(() => {
        interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [resultEmbed], components: [] }).catch(console.error);
    });
}

if (sentMessage) {
    sentMessage.delete().catch(console.error);
}
               

                const { addPlayerLog } = require('../utility/utilFunctions');
                await addPlayerLog(`Match ${match.match_id} was scored by ${interaction.user.username}(${interaction.user.id})\n\`${winEmbed}\`\n\`${loseEmbed}\``);

    

                for (const player of winningPlayers) {
                    try {
                        await refreshPlayer(client, interaction.guild.id, player);
                        await delay(2000);
                    } catch (error) {
                        console.log(`Error refreshing player ${player}: ${error.message}`);
                    }
                }

                for (const player of losingPlayers) {
                    try {
                        await refreshPlayer(client, interaction.guild.id, player);
                        await delay(2000);
                    } catch (error) {
                        console.log(`Error refreshing player ${player}: ${error.message}`);
                    }
                }

                addStaffPoints(interaction.user.id);

           


            async function addStaffPoints(discordId) {
    try {
        const registerCollection = db.collection('register');
        
        const result = await registerCollection.updateOne(
            { discord_id: discordId },
            { $inc: { staffPoints: 1 } }  
        );

        if (result.matchedCount === 0) {
            console.log("Couldnt add staff points.");
        } 
    } catch (error) {
        console.error("Error:", error);
    }
}



        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};
