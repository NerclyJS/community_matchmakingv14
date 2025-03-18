const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('active_queues')
    .setDescription('Show Active Queues'),
  com_staff_only: true,
  parent: 'staff',

  execute: async (client, interaction) => {
        try {
            const db = await connectToMongoDB();
            const queueCollection = db.collection('queue');
            const activeQueues = await queueCollection.find({}).toArray();

            if (activeQueues.length === 0) {
                return interaction.reply({ content: 'There are no active queues at the moment.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('Active Queues')
                .setColor('#04be49')
                  .setFooter({
        text: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()
    });

            activeQueues.forEach((queue, index) => {
                const playerCount = queue.players.length;
                embed.addFields(
                    {
                        name: `Queue ${index + 1}`,
                        value: `**Text Channel:** <#${queue.channel_id}>\n**Voice Channel:** <#${queue.vc_channel_id}>\n**Max Players:** ${queue.max_player}\n**Min Rating:** ${queue.min_rating}\n**Current Players:** ${playerCount} / ${queue.max_player}`,
                        inline: true
                    }
                );
            });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'An error occurred while fetching the active queues.', ephemeral: true });
        }
    }
};
