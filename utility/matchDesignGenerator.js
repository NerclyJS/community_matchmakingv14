const Canvas = require('canvas');
const fetch = require('node-fetch');
const Discord = require('discord.js');
const { connectToMongoDB } = require('../utility/utilFunctions'); 

async function getPlayer(id) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('register');

 
    const player = await collection.findOne({ discord_id: id });
    
    return player || null; 
  } catch (error) {
    console.error('Database Error:', error);
    return null;
  }
}

const backgrounds = {
  Bureau: 'https://i.imgur.com/kZ82sr0.jpeg',
  Canals: 'https://i.imgur.com/m0ywcDh.jpeg',
  Village: 'https://i.imgur.com/61wcc0X.jpeg',
  Grounded: 'https://i.imgur.com/nG4ZXlV.jpeg',
  Legacy: 'https://i.imgur.com/ZefV4Eq.jpeg',
  Plaza: 'https://i.imgur.com/KgHTzym.jpeg',
  Port: 'https://i.imgur.com/a9Xb8E8.jpeg',
  Raid: 'https://i.imgur.com/eWoo1Lr.jpeg',
  Soar: 'https://i.imgur.com/1OktM87.jpeg',
  Castello: 'https://i.imgur.com/j68DNvp.jpeg',
  no_map_info: 'https://i.imgur.com/Ok5g7nQ.png'
};

const overlay = 'https://i.imgur.com/Ok5g7nQ.png';
const boxA = 'https://i.imgur.com/Y21T5O9.png';
const boxB = 'https://i.imgur.com/qYXB4Hc.png';

async function matchDesignGenerator(client, interaction, matchId, map) {
  try {
    const db = await connectToMongoDB();
    const matchesCollection = db.collection('matches');
    
    const match = await matchesCollection.findOne({ match_id: matchId });

    if (!match) {
      throw new Error(`Match with ID ${matchId} not found.`);
    }

    const canvas = Canvas.createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');


    //map background
    const background = await Canvas.loadImage(backgrounds[map]);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    //overlay
    const overlayImg = await Canvas.loadImage(overlay);
    ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);

    try {
      Canvas.registerFont('./fonts/purista.otf', { family: 'Purista' });
      Canvas.registerFont('./fonts/nextlight.otf', { family: 'NEXT ART' });
      console.log('Fontlar kaydedildi.');
    } catch (error) {
      console.error('Yazı tipi kaydedilirken hata oluştu:', error);
    }




    //player box
    const drawPlayerBox = async (playerId, x, y, boxImage) => {
      try {
        const player = await getPlayer(playerId);

        if (!player) {
          throw new Error(`Player with ID ${playerId} not found.`);
        }

        const member = await client.users.fetch(player.discord_id).catch(() => null);

        if (!member) {
          throw new Error(`Discord member with ID ${player.discord_id} not found.`);
        }

        const avatarURL = member.displayAvatarURL({ format: 'png', dynamic: false, size: 256 });
        const pngAvatarURL = avatarURL.replace('.webp', '.png');  
        const avatar = await Canvas.loadImage(pngAvatarURL);

        const box = await Canvas.loadImage(boxImage);
        ctx.drawImage(box, x, y, 610, 97);

        ctx.drawImage(avatar, x + 10, y + 10, 77, 77);

        ctx.textAlign = 'start';
        ctx.font = '45px "Purista"';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(player.ign, x + 120, y + 63);
        ctx.font = '45px "NEXT ART"';
        ctx.textAlign = 'center';
        ctx.fillText(player.matchmaking.elo.toString(), x + 550, y + 63);
      } catch (error) {
        console.error('drawPlayerBox hatası:', error);
      }
    };


    //coalition
    let yPosA = 450;
    for (const playerId of match.team_a_players) {
      await drawPlayerBox(playerId, 100, yPosA, boxA);
      yPosA += 110;
    }


    //breach
    let yPosB = 450;
    for (const playerId of match.team_b_players) {
      await drawPlayerBox(playerId, 1210, yPosB, boxB);
      yPosB += 110;
    }

    ctx.textAlign = 'center';
    ctx.font = '50px "Purista"';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`ID: ${match.match_id}`, canvas.width / 2, canvas.height / 2 + 200);

    ctx.font = '50px "Purista"';
    ctx.fillStyle = '#ff003f';
    ctx.fillText(map.toUpperCase(), canvas.width / 2, canvas.height / 2 + 250);

    const attachment = new Discord.AttachmentBuilder(canvas.toBuffer(), 'match_design.png');
    return attachment;
  } catch (error) {
    console.error('matchDesignGenerator hatası:', error);
  }
}

module.exports = { matchDesignGenerator };
