import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Classe para erros customizados
export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware principal de tratamento de erros
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error;

  // Log do erro
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Tratar erros específicos do MongoDB
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Dados inválidos';
  }

  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'ID inválido';
  }

  if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = 409;
    message = 'Dados duplicados';
  }

  // Tratar erros de JWT
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  // Tratar erros de sintaxe JSON
  if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'JSON inválido';
  }

  // Em produção, não expor detalhes do erro
  if (config.nodeEnv === 'production' && !error.isOperational) {
    message = 'Algo deu errado';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: error.stack }),
  });
};

// Middleware para capturar rotas não encontradas
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new CustomError(`Rota ${req.originalUrl} não encontrada`, 404);
  next(error);
};

// Middleware para capturar erros assíncronos
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Função para criar erros customizados
export const createError = (message: string, statusCode: number = 500): CustomError => {
  return new CustomError(message, statusCode);
};

// Funções para erros comuns
export const badRequest = (message: string = 'Requisição inválida'): CustomError => {
  return new CustomError(message, 400);
};

export const unauthorized = (message: string = 'Não autorizado'): CustomError => {
  return new CustomError(message, 401);
};

export const forbidden = (message: string = 'Acesso negado'): CustomError => {
  return new CustomError(message, 403);
};

export const notFound = (message: string = 'Recurso não encontrado'): CustomError => {
  return new CustomError(message, 404);
};

export const conflict = (message: string = 'Conflito de dados'): CustomError => {
  return new CustomError(message, 409);
};

export const unprocessableEntity = (message: string = 'Dados não processáveis'): CustomError => {
  return new CustomError(message, 422);
};

export const tooManyRequests = (message: string = 'Muitas requisições'): CustomError => {
  return new CustomError(message, 429);
};

export const internalServerError = (message: string = 'Erro interno do servidor'): CustomError => {
  return new CustomError(message, 500);
};
