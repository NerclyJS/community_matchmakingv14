const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ranks = require('../utility/ranks.json');

function getRankThumbnailUrl(rankInfo) {
    switch (rankInfo) {
        case "IRON":
            return "https://criticalopsgame.com/homepage/ranked/iron.png";
        case "BRONZE":
            return "https://criticalopsgame.com/homepage/ranked/bronze.png";
        case "SILVER":
            return "https://criticalopsgame.com/homepage/ranked/silver.png";
        case "GOLD":
            return "https://criticalopsgame.com/homepage/ranked/gold.png";
        case "PLATINUM":
            return "https://criticalopsgame.com/homepage/ranked/platinum.png";
        case "DIAMOND":
            return "https://criticalopsgame.com/homepage/ranked/diamond.png";
        case "MASTER":
            return "https://criticalopsgame.com/homepage/ranked/master.png";
        case "SPEC OPS":
            return "https://criticalopsgame.com/homepage/ranked/spec-ops.png";
        case "ELITE OPS":
            return "https://i.imgur.com/5IHbkq5.png";
        default:
            return "https://i.imgur.com/fVIZr5r.png";
    }
}

module.exports = {
    description: 'Show Elo System',
    data: new SlashCommandBuilder()
        .setName('elo_system')
        .setDescription('Displays the Elo ranking system'),
    staff_only: false,
    async execute(client, interaction) {
    const imageEmbed = new EmbedBuilder()
      .setImage('https://i.imgur.com/xQ6kwy9.jpeg')
      .setColor('#ff0557')
           .setTimestamp()
           .setAuthor({
            name: 'Critical Ops Esports', 
            iconURL: client.user.displayAvatarURL() // Avatar URL'sini client üzerinden alabilirsiniz
        });

    const ranksEmbeds = Object.entries(ranks)
      .filter(([key]) => key !== 'REGISTERED')
      .map(([key, value], index, array) => {
     
        const nextRankPoints = array[index + 1] ? array[index + 1][1].point : '∞';

        return new EmbedBuilder()
          .setTitle(`${key} // ${value.point} - ${nextRankPoints} Points`)
          .setDescription(
            `**Win:** (+${value.win}) **Lose:** (-${value.lose}) **Role:** <@&${value.role_id}>`
          )
    
          .setColor('#ff0557')
     
      });

    interaction.reply({ embeds: [imageEmbed, ...ranksEmbeds] });
  }
};
