const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { connectToMongoDB, handleError } = require('../utility/utilFunctions');

module.exports = {
    description: 'Delete Player',
    data: new SlashCommandBuilder()
        .setName('delete_player') 
        .setDescription('Deletes a player from the database.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to delete')
                .setRequired(true)),
    admin_only: true,
    parent: "admin",
    async execute(client, interaction) {
        try {
            const targetUser = interaction.options.getUser('user');

            const db = await connectToMongoDB();
            const registerCollection = db.collection('register');

            const player = await registerCollection.findOne({ discord_id: targetUser.id });

            if (!player) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription('This user is not registered.')
                        .setColor('#ff0557')
                        .setAuthor({
                            name: 'Critical Ops Esports', 
                            iconURL: client.user.displayAvatarURL()
                        })],
                    ephemeral: true
                });
            }

            await registerCollection.deleteOne({ discord_id: targetUser.id });

            interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('Success')
                    .setDescription(`${targetUser.username} has been successfully deleted from the system.`)
                    .setColor('#00ff51')
                    .setAuthor({
                        name: 'Critical Ops Esports', 
                        iconURL: client.user.displayAvatarURL()
                    })]
            });

            const { addPlayerLog } = require('../utility/utilFunctions');
            await addPlayerLog(`${targetUser.username}(${targetUser.id}) has been deleted from the system by ${interaction.user.username}(${interaction.user.id})`);

        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};
