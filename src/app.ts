import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { config } from './config/config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import database from './config/database';

const app = express();

// Connect to database middleware for serverless environments (like Vercel)
app.use(async (req, res, next) => {
  try {
    await database.connect();
    next();
  } catch (err) {
    console.error('Failed to connect to database in app.ts middleware:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error: Database connection failed' });
  }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
const allowedOrigins = config.frontendUrl.split(',').map(url => url.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (para rate limiting funcionar corretamente)
app.set('trust proxy', 1);

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/v1', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Marcenaria API',
    version: '1.0.0',
    documentation: '/api/v1/health',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
