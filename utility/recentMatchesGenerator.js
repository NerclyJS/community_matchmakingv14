const fs = require('fs');
const fetch = require('node-fetch');
const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, MessageSelectMenu } = require('discord.js');
const { fetchPlayerData, calculateRankInfo, getRankThumbnailUrl, getGameStats, createComChart, banCheck, connectToMongoDB } = require('../utility/utilFunctions');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const Canvas = require('canvas')
const { registerFont } = Canvas;
Canvas.registerFont('./fonts/purista.otf', { family: 'Purista' });


 
async function recentMatchesGenerator(client, interaction, playerData, comPlayerData) {
      
try {

    if (playerData == null) {
            return null
        }
        


     
  
        
   
        
        
let banInfo = {
  status: 'N/A',
  type: 'N/A',
  duration: 'N/A'
  
}

if (playerData.ban !== null && typeof playerData.ban === "object") {
    if (playerData.ban.Type === 0) {
      banInfo.status = "BANNED";
      banInfo.type = "IN-GAME BAN";
      banInfo.duration = 'PERMANENT'
    } else if (playerData.ban.SecondsLeft) {
      
      
      const secondsLeft = playerData.ban.SecondsLeft;
          
        const now = new Date();

        const banEndDate = new Date(now.getTime() + secondsLeft * 1000);

     
        const timestamp = `<t:${Math.floor(banEndDate.getTime() / 1000)}:R>`;
      
        
        const days = Math.floor(secondsLeft / 86400); 
        const hours = Math.floor((secondsLeft % 86400) / 3600);
        const minutes = Math.floor((secondsLeft % 3600) / 60);
        const seconds = secondsLeft % 60;
      
      banInfo.duration = `${days}D ${hours}H ${minutes}M`
      banInfo.status = 'BANNED'
      banInfo.type = "IN-GAME BAN";
    }

   
   
}
    const comBanInfo = await banCheck(comPlayerData.discord_id)
   
        function formatRemainingTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);

    if (days > 200) {
        return "PERMANENT";
    }

    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days}D ${hours}H ${minutes}M`;
}
  


  if (comBanInfo.length > 0) {
    
     const now = Date.now();
   
      const remainingTime = formatRemainingTime(comBanInfo[0].end - now);


      banInfo.status = "BANNED";
      banInfo.type = "QUEUE BAN";
      banInfo.duration =  remainingTime
 

        }


//get rank info
      let rankInfo = "UNRANKED";
    

    if (playerData.stats.ranked.rank !== 0) {
    rankInfo = await calculateRankInfo(playerData.stats.ranked.mmr, playerData.stats.ranked.global_position);

    }
        
        
          let rankInfoSade = "UNRANKED";
    

    if (playerData.stats.ranked.rank !== 0) {
    rankInfoSade = await calculateRankInfo(playerData.stats.ranked.mmr, playerData.stats.ranked.global_position);

    }


      
    let totalKills = 0;
    playerData.stats.seasonal_stats.forEach(season => {
        totalKills += season.ranked.k;
        totalKills += season.casual.k;
        totalKills += season.custom.k;
    });

    let totalDeaths = 0;
    playerData.stats.seasonal_stats.forEach(season => {
      totalDeaths += season.ranked.d;
      totalDeaths += season.casual.d;
      totalDeaths += season.custom.d;
    });

    const kd = (totalKills / totalDeaths).toFixed(2);
      
      
  
  //get background  
 
   let foto = 'https://i.imgur.com/g84YM7s.jpeg'

      const canvas = Canvas.createCanvas(1920, 1400);
    const ctx = canvas.getContext('2d');

    const background = await Canvas.loadImage(foto);
ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
 
  
 
      
       const rankInfoFirstWord = rankInfo.split(' ')[0];
        
        

        
        //get clan info

 const clanNamee = playerData.clan ? `${playerData.clan.basicInfo.name || 'N/A'}` : 'N/A'     
   const clanTagg = playerData.clan ? `${playerData.clan.basicInfo.tag || 'N/A'}` : 'N/A'     
        
 
  
 


ctx.font = '28px Aftika, sans-serif'; 
       
      

 
     
   let discordInfo;
   
             //avatarbackground
   
    const discordId = comPlayerData.discord_id
    const member = await client.users.fetch(discordId).catch(() => null);

  
      
    const avatarURL = member.displayAvatarURL({ format: 'webp', dynamic: false, size: 256 });
    const pngAvatarURL = avatarURL.replace('.webp', '.png');  
    
  
    const avatarImage = await Canvas.loadImage(pngAvatarURL);


ctx.drawImage(avatarImage, 204, 159, 113, 113);


 



        

     let discordInfoArray = {
username: 'N/A',
id: 'N/A',
createdAt: 'N/A',


     }
        
   discordInfoArray.username = member ? member.username : 'N/A'
   discordInfoArray.userid =  member ? member.id : 'N/A'
   discordInfoArray.createdAt = member ? member.createdAt.toISOString().split('T')[0] : 'N/A'
          



 
   ctx.textAlign = 'left';
   ctx.fillStyle = '#ff0038';
ctx.fillText(discordInfoArray.userid, 407, 256 );
  
ctx.font = '40px Purista';   
ctx.fillStyle = '#ffffff';


const region = comPlayerData.matchmaking.region;
const ignWithRegion = `[${region}] ${comPlayerData.ign}`;



ctx.fillText(ignWithRegion, 355, 202);


ctx.textAlign = 'center';

  
 






     // recent matches

     const matches = comPlayerData.matchmaking?.matches?.slice(-40).reverse()

     function getMapLink(mapName) {
      const mapLinks = {
          Bureau: 'https://i.imgur.com/jfq8QZg.png',
          Canals: 'https://i.imgur.com/MoLunVC.png',
          Castello: 'https://i.imgur.com/mkts32L.png',
          Grounded: 'https://i.imgur.com/9yP4OJu.png',
          Legacy: 'https://i.imgur.com/1ocxtDq.png',
          Plaza: 'https://i.imgur.com/7jolJsK.png',
          Port: 'https://i.imgur.com/jKVgtaI.png',
          Raid: 'https://i.imgur.com/xc57VFf.png',
          Soar: 'https://i.imgur.com/dNfKyXy.png',
          Village: 'https://i.imgur.com/pDDZ22e.png',
      };
  
      if (mapLinks.hasOwnProperty(mapName)) {
          return mapLinks[mapName];
      } else {
          return 'Map bulunamadı';
      }
  }
        
        
  const winOverlay = await Canvas.loadImage('https://i.imgur.com/VxeRGa7.png');
    const loseOverlay = await Canvas.loadImage('https://i.imgur.com/1bSvl7j.png');


    const cellWidth = winOverlay.width + 16;
    const cellHeight = winOverlay.height + 16;
    const xpadding = -50;
    const ypadding = 0;
    const cols = 5;
    
    // kenardan boşluklar
    const textMarginX = 50; 
    const textMarginY = 20; 
    
    for (let i = 0; i < matches?.length; i++) {
        const match = matches[i];
        const row = Math.floor(i / cols);
        const col = i % cols;
    
        const x = 250 + col * (cellWidth + xpadding);
        const y = 470 + row * (cellHeight + ypadding);
    
        const mapImage = await Canvas.loadImage(getMapLink(match.map));
    
        
        ctx.drawImage(mapImage, x, y, cellWidth, cellHeight);
    
        
        if (match.win !== undefined) {
            ctx.drawImage(winOverlay, x, y, cellWidth, cellHeight);
        } else if (match.lose !== undefined) {
            ctx.drawImage(loseOverlay, x, y, cellWidth, cellHeight);
        }
    

        ctx.fillStyle = 'white';
        ctx.font = '20px Purista';
    
        ctx.textAlign = 'left';
        ctx.fillText(match.map, x + textMarginX, y + textMarginY + 15);
    
      
        if (match.win !== undefined) {
          ctx.textAlign = 'center';
          ctx.font = '25px Purista';
          ctx.fillStyle = 'black';
            ctx.fillText(`+${match.win}`, x + 20 + textMarginX, y + textMarginY + 57);
        } else if (match.lose !== undefined) {
          ctx.textAlign = 'center';
          ctx.font = '25px Purista';
          ctx.fillStyle = 'white';
            ctx.fillText(`-${match.lose}`, x + 20 + textMarginX, y + textMarginY + 57);
        }

        ctx.font = '20px Purista';
        ctx.fillStyle = 'white';
    
        
        ctx.textAlign = 'right';
        ctx.fillText(match.match_id, x + cellWidth - textMarginX, y + textMarginY + 15);
    
       
        ctx.textAlign = 'left';
    }
    

     
     
         const attachment = new AttachmentBuilder(canvas.toBuffer(), 'com_profile.jpg');
  return attachment


} catch (error) {
  console.log(error)
    
  return null

  
}


 
  
      
    }



module.exports = {
    recentMatchesGenerator
};

