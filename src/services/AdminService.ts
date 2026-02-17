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
}

export default new AdminService();
