import { MongoClient, ServerApiVersion, type Db } from "mongodb";

// Cached MongoClient singleton — survives HMR in dev and avoids exhausting
// connections across serverless invocations. (mongodb@6; @auth/mongodb-adapter@3
// peers mongodb@^6, so stay on 6 even though 7 exists — see SETUP.md.)

const uri = process.env.MONGODB_URI;

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }
  if (process.env.NODE_ENV === "development") {
    const g = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    if (!g._mongoClientPromise) {
      g._mongoClientPromise = new MongoClient(uri, options).connect();
    }
    return g._mongoClientPromise;
  }
  if (!clientPromise) {
    clientPromise = new MongoClient(uri, options).connect();
  }
  return clientPromise;
}

export default getClientPromise;

export async function getDb(name = "doctoapp"): Promise<Db> {
  return (await getClientPromise()).db(name);
}
