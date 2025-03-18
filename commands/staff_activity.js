
const { SlashCommandBuilder } = require('discord.js');
const { connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_activity')
    .setDescription('Displays staff activity.'), 
  com_staff_only: true,
  parent: "staff",

  execute: async (client, interaction) => {
        interaction.deferReply();
        try {
            const db = await connectToMongoDB();
            const registerCollection = db.collection('register');
            const permissionCollection = db.collection('permissions');

            const permissionData = await permissionCollection.findOne({});
            if (!permissionData) {
                return interaction.reply({ content: 'No staff found.', ephemeral: true });
            }

            const staffIds = [
                ...(permissionData.owner || []),
                ...(permissionData.admin || []),
                ...(permissionData.staff || [])
            ];

            if (staffIds.length === 0) {
                return interaction.reply({ content: 'No staff found.', ephemeral: true });
            }

            let staffList = await registerCollection
                .find({ discord_id: { $in: staffIds } })
                .toArray();

            const staffMap = new Map(
                staffList.map(staff => [
                    staff.discord_id,
                    { points: staff.staffPoints || 0, ign: staff.ign || 'N/A' }
                ])
            );

            for (const userId of staffIds) {
                if (!staffMap.has(userId)) {
                    staffMap.set(userId, { points: 0, ign: 'N/A' });
                }
            }

            const sortedStaff = [...staffMap.entries()].sort((a, b) => b[1].points - a[1].points);

            let leaderboard = "```";
            leaderboard += "Rank | IGN               | Point(s)\n";
            leaderboard += "---------------------------------------\n";

            let rank = 1;
            for (const [userId, data] of sortedStaff) {
                try {
                    const user = await client.users.fetch(userId);
                    let ign = data.ign.toString().padEnd(16);

                   
                    if (data.ign === 'N/A') {
                        ign = `${user.username} (NR)`.padEnd(16);
                    }

                    leaderboard += `${rank.toString().padEnd(4)} | ${ign} | ${parseFloat(data.points).toFixed(1)}\n`;
                    rank++;
                } catch (error) {
                    console.error(`Could not fetch user with ID: ${userId}`);
                }
            }

            leaderboard += "```";

            await interaction.editReply({ content: leaderboard });

        } catch (error) {
            console.error("Error:", error);
            await interaction.reply({ content: "Error occurred.", ephemeral: true });
        }
    }
};
