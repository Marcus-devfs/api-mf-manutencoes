Guia de Implementação: Integração Asaas
Este guia detalha as mudanças necessárias no Backend (/api) e Frontend (/app) para integrar o gateway de pagamentos Asaas com split de pagamentos.

1. Configuração Inicial
Variáveis de Ambiente (.env)
Adicione as seguintes chaves no arquivo .env da API:

ASAAS_API_KEY="seu_api_key_aqui"
ASAAS_API_URL="https://sandbox.asaas.com/api/v3" # ou https://www.asaas.com/api/v3 para produção
ASAAS_WALLET_ID="seu_wallet_id_principal" # ID da sua carteira principal para receber os 10%
WEBHOOK_SECRET="seu_segredo_webhook"
2. Backend (/api)
A. Novos Modelos de Dados
Precisamos armazenar os IDs do Asaas vinculados aos nossos usuários.

Atualizar User model:

asaasCustomerId: String (ID do cliente pagador no Asaas)
asaasAccountId: String (ID da subconta do profissional no Asaas - para receber o split)
B. Novo Serviço: AsaasService.ts
Criar um serviço dedicado para encapsular as chamadas à API do Asaas.

Métodos Principais:

createCustomer(user): Cria/Atualiza cliente no Asaas.
createProfessionalAccount(user): Cria a subconta para o profissional (obrigatório para Split).
createPayment(quote, paymentMethod):
Cria a cobrança.
Define o Split:
walletId: Conta do Profissional.
percentualValue: 90%.
split: [{ walletId: 'sua_conta_principal', percentualValue: 10% }]
transferFunds(withdrawal): Realiza transferência via PIX para a conta do bancária do profissional.
C. Atualizar PaymentController
Substituir a lógica simulada (Mock) pela chamada real ao AsaasService.

Pagamento PIX: Retornar o payload (Copia e Cola) e encodedImage (QR Code) gerados pelo Asaas.
Pagamento Cartão: Se optar por usar o Checkout Transparente do Asaas, retornar o invoiceUrl ou processar os dados do cartão diretamente (requer PCI compliance básico). Recomendação: Começar com Link de Pagamento ou PIX para simplificar.
D. Webhook (/api/src/controllers/webhookController.ts)
O Asaas avisa quando o pagamento muda de status.

Receber POST /webhook/asaas.
Verificar assinatura/token.
Se event for PAYMENT_RECEIVED ou PAYMENT_CONFIRMED:
Buscar o Payment pelo ID externo.
Atualizar status para completed no banco local.
Atualizar status do Orçamento (Quote).
3. Frontend (/app)
A. Onboarding do Profissional
O profissional precisa completar o cadastro para receber.

Nova Tela: "Dados Bancários".
Ao salvar, o backend chama AsaasService.createProfessionalAccount.
B. Tela de Pagamento (Cliente)
Opção PIX: Exibir o QR Code retornado pela API do Asaas.
Opção Cartão:
Simples: Abrir WebView com o Link de Pagamento do Asaas.
Integrado: Formulário de cartão -> Enviar dados para API -> API envia para Asaas.
C. Tela de Saque (Profissional)
Já implementada (earnings/withdraw.tsx).
Backend deve ser atualizado para que ao receber o POST /withdrawals, ele valide o saldo real e agende a transferência no Asaas.
4. Fluxo de Split (Detalhado)
Orçamento Aceito: R$ 1.000,00.
Cliente Paga: R$ 1.000,00 entram no Asaas.
Divisão Automática (Asaas):
R$ 900,00 -> Vai para a subconta do Profissional (Saldo dele no Asaas).
R$ 100,00 -> Vai para sua conta Mestre.
Liberação: O Asaas retém o saldo conforme a forma de pagamento (ex: PIX na hora, Cartão em 30 dias ou antecipado).
Saque:
O profissional solicita saque no App.
Sua API ordena: "Asaas, transfira R$ 500,00 da Subconta X para a Chave PIX Y".
5. Próximos Passos de Implementação
 Criar conta Sandbox no Asaas.
 Instalar pacote axios na API (se não houver).
 Criar src/services/asaasService.ts.
 Atualizar PaymentService para usar AsaasService.

Comment
⌥⌘M
