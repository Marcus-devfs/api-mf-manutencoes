import mongoose from 'mongoose';
import { config } from './config';

class Database {
  private static instance: Database;

  private connectionPromise: Promise<typeof mongoose> | null = null;

  private constructor() { }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
        if (!this.connectionPromise) {
          console.log('✅ MongoDB already connected or connecting (reusing existing connection state)');
          // Provide a dummy resolved promise if readyState is 1 but we don't hold the promise locally
          this.connectionPromise = Promise.resolve(mongoose);
        }
        await this.connectionPromise;
        return;
      }

      if (this.connectionPromise) {
        console.log('✅ MongoDB connection already in progress, waiting...');
        await this.connectionPromise;
        return;
      }

      const mongoUri = config.nodeEnv === 'test'
        ? config.mongodbTestUri
        : config.mongodbUri;

      this.connectionPromise = mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });

      await this.connectionPromise;

      console.log('✅ MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB disconnected gracefully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  public getConnectionStatus(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
  }
}

export default Database.getInstance();
