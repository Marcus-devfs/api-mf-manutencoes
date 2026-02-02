import { Payment, Quote, User } from '../models';
import { IPayment, IQuote } from '../types';
import { createError, notFound, badRequest, forbidden } from '../middlewares/errorHandler';
import { config } from '../config/config';

export class PaymentService {
  // Processar pagamento com Stripe
  static async processStripePayment(quoteId: string, paymentMethodId: string, clientId: string): Promise<{
    payment: IPayment;
    clientSecret?: string;
  }> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      if (quote.clientId !== clientId) {
        throw forbidden('Você não tem permissão para pagar este orçamento');
      }

      if (quote.status !== 'accepted') {
        throw badRequest('Apenas orçamentos aceitos podem ser pagos');
      }

      if (quote.paymentStatus === 'paid') {
        throw badRequest('Orçamento já foi pago');
      }

      // Aqui você integraria com o Stripe
      // Por enquanto, vamos simular o processo
      const stripe = require('stripe')(config.stripe.secretKey);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(quote.totalPrice * 100), // Converter para centavos
        currency: 'brl',
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          quoteId: quote._id.toString(),
          clientId: clientId,
          professionalId: quote.professionalId,
        },
      });

      // Criar registro de pagamento
      const payment = new Payment({
        quoteId: quote._id,
        clientId: clientId,
        professionalId: quote.professionalId,
        amount: quote.totalPrice,
        currency: 'BRL',
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
        paymentMethod: 'credit_card',
        stripePaymentIntentId: paymentIntent.id,
      });

      await payment.save();

      // Se o pagamento foi bem-sucedido, atualizar o orçamento
      if (paymentIntent.status === 'succeeded') {
        await quote.markAsPaid(paymentIntent.id);
      }

      return {
        payment,
        clientSecret: paymentIntent.client_secret
      };
    } catch (error) {
      throw error;
    }
  }

  // Processar pagamento PIX
  static async processPixPayment(quoteId: string, clientId: string): Promise<{
    payment: IPayment;
    pixCode: string;
    qrCode: string;
  }> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      if (quote.clientId !== clientId) {
        throw forbidden('Você não tem permissão para pagar este orçamento');
      }

      if (quote.status !== 'accepted') {
        throw badRequest('Apenas orçamentos aceitos podem ser pagos');
      }

      if (quote.paymentStatus === 'paid') {
        throw badRequest('Orçamento já foi pago');
      }

      // Aqui você integraria com um provedor PIX
      // Por enquanto, vamos simular
      const pixCode = this.generatePixCode(quote.totalPrice);
      const qrCode = this.generateQRCode(pixCode);

      // Criar registro de pagamento
      const payment = new Payment({
        quoteId: quote._id,
        clientId: clientId,
        professionalId: quote.professionalId,
        amount: quote.totalPrice,
        currency: 'BRL',
        status: 'pending',
        paymentMethod: 'pix',
      });

      await payment.save();

      return {
        payment,
        pixCode,
        qrCode
      };
    } catch (error) {
      throw error;
    }
  }

  // Confirmar pagamento PIX
  static async confirmPixPayment(paymentId: string, transactionId: string): Promise<IPayment> {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw notFound('Pagamento não encontrado');
      }

      if (payment.status !== 'pending') {
        throw badRequest('Pagamento já foi processado');
      }

      // Marcar como concluído
      await payment.markAsCompleted(transactionId);

      // Atualizar orçamento
      const quote = await Quote.findById(payment.quoteId);
      if (quote) {
        await quote.markAsPaid(transactionId);
      }

      return payment;
    } catch (error) {
      throw error;
    }
  }

  // Processar transferência bancária
  static async processBankTransfer(quoteId: string, clientId: string, bankData: {
    bankName: string;
    accountNumber: string;
    agency: string;
  }): Promise<{
    payment: IPayment;
    transferData: any;
  }> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      if (quote.clientId !== clientId) {
        throw forbidden('Você não tem permissão para pagar este orçamento');
      }

      if (quote.status !== 'accepted') {
        throw badRequest('Apenas orçamentos aceitos podem ser pagos');
      }

      if (quote.paymentStatus === 'paid') {
        throw badRequest('Orçamento já foi pago');
      }

      // Criar registro de pagamento
      const payment = new Payment({
        quoteId: quote._id,
        clientId: clientId,
        professionalId: quote.professionalId,
        amount: quote.totalPrice,
        currency: 'BRL',
        status: 'pending',
        paymentMethod: 'bank_transfer',
      });

      await payment.save();

      // Dados da transferência (normalmente você obteria do banco do profissional)
      const transferData = {
        bankName: bankData.bankName,
        accountNumber: bankData.accountNumber,
        agency: bankData.agency,
        amount: quote.totalPrice,
        reference: `ORC-${quote._id}`,
        instructions: 'Use o código de referência no comprovante de transferência'
      };

      return {
        payment,
        transferData
      };
    } catch (error) {
      throw error;
    }
  }

  // Confirmar transferência bancária
  static async confirmBankTransfer(paymentId: string, transactionId: string, receiptUrl?: string): Promise<IPayment> {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw notFound('Pagamento não encontrado');
      }

      if (payment.status !== 'pending') {
        throw badRequest('Pagamento já foi processado');
      }

      // Marcar como concluído
      await payment.markAsCompleted(transactionId);

      // Atualizar orçamento
      const quote = await Quote.findById(payment.quoteId);
      if (quote) {
        await quote.markAsPaid(transactionId);
      }

      return payment;
    } catch (error) {
      throw error;
    }
  }

  // Buscar pagamentos do cliente
  static async getClientPayments(clientId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
    paymentMethod?: string;
  } = {}): Promise<{ payments: IPayment[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 10, status, paymentMethod } = options;
      const skip = (page - 1) * limit;

      const filter: any = { clientId };
      if (status) filter.status = status;
      if (paymentMethod) filter.paymentMethod = paymentMethod;

      const [payments, total] = await Promise.all([
        Payment.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('quoteId', 'title totalPrice')
          .populate('professionalId', 'name email'),
        Payment.countDocuments(filter)
      ]);

      return {
        payments,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Buscar pagamentos do profissional
  static async getProfessionalPayments(professionalId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
    paymentMethod?: string;
  } = {}): Promise<{ payments: IPayment[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 10, status, paymentMethod } = options;
      const skip = (page - 1) * limit;

      const filter: any = { professionalId };
      if (status) filter.status = status;
      if (paymentMethod) filter.paymentMethod = paymentMethod;

      const [payments, total] = await Promise.all([
        Payment.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('quoteId', 'title totalPrice')
          .populate('clientId', 'name email'),
        Payment.countDocuments(filter)
      ]);

      return {
        payments,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Buscar pagamento por ID
  static async getPaymentById(paymentId: string, userId: string, userRole: string): Promise<IPayment> {
    try {
      const filter = userRole === 'client' ? { _id: paymentId, clientId: userId } : { _id: paymentId, professionalId: userId };

      const payment = await Payment.findOne(filter)
        .populate('quoteId', 'title totalPrice status')
        .populate('clientId', 'name email')
        .populate('professionalId', 'name email');

      if (!payment) {
        throw notFound('Pagamento não encontrado');
      }

      return payment;
    } catch (error) {
      throw error;
    }
  }

  // Processar reembolso
  static async processRefund(paymentId: string, reason: string, userId: string, userRole: string): Promise<IPayment> {
    try {
      const filter = userRole === 'client' ? { _id: paymentId, clientId: userId } : { _id: paymentId, professionalId: userId };

      const payment = await Payment.findOne(filter);
      if (!payment) {
        throw notFound('Pagamento não encontrado');
      }

      if (!payment.canBeRefunded) {
        throw badRequest('Pagamento não pode ser reembolsado');
      }

      // Aqui você integraria com o Stripe para processar o reembolso
      if (payment.stripePaymentIntentId) {
        const stripe = require('stripe')(config.stripe.secretKey);

        await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          reason: 'requested_by_customer',
          metadata: {
            reason: reason,
            refundedBy: userId
          }
        });
      }

      // Marcar como reembolsado
      await payment.processRefund();

      return payment;
    } catch (error) {
      throw error;
    }
  }

  // Obter estatísticas de pagamentos
  static async getPaymentStats(userId: string, userRole: string): Promise<{
    totalPayments: number;
    totalAmount: number;
    pendingPayments: number;
    completedPayments: number;
    failedPayments: number;
    refundedPayments: number;
    averagePaymentValue: number;
  }> {
    try {
      const filter = userRole === 'client' ? { clientId: userId } : { professionalId: userId };

      const payments = await Payment.find(filter);

      const stats = {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        pendingPayments: payments.filter(p => p.status === 'pending').length,
        completedPayments: payments.filter(p => p.status === 'completed').length,
        failedPayments: payments.filter(p => p.status === 'failed').length,
        refundedPayments: payments.filter(p => p.status === 'refunded').length,
        averagePaymentValue: payments.length > 0
          ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length
          : 0
      };

      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Obter ganhos (com cálculo de taxas)
  static async getEarnings(userId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<{
    grossTotal: number;
    fee: number;
    netTotal: number;
    completedCount: number;
    pendingCount: number;
    averageTicket: number;
    recentPayments: any[];
  }> {
    try {
      const now = new Date();
      let startDate = new Date();

      if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      const filter: any = {
        professionalId: userId,
        createdAt: { $gte: startDate }
      };

      const payments = await Payment.find(filter)
        .populate('quoteId', 'title')
        .populate('clientId', 'name');

      const completedPayments = payments.filter(p => p.status === 'completed');
      const pendingPayments = payments.filter(p => p.status === 'pending');

      const grossTotal = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const feePercentage = 0.10; // 10% de taxa da plataforma
      const fee = grossTotal * feePercentage;
      const netTotal = grossTotal - fee;

      const recentPayments = await Payment.find({ professionalId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('quoteId', 'title')
        .populate('clientId', 'name');

      return {
        grossTotal,
        fee,
        netTotal,
        completedCount: completedPayments.length,
        pendingCount: pendingPayments.length,
        averageTicket: completedPayments.length > 0 ? grossTotal / completedPayments.length : 0,
        recentPayments: recentPayments.map(p => ({
          id: p._id,
          service: (p.quoteId as any)?.title || 'Serviço',
          client: (p.clientId as any)?.name || 'Cliente',
          amount: p.amount,
          date: p.createdAt,
          status: p.status
        }))
      };
    } catch (error) {
      throw error;
    }
  }

  // Gerar código PIX (simulado)
  private static generatePixCode(amount: number): string {
    // Em uma implementação real, você usaria um provedor PIX
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `00020126580014br.gov.bcb.pix0136${timestamp}${random}520400005303986540${amount.toFixed(2)}5802BR5913MarcenariaApp6009Sao Paulo62070503***6304`;
  }

  // Gerar QR Code (simulado)
  private static generateQRCode(pixCode: string): string {
    // Em uma implementação real, você geraria um QR Code real
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }
}
