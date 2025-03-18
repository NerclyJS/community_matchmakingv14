const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const { queueDelete } = require('../utility/utilFunctions');

module.exports = {
    description: 'Delete Queue',
    data: new SlashCommandBuilder()
        .setName('queue_delete') 
        .setDescription('Deletes a queue from the database.')
        .addChannelOption(option =>
            option.setName('text_channel')
                .setDescription('Select the text channel for the queue')
                .setRequired(true)),
    admin_only: true,
    parent: "admin",
    async execute(client, interaction) {
        const textChannelId = interaction.options.getChannel('text_channel').id;

        queueDelete(textChannelId);

        const embed = new EmbedBuilder()
            .setTitle('Queue Deleted')
            .setDescription(`The selected queue channel has been deleted.`)
            .setColor('#00ff51');

        return interaction.reply({ embeds: [embed] });
    }
};
