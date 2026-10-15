import serverless from 'serverless-http';
import { app } from './app.js';
import { connectMongo, refreshMongo } from './db.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('Set JWT_SECRET before starting in production.');
}

const expressHandler = serverless(app);
let connected = false;

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!process.env.MONGODB_URI) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'MONGODB_URI is not set.' }),
    };
  }
  if (!connected) {
    await connectMongo();
    connected = true;
  } else {
    await refreshMongo();
  }
  return expressHandler(event, context);
}
