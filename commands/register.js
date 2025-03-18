const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { fetchPlayerData, refreshPlayer, handleError, fetchGoxPlayerData } = require('../utility/utilFunctions');
const ranks = require('../utility/ranks.json');
const { connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register')
        .addStringOption(option =>
            option.setName('ign')
                .setDescription('Enter an IGN')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('region')
                .setDescription('Select your Region')
                .setRequired(true)
                .addChoices(
                    { name: 'Europe', value: 'EU' },
                    { name: 'Asia', value: 'AS' },
                    { name: 'North America', value: 'NA' },
                    { name: 'South America', value: 'SA' }
                )
        ),

    async execute(client, interaction) {
        const errorEmbed2 = new EmbedBuilder().setColor('#ff0557');
        await interaction.deferReply().catch(() => {});

        const userCreationDate = interaction.user.createdAt;
        const accountAgeInDays = (Date.now() - userCreationDate.getTime()) / (1000 * 60 * 60 * 24);

        if (accountAgeInDays < 3) {
            return interaction.editReply({
                embeds: [errorEmbed2.setTitle('Error').setDescription('❗ Your Discord account must be at least 3 days old to register.')]
            }).catch(() => {
                interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [errorEmbed2] }).catch(console.error);
            });
        }

        const usernames = interaction.options.getString('ign');
        const region = interaction.options.getString('region');
        let playerData = await fetchPlayerData('ign', usernames);

        if (playerData == null) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription('❗ In-game profile not found.')
                .setColor('#ff0557')
                .setAuthor({ name: 'Critical Ops Esports', iconURL: client.user.displayAvatarURL() });

            interaction.editReply({ embeds: [errorEmbed] }).catch(() => {
                interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [errorEmbed] }).catch(console.error);
            });

            return;
        }

        if (playerData.ban !== null && typeof playerData.ban === "object") {
            const errorEmbed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription('❗ Banned in-game accounts cannot register.')
                .setColor('#ff0557')
                .setAuthor({ name: 'Critical Ops Esports', iconURL: client.user.displayAvatarURL() });

            interaction.editReply({ embeds: [errorEmbed] }).catch(() => {
                interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [errorEmbed] }).catch(console.error);
            });

            return;
        }

        // Check API
        const tokenCheck = await fetchPlayerData('ign', 'nercly');
        if (tokenCheck == null) {
            return interaction.editReply({ embeds: [errorEmbed.setDescription(`❗ Critical Ops API is currently unavailable. Please try again later.`)] });
        }

        try {
            const db = await connectToMongoDB();
            const registerCollection = db.collection('register');

            const member = await interaction.guild.members.fetch(interaction.user.id);
            const registeredRole = interaction.guild.roles.cache.get(ranks.REGISTERED);

            let totalKills = 0;
            playerData.stats.seasonal_stats.forEach(season => {
                totalKills += season.ranked.k;
                totalKills += season.casual.k;
                totalKills += season.custom.k;
            });

            if (totalKills < 1000) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('Error')
                    .setDescription('❗ You need a total of 1000 kills to register.')
                    .setColor('#ff0557')
                    .setAuthor({ name: 'Critical Ops Esports', iconURL: client.user.displayAvatarURL() });

                interaction.editReply({ embeds: [errorEmbed] }).catch(() => {
                    interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [errorEmbed] }).catch(console.error);
                });

                return;
            }

            const registerData = await registerCollection.findOne({ discord_id: interaction.user.id });
            if (registerData) {
                await refreshPlayer(client, interaction.guild.id, interaction.user.id);
                interaction.editReply({ embeds: [errorEmbed2.setDescription(`❗ You are already registered. Necessary roles have been granted.`)] })
                    .catch(() => {
                        interaction.channel.send({
                            content: `<@${interaction.user.id}>`,
                            embeds: [errorEmbed2.setDescription(`❗ You are already registered. Necessary roles have been granted.`)]
                        });
                    });

                return;
            }

            const checkIngame = await registerCollection.findOne({ ingame_id: `${playerData.basicInfo.userID}` });
            if (checkIngame) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('Error')
                    .setDescription('❗ This in-game account is already being used by someone else.')
                    .setColor('#ff0557')
                    .setAuthor({ name: 'Critical Ops Esports', iconURL: client.user.displayAvatarURL() });

                interaction.editReply({ embeds: [errorEmbed] }).catch(() => {
                    interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [errorEmbed] }).catch(console.error);
                });

                return;
            }

            let registerJson = {
                discord_id: interaction.user.id,
                ingame_id: `${playerData.basicInfo.userID}`,
                ign: playerData.basicInfo.name,
                pastIds: [],
                reports: [],
                matchmaking: {
                    region,
                    rank: "UNRANKED",
                    elo: 0,
                    wins: 0,
                    losses: 0,
                    ban: [],
                    matches: [],
                    pastSeasons: []
                }
            };

            await registerCollection.insertOne(registerJson);
            await refreshPlayer(client, interaction.guild.id, interaction.user.id);

            const embed = new EmbedBuilder()
                .setColor('#04be49')
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setDescription("Welcome to Critical Ops Community Matchmaking.\nPlease read the rules before you start playing.")
                .setFooter({
                    text: 'Critical Ops Esports',
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            interaction.editReply({ embeds: [embed] }).catch(() => interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed] }));

            const { addPlayerLog } = require('../utility/utilFunctions');
            await addPlayerLog(`${interaction.user.username}(${interaction.user.id}) has been registered with "${playerData.basicInfo.userID}" in-game ID`);

        } catch (error) {
            const embed = await handleError(error, interaction, client);
            // interaction.channel.send({ embeds: [embed] });
        }
    }
};
