const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { connectToMongoDB } = require("../utility/utilFunctions");

module.exports = {
    description: "Displays database collection information.",
    data: new SlashCommandBuilder()
        .setName("db_info")
        .setDescription("Displays database collection information."),
    owner_only: true,
    parent: "owner",
    async execute(client, interaction) {
        try {
            const mdb = await connectToMongoDB();
            const dbName = mdb.databaseName; 
            const collections = await mdb.listCollections().toArray();
            
            let description = "```";
            for (const col of collections) {
                const count = await mdb.collection(col.name).countDocuments();
                description += `\n${col.name} // ${count} documents`;
            }
            description += "```";

            const embed = new EmbedBuilder()
                .setTitle(`${dbName}`)
                .setDescription(description || "```No collections found in the database.```")
                .setColor('#ff0038')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "⚠️ An error occurred.", ephemeral: true });
        }
    }
};
