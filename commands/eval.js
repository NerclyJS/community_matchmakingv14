const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const Canvas = require('canvas');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const fetch = require("node-fetch");
const { inspect } = require('util');
const fs = require("fs");
const { connectToMongoDB, getPlayer } = require('../utility/utilFunctions');
const functions = require('../utility/utilFunctions');

module.exports = {
    description: 'Evaluate JavaScript code',
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluates JavaScript code')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Code to evaluate')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('async')
                .setDescription('Execute asynchronously')
                .setRequired(false)),
    owner_only: true,
    parent: "owner",
    async execute(client, interaction) {
 
        interaction.reply({ content: ":white_check_mark:" });


        const mdb = await connectToMongoDB();
        const matches = mdb.collection('matches');
        const completedMatches = mdb.collection('completedMatches');
        const register = mdb.collection('register');
        const allPlayers = await register.find({}).toArray();
        const settings = mdb.collection('settings');

        try {
            const codeInput = interaction.options.getString('code');
            const isAsync = interaction.options.getBoolean('async');
            const codeToEvaluate = isAsync ? `(async () => { return ${codeInput} })()` : `(() => { return ${codeInput} })()`;
            let evalResult = await eval(codeToEvaluate);

            let output = typeof evalResult === 'string' ? evalResult : inspect(evalResult, { depth: null, maxArrayLength: null });
            
            if (output.length > 1800) {
                fs.writeFile('text.txt', output, (error) => {
                    if (error) throw error;
                    const fileAttachment = new AttachmentBuilder('text.txt');
                    interaction.channel.send({ files: [fileAttachment] }).then(() => {
                        fs.unlink('text.txt', (error) => {
                            if (error) console.error(error);
                        });
                    });
                });
            } else {
                const embed = new EmbedBuilder()
                    .setDescription(`\`\`\`js\n${output.slice(0, 1800)}\n\`\`\``)
                    .addFields({ name: 'Input:', value: `\`\`\`js\n${codeInput}\n\`\`\`` });

                await interaction.channel.send({ embeds: [embed] });
            }
        } catch (err) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0038')
                .setTitle("Error Occurred")
                .setDescription(`An error was encountered while executing code:\n\`\`\`js\n${err.message.slice(0, 1800)}\n\`\`\``);

            await interaction.channel.send({ embeds: [errorEmbed] });
            console.error("Evaluation error:", err);
        }
    }
};
