const fs = require('fs');
const path = require('path');

// Simple file-based database for storing scammer data
const DB_FILE = path.join(__dirname, 'data', 'scammers.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

// Make sure the data directory exists
function setupDatabase() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  
  // Initialize scammers file if it doesn't exist
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
  }
  
  // Initialize settings file if it doesn't exist
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({}));
  }
  
  console.log('Database initialized');
}

// Guild settings functions
function getGuildSettings(guildId) {
  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE));
  return settings[guildId] || null;
}

function saveGuildSettings(guildId, data) {
  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE));
  settings[guildId] = data;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  return settings[guildId];
}

// Scammer functions
function getAllScammers() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function getGuildScammers(guildId, activeOnly = false) {
  const scammers = getAllScammers();
  return scammers.filter(s => 
    s.guildId === guildId && 
    (activeOnly ? s.removed === 0 : true)
  );
}

function addScammer(scammerData) {
  const scammers = getAllScammers();
  
  // Generate ID for new scammer
  const id = scammers.length > 0 
    ? Math.max(...scammers.map(s => s.id)) + 1 
    : 1;
  
  const newScammer = {
    id,
    userId: scammerData.userId,
    username: scammerData.username,
    reason: scammerData.reason,
    addedBy: scammerData.addedBy,
    addedById: scammerData.addedById,
    guildId: scammerData.guildId,
    timestamp: new Date().toISOString(),
    removed: 0,
    removedBy: null,
    removedById: null,
    removeReason: null,
    removeTimestamp: null
  };
  
  scammers.push(newScammer);
  fs.writeFileSync(DB_FILE, JSON.stringify(scammers, null, 2));
  
  return newScammer;
}

function removeScammer(userId, guildId, removedBy, removedById, removeReason) {
  const scammers = getAllScammers();
  
  // Find the scammer to remove
  const scammerIndex = scammers.findIndex(
    s => s.userId === userId && s.guildId === guildId && s.removed === 0
  );
  
  if (scammerIndex === -1) return null;
  
  // Update the scammer record
  scammers[scammerIndex].removed = 1;
  scammers[scammerIndex].removedBy = removedBy;
  scammers[scammerIndex].removedById = removedById;
  scammers[scammerIndex].removeReason = removeReason;
  scammers[scammerIndex].removeTimestamp = new Date().toISOString();
  
  fs.writeFileSync(DB_FILE, JSON.stringify(scammers, null, 2));
  
  return scammers[scammerIndex];
}

function getActiveScammer(userId, guildId) {
  const scammers = getAllScammers();
  return scammers.find(
    s => s.userId === userId && s.guildId === guildId && s.removed === 0
  );
}

function getScammerInstances(userId) {
  const scammers = getAllScammers();
  return scammers.filter(
    s => s.userId === userId && s.removed === 0
  );
}

module.exports = {
  setupDatabase,
  getGuildSettings,
  saveGuildSettings,
  getAllScammers,
  getGuildScammers,
  addScammer,
  removeScammer,
  getActiveScammer,
  getScammerInstances
};