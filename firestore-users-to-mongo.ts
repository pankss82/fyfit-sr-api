import admin from 'firebase-admin';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import bcrypt from 'bcryptjs';

const FIREBASE_SERVICE_ACCOUNT = './serviceAccountKey.json';
const MONGO_URI = 'mongodb://adminuser:adminpassword@localhost:27017/fyfit_db?authSource=admin';
const BATCH_SIZE = 50; // Size for writing to Mongo
const QUERY_LIMIT = 500; // Size for reading from Firestore (can be larger than BATCH_SIZE)

admin.initializeApp({
  credential: admin.credential.cert(FIREBASE_SERVICE_ACCOUNT),
});
const db = admin.firestore();
const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const log = (msg: string) => console.log(chalk.cyan(`[INFO] ${msg}`));
const success = (msg: string) => console.log(chalk.green(`[SUCCESS] ${msg}`));
const error = (msg: string) => console.log(chalk.red(`[ERROR] ${msg}`));

await mongoose.connect(MONGO_URI);
log(`Connected → Collection: ${User.collection.name}`);

async function exportFirestoreUsersToMongo() {
  log('Starting migration...');

  // Get total count (optional, for progress bar accuracy)
  const initialSnapshot = await db.collection('users').get();
  const total = initialSnapshot.size;
  if (total === 0) {
    success('No users to migrate.');
    process.exit(0);
  }
  progress.start(total, 0);

  let processed = 0;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | undefined = undefined;
  let batch: any[] = [];
  let isDone = false;
  
  // --- FLUSH FUNCTION (NO CHANGE) ---
  const flush = async () => {
    if (batch.length === 0) return;

    const ops = await Promise.all(
      batch.map(async (doc) => {
        const data = doc.data();
        if (!data.email || !data.password || !data.name) return null;

        let hashed: string;
        try {
          hashed = await bcrypt.hash(data.password, 10);
        } catch (err) {
          error(`Hash failed: ${data.email}`);
          return null;
        }

        return {
          updateOne: {
            filter: { email: data.email.toLowerCase() },
            update: {
              $set: {
                email: data.email.toLowerCase(),
                password: hashed,
                name: data.name,
                deviceId: data.deviceId || 'UNKNOWN',
                fcmToken: data.fcmToken ?? null,
                age: data.age ?? null,
                deviceType: data.deviceType ?? null,
                gender: data.gender ?? null,
                mobileNo: data.mobileNo ?? null,
                profileUrl: data.profileUrl ?? null,
                uid: doc.uid ?? null
              },
            },
            upsert: true,
          },
        };

      })
    );

    const validOps = ops.filter(op => op !== null);
    if (validOps.length === 0) {
      processed += batch.length;
      progress.update(processed);
      batch = [];
      return;
    }

    try {
      const result = await User.bulkWrite(validOps, { ordered: false });
      // NOTE: We rely on the batch size for progress, as bulkWrite doesn't return document-level counts easily
      processed += batch.length; 
      log(`Batch: ${validOps.length} processed. ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);
    } catch (err: any) {
      error(`Write failed: ${err.message}`);
    }

    progress.update(processed);
    batch = [];
  };

  // --- PAGINATED FETCH LOOP (NEW LOGIC) ---
  while (!isDone) {
    let query = db.collection('users').limit(QUERY_LIMIT);
    
    // If we have a document from the previous run, start the next query after it
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    // Fetch the next batch from Firestore
    const snapshot = await query.get();
    
    if (snapshot.size === 0) {
      isDone = true; // No more documents left to process
      break;
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1]; // Store the last document for the next cursor

    // Process the fetched documents in smaller BATCH_SIZE chunks for MongoDB bulkWrite
    for (const doc of snapshot.docs) {
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) {
        await flush();
      }
    }
    
    // Flush any remaining documents from the Firestore batch
    await flush();

    // If the snapshot size was less than the QUERY_LIMIT, we reached the end of the collection
    if (snapshot.size < QUERY_LIMIT) {
        isDone = true;
    }
  }

  // Ensure any final, partial batches are written (though already handled inside the loop)
  await flush(); 

  progress.stop();
  success(`Exported ${processed} users!`);
  process.exit(0);
}

exportFirestoreUsersToMongo().catch(err => {
  error(`Failed: ${err.message}`);
  process.exit(1);
});