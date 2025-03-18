const fs = require('fs');
const fetch = require('node-fetch');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { fetchPlayerData, getPlayer, refreshPlayer } = require('../utility/utilFunctions');
const ranks = require('../utility/ranks.json');
const { connectToMongoDB, handleError } = require('../utility/utilFunctions');

module.exports = {
    description: 'Force register a player',
    data: new SlashCommandBuilder()
        .setName('force_register')
        .setDescription('Registers a new player to the system')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to register')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ign')
                .setDescription('Enter an IGN (In-Game Name)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('region')
                .setDescription('Select your region')
                .setRequired(true)
                .addChoices(
                    { name: 'Europe', value: 'EU' },
                    { name: 'Asia', value: 'AS' },
                    { name: 'North America', value: 'NA' },
                    { name: 'South America', value: 'SA' }
                )),
    staff_only: false,
    parent: "staff",
    com_staff_only: true,
    async execute(client, interaction) {
        try {
            await interaction.deferReply();

            const errorEmbed = new EmbedBuilder().setColor('#ff0557');
            const usernames = interaction.options.getString('ign');
            const region = interaction.options.getString('region');
            const target_user = interaction.options.getUser('user');

            let playerData = await fetchPlayerData('ign', usernames);
            if (playerData == null) {
                return interaction.editReply({ embeds: [errorEmbed.setDescription(`❗ In-game profile not found.`)] });
            }

            if (playerData.ban !== null && typeof playerData.ban === "object") {
                return interaction.editReply({ embeds: [errorEmbed.setDescription(`❗ Banned accounts cannot register.`)] });
            }

            // Check API
            const tokenCheck = await fetchPlayerData('ign', 'nercly');
            if (tokenCheck == null) {
                return interaction.editReply({ embeds: [errorEmbed.setDescription(`❗ The service is currently unavailable. Please try again later.`)] });
            }

            const db = await connectToMongoDB();
            const registerCollection = db.collection('register');

            const member = await interaction.guild.members.fetch(target_user.id);
            const registeredRole = interaction.guild.roles.cache.get(ranks.REGISTERED);

            let totalKills = 0;
            playerData.stats.seasonal_stats.forEach(season => {
                totalKills += season.ranked.k;
                totalKills += season.casual.k;
                totalKills += season.custom.k;
            });

         

            const registerData = await registerCollection.findOne({ discord_id: target_user.id });
            if (registerData) {
                await refreshPlayer(client, interaction.guild.id, target_user.id);
                return interaction.editReply({ embeds: [errorEmbed.setDescription(`❗ You are already registered. The required roles have been assigned.`)] });
            }



      

                   let registerJson = {
                discord_id: target_user.id,
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
            await refreshPlayer(client, interaction.guild.id, target_user.id);

            const successEmbed = new EmbedBuilder()
                .setColor('#04be49')
                .setThumbnail(target_user.displayAvatarURL({ dynamic: true }))
                .setDescription("Welcome to Critical Ops Community Matchmaking.\nPlease read the rules before you start playing.")
                  .setFooter({
        text: 'Critical Ops Esports', 
        iconURL: client.user.displayAvatarURL()
    })
                .setTimestamp();

            interaction.editReply({ embeds: [successEmbed] });

            const { addPlayerLog } = require('../utility/utilFunctions');
            await addPlayerLog(`${target_user.username}(${target_user.id}) has been registered with "${playerData.basicInfo.userID}" in-game ID by ${interaction.user.username}(${interaction.user.id})`)


        } catch (error) {
            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });
        }
    }
};
