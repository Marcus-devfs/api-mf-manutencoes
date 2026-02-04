import { User } from '../models';
import { IUser } from '../types';
import { createError, notFound, badRequest } from '../middlewares/errorHandler';
import { AsaasService } from './asaasService';
import { AddressService } from './addressService';

export class UserService {
  // Completar perfil financeiro
  static async completeFinancialProfile(userId: string, data: {
    cpfCnpj: string;
    birthDate: string; // YYYY-MM-DD
    mobilePhone: string;
    incomeValue: number;
    address?: {
      zipCode: string;
      street: string;
      number: string;
      neighborhood: string;
      city: string;
      state: string;
      complement?: string;
    };
  }): Promise<{ user: IUser; asaasStatus: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) throw notFound('Usuário não encontrado');

      // 1. Atualizar dados do usuário
      user.cpfCnpj = data.cpfCnpj;
      user.birthDate = new Date(data.birthDate);

      // Se mobilePhone for diferente, atualizamos. O Asaas exige mobilePhone limpo.
      if (data.mobilePhone) {
        // TODO: Considerar atualizar user.phone se desejado
      }
      await user.save();

      // 2. Salvar Endereço
      if (data.address) {
        await AddressService.createAddress(userId, {
          title: 'Principal',
          isDefault: true,
          ...data.address
        });
      }

      // 3. Criar Conta Asaas
      const asaasId = await AsaasService.createProfessionalAccount(userId, {
        incomeValue: data.incomeValue,
        mobilePhone: data.mobilePhone
      });

      return {
        user,
        asaasStatus: asaasId ? 'CREATED' : 'ERROR'
      };

    } catch (error) {
      throw error;
    }
  }

  // Buscar usuário por ID
  static async getUserById(userId: string): Promise<IUser> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw notFound('Usuário não encontrado');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Atualizar perfil do usuário
  static async updateProfile(userId: string, updateData: Partial<IUser>): Promise<IUser> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw notFound('Usuário não encontrado');
      }

      // Campos que podem ser atualizados
      const allowedFields = ['name', 'phone', 'avatar'];
      const updates: any = {};

      for (const field of allowedFields) {
        if (updateData[field as keyof IUser] !== undefined) {
          updates[field] = updateData[field as keyof IUser];
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updates,
        { new: true, runValidators: true }
      );

      return updatedUser!;
    } catch (error) {
      throw error;
    }
  }

  // Desativar conta
  static async deactivateAccount(userId: string): Promise<IUser> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      );

      if (!user) {
        throw notFound('Usuário não encontrado');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Reativar conta
  static async reactivateAccount(userId: string): Promise<IUser> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: true },
        { new: true }
      );

      if (!user) {
        throw notFound('Usuário não encontrado');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }
}
