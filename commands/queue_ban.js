const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { connectToMongoDB, queueBan, banCheck, handleError } = require('../utility/utilFunctions');

module.exports = {
    description: 'Ban a player from the queue',
    data: new SlashCommandBuilder()
        .setName('queue_ban')
        .setDescription('Ban a player from the queue')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of the ban (e.g., 7h, 1d, 30d, or "perma" for permanent)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('send_dm')
                .setDescription('Send a DM to the user?')
                .setRequired(true)
                .addChoices(
                    { name: 'Yes', value: 'yes' },
                    { name: 'No', value: 'no' }
                )
        ),
    staff_only: false,
    parent: "staff",
    com_staff_only: true,
   execute: async (client, interaction) => {
        const user = interaction.options.getUser('user');
        let duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason');
        const sendDM = interaction.options.getString('send_dm');

        try {
            await interaction.deferReply();
        } catch (error) {
            console.error('Defer reply failed:', error);
        }

        const validDurationPattern = /^(?:\d+d|\d+h|perma)$/i;
        if (!validDurationPattern.test(duration)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('Invalid Duration Format')
                .setDescription('The duration format is invalid.')
                .setColor('#ff0557');

            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (editError) {
                console.error('Edit reply failed:', editError);
                await interaction.channel.send({ embeds: [errorEmbed] });
            }
            return;
        }

        if (duration.toLowerCase().includes("perma")) {
            duration = "999d";
        }

        try {
            const db = await connectToMongoDB();
            const usersCollection = db.collection('register');

            const userData = await usersCollection.findOne({ discord_id: user.id });

            if (!userData) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('Error')
                    .setDescription('This player is not registered yet.')
                    .setColor('#ff0557')
                    .setAuthor({
                        name: 'Critical Ops Esports', 
                        iconURL: client.user.displayAvatarURL()
                    });

                try {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } catch (editError) {
                    console.error('Edit reply failed:', editError);
                    await interaction.channel.send({ embeds: [errorEmbed] });
                }
                return;
            }

            const banInfo = await banCheck(user.id);
            if (banInfo.length > 0) {
                const alreadyBannedEmbed = new EmbedBuilder()
                    .setTitle('Already Banned')
                    .setDescription('The player is already banned.')
                    .setColor('#ff0557');

                try {
                    await interaction.editReply({ embeds: [alreadyBannedEmbed] });
                } catch (editError) {
                    console.error('Edit reply failed:', editError);
                    await interaction.channel.send({ embeds: [alreadyBannedEmbed] });
                }
                return;
            }

            await queueBan(user.id, duration, reason, interaction.user.id);

            if (duration.toLowerCase().includes("999d")) {
                duration = "PERMANENT";
            }

            let dmStatus = "DM Not Sent";

            if (sendDM === 'yes') {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('You have been banned')
                    .setDescription('You have been banned from the queue.')
                    .addFields(
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Duration', value: duration, inline: false }
                    )
                    .setColor('#ff0557')
                    .setTimestamp();

                try {
                    await user.send({ embeds: [dmEmbed] });
                    dmStatus = "DM Sent Successfully";
                } catch (dmError) {
                    console.error(`Failed to send DM to ${user.tag}:`, dmError);
                    dmStatus = "Failed to send DM";
                }
            }

            const successEmbed = new EmbedBuilder()
                .setTitle('Player Banned')
                .setDescription(`${user.tag} has been banned`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Duration', value: duration, inline: false },
                    { name: 'DM Status', value: dmStatus, inline: false }
                )
                .setColor('#ff0557')
                .setTimestamp();

            try {
                await interaction.editReply({ embeds: [successEmbed] });
            } catch (editError) {
                console.error('Edit reply failed:', editError);
                await interaction.channel.send({ embeds: [successEmbed] });
            }

            const { addPlayerLog } = require('../utility/utilFunctions');
            await addPlayerLog(`${user.username}(${user.id}) has been banned by ${interaction.user.username}(${interaction.user.id}) for "${reason}"`);

            const guild = client.guilds.cache.get(interaction.guild.id);
            const banRoleId = '1257128748411523162';
            const banRole = guild.roles.cache.get(banRoleId);
            const member = await guild.members.fetch(user.id);

            await member.roles.add(banRole);

        } catch (error) {
            const embed = await handleError(error, interaction, client);

            try {
                await interaction.editReply({ embeds: [embed] });
            } catch (editError) {
                console.error('Edit reply failed:', editError);
                await interaction.channel.send({ embeds: [embed] });
            }
        }
    }
};
