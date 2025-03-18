const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { connectToMongoDB, applyWin, applyLose, refreshPlayer, getPlayer, handleError } = require('../utility/utilFunctions');
const { QuickDB } = require('quick.db');
const qdb = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('undo_match')
    .setDescription('Undo Match')
    .addIntegerOption(option =>
      option.setName('match_id')
        .setDescription('The ID of the match to undo')
        .setRequired(true)
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


         

        try {

               await interaction.deferReply();

               qdb.set(`scoreCooldown_${matchId}`, now);

         
            const db = await connectToMongoDB();
       
            const matchesCollection = db.collection('completedMatches'); 
            const completedMatchesCollection = db.collection('completedMatches');
            const registerCollection = db.collection('register');

            
            const match = await completedMatchesCollection.findOne({ match_id: matchId });


                   if (!match) {

setTimeout(() => {

                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription('Results for this match could not be found.')
                        .setColor('#ff0557')
                            .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) ],
                    ephemeral: true
                });

  }, 3000);
            }


setTimeout(() => {
            interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('Processing')
                    .setDescription(`The results are being undone, please wait...`)
                    .setColor('#ffdf00')
                        .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()})   
                ],
                components: []
            });

             }, 3000);


          
            const combinedResults = [...match.team_a_results, ...match.team_b_results].join('\n');

       
            const result = combinedResults.split('\n').map(line => {
                const [name, range] = line.split(' [');
                const [start, end] = range.replace(']', '').split(' ➜ ').map(Number);
                const key = end > start ? 'win' : 'lose';
                return {
                    [name.trim()]: {
                        [key]: Math.abs(end - start)
                    }
                };
            });
          
          console.log(result)

            let winEmbed = '';
            let loseEmbed = '';

           
            for (const playerResult of result) {
                const ign = Object.keys(playerResult)[0];
                const player = await registerCollection.findOne({ ign });
            
                if (player && player.matchmaking && player.matchmaking.elo !== undefined) {
                    const data = playerResult[ign];

                    let newElo = player.matchmaking.elo;
                    let newWins = player.matchmaking.wins;
                    let newLosses = player.matchmaking.losses;
            
                    
                    if (data.win) {
                        newElo = player.matchmaking.elo - data.win;
                        newWins = player.matchmaking.wins - 1;
                        winEmbed += `${ign} [${player.matchmaking.elo} ➜ ${newElo}]\n`;
                    } else if (data.lose !== undefined) {
                        newElo = player.matchmaking.elo + data.lose;
                        newLosses = player.matchmaking.losses - 1;
                        loseEmbed += `${ign} [${player.matchmaking.elo} ➜ ${newElo}]\n`;
                    }
  
                   
            const updatedMatches = player.matchmaking.matches.filter(
                (match) => match.match_id !== matchId
            );
            
               
                    await registerCollection.updateOne(
                        { ign },
                        {
                            $set: {
                                "matchmaking.elo": newElo,
                                "matchmaking.wins": newWins,
                                "matchmaking.losses": newLosses,
                                "matchmaking.matches": updatedMatches,
                            },
                        }
                    );
            
                    await refreshPlayer(client, interaction.guild.id, player.discord_id);
                } else {
                    console.log(`missing player: ${ign}`);
                }
            }
            

      
            await completedMatchesCollection.deleteOne({ match_id: matchId });

            const resultEmbed = new EmbedBuilder()
            .setTitle(`Match ID: ${match.match_id}`)
            .addFields(
              { name: 'Undone Winners', value: winEmbed || 'No players' },
              { name: 'Undone Losers', value: loseEmbed || 'No players' }
            )
            .setColor('#00ff51')
            .setFooter({
              text: `Match Date: ${match.creation_date}`,
              iconURL: client.user.displayAvatarURL()
            })
            .setAuthor({
              name: 'Critical Ops Esports',
              iconURL: client.user.displayAvatarURL()
            })
            .setDescription('The match has been undone and player data has been updated.');
setTimeout(() => {
             interaction.editReply({ embeds: [resultEmbed] });
             }, 6000);

            const { addPlayerLog } = require('../utility/utilFunctions');
            await addPlayerLog(`Match ${match.match_id} has been undone by ${interaction.user.username}(${interaction.user.id})\n ${winEmbed}\n ${loseEmbed}`)


        } catch (error) {

            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
          
        }
    }
};
