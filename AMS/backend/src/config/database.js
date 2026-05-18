require('dotenv').config();

const DEFAULT_PROFILE = 'default';
const DEFAULT_DIALECT = 'mysql';
const DEFAULT_ENGINE = 'mysql';

function getDatabaseEngine() {
  return String(process.env.DB_ENGINE || process.env.DATABASE_ENGINE || DEFAULT_ENGINE).trim().toLowerCase();
}

function normalizeProfile(profile) {
  return String(profile || DEFAULT_PROFILE).trim().toLowerCase();
}

function envKeyForProfile(profile, key) {
  const prefix = normalizeProfile(profile).replace(/[^a-z0-9]/g, '_').toUpperCase();
  return `DB_${prefix}_${key}`;
}

function readProfileValue(profile, key, fallback) {
  const profileValue = process.env[envKeyForProfile(profile, key)];
  if (profileValue !== undefined && profileValue !== '') return profileValue;

  const sharedValue = process.env[`DB_${key}`];
  if (sharedValue !== undefined && sharedValue !== '') return sharedValue;

  return fallback;
}

function readBoolean(profile, key, fallback = false) {
  const value = readProfileValue(profile, key, undefined);
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function readNumber(profile, key, fallback) {
  const value = readProfileValue(profile, key, undefined);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDatabaseConfig() {
  const engine = getDatabaseEngine();
  const profile = normalizeProfile(process.env.DB_PROFILE || process.env.DATABASE_PROFILE);
  const dialect = readProfileValue(profile, 'DIALECT', DEFAULT_DIALECT).toLowerCase();
  const database = readProfileValue(profile, 'NAME', 'school_management');
  const username = readProfileValue(profile, 'USER', 'root');
  const password = readProfileValue(profile, 'PASSWORD', '');
  const host = readProfileValue(profile, 'HOST', 'localhost');
  const port = readNumber(profile, 'PORT', 3306);
  const url = readProfileValue(profile, 'URL', undefined);

  return {
    engine,
    profile,
    dialect,
    database,
    username,
    password,
    host,
    port,
    url,
    logging: readBoolean(profile, 'LOGGING', false),
    syncAlter: readBoolean(profile, 'SYNC_ALTER', false),
    pool: {
      max: readNumber(profile, 'POOL_MAX', 10),
      min: readNumber(profile, 'POOL_MIN', 0),
      acquire: readNumber(profile, 'POOL_ACQUIRE', 30000),
      idle: readNumber(profile, 'POOL_IDLE', 10000),
    },
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management',
      serverSelectionTimeoutMS: readNumber(profile, 'MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000),
    },
  };
}

function getAdminConnectionConfig(config = getDatabaseConfig()) {
  return {
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
  };
}

function describeDatabaseConfig(config = getDatabaseConfig()) {
  if (config.engine === 'mongodb') {
    return {
      engine: config.engine,
      profile: config.profile,
      uri: config.mongodb.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
      serverSelectionTimeoutMS: config.mongodb.serverSelectionTimeoutMS,
    };
  }

  return {
    engine: config.engine,
    profile: config.profile,
    dialect: config.dialect,
    database: config.database,
    host: config.host,
    port: config.port,
    logging: config.logging,
    syncAlter: config.syncAlter,
  };
}

module.exports = {
  getDatabaseEngine,
  getDatabaseConfig,
  getAdminConnectionConfig,
  describeDatabaseConfig,
};
