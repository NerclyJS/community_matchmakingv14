const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('show_whitelist')
    .setDescription('Show all users with permissions'),
  admin_only: true,
  parent: 'admin',

  execute: async (client, interaction) => {
        const db = await connectToMongoDB();
        const collection = db.collection('permissions');

        const permissionData = await collection.findOne({});

        if (!permissionData) {
            return interaction.reply({ content: 'No permission data found.', ephemeral: true });
        }

        let userList = '';

        // Owner(s)
        if (permissionData.owner && permissionData.owner.length > 0) {
            for (const userId of permissionData.owner) {
                try {
                    const user = await client.users.fetch(userId);
                    userList += `${user.username} (${user.id}) // Owner\n`;
                } catch (error) {
                    console.error(`Could not fetch user with ID: ${userId}`);
                }
            }
        }

        // Admin(s)
        if (permissionData.admin && permissionData.admin.length > 0) {
            for (const userId of permissionData.admin) {
                try {
                    const user = await client.users.fetch(userId);
                    userList += `${user.username} (${user.id}) // Admin\n`;
                } catch (error) {
                    console.error(`Could not fetch user with ID: ${userId}`);
                }
            }
        }

        // Staff(s)
        if (permissionData.staff && permissionData.staff.length > 0) {
            for (const userId of permissionData.staff) {
                try {
                    const user = await client.users.fetch(userId);
                    userList += `${user.username} (${user.id}) // Staff\n`;
                } catch (error) {
                    console.error(`Could not fetch user with ID: ${userId}`);
                }
            }
        }

        if (!userList) {
            return interaction.reply({ content: 'No users found with any permissions.', ephemeral: true });
        }

        return interaction.reply({ content: `\`\`\`${userList}\`\`\`` });
    }
};
