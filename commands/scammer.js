const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { 
  getGuildSettings, 
  saveGuildSettings, 
  addScammer, 
  removeScammer, 
  getGuildScammers,
  getActiveScammer,
  getScammerInstances
} = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scammer')
    .setDescription('Manage scammers in your server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a user to the scammer list')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to add as a scammer')
            .setRequired(true))
        .addStringOption(option => 
          option.setName('reason')
            .setDescription('The reason for adding the user as a scammer')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from the scammer list')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to remove from the scammer list')
            .setRequired(true))
        .addStringOption(option => 
          option.setName('reason')
            .setDescription('The reason for removing the user from the scammer list')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('Show all scammers in this server'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check if a user is a scammer')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to check')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup scammer role and notification channel')
        .addRoleOption(option => 
          option.setName('role')
            .setDescription('The role to assign to scammers')
            .setRequired(true))
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('The channel to send notifications to')
            .setRequired(true))
        .addChannelOption(option => 
          option.setName('logs')
            .setDescription('The channel to send logs to (optional)')
            .setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const staffRoleIds = process.env.STAFF_ROLE_IDS.split(',');

    const subcommand = interaction.options.getSubcommand();
    if (!['setup', 'show'].includes(subcommand)) {
      if (!interaction.member.roles.cache.some(role => staffRoleIds.includes(role.id))) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
      }
    }

    if (subcommand !== 'setup') {
      const settings = getGuildSettings(interaction.guild.id);
      if (!settings) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('⚠️ Setup Required')
          .setDescription('Please setup the bot first using `/scammer setup`')
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
    
    switch (subcommand) {
      case 'add':
        await handleAddScammer(interaction);
        break;
      case 'remove':
        await handleRemoveScammer(interaction);
        break;
      case 'show':
        await handleShowScammers(interaction);
        break;
      case 'check':
        await handleCheckScammer(interaction);
        break;
      case 'setup':
        await handleSetup(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown subcommand!', ephemeral: true });
    }
  },
};

async function handleAddScammer(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const settings = getGuildSettings(interaction.guild.id);
  
  const existingScammer = getActiveScammer(user.id, interaction.guild.id);
  if (existingScammer) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('⚠️ Already a Scammer')
      .setDescription(`${user.username} is already marked as a scammer.`)
      .addFields(
        { name: 'Reason', value: existingScammer.reason },
        { name: 'Added by', value: existingScammer.addedBy },
        { name: 'Date', value: new Date(existingScammer.timestamp).toLocaleString() }
      )
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }

  const scammerData = {
    userId: user.id,
    username: user.username,
    reason: reason,
    addedBy: interaction.user.username,
    addedById: interaction.user.id,
    guildId: interaction.guild.id
  };
  
  const newScammer = addScammer(scammerData);
  
  try {
    const member = await interaction.guild.members.fetch(user.id);
    const role = await interaction.guild.roles.fetch(settings.scammerRole);
    if (role && member) {
      await member.roles.add(role);
    }
  } catch (error) {
    console.error('Error adding role:', error);
  }

  const successEmbed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('✅ Scammer Added')
    .setDescription(`${user.username} has been marked as a scammer.`)
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'Added by', value: interaction.user.username }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [successEmbed] });
  
  try {
    if (settings.logChannel) {
      const logChannel = await interaction.guild.channels.fetch(settings.logChannel);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('📝 Scammer Added')
          .setDescription(`${user.username} (${user.id}) was marked as a scammer.`)
          .addFields(
            { name: 'Reason', value: reason },
            { name: 'Added by', value: `${interaction.user.username} (${interaction.user.id})` }
          )
          .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (error) {
    console.error('Error sending to log channel:', error);
  }
}

async function handleRemoveScammer(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const settings = getGuildSettings(interaction.guild.id);
  
  const existingScammer = getActiveScammer(user.id, interaction.guild.id);
  if (!existingScammer) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('⚠️ Not a Scammer')
      .setDescription(`${user.username} is not marked as a scammer.`)
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }

  const removed = removeScammer(
    user.id, 
    interaction.guild.id, 
    interaction.user.username, 
    interaction.user.id, 
    reason
  );
  
  try {
    const member = await interaction.guild.members.fetch(user.id);
    const role = await interaction.guild.roles.fetch(settings.scammerRole);
    if (role && member) {
      await member.roles.remove(role);
    }
  } catch (error) {
    console.error('Error removing role:', error);
  }

  const successEmbed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Scammer Removed')
    .setDescription(`${user.username} has been removed from the scammer list.`)
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'Removed by', value: interaction.user.username }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [successEmbed] });
  
  try {
    if (settings.logChannel) {
      const logChannel = await interaction.guild.channels.fetch(settings.logChannel);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('📝 Scammer Removed')
          .setDescription(`${user.username} (${user.id}) was removed from the scammer list.`)
          .addFields(
            { name: 'Original reason', value: existingScammer.reason },
            { name: 'Removal reason', value: reason },
            { name: 'Removed by', value: `${interaction.user.username} (${interaction.user.id})` }
          )
          .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (error) {
    console.error('Error sending to log channel:', error);
  }
}

async function handleShowScammers(interaction) {
  const settings = getGuildSettings(interaction.guild.id);
  const scammers = getGuildScammers(interaction.guild.id);
  
  if (!scammers || scammers.length === 0) {
    return interaction.reply({ content: 'There are no scammers in this server.', ephemeral: true });
  }
  
  const description = scammers.map(scammer => `• ${scammer.username} - Reason: ${scammer.reason}`).join('\n');
  
  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('🚨 Scammer List')
    .setDescription(description)
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ✅ UPDATED: Show scammer history
async function handleCheckScammer(interaction) {
  const user = interaction.options.getUser('user');
  const instances = getScammerInstances(user.id, interaction.guild.id);

  if (!instances || instances.length === 0) {
    return interaction.reply({ content: `${user.username} has no scammer history.`, ephemeral: true });
  }

  const history = instances.map((entry, index) => {
    const action = entry.removedAt ? 'Removed' : 'Added';
    const by = entry.removedAt ? entry.removedBy : entry.addedBy;
    const reason = entry.removedAt ? entry.removalReason : entry.reason;
    const timestamp = new Date(entry.removedAt || entry.timestamp).toLocaleString();

    return `**${index + 1}. ${action}**\n• **By**: ${by}\n• **Reason**: ${reason}\n• **Date**: ${timestamp}`;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(0xFFA500)
    .setTitle(`📜 Scammer History: ${user.username}`)
    .setDescription(history)
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetup(interaction) {
  const role = interaction.options.getRole('role');
  const channel = interaction.options.getChannel('channel');
  const logs = interaction.options.getChannel('logs');

  saveGuildSettings({
    guildId: interaction.guild.id,
    scammerRole: role.id,
    notificationChannel: channel.id,
    logChannel: logs ? logs.id : null
  });

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Setup Complete')
    .setDescription(`Scammer role set to ${role.name}\nNotification channel set to ${channel.name}${logs ? `\nLog channel set to ${logs.name}` : ''}`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

