const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { fetchPlayerData } = require('../utility/utilFunctions');
const fetch = require('node-fetch');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search_cops')
    .setDescription('Search COPS accounts (Format: \'PLAYER, PLAYER, PLAYER\' ) (Max 7)')
    .addStringOption(option =>
      option.setName('search_list')
        .setDescription('IGN or ID list (Format: \'PLAYER, PLAYER, PLAYER\' )')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('select_type')
        .setDescription('Select search type')
        .setRequired(true)
        .addChoices(
          { name: 'ID', value: 'ids' },
          { name: 'IGN', value: 'ign' }
        )
    )
    .setDefaultMemberPermissions(0),
  com_staff_only: true,
  parent: "staff",

  execute: async (client, interaction) => {
    try {
      const user = interaction.user;

      const hata = new EmbedBuilder().setColor('#ff0038');
      const idList = interaction.options.getString("search_list");
      const playerIds = idList.split(",").map((id) => id.trim());

      if (playerIds.length > 7) {
        return interaction.reply({
          content: "You can only search for a maximum of 7. Please provide a list with 7 or fewer.",
          ephemeral: true,
        });
      }

      interaction.deferReply().catch(() => {});

      const selectType = interaction.options.getString("select_type");
      const data = [];
      const incorrectIds = [];

      for (const playerId of playerIds) {
        const data1 = await fetchPlayerData(selectType, playerId);
        if (data1 === null) {
          incorrectIds.push(playerId);
        } else {
          data.push(data1);
        }
      }

      if (data.length === 0) {
        return interaction.editReply({
          embeds: [hata.setDescription(`❗ Players not found`)],
        });
      }

      if (incorrectIds.length > 0) {
        console.log(`Incorrect IDs: ${incorrectIds.join(", ")}`);
      }

      data.sort((a, b) => b.stats.ranked.mmr - a.stats.ranked.mmr);

      const leaderboardsEmbed = new EmbedBuilder()
        .setColor(client.nercly.color)
        .setTitle("Search Results")
        .setThumbnail("https://i.imgur.com/7Ell0zA.png");

      for (const playerData of data) {
        const totalStats = {
          ranked: { k: 0, d: 0, a: 0, w: 0, l: 0 },
          casual: { k: 0, d: 0, a: 0, w: 0, l: 0 },
          custom: { k: 0, d: 0, a: 0, w: 0, l: 0 },
        };

        for (const season of playerData.stats.seasonal_stats) {
          totalStats.ranked.k += season.ranked.k;
          totalStats.ranked.d += season.ranked.d;
          totalStats.ranked.a += season.ranked.a;
          totalStats.ranked.w += season.ranked.w;
          totalStats.ranked.l += season.ranked.l;

          totalStats.casual.k += season.casual.k;
          totalStats.casual.d += season.casual.d;
          totalStats.casual.a += season.casual.a;
          totalStats.casual.w += season.casual.w;
          totalStats.casual.l += season.casual.l;

          totalStats.custom.k += season.custom.k;
          totalStats.custom.d += season.custom.d;
          totalStats.custom.a += season.custom.a;
          totalStats.custom.w += season.custom.w;
          totalStats.custom.l += season.custom.l;
        }

        const totalAllMods = {
          k: totalStats.ranked.k + totalStats.casual.k + totalStats.custom.k,
          d: totalStats.ranked.d + totalStats.casual.d + totalStats.custom.d,
          a: totalStats.ranked.a + totalStats.casual.a + totalStats.custom.a,
          w: totalStats.ranked.w + totalStats.casual.w + totalStats.custom.w,
          l: totalStats.ranked.l + totalStats.casual.l + totalStats.custom.l,
        };

        function getPlayerType(userType) {
          switch (userType) {
            case 1:
              return "Player";
            case 64:
              return "DEVELOPER";
            case 2:
              return "MOD";
            case 0:
              return "SPECTATOR";
            default:
              return "MOD";
          }
        }

        const kdRatioCasual = (
          totalStats.casual.k / totalStats.casual.d
        ).toFixed(2);
        const kdRatioCustom = (
          totalStats.custom.k / totalStats.custom.d
        ).toFixed(2);

        const combinedCasualStats = {
          k: totalStats.casual.k + totalStats.custom.k,
          d: totalStats.casual.d + totalStats.custom.d,
          a: totalStats.casual.a + totalStats.custom.a,
          w: totalStats.casual.w + totalStats.custom.w,
          l: totalStats.casual.l + totalStats.custom.l,
        };

        const kdRatioCombined = (
          combinedCasualStats.k / combinedCasualStats.d
        ).toFixed(2);

        let rankInfo = "UNRANKED";

        const latestSeason =
          playerData.stats.seasonal_stats[
            playerData.stats.seasonal_stats.length - 1
          ];

        const kdRatioCurrent = (
          latestSeason.ranked.k / latestSeason.ranked.d
        ).toFixed(2);

        const playerName = playerData.basicInfo.name;
        const playerRating = playerData.stats.ranked.mmr;
        let playerRankInfo = calculateRankInfo(
          playerData.stats.ranked.mmr,
          playerData.stats.ranked.global_position
        );

        const tahmini = playerRankInfo;
        if (playerData.stats.ranked.rank == 0) {
          playerRankInfo = `<:unranked:1160925511493627984> UNRANKED (Estimated Rank: ${tahmini})`;
        }

      

        const playerDisplayName =
          playerData.clan && playerData.clan.basicInfo.tag
            ? `[${playerData.clan.basicInfo.tag}] ${playerName}`
            : playerName;

        const fields = [
          { name: playerDisplayName, value:  `**ID:** ${playerData.basicInfo.userID}\n**Rating:** ${playerRating}\n**Rank Info:** ${playerRankInfo}\n**Kills :** ${totalAllMods.k}\n**Deaths :** ${totalAllMods.d}` },
 
        
        ];

        if (playerData.ban !== null && typeof playerData.ban === "object") {
          let banInfo = "TEMPORARY BANNED";
          if (playerData.ban.Type === 0) {
            banInfo = "PERMANENT BANNED";
          }
          fields.push(
            { name: "Ban Info", value: banInfo, inline: false }
          );
        }

        leaderboardsEmbed.addFields(...fields);
      }

      interaction.editReply({ embeds: [leaderboardsEmbed] }).catch(() => {
        interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [leaderboardsEmbed] }).catch(console.error);
      });
    } catch (error) {
      console.error(error);
   
    }
  },
};
let rankInfo = "UNRANKED";

function calculateRankInfo(rating, globalPosition) {
  let rankInfo = "<:unranked:1160925511493627984> UNRANKED";

  if (rating >= 0 && rating <= 1200) {
    rankInfo = "<:iron:1160925502186455040> IRON";
    if (rating >= 0 && rating < 1125) {
      rankInfo += " 1";
    } else if (rating >= 1125 && rating < 1150) {
      rankInfo += " 2";
    } else if (rating >= 1150 && rating < 1175) {
      rankInfo += " 3";
    } else {
      rankInfo += " 4";
    }
  } else if (rating > 1200 && rating <= 1299) {
    rankInfo = "<:bronze:1160925494544437258> BRONZE";
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
    rankInfo = "<:silver:1160925508746354718> SILVER";
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
    rankInfo = "<:gold:1160925499774742568> GOLD";
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
    rankInfo = "<:platinum:1160925506703728640> PLATINUM";
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
    rankInfo = "<:diamond:1160925498076057651> DIAMOND";
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
    rankInfo = "<:master:1160925503910330439> MASTER";
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
      rankInfo = `<:rank_elite:1032712944296923258> ELITE_OPS ${globalPosition}`;
    } else {
      rankInfo = "<:specops:1160925159453102171> SPEC_OPS";
    }
  }

  return rankInfo;
}
