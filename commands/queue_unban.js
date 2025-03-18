const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { connectToMongoDB } = require('../utility/utilFunctions');
const { queueUnban, banCheck } = require('../utility/utilFunctions');

module.exports = {
    data: new SlashCommandBuilder() 
        .setName('queue_unban')
        .setDescription('Unban a player from the queue')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unban')
                .setRequired(true)
        ),
    staff_only: false,
    parent: "staff",
    com_staff_only: true,
    
    execute: async (client, interaction) => {
        const user = interaction.options.getUser('user');

        try {
            await interaction.deferReply();
        } catch (error) {
            console.error('Defer reply failed:', error);
        }

        try {
            const db = await connectToMongoDB();
            const bansCollection = db.collection('register');

            const banInfo = await banCheck(user.id);
            if (banInfo.length < 1) {
                interaction.editReply({ content: `The player is not banned.`, ephemeral: true }).catch(() => {
                    interaction.channel.send({ content: `<@${interaction.user.id}> The player is not banned.` }).catch(console.error);
                });
                return;
            }

            await queueUnban(user.id);

            const embed = new EmbedBuilder()
                .setTitle('Ban Removed')
                .setDescription(`The ban for player ${user.tag} has been removed.`)
                .setColor('#00ff51')
                .setTimestamp();

            interaction.editReply({ embeds: [embed] }).catch(() => {
                interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed] }).catch(console.error);
            });

            const { addPlayerLog } = require('../utility/utilFunctions');
            await addPlayerLog(`${user.username}(${user.id}) has been unbanned by ${interaction.user.username}(${interaction.user.id})`);

            const guild = client.guilds.cache.get(interaction.guild.id);
            const banRoleId = '1257128748411523162';
            const banRole = guild.roles.cache.get(banRoleId);
            const member = await guild.members.fetch(user.id);

            await member.roles.remove(banRole);

        } catch (error) {
            interaction.reply({ content: `Error unbanning user: ${error.message}`, ephemeral: true });
        }
    }
};
