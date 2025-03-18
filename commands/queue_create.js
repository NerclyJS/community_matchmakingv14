const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const { queueCreate } = require('../utility/utilFunctions');

module.exports = {
    description: 'Create a Queue',
    data: new SlashCommandBuilder()
        .setName('queue_create') 
        .setDescription('Creates a new queue')
        .addChannelOption(option =>
            option.setName('text_channel')
                .setDescription('Select the text channel for the queue')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('voice_channel')
                .setDescription('Select the voice channel for the queue')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('max_players')
                .setDescription('Maximum number of players')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('min_rating')
                .setDescription('Minimum rating to join the queue')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('max_rating')
                .setDescription('Maximum rating to join the queue')
                .setRequired(true)),
    admin_only: true,
    parent: "admin",
    async execute(client, interaction) {
        try {
            
            const textChannelId = interaction.options.getChannel('text_channel').id;
            const voiceChannelId = interaction.options.getChannel('voice_channel').id;
            const maxPlayers = interaction.options.getInteger('max_players');
            const minRating = interaction.options.getInteger('min_rating');
            const maxRating = interaction.options.getInteger('max_rating');

         
            queueCreate(textChannelId, voiceChannelId, maxPlayers, minRating, maxRating);

            
            const embed = new EmbedBuilder()
                .setTitle('✅ Queue Successfully Created')
                .setColor('#00FF00')
                .setDescription('The following queue has been created with the specified settings:')
                .addFields(
                    {
                        name: 'Text Channel',
                        value: `<#${textChannelId}>`,
                        inline: true,
                    },
                    {
                        name: 'Voice Channel',
                        value: `<#${voiceChannelId}>`,
                        inline: true,
                    },
                    {
                        name: 'Maximum Players',
                        value: `\`${maxPlayers}\``,
                        inline: true,
                    },
                    {
                        name: 'Minimum Rating',
                        value: `\`${minRating}\``,
                        inline: true,
                    },
                    {
                        name: 'Maximum Rating',
                        value: `\`${maxRating}\``,
                        inline: true,
                    }
                )
                .setFooter({ text: 'Queue System', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            return interaction.reply({
                content: '❌ An error occurred while creating the queue. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
