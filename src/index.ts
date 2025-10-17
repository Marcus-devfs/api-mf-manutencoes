import app from './app';
import database from './config/database';
import { config } from './config/config';

const startServer = async (): Promise<void> => {
  try {
    // Conectar ao banco de dados
    await database.connect();

    // Iniciar servidor
    const server = app.listen(config.port, () => {
      console.log(`🚀 Servidor rodando na porta ${config.port}`);
      console.log(`📱 Ambiente: ${config.nodeEnv}`);
      console.log(`🌐 URL: http://localhost:${config.port}`);
      console.log(`📚 API: http://localhost:${config.port}/api/v1`);
      console.log(`❤️  Health: http://localhost:${config.port}/api/v1/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Recebido ${signal}. Iniciando shutdown graceful...`);
      
      server.close(async () => {
        try {
          await database.disconnect();
          console.log('✅ Shutdown concluído');
          process.exit(0);
        } catch (error) {
          console.error('❌ Erro durante shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Iniciar servidor
startServer();

