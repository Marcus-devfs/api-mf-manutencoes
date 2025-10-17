import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthRequest } from '../types';
import { config } from '../config/config';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Middleware para verificar token JWT
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de acesso não fornecido',
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    
    // Buscar usuário no banco de dados
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Usuário não encontrado',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Conta desativada',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Token inválido',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expirado',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
};

// Middleware para verificar se o usuário está verificado
export const requireVerification = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isVerified) {
    res.status(403).json({
      success: false,
      message: 'Email não verificado. Verifique sua caixa de entrada.',
    });
    return;
  }
  next();
};

// Middleware para verificar roles específicas
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissões insuficientes.',
      });
      return;
    }

    next();
  };
};

// Middleware para verificar se é cliente
export const requireClient = requireRole('client');

// Middleware para verificar se é profissional
export const requireProfessional = requireRole('professional');

// Middleware para verificar se é admin
export const requireAdmin = requireRole('admin');

// Middleware para verificar se é cliente ou profissional
export const requireClientOrProfessional = requireRole('client', 'professional');

// Middleware para verificar se é profissional ou admin
export const requireProfessionalOrAdmin = requireRole('professional', 'admin');

// Middleware opcional de autenticação (não falha se não houver token)
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignorar erros de token opcional
  }
  
  next();
};

// Função para gerar tokens
export const generateTokens = (user: any) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn,
    } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

// Função para verificar refresh token
export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwtRefreshSecret) as JWTPayload;
};
