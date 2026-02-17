import { Payment, Quote, User } from '../models';
import { AsaasService } from './asaasService';
import { IPayment, IQuote } from '../types';
import { createError, notFound, badRequest, forbidden } from '../middlewares/errorHandler';
import { config } from '../config/config';

export class PaymentService {
  // Processar pagamento com Cartão de Crédito (via Asaas)
  static async processCreditCardPayment(quoteId: string, creditCardData: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  }, holderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  }, clientId: string): Promise<{
    payment: IPayment;
  }> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) throw notFound('Orçamento não encontrado');
      if (quote.clientId !== clientId) throw forbidden('Você não tem permissão para pagar este orçamento');
      if (quote.status !== 'accepted') throw badRequest('Apenas orçamentos aceitos podem ser pagos');
      if (quote.paymentStatus === 'paid') throw badRequest('Orçamento já foi pago');

      // Atualizar CPF do usuário se necessário (importante para Asaas)
      if (holderInfo.cpfCnpj) {
        const user = await User.findById(clientId);
        if (user && !user.cpfCnpj) {
          user.cpfCnpj = holderInfo.cpfCnpj;
          await user.save();
        }
      }

      // 1. Criar/Buscar Cliente e Profissional no Asaas
      const asaasCustomerId = await AsaasService.createCustomer(clientId);

      // Atualizar CPF do cliente no Asaas caso tenha sido fornecido nos dados do cartão
      if (holderInfo.cpfCnpj) {
        const cpfCnpjClean = holderInfo.cpfCnpj.replace(/\D/g, '');
        await AsaasService.updateCustomer(asaasCustomerId, {
          cpfCnpj: cpfCnpjClean,
          name: holderInfo.name,
          mobilePhone: holderInfo.phone?.replace(/\D/g, '') || undefined
        });
      }

      const asaasProfessionalId = await AsaasService.createProfessionalAccount(quote.professionalId);

      // 2. Processar Pagamento via Asaas
      const asaasPayment = await AsaasService.createPayment(
        asaasCustomerId,
        quote.totalPrice,
        asaasProfessionalId,
        `Pagamento Orçamento #${quote._id}`,
        quote._id.toString(),
        'CREDIT_CARD',
        creditCardData,
        holderInfo
      );

      // 3. Cálculos de Taxas (Estimativa)
      const appFeePercentage = 0.10; // 10%
      const appFee = quote.totalPrice * appFeePercentage;
      const gatewayFee = 0.50 + (quote.totalPrice * 0.0299); // Exemplo: R$ 0,50 + 2.99% (ajustar conforme Asaas)
      const netAmount = quote.totalPrice - appFee; // Profissional recebe 90% (o Gateway descontará suas taxas do Holder da Wallet se configurado, aqui assumimos que o split já separa o valor bruto do profissional) 

      // Ajuste: O Asaas cobra taxas. Se a taxa for descontada de quem recebe, o netAmount pode variar.
      // Simplificação: Consideramos netAmount = (Total - AppFee). O Asaas descontará sua taxa desse montante ou do montante total.
      // Para fins de exibição no app, netAmount é o que a plataforma repassa "teoricamente".

      const availableDate = new Date();
      availableDate.setDate(availableDate.getDate() + 30); // Cartão demora ~30 dias

      // 4. Salvar
      const payment = new Payment({
        quoteId: quote._id,
        clientId: clientId,
        professionalId: quote.professionalId,
        amount: quote.totalPrice,
        currency: 'BRL',
        status: asaasPayment.status === 'CONFIRMED' || asaasPayment.status === 'RECEIVED' ? 'completed' : 'pending',
        paymentMethod: 'credit_card',
        transactionId: asaasPayment.id,
        appFee,
        netAmount,
        gatewayFee,
        availableAt: availableDate
      });

      await payment.save();

      if (payment.status === 'completed') {
        await quote.markAsPaid(payment._id.toString());
      }

      return { payment };
    } catch (error) {
      throw error;
    }
  }

  // Processar pagamento PIX (Integrado com Asaas)
  static async processPixPayment(quoteId: string, clientId: string, payerInfo?: { cpfCnpj?: string }): Promise<{
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

      // Atualizar CPF do usuário se não existir e for fornecido
      if (payerInfo?.cpfCnpj) {
        const user = await User.findById(clientId);
        if (user && !user.cpfCnpj) {
          user.cpfCnpj = payerInfo.cpfCnpj;
          await user.save();
        }
      }

      console.log('CPF do usuário:', payerInfo?.cpfCnpj);

      // 1. Criar/Buscar Cliente no Asaas (Pagador)
      // O createCustomer agora usa o user.cpfCnpj atualizado
      const asaasCustomerId = await AsaasService.createCustomer(clientId);

      // Atualizar CPF do cliente no Asaas caso tenha sido fornecido agora
      if (payerInfo?.cpfCnpj) {
        console.log('--- Iniciando Atualização de CPF no Asaas ---');
        console.log('Customer ID:', asaasCustomerId);
        const cpfCnpjClean = payerInfo.cpfCnpj.replace(/\D/g, '');
        console.log('CPF Enviado:', cpfCnpjClean);

        try {
          const updateResult = await AsaasService.updateCustomer(asaasCustomerId, {
            cpfCnpj: cpfCnpjClean
          });
          console.log('Update Asaas Resultado:', updateResult ? 'Sucesso' : 'Sem retorno');

          // Aguardar 1 segundo para propagação no Asaas (Sandbox as vezes tem delay)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error('ERRO AO ATUALIZAR CUSTOMER ASAAS:', err);
        }
        console.log('--- Fim Atualização Asaas ---');
      }

      // 2. Criar/Buscar Conta do Profissional no Asaas (Recebedor Split)
      const asaasProfessionalId = await AsaasService.createProfessionalAccount(quote.professionalId);

      // 3. Criar Cobrança com Split
      const asaasPayment = await AsaasService.createPayment(
        asaasCustomerId,
        quote.totalPrice,
        asaasProfessionalId,
        `Pagamento Orçamento #${quote._id}`,
        quote._id.toString()
      );

      // 4. Salvar no Banco
      const appFee = quote.totalPrice * 0.10;
      const netAmount = quote.totalPrice - appFee;
      const availableDate = new Date(); // PIX é imediato ou D+1 dependendo da regra, vamos por D+1 por segurança
      availableDate.setDate(availableDate.getDate() + 1);

      const payment = new Payment({
        quoteId: quote._id,
        clientId: clientId,
        professionalId: quote.professionalId,
        amount: quote.totalPrice,
        currency: 'BRL',
        status: 'pending',
        paymentMethod: 'pix',
        transactionId: asaasPayment.id,
        appFee,
        netAmount,
        gatewayFee: 0.99, // Exemplo taxa fixa PIX Asaas
        availableAt: availableDate
      });

      await payment.save();

      return {
        payment,
        pixCode: asaasPayment.pixQrCodeId || 'fluxo_sandbox_simulado', // Em sandbox pode não vir
        qrCode: asaasPayment.encodedImage || 'fluxo_sandbox_simulado'
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
        await quote.markAsPaid(payment._id.toString());
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
        await quote.markAsPaid(payment._id.toString());
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
      let filter: any;

      // Verificar se é um ID antigo do Asaas (começa com pay_) ou não é ObjectId válido
      const isLegacyId = paymentId.startsWith('pay_') || !paymentId.match(/^[0-9a-fA-F]{24}$/);

      if (isLegacyId) {
        // Busca por transactionId para compatibilidade
        filter = userRole === 'client'
          ? { transactionId: paymentId, clientId: userId }
          : { transactionId: paymentId, professionalId: userId };
      } else {
        // Busca normal por _id
        filter = userRole === 'client'
          ? { _id: paymentId, clientId: userId }
          : { _id: paymentId, professionalId: userId };
      }

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
          netAmount: p.netAmount,
          paymentMethod: p.paymentMethod,
          date: p.createdAt,
          status: p.status
        }))
      };
    } catch (error) {
      throw error;
    }
  }

  // Calcular saldo disponível para saque
  static async getAvailableBalance(userId: string): Promise<number> {
    try {
      // Soma de todos os pagamentos concluídos onde o usuário é o profissional
      // Menos a taxa da plataforma (appFee)
      // O split já deve ter considerado taxas de gateway ou não, depende da regra.
      // Aqui usamos netAmount que salvamos no pagamento

      const payments = await Payment.find({
        professionalId: userId,
        status: 'completed'
      });

      const totalEarnings = payments.reduce((sum, payment) => {
        return sum + (payment.netAmount || 0);
      }, 0);

      return totalEarnings;
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
