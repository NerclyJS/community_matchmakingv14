const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const { connectToMongoDB, startPool, handleError, getPlayer } = require('../utility/utilFunctions');
const { matchDesignGenerator } = require('../utility/matchDesignGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pick')
    .setDescription('Pick players for teams')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('Select Player')
        .setRequired(true)
    ),
  staff_only: false,
  
  async execute(client, interaction) {
    await interaction.deferReply().catch(() => {});

    const userId = interaction.user.id;
    const channelId = interaction.channel.id;

    try {
      const db = await connectToMongoDB();
      const matchesCollection = db.collection('matches');


      
      let match = await matchesCollection.findOne({ channel_id: channelId, picked: { $ne: true } });

      if (!match) {
        return sendError(interaction, '❗ No valid match found for this channel, or the match is already completed');
      }

      if (!isCaptain(userId, match)) {
        return sendError(interaction, '❗ Only captains can use this command.');
      }

      const playerToPick = interaction.options.getUser('player').id;

      if (!match.players.includes(playerToPick)) {
        return sendError(interaction, '❗ This player is not in the remaining players');
      }

      const isTeamACaptain = match.team_a_captain === userId;
      const teamKey = isTeamACaptain ? 'a' : 'b';
      const opponentTeamKey = isTeamACaptain ? 'b' : 'a';

      if (match[`team_${teamKey}_captain_picked`]) {
        return sendError(interaction, '❗ It is not your turn yet.');
      }

      match[`team_${teamKey}_players`].push(playerToPick);
      match.players = match.players.filter(p => p !== playerToPick);
      match[`team_${teamKey}_captain_picked`] = true;
      match[`team_${opponentTeamKey}_captain_picked`] = false;

      if (match.players.length === 1) {
        const lastPlayer = match.players[0];
        match[`team_${match.team_a_players.length <= match.team_b_players.length ? 'a' : 'b'}_players`].push(lastPlayer);
        match.players = [];
      }

      if (match.players.length === 0) {
        await finalizeMatch(interaction, match, client, matchesCollection);
        return;
      }
  
      await matchesCollection.updateOne({ _id: match._id }, { $set: match });

      const pickEmbed = createPickEmbed(match, client);
      const nextCaptain = match[`team_${opponentTeamKey}_captain`];

      setTimeout(() => {
        interaction.editReply({ content: `<@${nextCaptain}>, your turn!`, embeds: [pickEmbed] })
          .catch(() => interaction.channel.send({ content: `<@${nextCaptain}>, your turn!`, embeds: [pickEmbed] }));
      }, 1000);
      
    } catch (error) {
      const embed = await handleError(error, interaction, client);
      interaction.channel.send({ embeds: [embed] });
    }
  }
};

function isCaptain(userId, match) {
  return match.team_a_captain === userId || match.team_b_captain === userId;
}


function sendError(interaction, message) {
  setTimeout(() => {
    if (interaction.editReply) {
      interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('Error')
          .setDescription(message)
          .setColor('#ff0557')
         .setAuthor({ 
    name: 'Critical Ops Esports', 
    iconURL: interaction.client.user.displayAvatarURL() 
})
  ]
      }).catch(() => {
     
        interaction.channel.send({
          content: `${interaction.user}`,
          embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription(message)
            .setColor('#ff0557')
           .setAuthor({ 
    name: 'Critical Ops Esports', 
    iconURL: interaction.client.user.displayAvatarURL() 
})
]
        });
      });
    }
  }, 3000);
}
function createPickEmbed(match, client) {
  return new EmbedBuilder()
  .setTitle('The player was picked')
  .addFields(
    {
      name: 'Remaining Players',
      value: match.players.length > 0 ? match.players.map(p => `<@${p}>`).join('\n') : 'No players',
      inline: false
    },
    {
      name: 'Team A',
      value: match.team_a_players.length > 0 ? match.team_a_players.map(p => `<@${p}> ${match.team_a_captain === p ? '(C)' : ''}`).join('\n') : 'No players',
      inline: false
    },
    {
      name: 'Team B',
      value: match.team_b_players.length > 0 ? match.team_b_players.map(p => `<@${p}> ${match.team_b_captain === p ? '(C)' : ''}`).join('\n') : 'No players',
      inline: false
    }
  )
  .setColor('#ff0557')
  .setAuthor({
    name: 'Critical Ops Esports',
    iconURL: client.user.displayAvatarURL()
  })
  .setFooter({
    text: 'Critical Ops Esports',
    iconURL: client.user.displayAvatarURL()
  })
  .setTimestamp(); 
}

async function finalizeMatch(interaction, match, client, matchesCollection) {
  const matchId = match.match_id;
  const matchEmbed = new EmbedBuilder()
  .setTitle(`Match ID: ${matchId}`)
  .addFields(
    {
      name: 'Team A',
      value: match.team_a_players.map(p => `<@${p}> ${match.team_a_captain === p ? '(C)' : ''}`).join('\n') || 'No players',
      inline: true
    },
    {
      name: 'Team B',
      value: match.team_b_players.map(p => `<@${p}> ${match.team_b_captain === p ? '(C)' : ''}`).join('\n') || 'No players',
      inline: true
    }
  )
  .setColor('#ff0557')
  .setFooter({
    text: `Match ID: ${matchId}`,
    iconURL: client.user.displayAvatarURL()
  })
  .setAuthor({
    name: 'Critical Ops Esports',
    iconURL: client.user.displayAvatarURL()
  })
  .setDescription(`The match has been created successfully. When hosting a room, please ensure that the **match ID matches the room name**, otherwise you may not receive points. After the match has been played, one of the players must send a screenshot of the match using the **/report_score** command.`);

  const allPlayers = [...match.team_a_players, ...match.team_b_players];
  const mentionPlayers = allPlayers.map(player => `<@${player}>`).join(' ');

  const finalEmbed = new EmbedBuilder()
    .setTitle(`The match is being created..`)
    .setColor('#ff0557');

  const regionText = await getDominantRegion(allPlayers);
  const regionWarn = new EmbedBuilder().setColor('#ffdf00').setDescription(`${regionText}`);
  const doubleEmbed = new EmbedBuilder().setTitle(`:zap: Double points applied for this match :zap:`).setColor('#ffdf00');

  setTimeout(async () => {
    await interaction.editReply({ embeds: [finalEmbed] });
    interaction.channel.send({ content: mentionPlayers, embeds: [matchEmbed] });
    interaction.channel.send({ embeds: [regionWarn] });

    if (match.isDouble) {
      interaction.channel.send({ embeds: [doubleEmbed], components: [] });
    }

    await matchesCollection.updateOne({ match_id: matchId }, { $set: { picked: true, team_a_players: match.team_a_players, team_b_players: match.team_b_players } });
    const selectedMap = await startPool(client, interaction.channel.id, matchId);

    setTimeout(async () => {
      const matchUpdated = await matchesCollection.findOne({ match_id: matchId });
      if (matchUpdated && matchUpdated.map) {
        const matchDesign = await matchDesignGenerator(client, interaction, matchId, matchUpdated.map);
        interaction.channel.send({ files: [matchDesign] });
      }
    }, 19000);
  }, 3000);
}

async function getDominantRegion(playerIds) {
  const regionCounts = {};

  for (const id of playerIds) {
    try {
      const playerData = await getPlayer(id);
      const region = playerData?.matchmaking?.region;

      if (region) {
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      }
    } catch (error) {
      console.error(`Error fetching data for player ID: ${id}`, error);
    }
  }

  const dominantRegion = Object.entries(regionCounts).reduce((max, curr) => curr[1] > max[1] ? curr : max, ["", 0])[0];

  return `:warning: The most common region in this queue is **${dominantRegion}**. Please select a server accordingly.`;
}