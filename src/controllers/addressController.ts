import { Request, Response, NextFunction } from 'express';
import { Address } from '../models/Address';
import { asyncHandler, notFound, badRequest } from '../middlewares';

export class AddressController {

    /**
     * Lista todos os endereços do usuário
     */
    static list = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user._id;

        const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

        res.json({
            success: true,
            data: addresses
        });
    });

    /**
     * Cria um novo endereço
     */
    static create = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user._id;
        const { title, street, number, complement, neighborhood, city, state, zipCode, isDefault, coordinates } = req.body;

        // Se for definir como padrão, o middleware do model já cuida de desmarcar os outros
        // Mas se for o primeiro endereço, forçamos ser padrão
        const count = await Address.countDocuments({ userId });
        const shouldBeDefault = count === 0 ? true : isDefault;

        const address = await Address.create({
            userId,
            title,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            zipCode,
            isDefault: shouldBeDefault,
            coordinates
        });

        res.status(201).json({
            success: true,
            data: address
        });
    });

    /**
     * Atualiza um endereço existente
     */
    static update = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = (req as any).user._id;
        const updateData = req.body;

        // Não permitir atualizar userId via body
        delete updateData.userId;

        const address = await Address.findOne({ _id: id, userId });

        if (!address) {
            throw notFound('Endereço não encontrado');
        }

        // Se estiver atualizando isDefault para true, precisamos desmarcar os outros
        // O middleware pre-save só roda em .save() ou .create(), não em findOneAndUpdate
        // Então vamos usar o save() do document
        Object.assign(address, updateData);

        // Manualmente garantir unicidade se isDefault for true (caso o middleware tenha issues ou pra garantir)
        if (updateData.isDefault) {
            await Address.updateMany(
                { userId, _id: { $ne: id } },
                { $set: { isDefault: false } }
            );
        }

        await address.save();

        res.json({
            success: true,
            data: address
        });
    });

    /**
     * Remove um endereço
     */
    static delete = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = (req as any).user._id;

        const address = await Address.findOneAndDelete({ _id: id, userId });

        if (!address) {
            throw notFound('Endereço não encontrado');
        }

        res.json({
            success: true,
            message: 'Endereço removido com sucesso'
        });
    });

    /**
     * Define um endereço como padrão
     */
    static setDefault = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = (req as any).user._id;

        const address = await Address.findOne({ _id: id, userId });

        if (!address) {
            throw notFound('Endereço não encontrado');
        }

        // Desmarcar todos os outros
        await Address.updateMany(
            { userId, _id: { $ne: id } },
            { $set: { isDefault: false } }
        );

        // Marcar este
        address.isDefault = true;
        await address.save();

        res.json({
            success: true,
            data: address
        });
    });
}
