import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/config';
import database from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';

class Server {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // CORS
    this.app.use(cors({
      origin: config.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression
    this.app.use(compression());

    // Logging
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Rate limiting
    this.app.use(generalLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy (para rate limiting funcionar corretamente)
    this.app.set('trust proxy', 1);
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1', routes);

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Marcenaria API',
        version: '1.0.0',
        documentation: '/api/v1/health',
        timestamp: new Date().toISOString()
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Conectar ao banco de dados
      await database.connect();

      // Iniciar servidor
      this.app.listen(this.port, () => {
        console.log(`🚀 Servidor rodando na porta ${this.port}`);
        console.log(`📱 Ambiente: ${config.nodeEnv}`);
        console.log(`🌐 URL: http://localhost:${this.port}`);
        console.log(`📚 API: http://localhost:${this.port}/api/v1`);
        console.log(`❤️  Health: http://localhost:${this.port}/api/v1/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.shutdown.bind(this));
      process.on('SIGINT', this.shutdown.bind(this));

    } catch (error) {
      console.error('❌ Erro ao iniciar servidor:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    console.log('\n🛑 Iniciando shutdown graceful...');
    
    try {
      await database.disconnect();
      console.log('✅ Shutdown concluído');
      process.exit(0);
    } catch (error) {
      console.error('❌ Erro durante shutdown:', error);
      process.exit(1);
    }
  }
}

// Iniciar servidor
const server = new Server();
server.start().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

export default server;
