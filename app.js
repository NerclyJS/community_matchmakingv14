const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, GuildInviteManager, AttachmentBuilder, ModalBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { fetchPlayerData, queueClear, connectToMongoDB, handleError, getPlayer, banCheck } = require('./utility/utilFunctions');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const fetch = require("node-fetch");
const axios = require('axios');
const { scoreMatch } = require('./utility/scoreMatch');



const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});



const serverId = "862340917117976618"
const banRoleId = "1257128748411523162"
const playerReportChannel = "1342863042337181696"
const token = ""

//player report modal

const { Modal, TextInputComponent, SelectMenuComponent, showModal } = require('discord-modals');

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.customId === 'report_reason') {

            const now = Date.now();
            const cooldownTime = 60000;

            const userCooldownKey = `${interaction.user.id}-reportcooldown`;
            const userCooldown = db.get(userCooldownKey);

            if (userCooldown && now - userCooldown < cooldownTime) {
                const timeLeft = (cooldownTime - (now - userCooldown)) / 1000;
                return void interaction.reply({
                    content: `You must wait ${timeLeft.toFixed(1)} seconds before you can use this command again.`,
                    ephemeral: true
                });
            }


            const selectedValue = interaction.values[0];

            console.log(selectedValue)
            let targetUserId = 'Unknown';
            if (interaction.message.embeds.length > 0) {
                const embed = interaction.message.embeds[0];
                if (embed.footer && embed.footer.text) {
                    const footerText = embed.footer.text;
                    const match = footerText.match(/Target User ID: (\d+)/);
                    if (match) {
                        targetUserId = match[1];
                    }
                }
            }

            const modal = new Modal()
                .setCustomId(`report_modal_${selectedValue}`)
                .setTitle('Please add your evidence!')
                .addComponents(
                    new TextInputComponent()
                        .setCustomId('additional_info')
                        .setLabel('Evidence Links')
                        .setStyle('LONG')
                        .setRequired(true)
                );

            await showModal(modal, {
                client: client,
                interaction
            });

            db.set(userCooldownKey, now);
        }

        if (interaction.customId?.startsWith('report_modal_')) {

            console.log(interaction.customId)
            const reportTypeValue = interaction.customId.split('_')[2];
            const targetUser = interaction.customId.split('_')[3];
            const additionalInfo = interaction.fields.getTextInputValue('additional_info');

            function getReportTypeLabel(value) {
                let label;

                switch (value) {
                    case 'hacking':
                        label = 'Hacking';
                        break;
                    case 'toxicity':
                        label = 'Toxicity / Racism';
                        break;
                    case 'unlinked':
                        label = 'Playing with an unlinked account';
                        break;
                    case 'leavesub':
                        label = 'Leaving the game without a sub';
                        break;
                    case 'leavepick':
                        label = 'Leaving after players are picked';
                        break;
                    case 'other':
                        label = 'Other';
                        break;
                    default:
                        label = 'Unknown';
                        break;
                }

                return label;
            }

            const reportType = getReportTypeLabel(reportTypeValue);

            try {
                const mdb = await connectToMongoDB();
                const collection = mdb.collection('register');

                const user = await collection.findOne({ discord_id: targetUser });

                if (user) {
                    const newReport = {
                        reported_by: interaction.user.id,
                        report_type: reportType,
                        evidence: additionalInfo,
                        date: Date.now()
                    };

                    await collection.updateOne(
                        { discord_id: targetUser },
                        { $push: { reports: newReport } }
                    );
                } else {
                    await interaction.reply({
                        content: 'The target user is not registered.',
                        ephemeral: true
                    });
                }

                await interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00ff51')
                            .setDescription('✅ Your report has been submitted. Thank you for helping keep the community fair!')
                    ]
                });

                const reportEmbed = new EmbedBuilder()
                    .setColor('#ff0557')
                    .setTitle(`Player Report - ${reportType}`)
                    .setAuthor({
                        name: 'Critical Ops Esports',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setThumbnail('https://i.imgur.com/6SCIMyL.png')
                    .setDescription(`
        **Reported Player:** <@${targetUser}> \`(${targetUser})\`
        **Evidence:** ${additionalInfo || 'None'}
    `)
                    .setFooter({ text: `Reported by ${interaction.user.username} (${interaction.user.id})` });


                const reportChannel = client.channels.cache.get(playerReportChannel);
                if (reportChannel) reportChannel.send({ embeds: [reportEmbed] });

            } catch (error) {
                console.error('Error processing the report:', error);
                await interaction.reply({
                    content: 'There was an error processing your report. Please try again later.',
                    ephemeral: true
                });
            }
        }

    } catch (error) {
        console.error('Error handling interaction:', error);
    }
});




//track tickets for staff points

client.on("messageCreate", async (message) => {
    if (message.channel.id !== "1169175471905329152" || message.author.id !== "557628352828014614") return;

    try {
        const db = await connectToMongoDB();
        const embed = message.embeds[0];
        if (!embed) return;

        const field = embed.fields.find(f => f.name === "Users in transcript");
        if (!field) return;

        const ids = [...field.value.matchAll(/<@(\d+)> - (?!Ticket Tool)/g)].map(m => m[1]);


        const permissions = await db.collection("permissions").findOne({});

        for (const id of ids) {
            if (permissions.owner.includes(id) || permissions.staff.includes(id) || permissions.admin.includes(id)) {
                await db.collection("register").updateOne(
                    { discord_id: id },
                    { $inc: { staffPoints: 0.2 } }
                );
            }
        }
    } catch (error) {
        console.error("Hata:", error);
    }
});


//score match buttons

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;


    if (!customId.startsWith('score-')) return;

    const db = await connectToMongoDB();

    const permissionData = await db.collection("permissions").findOne({});


    const userPermissions = [...permissionData.staff, ...permissionData.admin, ...permissionData.owner];
    if (!userPermissions.includes(interaction.user.id)) {
        const errorEmbed = new EmbedBuilder()
            .setDescription("You don't have permission to use this button.")
            .setColor('#ff0000');
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }



    const parts = customId.split('-');


    const [action, matchId, winningTeam] = parts;

    const disabledButtons = interaction.message.components.map(row => {
        return new ActionRowBuilder().addComponents(
            row.components.map(button =>
                new ButtonBuilder()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
            )
        );
    });


    await interaction.message.edit({ components: disabledButtons });


    await scoreMatch(client, interaction, parseInt(matchId), winningTeam);



});




async function updateStaffNames() {
    const db = await connectToMongoDB();
    const collection = db.collection('permissions');

    const permissionData = await collection.findOne({});
    if (!permissionData || !permissionData.staff || permissionData.staff.length === 0) {
        console.log('No staff members found.');
        return;
    }

    const guild = client.guilds.cache.get(serverId);
    if (!guild) {
        console.log(`Bot is not in the server with ID ${serverId}`);
        return;
    }

    for (const userId of permissionData.staff) {
        try {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member && !member.displayName.startsWith('COM |')) {
                await member.setNickname(`COM | ${member.displayName}`).catch(console.error);
                console.log(`Updated nickname for ${member.user.tag}`);
            }
        } catch (error) {
            console.error(`Error updating nickname for user ${userId}:`, error);
        }
    }
}


//add COM | to staff names

client.on("messageCreate", async (message) => {
    if (message.channel.id !== "1169175471905329152" || message.author.id !== "557628352828014614") return;

    try {
        const db = await connectToMongoDB();
        const embed = message.embeds[0];
        if (!embed) return;

        const field = embed.fields.find(f => f.name === "Users in transcript");
        if (!field) return;

        const ids = [...field.value.matchAll(/<@(\d+)> - (?!Ticket Tool)/g)].map(m => m[1]);
        console.log(ids)

        const permissions = await db.collection("permissions").findOne({});

        for (const id of ids) {
            if (permissions.owner.includes(id) || permissions.staff.includes(id) || permissions.admin.includes(id)) {
                await db.collection("register").updateOne(
                    { discord_id: id },
                    { $inc: { staffPoints: 0.2 } }
                );
            }
        }
    } catch (error) {
        console.error("Hata:", error);
    }
});


client.once('ready', async () => {
    console.log(`started checking staff`);

    await updateStaffNames();


    setInterval(updateStaffNames, 5 * 60 * 1000);

});





//check bans, add or remove role
async function checkBans() {
    try {
        const mdb = await connectToMongoDB();
        const collection = mdb.collection('register');


        const players = await collection.find({}, { projection: { discord_id: 1, _id: 0 } }).toArray();

        const guild = await client.guilds.fetch(serverId);

        for (const player of players) {
            if (player.discord_id) {
                const activeBans = await banCheck(player.discord_id);

                if (activeBans.length === 0) {
                    const member = await guild.members.fetch(player.discord_id).catch(() => null);

                    if (member && member.roles.cache.has(banRoleId)) {
                        await member.roles.remove(banRoleId);
                        console.log(`Ban role removed from ${member.user.tag}`);
                    }
                }
            }
        }

        console.log('Checked all bans');
    } catch (error) {
        console.error('Failed ban checking');
    }
}

client.once('ready', () => {

    checkBans();

    setInterval(checkBans, 30 * 60 * 1000);
});




// clear queue if anyone left and ban them
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.channelId && !newState.channelId) {
        const vcChannelId = oldState.channelId;
        const mdb = await connectToMongoDB();
        const collection = mdb.collection('queue');
        const matchesCollection = mdb.collection('matches');

        const queue = await collection.findOne({ vc_channel_id: vcChannelId });
        if (!queue) return;

        const textChannelId = queue.channel_id;
        const userId = oldState.id;
        const user = await client.users.fetch(userId);
        const isPlayerInQueue = queue.players.includes(userId);

        let currentMatch = await matchesCollection.findOne({ channel_id: textChannelId, picked: { $ne: true } });
        const isPlayerInMatch = currentMatch
            ? (currentMatch.team_a_players.includes(userId) || currentMatch.team_b_players.includes(userId))
            : false;



        if (isPlayerInMatch) {

            const banInfo = await banCheck(userId);
            if (banInfo.length === 0) {

                await queueBan(userId, "7h", "Leaving during picking.");

                const dmEmbed = new EmbedBuilder()
                    .setTitle('You have been banned')
                    .setDescription('You have been banned from the queue.')
                    .addFields(
                        { name: 'Reason', value: 'Leaving during picking.' },
                        { name: 'Duration', value: '7h' }
                    )
                    .setColor('#ff0000')
                    .setTimestamp();

                const playerUser = await client.users.fetch(userId);
                const guild = await client.guilds.fetch(serverId);
                const member = await guild.members.fetch(userId).catch(() => null);
                if (!member.roles.cache.has(banRoleId)) {
                    await member.roles.add(banRoleId);
                    console.log(`Ban role added to ${member.user.tag}`);
                }

                try {
                    await playerUser.send({ embeds: [dmEmbed] });



                } catch (dmError) {
                    console.error(`Failed to send DM to ${user.tag}:`, dmError);

                }

            }



        }
        if (isPlayerInQueue) {

            await queueClear(textChannelId);

            const embed = new EmbedBuilder()
                .setTitle('Queue Cleared')
                .setDescription('A player left the channel, the queue has been cleared.')
                .setColor('#ff0000');

            const textChannel = client.channels.cache.get(textChannelId);
            textChannel.send({ embeds: [embed] });
        }


        const logChannel = client.channels.cache.get('1347316947305369631');
        if (logChannel) {
            const playerData = await getPlayer(userId);
            const playerIGN = playerData?.ign || 'Unknown';


            const logEmbed = new EmbedBuilder()
                .setColor(isPlayerInMatch ? '#ff0000' : '#ffbf48')
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setTitle('Queue Leave Log')
                .addFields(
                    { name: 'Player', value: `<@${userId}> (${playerIGN})`, inline: true },
                    { name: 'Queue', value: `<#${vcChannelId}>`, inline: true },
                    { name: 'Left while picking?', value: isPlayerInMatch ? 'Yes' : 'No', inline: true }
                )
                .setFooter({ text: `User ID: ${userId}` })
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] });
        }
    }
});


client.on('unhandledRejection', (reason, promise) => {
    console.error('Bir hata oluştu: ', reason);

});

process.on('unhandledRejection', (error) => {
    console.error('Bir işlenmeyen promise hatası oluştu:', error);

});



//sync commmands
client.commands = new Collection();

const config = require('./config.json');
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] ${filePath} Invalid Command Format.`);
    }
}


const rest = new REST().setToken(token);

async function deployCommands() {
    try {
        console.log(`Loading ${commands.length} Commands`);

        const data = await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands },
        );

        console.log(`${data.length} commands loaded`);
    } catch (error) {
        console.error('Error loading commands:', error);
    }
}

client.once('ready', () => {
    deployCommands();
});

// sync commands end




client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const commandName = interaction.commandName;


    let command = client.commands.get(commandName);


    if (!command) {
        return interaction.reply({
            content: `\`${commandName}\` not found.`,
            ephemeral: true
        });
    }
    const userId = interaction.user.id;


    const now = Date.now();
    const cooldownTime = 3000;

    const userCooldownKey = `${userId}-${commandName}`;
    const userCooldown = db.get(userCooldownKey);

    if (userCooldown && now - userCooldown < cooldownTime) {
        const timeLeft = (cooldownTime - (now - userCooldown)) / 1000;
        return void interaction.reply({
            content: `You must wait ${timeLeft.toFixed(1)} seconds before you can use this command again.`,
            ephemeral: true
        });
    }



    const mdb = await connectToMongoDB();


    const permissionData = await mdb.collection("permissions").findOne({});

    if (interaction.user.id !== '1250462973667840054') {


        /*
        
                        const errorEmbed = new EmbedBuilder()
                    .setDescription("You don't have permission to use this command.")
                    .setColor('#ff0000');
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        
                
        */
        if (command.com_staff_only === true) {
            const userPermissions = [...permissionData.staff, ...permissionData.admin, ...permissionData.owner];
            if (!userPermissions.includes(interaction.user.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("You don't have permission to use this command.")
                    .setColor('#ff0000');
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }


        if (command.admin_only === true) {
            const userPermissions = [...permissionData.admin, ...permissionData.owner];
            if (!userPermissions.includes(interaction.user.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("You don't have permission to use this command.")
                    .setColor('#ff0000');
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }


        if (command.owner_only === true) {
            if (!permissionData.owner.includes(interaction.user.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("You don't have permission to use this command.")
                    .setColor('#ff0000');
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }



    try {

        await command.execute(client, interaction);
        db.set(userCooldownKey, now);
    } catch (error) {

        const embed = await handleError(error, interaction, client);
        interaction.channel.send({ embeds: [embed] });

    }
});



client.nercly = {
    color: "#e20000"
}





client.login(token);
