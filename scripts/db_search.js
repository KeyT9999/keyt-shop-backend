require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) {
  console.error('Error: MONGODB_URL not found in environment');
  process.exit(1);
}

async function searchDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to MongoDB.');

    const collections = await mongoose.connection.db.collections();
    console.log(`Found ${collections.length} collections.`);

    const searchQueries = [
      'chuyên cung cấp',
      'MMO',
      'Coá Canva',
      'Instagram',
      'Canva Pro',
      'CapCut Pro',
      'ChatGPT Plus'
    ];

    for (const collection of collections) {
      const name = collection.collectionName;
      const count = await collection.countDocuments();
      console.log(`Searching collection: ${name} (${count} documents)...`);

      // We will fetch all documents and search their contents recursively
      const docs = await collection.find({}).toArray();
      let matchCount = 0;

      for (const doc of docs) {
        const str = JSON.stringify(doc);
        const matches = [];
        for (const query of searchQueries) {
          if (str.includes(query)) {
            matches.push(query);
          }
        }
        if (matches.length > 0) {
          matchCount++;
          console.log(`  Match in doc ID: ${doc._id || 'unknown'}`);
          console.log(`    Matched terms: ${matches.join(', ')}`);
          // Print snippet of the matched fields
          // Simple key-value display
          for (const key in doc) {
            const valStr = JSON.stringify(doc[key]);
            for (const query of matches) {
              if (valStr.includes(query)) {
                console.log(`    - Field [${key}]: ${valStr.substring(0, 300)}`);
              }
            }
          }
        }
      }
      if (matchCount > 0) {
        console.log(`Collection ${name}: found ${matchCount} matching documents.`);
      }
    }

    console.log('Search complete.');
  } catch (error) {
    console.error('Error searching DB:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

searchDB();
