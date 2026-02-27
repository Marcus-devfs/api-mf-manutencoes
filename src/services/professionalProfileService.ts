import { ProfessionalProfile, User } from '../models';
import { IProfessionalProfile } from '../types';
import { notFound, badRequest } from '../middlewares/errorHandler';

export class ProfessionalProfileService {
    // Buscar perfil profissional
    static async getProfile(userId: string): Promise<IProfessionalProfile | null> {
        try {
            const profile = await ProfessionalProfile.findOne({ userId });
            return profile;
        } catch (error) {
            throw error;
        }
    }

    // Criar perfil profissional
    static async createProfile(userId: string, profileData: any): Promise<IProfessionalProfile> {
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
    static async updateProfile(userId: string, updateData: Partial<IProfessionalProfile>): Promise<IProfessionalProfile> {
        try {
            // Usar upsert para criar se não existir (necessário setDefaultsOnInsert para aplicar defaults do schema)
            const profile = await ProfessionalProfile.findOneAndUpdate(
                { userId },
                updateData,
                {
                    new: true,
                    upsert: true,
                    runValidators: true,
                    setDefaultsOnInsert: true
                }
            );

            return profile;
        } catch (error) {
            throw error;
        }
    }

    // Buscar profissionais próximos
    static async findNearby(lat: number, lng: number, radius: number = 10): Promise<IProfessionalProfile[]> {
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
    static async findBySpecialty(specialty: string): Promise<IProfessionalProfile[]> {
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
