const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const qdb = new QuickDB();
const { queueClear, banCheck, connectToMongoDB, handleError, getPlayer, fetchPlayerData } = require('../utility/utilFunctions');

const queueTimers = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')  
        .setDescription('Join the queue for the game'),
    
    async execute(client, interaction) {

        await interaction.deferReply().catch(() => {});

        try {
            const channelId = interaction.channel.id;
            const userId = interaction.user.id;


            

            const db = await connectToMongoDB();
            const collection = db.collection('queue');
            let queue = await collection.findOne({ channel_id: channelId });

            if (!queue) {
                setTimeout(() =>  interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription('❗ This is not a queue channel.')
                            .setColor('#ff0557')
                                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                          
                    ]
                }), 3000);

                return;
            }




            const comPlayer = await getPlayer(interaction.user.id)

                if (!comPlayer) {
                setTimeout(() =>
                    interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Error')
                                .setDescription('You need to register to join the queue.')
                                .setColor('#ff0557')
                                    .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                        ]
                    }), 3000);

                return;
            }

            const playerData = await fetchPlayerData("ids", comPlayer.ingame_id);

            if (playerData) { 
                const playerRating = playerData.stats.ranked.mmr;
            
                if (playerData.ban !== null && typeof playerData.ban === "object") {
                    setTimeout(() => interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Error')
                                .setDescription('❗ Players with in-game bans cannot join the queue.')
                                .setColor('#ff0557')
                                    .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                        ]
                    }), 3000);
                    return;
                }
            
                if (playerRating < queue.min_rating) {
                    setTimeout(() => interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Error')
                                .setDescription('❗ You do not have enough rating to play in this queue.')
                                .setColor('#ff0557')
                                    .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                        ]
                    }), 3000);
                    return;
                }
            
                if (queue.max_rating !== undefined && playerRating > queue.max_rating) {
                    setTimeout(() => interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Error')
                                .setDescription('❗ Your rating is too high to join this queue.')
                                .setColor('#ff0557')
                                    .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                        ]
                    }), 3000);
                    return;
                }
            }
            

            if (queue.players.includes(userId)) {
                setTimeout(() =>  interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription('❗ This player is already in the queue.')
                            .setColor('#ff0557')
                                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                    ]
                }), 3000);


                return;
            }

           

           
         

        function formatRemainingTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);

    if (days > 200) {
        return "PERMANENT";
    }

    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days} Days ${hours} Hours ${minutes} Minutes ${seconds} Seconds`;
}


        

            


            const banInfo = await banCheck(userId);


if (banInfo.length > 0) {
    const now = Math.floor(Date.now() / 1000);
    const endTimestamp = Math.floor(banInfo[0].end / 1000);
    const remainingTime = banInfo[0].end - Date.now();

    let remainingText;
    if (remainingTime > 200 * 24 * 60 * 60 * 1000) { 
        remainingText = "**PERMANENT**";
    } else {
        remainingText = `<t:${endTimestamp}:R>`;
    }

    const banEmbed = new EmbedBuilder()
        .setDescription(`❗ This Player was banned for **${banInfo[0].reason}**. Remaining time: ${remainingText}`)
        .setColor('#ff0557');

    return interaction.editReply({ embeds: [banEmbed] });
}  



 const inactiveEmbed = new EmbedBuilder()
        .setDescription(`❗ Queue has been cleared due to 10 minutes of inactivity.`)
        .setColor('#ff0557');

if (queueTimers.has(channelId)) {
                clearTimeout(queueTimers.get(channelId));
            }
            
            queueTimers.set(channelId, setTimeout(async () => {
                const updatedQueue = await collection.findOne({ channel_id: channelId });
                if (updatedQueue && updatedQueue.players.length > 0) {
                    await queueClear(channelId);
                    interaction.channel.send({embeds: [inactiveEmbed]});
                }
                queueTimers.delete(channelId);
            }, 600000));


            //join
const existingQueue = await collection.findOne({ players: userId });

if (existingQueue) {
   
    await collection.updateOne(
        { channel_id: existingQueue.channel_id },
        { $pull: { players: userId } }
    );
}


           await collection.updateOne(
    { channel_id: channelId },
    { $addToSet: { players: userId } } 
);

              queue = await collection.findOne({ channel_id: channelId });
              

            if (queue.players.length >= queue.max_player) {
                const matchesCollection = db.collection('matches');
                await matchesCollection.deleteMany({ channel_id: channelId, picked: { $ne: true } });

                const shuffledPlayers = queue.players.sort(() => 0.5 - Math.random());
                const aCaptain =  shuffledPlayers.pop();
                const bCaptain =  shuffledPlayers.pop();

                const aPlayers = [aCaptain];
                const bPlayers = [bCaptain];

                const remainingPlayers = queue.players.filter(player => player !== aCaptain && player !== bCaptain);

     

                const matchId = await generateUniqueMatchId();
                const creationDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');


                const setting = await db.collection('settings').find().toArray()
                const isDouble = setting[0].double_point
                const season = setting[0].season

                const match = {
                    match_id: matchId,
                    channel_id: channelId,
                    players: remainingPlayers,
                    team_a_players: aPlayers,
                    team_b_players: bPlayers,
                    team_a_captain: aCaptain,
                    team_a_captain_picked: false,
                    team_b_captain: bCaptain,
                    team_b_captain_picked: true,
                    creation_date: creationDate,
                    picked: false,
                    winner: null,
                    team_a_results: [],
                    team_b_results: [],
                    map: '',
                    isDouble: isDouble,
                    season: season
                };

                await db.collection('matches').insertOne(match);

                await queueClear(interaction.channel.id);


            
                const joinEmbed = new EmbedBuilder()
                    .setTitle('Match Creation')
                    .setDescription('Waiting for captains to pick players using **/pick**')
                    .addFields([
                        {
                            name: 'Remaining Players',
                            value: match.players.length > 0
                                ? match.players.map(p => `<@${p}>`).join('\n')
                                : 'No players yet'
                        },
                        {
                            name: 'Team A',
                            value: match.team_a_players.length > 0
                                ? match.team_a_players.map(p => `<@${p}> ${match.team_a_captain === p ? '(C)' : ''}`).join('\n')
                                : 'No players yet'
                        },
                        {
                            name: 'Team B',
                            value: match.team_b_players.length > 0
                                ? match.team_b_players.map(p => `<@${p}> ${match.team_b_captain === p ? '(C)' : ''}`).join('\n')
                                : 'No players yet'
                        }
                    ])
                    .setColor('#ff0557');

                const captainsMention = `<@${match.team_a_captain}> and <@${match.team_b_captain}>`;
           
             setTimeout(() => {
    interaction.editReply({ content: `Match created! Captains: ${captainsMention}`, embeds: [joinEmbed] }).catch(() => {
        interaction.channel.send({ content: `Match created! Captains: ${captainsMention}`, embeds: [joinEmbed] }).catch(console.error);
    });
}, 2000);

                 

        

            } else {
                const joinEmbed = new EmbedBuilder()
                    .setTitle('Join the Queue')
                    .setDescription(`Waiting for players to join the queue.\n\`\`\`\n${queue.players.length} / ${queue.max_player}\n\`\`\``)
                    .setColor('#ff0557')
                    .addFields([
                        {
                            name: 'Players in Queue',
                            value: queue.players.length > 0
                                ? queue.players.map(p => `<@${p}>`).join('\n')
                                : 'No players yet'
                        }
                    ])
                        .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 

              setTimeout(() => {
    interaction.editReply({ embeds: [joinEmbed] }).catch(() => {
        interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [joinEmbed] }).catch(console.error);
    });
}, 1000);

            }
        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};

async function generateUniqueMatchId() {
    let matchId;
    const db = await connectToMongoDB();
    const matchesCollection = db.collection('matches'); 

    let existingMatch;
    do {
        matchId = Math.floor(Math.random() * 90000) + 10000; 
        existingMatch = await matchesCollection.findOne({ match_id: matchId });
    } while (existingMatch);

    return matchId;
}

