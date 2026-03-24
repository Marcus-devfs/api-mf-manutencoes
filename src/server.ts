import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { config } from './config/config';
import database from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import { initializeSocketService } from './services/socketService';

class Server {
  private app: express.Application;
  private server: any;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {

    const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',') 
  : [];
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // CORS
  this.app.use(cors({
  origin: (origin, callback) => {
    // Se não houver origin (ex: mobile apps ou ferramentas de teste) ou se estiver em dev
    if (!origin || config.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
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

    // Servir arquivos estáticos (uploads)
    this.app.use('/uploads', express.static('uploads'));
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1', routes);

    // Socket.IO health check route
    this.app.get('/socket.io/', (req, res) => {
      res.json({
        success: true,
        message: 'Socket.IO está funcionando',
        timestamp: new Date().toISOString()
      });
    });

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

      // Tentar liberar a porta antes de iniciar
      await this.killProcessOnPort(this.port);

      // Criar HTTP Server
      this.server = createServer(this.app);

      // Inicializar WebSocket
      initializeSocketService(this.server);

      // Iniciar servidor
      this.server.listen(this.port, () => {
        console.log(`🚀 Servidor rodando na porta ${this.port}`);
        console.log(`📱 Ambiente: ${config.nodeEnv}`);
        console.log(`🌐 URL: http://localhost:${this.port}`);
        console.log(`📚 API: http://localhost:${this.port}/api/v1`);
        console.log(`❤️  Health: http://localhost:${this.port}/api/v1/health`);
        console.log(`🔌 WebSocket: ws://localhost:${this.port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.shutdown.bind(this));
      process.on('SIGINT', this.shutdown.bind(this));

    } catch (error) {
      console.error('❌ Erro ao iniciar servidor:', error);
      process.exit(1);
    }
  }

  private async killProcessOnPort(port: number): Promise<void> {
    return new Promise((resolve) => {
      import('child_process').then(({ exec }) => {
        exec(`lsof -ti :${port} | xargs kill -9`, (error) => {
          if (error) {
            // Se der erro, provavelmente não tinha processo rodando ou não temos permissão.
            // Apenas ignoramos e seguimos.
          } else {
            console.log(`🧹 Porta ${port} limpa com sucesso.`);
          }
          // Pequeno delay para garantir que o SO liberou a porta
          setTimeout(resolve, 500);
        });
      });
    });
  }

  private async shutdown(): Promise<void> {
    console.log('\n🛑 Iniciando shutdown graceful...');

    try {
      // Fechar servidor HTTP
      if (this.server) {
        this.server.close(() => {
          console.log('🔌 Servidor HTTP fechado');
        });
      }

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

