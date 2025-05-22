const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows help information for ScammerGuard commands'),
    
  async execute(interaction) {
    // Create main help embed
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Scammy bot Help')
      .setDescription('Scammmy helps you manage and track scammers in your Discord server.')
      .addFields(
        { name: 'Getting Started', value: 'Use `/scammer setup` to configure the bot for your server.' },
        { name: 'Commands', value: 'Select a command from the dropdown menu below to see detailed information.' }
      )
      .setFooter({ text: 'Scammybot Bot • Protecting your server from scammers' })
      .setTimestamp();
    
    // Create dropdown menu for commands
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('help-menu')
          .setPlaceholder('Select a command')
          .addOptions([
            {
              label: '/scammer add',
              description: 'Add a user to the scammer list',
              value: 'add',
            },
            {
              label: '/scammer remove',
              description: 'Remove a user from the scammer list',
              value: 'remove',
            },
            {
              label: '/scammer show',
              description: 'Show all scammers in this server',
              value: 'show',
            },
            {
              label: '/scammer check',
              description: 'Check if a user is a scammer',
              value: 'check',
            },
            {
              label: '/scammer setup',
              description: 'Setup scammer role and notification channel',
              value: 'setup',
            },
          ]),
      );
    
    // Send initial help message
    const response = await interaction.reply({
      embeds: [helpEmbed],
      components: [row],
      ephemeral: true
    });
    
    // Create collector for dropdown menu interactions
    const collector = response.createMessageComponentCollector({ 
      time: 60000, // 1 minute timeout
    });
    
    collector.on('collect', async i => {
      if (i.customId === 'help-menu') {
        const selected = i.values[0];
        let commandEmbed;
        
        // Create command-specific embed
        switch(selected) {
          case 'add':
            commandEmbed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('Command: /scammer add')
              .setDescription('Add a user to the scammer list')
              .addFields(
                { name: 'Usage', value: '`/scammer add [user] [reason]`' },
                { name: 'Example', value: '`/scammer add @User#1234 Scammed 5 members in J4J`' },
                { name: 'Required Permissions', value: 'Manage Roles' }
              )
              .setFooter({ text: 'This command will also assign the configured scammer role to the user' })
              .setTimestamp();
            break;
          case 'remove':
            commandEmbed = new EmbedBuilder()
              .setColor(0x00FF00)
              .setTitle('Command: /scammer remove')
              .setDescription('Remove a user from the scammer list')
              .addFields(
                { name: 'Usage', value: '`/scammer remove [user] [reason]`' },
                { name: 'Example', value: '`/scammer remove @User#1234 Wrongfully added`' },
                { name: 'Required Permissions', value: 'Manage Roles' }
              )
              .setFooter({ text: 'This command will also remove the scammer role from the user' })
              .setTimestamp();
            break;
          case 'show':
            commandEmbed = new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle('Command: /scammer show')
              .setDescription('Show all scammers in this server')
              .addFields(
                { name: 'Usage', value: '`/scammer show`' },
                { name: 'Required Permissions', value: 'Manage Roles' }
              )
              .setFooter({ text: 'Shows up to 25 scammers due to Discord limits' })
              .setTimestamp();
            break;
          case 'check':
            commandEmbed = new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle('Command: /scammer check')
              .setDescription('Check if a user is a scammer')
              .addFields(
                { name: 'Usage', value: '`/scammer check [user]`' },
                { name: 'Example', value: '`/scammer check @User#1234`' },
                { name: 'Required Permissions', value: 'Manage Roles' }
              )
              .setFooter({ text: 'Shows if a user is marked as a scammer in this server or others' })
              .setTimestamp();
            break;
          case 'setup':
            commandEmbed = new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle('Command: /scammer setup')
              .setDescription('Setup scammer role and notification channel')
              .addFields(
                { name: 'Usage', value: '`/scammer setup [role] [channel] [logs]`' },
                { name: 'Example', value: '`/scammer setup @Scammer #notifications #logs`' },
                { name: 'Required Permissions', value: 'Manage Roles' },
                { name: 'Parameters', value: '`role` - The role to assign to scammers\n`channel` - The channel to send notifications to\n`logs` - (Optional) The channel to send logs to' }
              )
              .setFooter({ text: 'You must set up the bot before using other commands' })
              .setTimestamp();
            break;
          default:
            commandEmbed = helpEmbed;
        }
        
        // Update message with the new embed
        await i.update({
          embeds: [commandEmbed],
          components: [row]
        });
      }
    });
    
    // When collector expires, remove dropdown
    collector.on('end', () => {
      interaction.editReply({
        components: []
      }).catch(console.error);
    });
  },
};