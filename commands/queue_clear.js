const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const { queueClear } = require('../utility/utilFunctions');

module.exports = {
    description: 'Clear the Queue',
    data: new SlashCommandBuilder()
        .setName('queue_clear') 
        .setDescription('Clears the players in the queue')
        .addChannelOption(option =>
            option.setName('text_channel')
                .setDescription('Select the text channel for the queue')
                .setRequired(true)),
    staff_only: false,
    parent: "staff",
    async execute(client, interaction) {
        const textChannelId = interaction.options.getChannel('text_channel').id;

        queueClear(textChannelId);

        const embed = new EmbedBuilder()
            .setTitle('Queue Cleared')
            .setDescription(`Players in <#${textChannelId}> channel have been cleared.`)
            .setColor('#00ff51');

        return interaction.reply({ embeds: [embed] });
    }
};
