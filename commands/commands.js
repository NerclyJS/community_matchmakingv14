const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
    description: 'Displays the list of commands',
    data: new SlashCommandBuilder()
        .setName('commands')
        .setDescription('Displays the list of available commands'),
    com_staff_only: true,
    parent: "staff",
    async execute(client, interaction) {
        const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
        const categories = { owner: [], admin: [], staff: [], user: [] };

        commandFiles.forEach(file => {
            const content = fs.readFileSync(`./commands/${file}`, 'utf8');
            const isOwnerOnly = /owner_only:\s*true/.test(content);
            const isComStaffOnly = /com_staff_only:\s*true/.test(content);
            const isAdminOnly = /admin_only:\s*true/.test(content);
            const descriptionMatch = /description:\s*'(.*?)'/.exec(content);
            const parentMatch = /parent:\s*['"](.+?)['"]/.exec(content); 
            const description = descriptionMatch ? descriptionMatch[1] : 'No description available';
            const commandName = file.replace('.js', '');
            const commandDisplay = parentMatch ? `/${commandName}` : `/${commandName}`;

            if (isOwnerOnly) {
                categories.owner.push(`${commandDisplay} // Owner Only`);
            } else if (isAdminOnly) {
                categories.admin.push(`${commandDisplay} // Admin + `);
            } else if (isComStaffOnly) {
                categories.staff.push(`${commandDisplay} // Staff + `);
            } else {
                categories.user.push(`${commandDisplay} // User`);
            }
        });

        const formatCategory = (commands) => commands.length ? commands.join('\n') : '';

        const commandList = [
            formatCategory(categories.owner),
            formatCategory(categories.admin),
            formatCategory(categories.staff),
            formatCategory(categories.user)
        ].filter(Boolean).join('\n\n');

const embed = new EmbedBuilder()
    .setTitle('Available Commands')
    .setDescription(`\`\`\`${commandList}\`\`\``)
    .setColor('#2F3136');

await interaction.reply({ embeds: [embed] });

    },
};
