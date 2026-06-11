import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined')
}

// Cached connection for Next.js hot-reload compatibility
interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null }
global._mongooseCache = cache

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands:    false,
      maxPoolSize:       10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:   45000,
    })
  }

  cache.conn = await cache.promise
  return cache.conn
}

export default dbConnect

export async function dbDisconnect(): Promise<void> {
  if (cache.conn) {
    await mongoose.disconnect()
    cache.conn    = null
    cache.promise = null
  }
}
