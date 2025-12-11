const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'soullock';

if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set.');
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
});

let clientPromise;

const getClient = async () => {
  if (!clientPromise) {
    clientPromise = client.connect();
  }

  return clientPromise;
};

const getDb = async () => {
  const connectedClient = await getClient();
  return connectedClient.db(dbName);
};

const getRoomsCollection = async () => {
  const db = await getDb();
  return db.collection('rooms');
};

const closeClient = async () => {
  if (clientPromise) {
    await client.close();
    clientPromise = null;
  }
};

module.exports = {
  getClient,
  getDb,
  getRoomsCollection,
  closeClient
};
