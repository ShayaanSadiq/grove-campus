import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { seed } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COLLECTIONS = ['users', 'services', 'bookings', 'payments', 'feedback'];
let cache = null;
let mongoClient = null;
let mongoDb = null;

export function dbPath() {
  return process.env.DB_PATH || path.join(__dirname, '../data/db.json');
}

export function storeName() {
  return mongoDb ? 'mongodb' : 'file';
}

function empty() {
  return { users: [], services: [], bookings: [], payments: [], feedback: [] };
}

function write(data) {
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function getDb() {
  if (cache) return cache;
  const file = dbPath();
  if (!fs.existsSync(file)) {
    cache = empty();
    return cache;
  }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  cache = empty();
  for (const key of COLLECTIONS) {
    if (Array.isArray(parsed[key])) cache[key] = parsed[key];
  }
  return cache;
}

async function persistMongo() {
  for (const key of COLLECTIONS) {
    const collection = mongoDb.collection(key);
    await collection.deleteMany({});
    if (!cache[key].length) continue;
    await collection.insertMany(cache[key].map((doc) => ({ ...doc })));
  }
}

export function save() {
  if (mongoDb) return persistMongo();
  write(getDb());
}

export function initDb() {
  const db = getDb();
  if (seed(db)) save();
  return db;
}

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGODB_URI to connect to MongoDB.');
  mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await mongoClient.connect();
  mongoDb = mongoClient.db(process.env.MONGODB_DB || 'grove');
  cache = empty();
  for (const key of COLLECTIONS) {
    cache[key] = await mongoDb.collection(key).find({}, { projection: { _id: 0 } }).toArray();
  }
  if (seed(cache)) await persistMongo();
  return cache;
}

export async function refreshMongo() {
  if (!mongoDb) return connectMongo();
  const next = empty();
  for (const key of COLLECTIONS) {
    next[key] = await mongoDb.collection(key).find({}, { projection: { _id: 0 } }).toArray();
  }
  cache = next;
  return cache;
}

export function resetDb() {
  cache = null;
  const file = dbPath();
  if (fs.existsSync(file)) fs.rmSync(file, { force: true });
  return initDb();
}
