const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    description: "Rules Embed",
    data: new SlashCommandBuilder()
        .setName('rules_embed') // Command name matches the filename
        .setDescription('Sends the rules embed to a specified channel')
        .addStringOption(option => 
            option.setName('channel_id')
                .setDescription('The channel ID where the embed will be sent')
                .setRequired(true)),
    admin_only: true,
    parent: "admin",
    async execute(client, interaction) {
        const channel_id = interaction.options.getString('channel_id');
        const channel = await client.channels.cache.get(channel_id);
        if (!channel) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('Error')
                    .setDescription('❗ This channel could not be found')
                    .setColor('#ff0557')
                    .setAuthor({
                        name: 'Critical Ops Esports', 
                        iconURL: client.user.displayAvatarURL()
                    })]
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const photoEmbed = new EmbedBuilder()
            .setColor('#ff0557')
            .setImage('https://i.imgur.com/vyW1ZhS.jpeg');

        const descriptionEmbed = new EmbedBuilder()
            .setColor('#ff0557')
            .setDescription('Our unique matchmaking system lets you queue up for competitive matches, earn points, and climb the ranks to become the best! We hope you enjoy it as much as we do. Before jumping into the action, please take a moment to read our rules below.');

        const photoEmbed1 = new EmbedBuilder()
            .setColor('#ff0557')
            .setImage('https://i.imgur.com/YqIVCIl.jpeg');

        const rulesEmbed = new EmbedBuilder()
            .setColor('#ff0557')
            .setDescription(`
## Rules & Guidelines 

We expect our users to abide by and accept the following rules and guidelines we have put in place to give everyone the best experience:  

### **Respect**  
You must respect all users, regardless of your mutual connection.  

### **Profanity**  
The use of profanity should be kept to a minimum. However, derogative or racial remarks towards a user are prohibited.  

### **Pornographic Material**  
No explicit material is allowed whatsoever. This includes but is not limited to profile pictures, emotes, pictures, etc.  

### **Inappropriate Profiling**  
Inappropriate names, profile descriptions including but not limited to profile picture, profile status, impersonation, etc. If negotiations are unable to be met, punishment will be issued.  

### **Matchmaking Bot**  
You are subject to be messaged by the bot at any time, this cannot be considered as harassment or spam as long as your account is still in the server.  

### **Cheating & Exploits**  
Using cheat software or exploiting game bugs during an event will result in a **permanent ban**.  

### **Account Sharing**  
Account sharing is not allowed. Every player must use their own account linked to the bot.  

### **Account Changes**  
If you need to change your account for any reason, you must create a **ticket** and get approval.  

### **Reporting Players**  
If you want to report a player for breaking the rules, please open a **ticket** with evidence.   

### **Follow Staff Instructions**  
Server moderators and administrators have the final say. Arguing with staff decisions may lead to further consequences.  

### **Discord Terms & Guidelines**  
Finally, all users must respect the terms of service and guidelines of Discord. These are found below:  

🔗 [Discord Guidelines](https://discordapp.com/guidelines)  
`);

        await channel.send({ embeds: [photoEmbed, descriptionEmbed, photoEmbed1, rulesEmbed] });
        await interaction.editReply("sent.");
    },
};
