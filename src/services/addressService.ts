import { Address } from '../models';
import { IAddress } from '../types';
import { notFound } from '../middlewares/errorHandler';

export class AddressService {
    // Buscar endereços do usuário
    static async getUserAddresses(userId: string): Promise<IAddress[]> {
        try {
            const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
            return addresses;
        } catch (error) {
            throw error;
        }
    }

    static async getUserAddressDefault(userId: string): Promise<IAddress> {
        try {
            const address = await Address.findOne({ userId, isDefault: true });
            if (!address) {
                throw notFound('Endereço não encontrado');
            }
            return address;
        } catch (error) {
            throw error;
        }
    }

    // Adicionar endereço
    static async createAddress(userId: string, addressData: any): Promise<IAddress> {
        try {
            // Se for definir como padrão, verificar se é o primeiro
            const count = await Address.countDocuments({ userId });
            const shouldBeDefault = count === 0 ? true : addressData.isDefault;

            const address = new Address({
                ...addressData,
                userId,
                isDefault: shouldBeDefault
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
            // Se estiver atualizando isDefault para true, precisamos desmarcar os outros
            // O middleware pre-save só roda em .save() ou .create(), não em findOneAndUpdate
            // No entanto, se passarmos isDefault: true no updateData, precisamos lidar com isso
            if (updateData.isDefault) {
                await Address.updateMany(
                    { userId, _id: { $ne: addressId } },
                    { $set: { isDefault: false } }
                );
            }

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
    static async deleteAddress(addressId: string, userId: string): Promise<void> {
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
}
