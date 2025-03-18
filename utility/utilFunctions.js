const fetch = require('node-fetch');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder,  ButtonStyle  } = require('discord.js');
const { MongoClient } = require('mongodb');
const ranks = require('../utility/ranks.json');
const { QuickDB } = require('quick.db');
const qdb = new QuickDB();
const fs = require('fs');
const { mongo_uri } = require('../utility/mongo.json');
const { unix } = require('moment');
const { connect } = require('http2');
const axios = require('axios');

let mclient;

async function connectToMongoDB() {
  if (!mclient) {
    mclient = new MongoClient(mongo_uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await mclient.connect();
  }

  return mclient.db('critical_ops_esports');
}

async function addPlayerLog(message) {
  try {

    const db = await connectToMongoDB();

    const collection = db.collection('playerlogs');

   
    const logEntry = {
      message: message,
      timestamp: Date.now()
    };

   
    await collection.insertOne(logEntry);

    console.log('logged');
  } catch (error) {
    console.error('Log error:', error);
  }
}

/*

async function importData() {
    try {
       
        
        const database = await connectToMongoDB()
        const collection = database.collection('completedMatches');

        
        const registerData = require('../utility/completedMatches.json');
    

        const result = await collection.insertMany(registerData);
        console.log(`${result.insertedCount} adet belge eklendi.`);
    } catch (error) {
        console.error('Hata oluştu:', error);
      
    }

}

*/





async function fetchGoxPlayerData(discord_id) {
  try {
      const response = await axios.get('https://backend-yokaigroup.nl:1515/players/view', {
          headers: {
              'accept': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb21tYm90IiwiZXhwIjoxNzcxNjI2MzkyfQ.wsypElnpeTPJBJ89LZUlNvhmrJdhOmE_LILkCFcYnfA'
          },
          params: { userid: discord_id }
      });
      return response.data;
  } catch (error) {
      console.error('Error fetching player data:', error.response ? error.response.data : error.message);
      return('Failed to fetch player data');
  }
}



const passKey = {  
    "passkey_api": "StencilStemBlabberGrapeUnengagedPep6VictoryUnpinnedLuminance",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb21ib3QiLCJleHAiOjE3NjUxMTY0ODd9.DYPxSosgzkw_a5-HD97yp3GuIBeeLc_XTBuOQch1eho"
}

async function getNewBearer() {
  try {
      const response = await axios.post(
          `https://backend-yokaigroup.nl:1515/auth?username=commbot&passkey=${passKey}`, 
          {}, 
          {
              headers: {
                  'accept': 'application/json',
                  
              }
              
          }
      );
      return response.data;
  } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      return('Failed');
  }
}


async function updateGoxGameId(userid, new_game_id) {
  try {
      const response = await axios.post(
          'https://backend-yokaigroup.nl:1515/admin/accounts/edit/gameid', 
          {}, 
          {
              headers: {
                  'accept': 'application/json',
                  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb21tYm90IiwiZXhwIjoxNzcxNjI2MzkyfQ.wsypElnpeTPJBJ89LZUlNvhmrJdhOmE_LILkCFcYnfA'
              },
              params: { userid, new_game_id }
          }
      );
      return response.data;
  } catch (error) {
      console.error('Error updating game ID:', error.response ? error.response.data : error.message);
      return('Failed to update game ID');
  }
}



async function handleError(error, interaction, client) {
  try {
    const db = await connectToMongoDB();
    const errorId = generateUniqueErrorId();

console.error(error)
    const lines = getOriginFromStack(error.stack);


    await db.collection('errors').insertOne({
      errorId,
      error: error.message,
      lines: lines,
      command: interaction.commandName,  
      user: interaction.user.tag,        
      timestamp: new Date(),
    });

   
    const embed = new EmbedBuilder()
      .setTitle('Command Error')
      .setDescription(`An error occurred while executing the command: **${interaction.commandName}**, Please contact staff.\n\nError code: **${errorId}**`)
      .setColor('#FF0000')
      .setTimestamp();

    return embed;
  } catch (err) {
    console.error('Error logging failed: ', err);
    return new EmbedBuilder()
      .setTitle('Log Error')
      .setDescription('Failed to log the error. Please contact staff.')
      .setColor('#FF0000')
      .setTimestamp();
  }
}

function generateUniqueErrorId() {
  return 'ERR-' + Math.random().toString(36).substring(2, 10).toUpperCase(); 
}


function getOriginFromStack(stack) {
    
  const stackLines = stack.split('\n');
  let codeSnippet = []

  stackLines.slice(1).forEach(line => {
    const match = line.match(/\((?<file>.*):(?<line>\d+):(?<pos>\d+)\)/);
 

    if (match) {
      const { file, line, pos } = match.groups;

      try {
        const f = fs.readFileSync(file, 'utf8').split('\n');
        const errorLine = f[line - 1].trim(); 
        codeSnippet.push(errorLine) 
      } catch (err) {
        
      }
    }
  });

  return codeSnippet
}


const maps = {
  'bureau': { name: 'Bureau', image: 'https://i.imgur.com/15RM8mw.png' },
  'canals': { name: 'Canals', image: 'https://i.imgur.com/czsexLC.png' },
  'castello': { name: 'Castello', image: 'https://i.imgur.com/RJdQB4k.png' },
  'grounded': { name: 'Grounded', image: 'https://i.imgur.com/vSHNjII.png' },
  'legacy': { name: 'Legacy', image: 'https://i.imgur.com/HGewbWD.png' },
  'plaza': { name: 'Plaza', image: 'https://i.imgur.com/bP2rdJL.png' },
  'port': { name: 'Port', image: 'https://i.imgur.com/MjrzROw.png' },
  'raid': { name: 'Raid', image: 'https://i.imgur.com/jVYKRPV.png' },
  'soar': { name: 'Soar', image: 'https://i.imgur.com/bithQGz.png' },
  'village': { name: 'Village', image: 'https://i.imgur.com/hNB22Dk.png' }
};

async function startPool(client, channelId, matchId) {
  const channel = await client.channels.fetch(channelId);

  let embed = new EmbedBuilder()
    .setTitle('Map Vote')
    .setDescription('Which map should we play?')
    .setFooter({ text: 'The vote will last for 15 seconds!' })

  const buttons = Object.keys(maps).map(mapKey => {
    return new ButtonBuilder()
      .setCustomId(mapKey)
      .setLabel(maps[mapKey].name)
      .setStyle(ButtonStyle.Primary);
  });


  const actionRows = [];
  while (buttons.length > 0) {
    actionRows.push(new ActionRowBuilder().addComponents(buttons.splice(0, 5)));
  }

  const pollMessage = await channel.send({ embeds: [embed], components: actionRows });

 
  const filter = interaction => interaction.message.id === pollMessage.id && interaction.user.id !== client.user.id;
  const collector = pollMessage.createMessageComponentCollector({ filter, time: 15000 });

  let voteCounts = {
    bureau: 0,
    canals: 0,
    castello: 0,
    grounded: 0,
    legacy: 0,
    plaza: 0,
    port: 0,
    raid: 0,
    soar: 0,
    village: 0
  };

  collector.on('collect', async interaction => {
    const mapKey = interaction.customId;
    voteCounts[mapKey]++;
    await interaction.reply({ content: `You voted for ${maps[mapKey].name}`, ephemeral: true });
  });

 
  const interval = setInterval(async () => {
    const updatedEmbed = new EmbedBuilder()
      .setTitle('Map Vote')
      .setDescription('Which map should we play?')
      .setFooter({ text: 'The vote will last for 15 seconds!' })
      .setColor('#ff0557');

    for (const [mapKey, { name }] of Object.entries(maps)) {
      updatedEmbed.addFields({ 
        name: `${name}`, 
        value: `${voteCounts[mapKey]} votes`, 
        inline: true 
      });
    }

    await pollMessage.edit({ embeds: [updatedEmbed] });
  }, 2000);

  collector.on('end', async () => {
    clearInterval(interval); 

    
    let maxVotes = 0;
    let winningMap = '';
    for (const [mapKey, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        winningMap = mapKey;
      }
    }

    const resultEmbed = new EmbedBuilder()
      .setTitle(`Poll Results - ${maps[winningMap].name} was selected!`)
      .setDescription(`The map with the most votes: ${maps[winningMap].name}`)
      .setImage(maps[winningMap].image)
      .setColor('#ff0000');

    
    await pollMessage.edit({ embeds: [resultEmbed] });

   
    const disabledButtons = Object.keys(maps).map(mapKey => {
      return new ButtonBuilder()
        .setCustomId(mapKey)
        .setLabel(maps[mapKey].name)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);
    });

    const actionRowsDisabled = [];
    while (disabledButtons.length > 0) {
      actionRowsDisabled.push(new ActionRowBuilder().addComponents(disabledButtons.splice(0, 5)));
    }

    await pollMessage.edit({ components: actionRowsDisabled });

  
    const db = await connectToMongoDB();
    const matches = await db.collection('matches').find().toArray();
    const matchIndex = matches.findIndex(p => p.match_id === matchId);
    if (matchIndex === -1) throw new Error('Match not found');

    matches[matchIndex].map = maps[winningMap].name;
    await db.collection('matches').updateOne(
      { match_id: matchId },
      { $set: { map: maps[winningMap].name } }
    );
  });
}




async function queueUnban(playerId) {
  const db = await connectToMongoDB();
  const collection = db.collection('register');
  
  const player = await collection.findOne({ discord_id: playerId });
  if (!player) throw new Error('Player not found');

  await collection.updateOne(
    { discord_id: playerId },
    { $set: { 'matchmaking.ban': [] } } 
  );
}





function parseDuration(duration) {
    const units = {
        'h': 3600000, 
        'd': 86400000 
    };
    const match = duration.match(/(\d+)([hd])/);
    if (!match) throw new Error('Invalid duration format');
    const value = parseInt(match[1]);
    const unit = match[2];
    return value * units[unit];
}

async function queueBan(playerId, duration, reason, authorId = "1304801843712622663") {
  const db = await connectToMongoDB();
  const collection = db.collection('register');

  const player = await collection.findOne({ discord_id: playerId });
  if (!player) throw new Error('Player not found');

  const banDuration = parseDuration(duration);
  const formattedDuration = formatDuration(duration);
  const banEnd = Date.now() + banDuration;
  const banStart = Date.now();

  const banInfo = {
    reason: reason,
    start: banStart, 
    end: banEnd,
    author: authorId
  };

  const pastBanInfo = {
    reason: reason,
    duration: formattedDuration,
    start: banStart, 
    end: banEnd,
    author: authorId
  };


  await collection.updateOne(
    { discord_id: playerId },
    { 
      $push: { 
        'matchmaking.ban': banInfo, 
        'matchmaking.pastBans': pastBanInfo 
      } 
    } 
  );
}


function formatDuration(duration) {
  const time = parseInt(duration);
  if (duration.includes('h')) return `${time} hour ban`;
  if (duration.includes('d')) return `${time} day ban`;
  if (duration.includes('m')) return `${time} month ban`;
  return `${time} hour ban`;
}



async function warnPlayer(playerId, reason, authorId) {
  const db = await connectToMongoDB();
  const collection = db.collection('register');

  authorId = authorId || "1304801843712622663"; 

  const player = await collection.findOne({ discord_id: playerId });
  if (!player) throw new Error('Player not found');

  const warningInfo = {
    reason: reason,
    author: authorId,
    date: Date.now() 
  };
  await collection.updateOne(
    { discord_id: playerId },
    { $push: { "matchmaking.warnings": warningInfo } }
  );
}


async function banCheck(playerId) {
  const db = await connectToMongoDB();
  const collection = db.collection('register');

  const player = await collection.findOne({ discord_id: playerId });
  if (!player) throw new Error('Player not found');

  const now = Date.now();
  const activeBans = player.matchmaking?.ban?.filter(ban => ban.end > now) || [];



      await collection.updateOne(
          { discord_id: playerId },
          { $set: { 'matchmaking.ban': activeBans } } 
      );
      return activeBans;
  

  return []; 
}


async function queueClear(channelId) {
  const db = await connectToMongoDB();
  const collection = db.collection('queue');
  

  const result = await collection.updateOne(
    { channel_id: channelId },
    { $set: { players: [] } }
  );

  if (result.modifiedCount === 1) {
    return 'Queue players cleared in the database.';
  } else {
    return 'Queue not found in the database.';
  }
}


async function queueCreate(channelId, vc_channelId, maxPlayer, minRating, maxRating) {
  const db = await connectToMongoDB();
  const collection = db.collection('queue');

    const queue = {
        channel_id: channelId,
        vc_channel_id: vc_channelId,
        max_player: maxPlayer,
        min_rating: minRating,
        max_rating: maxRating,
        players: []
    };
    
    await collection.insertOne(queue);
    return('Queue created and added to the database.');
}



async function queueDelete(channelId) {
  const db = await connectToMongoDB();
  const collection = db.collection('queue');
  

  const result = await collection.deleteOne({ channel_id: channelId });

  if (result.deletedCount === 1) {
    return 'Queue deleted from the database.';
  } else {
    return 'Queue not found in the database.';
  }
}



async function applyWin(playerId, matchId, map) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('register');
    const matches = db.collection('matches');
    const match =  await matches.findOne({ match_id: matchId });
    
    const player = await collection.findOne({ discord_id: playerId });
    if (!player) throw new Error('Oyuncu bulunamadı.');

     const alreadyPlayed = player.matchmaking.matches.some(m => m.match_id === matchId);
    if (alreadyPlayed) return `This match (${matchId}) has already been processed.`;

    const rank = player.matchmaking.rank;
    const elo = player.matchmaking.elo;
    const rankData = ranks[rank];
    if (!rankData) throw new Error(`Rank verisi bulunamadı: ${rank}`);

    let eloToAdd = rankData.win;
    if (match.isDouble === true) {
        eloToAdd = rankData.win * 2;
  
    }
    
    await collection.updateOne(
      { discord_id: playerId },
      { 
        $inc: { 'matchmaking.wins': 1, 'matchmaking.elo': eloToAdd }, 
        $push: { 
          'matchmaking.matches': { 
            match_id: matchId || null, 
            map: map || null, 
            win: eloToAdd 
          }
        }
      }
    );

    return(`win: ${playerId}`);
  } catch (error) {
    return('Error:', error);
  }
}



async function applyLose(playerId, matchId, map) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('register');

    const player = await collection.findOne({ discord_id: playerId });
    if (!player) throw new Error('Oyuncu bulunamadı.');

         const alreadyPlayed = player.matchmaking.matches.some(m => m.match_id === matchId);
    if (alreadyPlayed) return `This match (${matchId}) has already been processed.`;

    const rank = player.matchmaking.rank;
    const elo = player.matchmaking.elo;
    const rankData = ranks[rank];
    if (!rankData) throw new Error(`Rank verisi bulunamadı: ${rank}`);

    const eloToSubtract = rankData.lose;
    let newElo = elo - eloToSubtract;
    if (newElo < 0) newElo = 0;

    await collection.updateOne(
      { discord_id: playerId },
      {
        $inc: { 'matchmaking.losses': 1 },
        $set: { 'matchmaking.elo': newElo },
        $push: {
          'matchmaking.matches': {
            match_id: matchId || null,
            map: map || null,
            lose: eloToSubtract
          }
        }
      }
    );

    console.log(`Added lose: ${playerId}`);
  } catch (error) {
    console.error('Hata oluştu:', error);
  }
}



async function getPlayer(id) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('register');

    const player = await collection.findOne({ discord_id: id });
    return player || null;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}


async function getSeason() {

  try {
    const db = await connectToMongoDB();
    const setting = await db.collection('settings').find().toArray()
    const season = setting[0].season

    return season

  } catch (error) {

    console.log(error)
    return null
  }


}


async function refreshPlayer(client, guildId, playerId) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('register');

    const player = await collection.findOne({ discord_id: playerId });
    if (!player) throw new Error('Oyuncu bulunamadı.');

    let { discord_id, matchmaking } = player;
    let { rank, ign, elo } = matchmaking;

    // rankların gereksinimleri
    const rankEntries = Object.entries(ranks).sort((a, b) => a[1].point - b[1].point);

    let newRank = rank;

    // eloya göre rank
    for (let i = rankEntries.length - 1; i >= 0; i--) {
      const [rankName, rankData] = rankEntries[i];
      if (elo >= rankData.point) {
        newRank = rankName;
        break; 
      }
    }

    // rank düşürme
    for (let i = 0; i < rankEntries.length; i++) {
      const [rankName, rankData] = rankEntries[i];
      if (elo < rankData.point) {
        newRank = i > 0 ? rankEntries[i - 1][0] : 'UNRANKED';
        break; 
      }
    }

    const newRankRole = ranks[newRank];
    if (!newRankRole) {
      return null;
    }
    const newRankRoleId = newRankRole.role_id;

    const registerRoleId = ranks.REGISTERED;
    if (!registerRoleId) {
      return null;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return null;
    }

    const member = await guild.members.fetch(discord_id);
    if (!member) {
      return null;
    }

    const newRankGuildRole = guild.roles.cache.get(newRankRoleId);
    if (!newRankGuildRole) {
      return null;
    }

    const registerGuildRole = guild.roles.cache.get(registerRoleId);
    if (!registerGuildRole) {
      return null;
    }

    if (rank !== newRank) {
      const oldRankRole = guild.roles.cache.get(ranks[rank]?.role_id);
      if (oldRankRole) {
        await member.roles.remove(oldRankRole);
      }
    }

    await member.roles.add(newRankGuildRole);
    await member.roles.add(registerGuildRole);

    const allRankRoleIds = Object.values(ranks).map(rankData => rankData.role_id);

    const currentRoles = member.roles.cache;
    currentRoles.forEach(role => {
      if (allRankRoleIds.includes(role.id) && role.id !== newRankRoleId) {
        member.roles.remove(role);
      }
    });
    const ingameUpdate = await fetchPlayerData('ids', player.ingame_id);
    matchmaking.rank = newRank;

    await collection.updateOne(
      { discord_id: playerId },
      {
        $set: {
          ign: ingameUpdate.basicInfo.name, 
          matchmaking: matchmaking 
        }
      }
    );

    const newNickname = `[${elo}] ${ingameUpdate.basicInfo.name}`;
    try {
      await member.setNickname(newNickname);
    } catch (error) {
      return 'perm_error';
    }

    console.log(`player updated: ${discord_id}`);
    return true;
  } catch (error) {
    console.error('error:', error);
  }
}



function getMapLink(mapName) {
    const mapLinks = {
        bureau: 'https://i.imgur.com/15RM8mw.png',
        canals: 'https://i.imgur.com/czsexLC.png',
        castello: 'https://i.imgur.com/RJdQB4k.png',
        grounded: 'https://i.imgur.com/vSHNjII.png',
        legacy: 'https://i.imgur.com/HGewbWD.png',
        plaza: 'https://i.imgur.com/bP2rdJL.png',
        port: 'https://i.imgur.com/MjrzROw.png',
        raid: 'https://i.imgur.com/jVYKRPV.png',
        soar: 'https://i.imgur.com/bithQGz.png',
        village: 'https://i.imgur.com/hNB22Dk.png',
    };

    if (mapLinks.hasOwnProperty(mapName)) {
        return mapLinks[mapName];
    } else {
        return 'Map not found';
    }
}


function parseMaps(maps) {
  const parts = maps.split(', ');

  return parts.map(part => {
    const [map, score] = part.split(' ');
    const [left, right] = score.split('-');
    const isWin = parseInt(left) === 13;

    return {
      map,
      score,
      isWin,
    };
  });
}


async function fetchPlayerData(selectType, usernames) {

 
  let apiUrl;
  let requestBody = {};

  if (selectType === "ids") {
    apiUrl =
      `https://1-44-1.prod.copsapi.criticalforce.fi/api/public/profile?ids=${usernames}`;
    requestBody.userIds = [usernames];
  } else {
    apiUrl =
      `https://1-44-1.prod.copsapi.criticalforce.fi/api/public/profile?usernames=${usernames}`;
    requestBody.usernames = [usernames];
  }
  return fetch(apiUrl, {
    method: "GET",
    headers: {
      "content-type": "application/json",
     
    },
 
  })
    .then((response) => {
      if (response.status === 500) {
        return null; 
      }
      return response.json();
    })
    .then((data) => {
      if (!data || data.length === 0) {
        return null;
      }

      const playerData = data[0];
      return playerData;
    })
    .catch((error) => {
      return null; 
    });
}




function getBanReason(reasonCode) {
    switch (reasonCode) {
        case 1:
            return `In-App purchase abuse`;
        case 2:
            return `Cheating, 3rd party\nsoftware`;
        case 10:
            return `Ghosting`;
        case 8:
            return `Account trading`;
        case 0:
            return `Breaking code of conduct`;
        case 3:
            return `Griefing, unsportsmanlike`;
         case 4:
            return `Verbal abuse, bad language`;
          case 9:
            return `Abusing bugs In-Game`;
          case 11:
            return `Partying with cheaters`;
        default:
            return `Unknown`;
    }
}



//rank hesaplama

function calculateRankInfo(rating, globalPosition) {
        let rankInfo = "UNRANKED";
    
        if (rating >= 0 && rating <= 1199) {
            rankInfo = "IRON";
            if (rating >= 0 && rating < 1125) {
                rankInfo += " 1";
            } else if (rating >= 1125 && rating < 1150) {
                rankInfo += " 2";
            } else if (rating >= 1150 && rating < 1175) {
                rankInfo += " 3";
            } else {
                rankInfo += " 4";
            }
        } else if (rating > 1199 && rating <= 1299) {
            rankInfo = "BRONZE";
            if (rating >= 1200 && rating < 1225) {
                rankInfo += " 1";
            } else if (rating >= 1225 && rating < 1250) {
                rankInfo += " 2";
            } else if (rating >= 1250 && rating < 1275) {
                rankInfo += " 3";
            } else {
                rankInfo += " 4";
            }
        } else if (rating > 1299 && rating <= 1399) {
            rankInfo = "SILVER";
            if (rating >= 1300 && rating < 1325) {
                rankInfo += " 1";
            } else if (rating >= 1325 && rating < 1350) {
                rankInfo += " 2";
            } else if (rating >= 1350 && rating < 1375) {
                rankInfo += " 3";
            } else {
                rankInfo += " 4";
            }
        } else if (rating > 1399 && rating <= 1499) {
            rankInfo = "GOLD";
            if (rating >= 1400 && rating < 1425) {
                rankInfo += " 1";
            } else if (rating >= 1425 && rating < 1450) {
                rankInfo += " 2";
            } else if (rating >= 1450 && rating < 1475) {
                rankInfo += " 3";
            } else {
                rankInfo += " 4";
            }
        } else if (rating > 1499 && rating <= 1599) {
            rankInfo = "PLATINUM";
            if (rating >= 1500 && rating < 1525) {
                rankInfo += " 1";
            } else if (rating >= 1525 && rating < 1550) {
                rankInfo += " 2";
            } else if (rating >= 1550 && rating < 1575) {
                rankInfo += " 3";
            } else {
                rankInfo += " 4";
            }
        } else if (rating > 1599 && rating <= 1699) {
            rankInfo = "DIAMOND";
            if (rating >= 1600 && rating < 1625) {
                rankInfo += " 1";
            } else if (rating >= 1625 && rating < 1650) {
                rankInfo += " 2";
            } else if (rating >= 1650 && rating < 1675) {
                rankInfo += " 3";
            } else {
                rankInfo += " 4";
            }
        } else if (rating > 1699 && rating <= 1900) {
            rankInfo = "MASTER";
            if (rating >= 1700 && rating < 1750) {
                rankInfo += " 1";
            } else if (rating >= 1750 && rating < 1800) {
                rankInfo += " 2";
            } else if (rating >= 1800 && rating < 1850) {
                rankInfo += " 3";
            } else {
                rankInfo += " 4";
            }
        } else {
            if (globalPosition) {
                rankInfo = `ELITE_OPS ${globalPosition}`;
            } else {
                rankInfo = "SPEC_OPS";
            }
        }
    
        return rankInfo;
    }




  function getRankThumbnailUrl(rankInfo) {
    switch (rankInfo) {
        case 'IRON':
            return 'https://criticalopsgame.com/homepage/ranked/iron.png';
        case 'BRONZE':
            return 'https://criticalopsgame.com/homepage/ranked/bronze.png';
        case 'SILVER':
            return 'https://criticalopsgame.com/homepage/ranked/silver.png';
        case 'GOLD':
            return 'https://criticalopsgame.com/homepage/ranked/gold.png';
        case 'PLATINUM':
            return 'https://criticalopsgame.com/homepage/ranked/platinum.png';
        case 'DIAMOND':
            return 'https://criticalopsgame.com/homepage/ranked/diamond.png';
        case 'MASTER':
            return 'https://criticalopsgame.com/homepage/ranked/master.png';
        case 'SPEC_OPS':
            return 'https://i.imgur.com/71GOmVN.png';
        case 'ELITE_OPS':
            return 'https://i.imgur.com/5IHbkq5.png';
        default:
            return 'https://i.imgur.com/fVIZr5r.png'; 
    }
}









module.exports = { 
  warnPlayer,
    getNewBearer,
  updateGoxGameId,
  fetchGoxPlayerData,
  connectToMongoDB,
  startPool,
fetchPlayerData,
 getBanReason, 
calculateRankInfo,
 getRankThumbnailUrl,
 parseMaps,
 getMapLink,
 getPlayer,
 refreshPlayer, 
applyWin, 
applyLose, 
queueCreate, 
queueDelete,
 queueClear, 
queueBan, 
banCheck,
queueUnban,
handleError,
addPlayerLog,
getSeason};