import { User, Address, ProfessionalProfile } from '../models';
import { IUser, IAddress, IProfessionalProfile } from '../types';
import { createError, notFound, badRequest } from '../middlewares/errorHandler';

export class UserService {
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

  // Buscar endereços do usuário
  static async getUserAddresses(userId: string): Promise<IAddress[]> {
    try {
      const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
      return addresses;
    } catch (error) {
      throw error;
    }
  }

  // Adicionar endereço
  static async addAddress(userId: string, addressData: Omit<IAddress, '_id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<IAddress> {
    try {
      const address = new Address({
        ...addressData,
        userId,
      });

      await address.save();
      return address;
    } catch (error) {
      throw error;
    }
  }

  // Atualizar endereço
  static async updateAddress(addressId: string, userId: string, updateData: Partial<IAddress>): Promise<IAddress> {
    try {
      const address = await Address.findOneAndUpdate(
        { _id: addressId, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!address) {
        throw notFound('Endereço não encontrado');
      }

      return address;
    } catch (error) {
      throw error;
    }
  }

  // Remover endereço
  static async removeAddress(addressId: string, userId: string): Promise<void> {
    try {
      const address = await Address.findOneAndDelete({ _id: addressId, userId });
      if (!address) {
        throw notFound('Endereço não encontrado');
      }
    } catch (error) {
      throw error;
    }
  }

  // Definir endereço padrão
  static async setDefaultAddress(addressId: string, userId: string): Promise<IAddress> {
    try {
      // Primeiro, remover padrão de todos os endereços do usuário
      await Address.updateMany(
        { userId },
        { isDefault: false }
      );

      // Definir o novo endereço como padrão
      const address = await Address.findOneAndUpdate(
        { _id: addressId, userId },
        { isDefault: true },
        { new: true }
      );

      if (!address) {
        throw notFound('Endereço não encontrado');
      }

      return address;
    } catch (error) {
      throw error;
    }
  }

  // Buscar perfil profissional
  static async getProfessionalProfile(userId: string): Promise<IProfessionalProfile | null> {
    try {
      const profile = await ProfessionalProfile.findOne({ userId });
      return profile;
    } catch (error) {
      throw error;
    }
  }

  // Criar perfil profissional
  static async createProfessionalProfile(userId: string, profileData: Omit<IProfessionalProfile, '_id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<IProfessionalProfile> {
    try {
      // Verificar se o usuário é profissional
      const user = await User.findById(userId);
      if (!user || user.role !== 'professional') {
        throw badRequest('Apenas profissionais podem criar perfil profissional');
      }

      // Verificar se já existe perfil
      const existingProfile = await ProfessionalProfile.findOne({ userId });
      if (existingProfile) {
        throw badRequest('Perfil profissional já existe');
      }

      const profile = new ProfessionalProfile({
        ...profileData,
        userId,
      });

      await profile.save();
      return profile;
    } catch (error) {
      throw error;
    }
  }

  // Atualizar perfil profissional
  static async updateProfessionalProfile(userId: string, updateData: Partial<IProfessionalProfile>): Promise<IProfessionalProfile> {
    try {
      const profile = await ProfessionalProfile.findOneAndUpdate(
        { userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!profile) {
        throw notFound('Perfil profissional não encontrado');
      }

      return profile;
    } catch (error) {
      throw error;
    }
  }

  // Buscar profissionais próximos
  static async getNearbyProfessionals(lat: number, lng: number, radius: number = 10): Promise<IProfessionalProfile[]> {
    try {
      const profiles = await ProfessionalProfile.find({
        $and: [
          {
            $expr: {
              $lte: [
                {
                  $multiply: [
                    6371, // Raio da Terra em km
                    {
                      $acos: {
                        $add: [
                          {
                            $multiply: [
                              { $sin: { $degreesToRadians: lat } },
                              { $sin: { $degreesToRadians: '$coordinates.lat' } }
                            ]
                          },
                          {
                            $multiply: [
                              { $cos: { $degreesToRadians: lat } },
                              { $cos: { $degreesToRadians: '$coordinates.lat' } },
                              { $cos: { $degreesToRadians: { $subtract: ['$coordinates.lng', lng] } } }
                            ]
                          }
                        ]
                      }
                    }
                  ]
                },
                radius
              ]
            }
          }
        ]
      }).populate('userId', 'name email avatar');

      return profiles;
    } catch (error) {
      throw error;
    }
  }

  // Buscar profissionais por especialidade
  static async getProfessionalsBySpecialty(specialty: string): Promise<IProfessionalProfile[]> {
    try {
      const profiles = await ProfessionalProfile.find({
        specialties: { $in: [new RegExp(specialty, 'i')] }
      }).populate('userId', 'name email avatar');

      return profiles;
    } catch (error) {
      throw error;
    }
  }

  // Avaliar profissional
  static async rateProfessional(professionalId: string, rating: number, comment?: string): Promise<IProfessionalProfile> {
    try {
      if (rating < 1 || rating > 5) {
        throw badRequest('Avaliação deve estar entre 1 e 5');
      }

      const profile = await ProfessionalProfile.findOne({ userId: professionalId });
      if (!profile) {
        throw notFound('Perfil profissional não encontrado');
      }

      // Calcular nova média (simplificado)
      const newRating = (profile.rating + rating) / 2;
      profile.rating = Math.round(newRating * 10) / 10; // Arredondar para 1 casa decimal

      await profile.save();
      return profile;
    } catch (error) {
      throw error;
    }
  }
}

