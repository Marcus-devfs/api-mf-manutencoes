import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { config } from '../config/config';
import { createError, badRequest, unauthorized, conflict } from '../middlewares/errorHandler';
import { IUser } from '../types';

export class AuthService {
  // Registrar novo usuário
  static async register(userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: 'client' | 'professional';
  }): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
    try {
      // Verificar se email já existe
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw conflict('Email já está em uso');
      }

      // Criar usuário
      const user = new User({
        ...userData,
        verificationToken: this.generateVerificationToken(),
      });

      await user.save();

      // Gerar tokens
      const tokens = this.generateTokens(user);

      return { user, tokens };
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw conflict('Email já está em uso');
      }
      throw error;
    }
  }

  // Login
  static async login(email: string, password: string): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
    try {
      // Buscar usuário com senha
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        throw unauthorized('Credenciais inválidas');
      }

      if (!user.isActive) {
        throw unauthorized('Conta desativada');
      }

      // Verificar senha
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw unauthorized('Credenciais inválidas');
      }

      // Gerar tokens
      const tokens = this.generateTokens(user);

      return { user, tokens };
    } catch (error) {
      throw error;
    }
  }

  // Refresh token
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as any;
      
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw unauthorized('Token inválido');
      }

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw unauthorized('Token inválido');
      }
      throw error;
    }
  }

  // Verificar email
  static async verifyEmail(token: string): Promise<IUser> {
    try {
      const user = await User.findOne({ verificationToken: token });
      
      if (!user) {
        throw badRequest('Token de verificação inválido');
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Solicitar reset de senha
  static async requestPasswordReset(email: string): Promise<{ message: string; resetToken: string }> {
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        // Por segurança, não revelar se o email existe ou não
        return {
          message: 'Se o email existir, você receberá instruções para resetar sua senha',
          resetToken: '',
        };
      }

      const resetToken = (user as any).generateResetToken();
      await user.save();

      // Aqui você enviaria o email com o token
      // await this.sendPasswordResetEmail(user.email, resetToken);

      return {
        message: 'Se o email existir, você receberá instruções para resetar sua senha',
        resetToken, // Em produção, não retornar o token
      };
    } catch (error) {
      throw error;
    }
  }

  // Reset de senha
  static async resetPassword(token: string, newPassword: string): Promise<IUser> {
    try {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user) {
        throw badRequest('Token de reset inválido ou expirado');
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Alterar senha
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<IUser> {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        throw badRequest('Usuário não encontrado');
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw unauthorized('Senha atual incorreta');
      }

      user.password = newPassword;
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Gerar tokens
  private static generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
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
  }

  // Gerar token de verificação
  private static generateVerificationToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  // Enviar email de verificação (placeholder)
  private static async sendVerificationEmail(email: string, token: string): Promise<void> {
    // Implementar envio de email
    console.log(`Email de verificação para ${email}: ${token}`);
  }

  // Enviar email de reset de senha (placeholder)
  private static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // Implementar envio de email
    console.log(`Email de reset para ${email}: ${token}`);
  }
}
