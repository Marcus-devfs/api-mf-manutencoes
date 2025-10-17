import rateLimit from 'express-rate-limit';
import { config } from '../config/config';

// Rate limiter geral
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente mais tarde.',
      retryAfter: Math.round(config.rateLimit.windowMs / 1000),
    });
  },
});

// Rate limiter para autenticação (mais restritivo)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
});

// Rate limiter para registro (mais restritivo)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por IP por hora
  message: {
    success: false,
    message: 'Muitas tentativas de registro. Tente novamente em 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para reset de senha
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 tentativas por IP por hora
  message: {
    success: false,
    message: 'Muitas tentativas de reset de senha. Tente novamente em 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para upload de arquivos
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // 20 uploads por IP por hora
  message: {
    success: false,
    message: 'Muitos uploads. Tente novamente em 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para API (mais permissivo para usuários autenticados)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: (req: any) => {
    // Usuários autenticados têm limite maior
    return req.user ? 200 : 50;
  },
  message: {
    success: false,
    message: 'Limite de requisições excedido. Tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    // Usar ID do usuário se autenticado, senão usar IP
    return req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
  },
});

// Rate limiter para chat (mais permissivo)
export const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 mensagens por minuto
  message: {
    success: false,
    message: 'Muitas mensagens. Aguarde um momento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para busca (moderado)
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // 10 buscas por minuto
  message: {
    success: false,
    message: 'Muitas buscas. Aguarde um momento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
