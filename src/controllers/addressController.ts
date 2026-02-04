import { Request, Response, NextFunction } from 'express';
import { AddressService } from '../services/addressService';
import { asyncHandler, notFound, badRequest } from '../middlewares';

export class AddressController {

    /**
     * Lista todos os endereços do usuário
     */
    static list = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user._id;

        const addresses = await AddressService.getUserAddresses(userId);

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

        const address = await AddressService.createAddress(userId, {
            title,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            zipCode,
            isDefault,
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

        const address = await AddressService.updateAddress(id, userId, updateData);

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

        await AddressService.deleteAddress(id, userId);

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

        const address = await AddressService.setDefaultAddress(id, userId);

        res.json({
            success: true,
            data: address
        });
    });
}
