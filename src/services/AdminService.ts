import { User } from '../models/User';
import { Service } from '../models/Service';
import { Payment } from '../models/Payment';
import { Quote } from '../models/Quote';
import { Review } from '../models/Review';
import { SERVICE_CATEGORIES } from '../types';

export class AdminService {
    async getDashboardStats() {
        try {
            // 1. User Stats
            const totalUsers = await User.countDocuments();
            const verifiedUsers = await User.countDocuments({ isVerified: true });
            const clients = await User.countDocuments({ role: 'client' });
            const professionals = await User.countDocuments({ role: 'professional' });
            const admins = await User.countDocuments({ role: 'admin' });

            // 2. Service Stats
            const totalServices = await Service.countDocuments();
            const servicesByStatus = await Service.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);
            const servicesByCategory = await Service.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ]);

            // 3. Payment Stats
            const totalPayments = await Payment.countDocuments();
            const totalRevenue = await Payment.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const paymentsByStatus = await Payment.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);

            // 4. Quote Stats
            const totalQuotes = await Quote.countDocuments();
            const quotesByStatus = await Quote.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);

            // 5. Review Stats (Optional, if exists)
            const totalReviews = await Review.countDocuments();
            const averageRating = await Review.aggregate([
                { $group: { _id: null, avg: { $avg: '$rating' } } }
            ]);

            return {
                users: {
                    total: totalUsers,
                    verified: verifiedUsers,
                    clients,
                    professionals,
                    admins
                },
                services: {
                    total: totalServices,
                    byStatus: servicesByStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
                    byCategory: servicesByCategory.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
                },
                financials: {
                    totalRevenue: totalRevenue[0]?.total || 0,
                    totalTransactions: totalPayments,
                    byStatus: paymentsByStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
                },
                quotes: {
                    total: totalQuotes,
                    byStatus: quotesByStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
                },
                reviews: {
                    total: totalReviews,
                    averageRating: averageRating[0]?.avg || 0
                }
            };
        } catch (error) {
            console.error('Error fetching admin dashboard stats:', error);
            throw error;
        }
    }

    async getServices(query: any = {}): Promise<{ services: any[]; total: number; pages: number; page: number; limit: number }> {
        try {
            const page = parseInt(query.page as string) || 1;
            const limit = parseInt(query.limit as string) || 10;
            const skip = (page - 1) * limit;

            const filter: any = {};

            if (query.category) {
                filter.category = query.category;
            }

            if (query.status) {
                filter.status = query.status;
            }

            // Using Service model directly
            const [services, total] = await Promise.all([
                Service.find(filter)
                    .populate('clientId', 'name email phone avatar')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                Service.countDocuments(filter)
            ]);

            const pages = Math.ceil(total / limit);

            return {
                services,
                total,
                pages,
                page,
                limit
            };
        } catch (error) {
            console.error('Error fetching admin services:', error);
            throw error;
        }
    }
    async getQuotes(query: any = {}): Promise<{ quotes: any[]; total: number; pages: number; page: number; limit: number }> {
        try {
            const page = parseInt(query.page as string) || 1;
            const limit = parseInt(query.limit as string) || 10;
            const skip = (page - 1) * limit;

            const filter: any = {};

            if (query.status) {
                filter.status = query.status;
            }

            // Using Quote model directly
            const [quotes, total] = await Promise.all([
                Quote.find(filter)
                    .populate('clientId', 'name email phone avatar')
                    .populate('professionalId', 'name email phone avatar')
                    .populate('serviceId', 'title category')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                Quote.countDocuments(filter)
            ]);

            const pages = Math.ceil(total / limit);

            return {
                quotes,
                total,
                pages,
                page,
                limit
            };
        } catch (error) {
            console.error('Error fetching admin quotes:', error);
            throw error;
        }
    }

    async getServiceById(id: string) {
        try {
            const service = await Service.findById(id)
                .populate('clientId', 'name email phone avatar');

            if (!service) return null;

            // Find the accepted quote to get the professional
            const acceptedQuote = await Quote.findOne({
                serviceId: id,
                status: 'accepted'
            }).populate('professionalId', 'name email phone avatar');

            const serviceObj = service.toObject();
            if (acceptedQuote) {
                (serviceObj as any).professionalId = acceptedQuote.professionalId;
                (serviceObj as any).acceptedQuote = acceptedQuote;
            }

            return serviceObj;
        } catch (error) {
            console.error('Error fetching service by id:', error);
            throw error;
        }
    }

    async getQuoteById(id: string) {
        try {
            return await Quote.findById(id)
                .populate('clientId', 'name email phone avatar')
                .populate('professionalId', 'name email phone avatar')
                .populate({
                    path: 'serviceId',
                    select: 'title description category status budget address images',
                    populate: {
                        path: 'clientId',
                        select: 'name email phone avatar'
                    }
                });
        } catch (error) {
            console.error('Error fetching quote by id:', error);
            throw error;
        }
    }

    async getPayments(query: any = {}): Promise<{ payments: any[]; total: number; pages: number; page: number; limit: number }> {
        try {
            const page = parseInt(query.page as string) || 1;
            const limit = parseInt(query.limit as string) || 10;
            const skip = (page - 1) * limit;

            const filter: any = {};
            if (query.status) filter.status = query.status;
            if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
            if (query.clientId) filter.clientId = query.clientId;
            if (query.professionalId) filter.professionalId = query.professionalId;

            const [payments, total] = await Promise.all([
                Payment.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('quoteId', 'title totalPrice status')
                    .populate('clientId', 'name email phone avatar')
                    .populate('professionalId', 'name email phone avatar'),
                Payment.countDocuments(filter)
            ]);

            return {
                payments,
                total,
                pages: Math.ceil(total / limit),
                page,
                limit
            };
        } catch (error) {
            console.error('Error fetching admin payments:', error);
            throw error;
        }
    }

    async getPaymentStats() {
        try {
            const statsAgg = await Payment.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPayments: { $sum: 1 },
                        totalAmount: { $sum: "$amount" },
                        totalAppFee: { $sum: "$appFee" },
                        totalNetAmount: { $sum: "$netAmount" },
                    }
                }
            ]);

            const countsByStatus = await Payment.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]);

            const statusMap = countsByStatus.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, { pending: 0, completed: 0, failed: 0, refunded: 0 });

            const stats = statsAgg[0] || { totalPayments: 0, totalAmount: 0, totalAppFee: 0, totalNetAmount: 0 };

            return {
                totalPayments: stats.totalPayments,
                totalAmount: stats.totalAmount,
                totalAppFee: stats.totalAppFee,
                totalNetAmount: stats.totalNetAmount,
                pendingPayments: statusMap.pending || 0,
                completedPayments: statusMap.completed || 0,
                failedPayments: statusMap.failed || 0,
                refundedPayments: statusMap.refunded || 0,
            };
        } catch (error) {
            console.error('Error fetching admin payment stats:', error);
            throw error;
        }
    }

    async getPaymentById(id: string) {
        try {
            const isLegacyId = id.startsWith('pay_') || !id.match(/^[0-9a-fA-F]{24}$/);
            const filter = isLegacyId ? { transactionId: id } : { _id: id };

            const payment = await Payment.findOne(filter)
                .populate('quoteId', 'title totalPrice status')
                .populate('clientId', 'name email phone avatar')
                .populate('professionalId', 'name email phone avatar');

            return payment;
        } catch (error) {
            console.error('Error fetching payment by id:', error);
            throw error;
        }
    }

    async getUserQuotes(userId: string) {
        try {
            return await Quote.find({ clientId: userId })
                .populate('professionalId', 'name email avatar')
                .populate('serviceId', 'title category')
                .sort({ createdAt: -1 });
        } catch (error) {
            console.error('Error fetching user quotes:', error);
            throw error;
        }
    }

    async getUserServices(userId: string, role: string) {
        try {
            if (role === 'professional') {
                // For professionals, services are linked via accepted quotes
                const acceptedQuotes = await Quote.find({
                    professionalId: userId,
                    status: 'accepted'
                }).populate('serviceId');

                // Map to return service objects with the accepted quote attached
                return acceptedQuotes.map(quote => {
                    const service = (quote.serviceId as any).toObject ? (quote.serviceId as any).toObject() : quote.serviceId;
                    return {
                        ...service,
                        acceptedQuote: {
                            _id: quote._id,
                            totalPrice: quote.totalPrice,
                            status: quote.status,
                            paymentStatus: quote.paymentStatus
                        }
                    };
                }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }

            // For clients, services are linked directly
            const filter: any = { clientId: userId };
            return await Service.find(filter)
                .populate('clientId', 'name email avatar')
                .sort({ createdAt: -1 });
        } catch (error) {
            console.error('Error fetching user services:', error);
            throw error;
        }
    }
}

export default new AdminService();
