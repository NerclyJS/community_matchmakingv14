const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { connectToMongoDB, refreshPlayer, getSeason } = require('../utility/utilFunctions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset_season')
        .setDescription('Reset stats and refresh all registered players'),

    owner_only: true,
    parent: "owner",

    async execute(client, interaction) {
        await interaction.deferReply();
    
        const db = await connectToMongoDB();
        const currentSeason = await getSeason();

        const setting = db.collection('settings');
        const registerCollection = db.collection('register');

        const players = await registerCollection.find({}).toArray();
        const totalPlayers = players.length; 

        for (const player of players) {
            const { matchmaking } = player;

            await registerCollection.updateOne(
                { _id: player._id },  
                { 
                    $push: { 
                        'matchmaking.pastSeasons': { 
                            season: currentSeason,
                            elo: matchmaking.elo,
                            wins: matchmaking.wins,
                            losses: matchmaking.losses,
                            rank: matchmaking.rank,
                            matches: matchmaking.matches 
                        }
                    }
                }
            );

            await registerCollection.updateOne(
                { _id: player._id },
                { 
                    $set: { 
                        'matchmaking.elo': 0, 
                        'matchmaking.wins': 0, 
                        'matchmaking.losses': 0, 
                        'matchmaking.rank': 'UNRANKED',
                        'matchmaking.matches': []
                    }
                }
            );
        }

        await setting.updateOne({}, { $set: { season: currentSeason + 1 } }, { upsert: true });

            
        const embed = new EmbedBuilder()
            .setColor('#FF0000') 

            .setDescription(`\`\`\`${totalPlayers} players have been reset\`\`\``)
     

        interaction.channel.send({ embeds: [embed] });

        for (const player of players) {
            await refreshPlayer(client, '862340917117976618', player.discord_id);
        }

   
    }
};
