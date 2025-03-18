const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
    description: 'Show Queue Info',
    data: new SlashCommandBuilder()
        .setName('queue_info') 
        .setDescription('Displays information about the queue')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Select a channel')
                .setRequired(false)),
    staff_only: false,
    async execute(client, interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        const mdb = await connectToMongoDB();
        const collection = mdb.collection('queue');
        
        const queueInfo = await collection.findOne({ channel_id: channel.id });

        if (!queueInfo) {
            return interaction.reply({ content: 'No queue found for this channel.', ephemeral: true });
        }

        const mentionPlayers = (players) => {
            return players.length > 0 ? players.map(id => `<@${id}>`).join(', ') : 'No players here.';
        };

        const embed = new EmbedBuilder()
            .setTitle('Queue Information')
            .addFields(
                { name: 'Channel', value: `<#${queueInfo.channel_id}>` },
                { name: 'Voice Channel', value: `<#${queueInfo.vc_channel_id}>` },
                { name: 'Max Players', value: `${queueInfo.max_player}` },
                { name: 'Min Rating', value: `${queueInfo.min_rating}` },
                { name: 'Remaining Players', value: mentionPlayers(queueInfo.players) }
            )
            .setAuthor({
                name: 'Critical Ops Esports', 
                iconURL: client.user.displayAvatarURL()
            })
            .setColor('#ff0557');

        interaction.reply({ embeds: [embed] });
    }
};
