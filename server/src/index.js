import { app } from './app.js';
import { port } from './config.js';
import { connectMongo, initDb, storeName } from './db.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('Set JWT_SECRET before starting in production.');
  process.exit(1);
}

if (process.env.MONGODB_URI) await connectMongo();
else initDb();

app.listen(port(), () => {
  console.log(`Grove API listening on http://localhost:${port()} (${storeName()})`);
});
