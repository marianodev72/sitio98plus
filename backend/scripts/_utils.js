// backend/scripts/_utils.js
require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function connect() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Falta MONGO_URI en .env');
  }
  const client = new MongoClient(uri, { maxPoolSize: 5 });
  await client.connect();

  // Si definiste un nombre de base explícito, úsalo:
  const dbNameFromUri = new URL(uri.replace('mongodb+srv://', 'mongodb://')).pathname?.slice(1);
  const dbName = process.env.MONGO_DB_NAME || dbNameFromUri || 'sitio98plus';
  const db = client.db(dbName);

  return { client, db };
}

async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

module.exports = { connect, hashPassword };
