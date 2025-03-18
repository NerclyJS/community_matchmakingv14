const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { connectToMongoDB } = require('../utility/utilFunctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_permission')
    .setDescription('Set a permission for a player (Add or Remove)')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('Select a player to set permission')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('permission')
        .setDescription('Select the permission to set')
        .setRequired(true)
        .addChoices(
          { name: 'Staff', value: 'staff' },
          { name: 'Admin', value: 'admin' },
          { name: 'Owner', value: 'owner' }
        )
    ),
  parent: 'owner',
  owner_only: true,

  execute: async (client, interaction) => {
        const userId = interaction.options.getUser('player').id;
        const permission = interaction.options.getString('permission');

        const db = await connectToMongoDB();
        const collection = db.collection('permissions'); 

        let permissionData = await collection.findOne({});

        if (!permissionData) {
            permissionData = {
                staff: [],
                admin: [],
                owner: []
            };
            await collection.insertOne(permissionData);
        }

        if (permissionData[permission].includes(userId)) {
            permissionData[permission] = permissionData[permission].filter(id => id !== userId);
            await collection.updateOne({}, { $set: { [permission]: permissionData[permission] } });

            const successEmbed = new EmbedBuilder()
                .setDescription(`The ${permission} permission has been successfully removed from <@${userId}>.`)
                .setColor('#ff0000');

            return interaction.reply({ embeds: [successEmbed] });
        } else {
            permissionData[permission].push(userId);
            await collection.updateOne({}, { $set: { [permission]: permissionData[permission] } });

            const successEmbed = new EmbedBuilder()
                .setDescription(`The ${permission} permission has been successfully added to <@${userId}>.`)
                .setColor('#00ff00');

            return interaction.reply({ embeds: [successEmbed] });
        }
    }
};
