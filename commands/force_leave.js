
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const { connectToMongoDB, handleError } = require('../utility/utilFunctions');

module.exports = {
    description: 'Forcefully remove a user from the queue',
    data: new SlashCommandBuilder()
        .setName('force_leave')
        .setDescription('Forcefully removes a user from the queue')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Select a user to remove from the queue')
                .setRequired(true)),
    staff_only: false,
    parent: "staff",
    com_staff_only: true,
    async execute(client, interaction) {
        try {
            const channelId = interaction.channel.id;
            const targetUser = interaction.options.getUser('user');
            const targetUserId = targetUser.id;

            await interaction.deferReply();

            const db = await connectToMongoDB();
            const collection = db.collection('queue');
            let queue = await collection.findOne({ channel_id: channelId });

            if (!queue) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription('❗ This is not a queue channel.')
                            .setColor('#ff0557')
                                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                    ]
                });
            }

            if (!queue.players.includes(targetUserId)) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription('❗ The specified user is not in the queue.')
                            .setColor('#ff0557')
                                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                    ]
                });
            }

            await collection.updateOne(
                { channel_id: channelId },
                { $pull: { players: targetUserId } }
            );

            queue = await collection.findOne({ channel_id: channelId });

            const forceLeaveEmbed = new EmbedBuilder()
                .setTitle('Force Leave Queue')
                .setDescription(`Successfully removed <@${targetUserId}> from the queue.`)
                .setColor('#ff0557')
                .addFields([
                    {
                        name: 'Players in Queue',
                        value: queue.players.length > 0
                            ? queue.players.map(p => `<@${p}>`).join('\n')
                            : 'No players yet'
                    }
                ])
                  .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 


                     const member = interaction.guild.members.cache.get(targetUserId);
            if (member && member.voice.channel) {
                 member.voice.disconnect().catch(err => console.error(`Failed to disconnect ${targetUserId} from voice channel:`, err));
            }

            setTimeout(() => interaction.editReply({ embeds: [forceLeaveEmbed] }), 1000);
        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};
