const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'); 
const { connectToMongoDB } = require('../utility/utilFunctions');
const { execute } = require('../commands/queue_create');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('point_multiplier')
        .setDescription('Set point multiplier mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Select multiplier mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Double', value: 'double' },
                    { name: 'Normal', value: 'normal' }
                )
        ),
    admin_only: true,
    parent: "admin",
    
    execute: async (client, interaction) => {
        try {
            const mode = interaction.options.getString('mode');
            const isDouble = mode === 'double';

    
            const db = await connectToMongoDB();
            const collection = db.collection('settings');


            await collection.updateOne({}, { $set: { double_point: isDouble } }, { upsert: true });


            const embed = new EmbedBuilder()
            .setColor('#ff0557')
                .setTitle('Point Multiplier Updated')
                .setDescription(`Point multiplier mode has been set to **${isDouble ? 'Double' : 'Normal'}**.`);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error updating point multiplier:', error);
            await interaction.reply({ content: 'An error occurred while updating the point multiplier.', ephemeral: true });
        }
    },
};
