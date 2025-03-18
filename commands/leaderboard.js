const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const { registerFont } = Canvas;
const { connectToMongoDB, handleError, getSeason } = require('../utility/utilFunctions');

registerFont('./fonts/aftikabold.ttf', { family: 'Aftika' });
registerFont('./fonts/nextregular.otf', { family: 'NEXT ART', weight: 'Regular' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the leaderboard'),

    async execute(client, interaction) {





        try {



            const embedLoading = new EmbedBuilder()

                .setColor(client.nercly.color)
                .setDescription(`<a:loading:1179059484509884476> \`Loading Leaderboard...\``)
            interaction.reply({ embeds: [embedLoading] })



            const season = await getSeason()

            const db = await connectToMongoDB();
            let collection = db.collection('register');





            const THREE_HUNDRED_DAYS = 300 * 24 * 60 * 60 * 1000;
            const currentTime = Date.now();

            /*
            
            let players = await collection
                .find({
                    "matchmaking.elo": { $exists: true },
                    "matchmaking.ban.end": { $not: { $gte: currentTime + THREE_HUNDRED_DAYS } } 
                })
                .sort({ "matchmaking.elo": -1 })
                .toArray();
            
                */
            let players = await collection
                .find({
                    "matchmaking.elo": { $exists: true },
                    "matchmaking.ban": { $size: 0 }
                })
                .sort({ "matchmaking.elo": -1 })
                .toArray();

            const eurasiaPlayers = players
                .filter(player => player.matchmaking.region === 'EU' || player.matchmaking.region === 'AS')
                .slice(0, 20);

            const americasPlayers = players
                .filter(player => player.matchmaking.region === 'NA' || player.matchmaking.region === 'SA')
                .slice(0, 20);

            const formattedData = {
                eurasia: eurasiaPlayers.map((player, index) => ({
                    rank: index + 1,
                    nick: player.ign,
                    wins: player.matchmaking.wins,
                    losses: player.matchmaking.losses,
                    elo: player.matchmaking.elo
                })),
                americas: americasPlayers.map((player, index) => ({
                    rank: index + 1,
                    nick: player.ign,
                    wins: player.matchmaking.wins,
                    losses: player.matchmaking.losses,
                    elo: player.matchmaking.elo
                }))
            };




            const teamAstats = formattedData['eurasia'];
            const teamBstats = formattedData['americas'];




            const backgroundImage = "https://i.imgur.com/Qf0TbE7.jpeg"


            const background = await Canvas.loadImage(backgroundImage);


            const canvas = Canvas.createCanvas(1796, 1680);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);








            const teamAPNG = await Canvas.loadImage('https://i.imgur.com/wncRAXf.png');


            let pngOffsetY = 0;
            for (const player of teamAstats) {


                ctx.drawImage(teamAPNG, 0, pngOffsetY, canvas.width, canvas.height);


                pngOffsetY += 62;
            }



            const teamBPNG = await Canvas.loadImage('https://i.imgur.com/FUn5595.png');


            let bpngOffsetY = 0;
            for (const player of teamBstats) {



                ctx.drawImage(teamBPNG, 0, bpngOffsetY, canvas.width, canvas.height);



                bpngOffsetY += 62;
            }










            ctx.shadowColor = 'rgba(0, 0, 0, 0)';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;


            // stats_teamA
            ctx.textAlign = 'start';
            ctx.font = '20px Aftika, sans-serif';

            const textHeight = 4

            // eurasia
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#000000';
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.shadowBlur = 5;

            const lineHeight = 62;

            teamAstats.forEach((player, index) => {
                const yOffset = canvas.height / textHeight + index * lineHeight;

                ctx.fillText(player.rank, 148.42, yOffset);
                ctx.fillText(player.nick, 218.00, yOffset);
                ctx.fillText(player.wins, 390 + 50, yOffset);
                ctx.fillText(player.losses, 518 + 40, yOffset);

                ctx.shadowColor = 'transparent';
                ctx.fillStyle = '#000000';
                ctx.fillText(player.elo, 628 + 47, yOffset);
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#000000';
            });




            // americas
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#000000';
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.shadowBlur = 5;

            teamBstats.forEach((player, index) => {
                const yOffset = canvas.height / textHeight + index * lineHeight;

                ctx.fillText(`${player.rank}`, 1042 + 50, yOffset);
                ctx.fillText(`${player.nick}`, 1149.04, yOffset);
                ctx.fillText(`${player.wins}`, 1336 + 50, yOffset);
                ctx.fillText(`${player.losses}`, 1456 + 50, yOffset);

                ctx.shadowColor = 'transparent';
                ctx.fillStyle = '#000000';
                ctx.fillText(`${player.elo}`, 1570 + 47, yOffset);
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#000000';
            });

            // season text
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#000000';

            ctx.font = '40px Aftika, sans-serif';
            ctx.fillText(`Season ${season}`, 134, 98);


            const buffer = canvas.toBuffer();
            const attachment = new AttachmentBuilder(buffer, 'stats_image.png');

            interaction.editReply({ embeds: [], files: [attachment] })




        } catch (error) {
            console.error(`Error occurred while running command: ${error} `);




        }



    },
};
