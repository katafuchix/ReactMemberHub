import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  const { host, name } = mongoose.connection;
  console.log(`[db] connected: ${host}/${name}`);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.connection.close();
}
