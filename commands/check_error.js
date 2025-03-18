const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { connectToMongoDB, handleError } = require('../utility/utilFunctions');
const { matchDesignGenerator } = require('../utility/matchDesignGenerator');
const { inspect } = require('util');

module.exports = {
    description: 'Check error code',
    data: new SlashCommandBuilder()
        .setName('check_error')
        .setDescription('Check error code details')
        .addStringOption(option =>
            option.setName('error_code')
                .setDescription('Error code')
                .setRequired(true)),
    owner_only: true,
    parent: "owner",
    async execute(client, interaction) {

        try {
            const errorId = interaction.options.getString('error_code');


            const db = await connectToMongoDB();
            const errorsCollection = db.collection('errors');

            const error = await errorsCollection.findOne({ errorId: errorId });

            if (!error) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription(`Error ID: ${matchId} not found`)
                        .setColor('#ff0557')
                        .setAuthor({
                            name: 'Critical Ops Esports',
                            iconURL: client.user.displayAvatarURL()
                        })
                    ]
                });
            }


            let output = typeof error === 'string' ? error : inspect(error, { depth: null, maxArrayLength: null });
            if (output.length > 1800) {
                fs.writeFile('error', output, (err) => {
                    if (err) throw err;
                    const fileAttachment = new AttachmentBuilder('error.txt');
                    interaction.reply({ files: [fileAttachment] }).then(() => {
                        fs.unlink('error.txt', (err) => {
                            if (err) console.error(err);
                        });
                    });
                });
            } else {
                const embed = new EmbedBuilder()
                    .setDescription(`\`\`\`js\n${output.slice(0, 1800)}\n\`\`\``)
                    .setTitle(`Error -  ${errorId}`)
                    .setColor('#ff0557')

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {

            const embed = await handleError(error, interaction, client);
            interaction.channel.send({ embeds: [embed] });

        }
    }
};
