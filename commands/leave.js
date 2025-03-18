const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { connectToMongoDB, handleError } = require('../utility/utilFunctions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leave the queue'),

    async execute(client, interaction) {


        try {
            const channelId = interaction.channel.id;
            const userId = interaction.user.id;

            interaction.deferReply();

            const db = await connectToMongoDB();
            const collection = db.collection('queue');
            let queue = await collection.findOne({ channel_id: channelId });

            if (!queue) {
                setTimeout(() => interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription('❗ This is not a queue channel.')
                            .setColor('#ff0557')
                                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                    ]
                }), 3000);
                return;
            }

            if (!queue.players.includes(userId)) {
                setTimeout(() => interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription('❗ You are not in the queue.')
                            .setColor('#ff0557')
                                .setAuthor({
        name: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()}) 
                    ]
                }), 3000);
                return;
            }

            await collection.updateOne(
                { channel_id: channelId },
                { $pull: { players: userId } }
            );

            queue = await collection.findOne({ channel_id: channelId });

            const leaveEmbed = new EmbedBuilder()
                .setTitle('Leave Queue')
                .setDescription('You have successfully left the queue.')
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

                  const member = interaction.guild.members.cache.get(userId);
            if (member && member.voice.channel) {
                 member.voice.disconnect().catch(err => console.error(`Failed to disconnect ${userId} from voice channel:`, err));
            }

            setTimeout(() => interaction.editReply({ embeds: [leaveEmbed] }), 1000);
        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};
