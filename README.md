# API Marcenaria

API REST para o aplicativo de marcenaria, desenvolvida com Node.js, TypeScript, Express e MongoDB.

## 🚀 Funcionalidades

### Para Clientes
- ✅ Cadastro e autenticação
- ✅ Criação de serviços (troca de porta, manutenção, etc.)
- ✅ Visualização e aprovação de orçamentos
- ✅ Chat com profissionais
- ✅ Pagamento de serviços
- ✅ Gerenciamento de endereços
- ✅ Notificações

### Para Profissionais
- ✅ Cadastro e autenticação
- ✅ Visualização de serviços disponíveis
- ✅ Envio de orçamentos
- ✅ Chat com clientes
- ✅ Recebimento de pagamentos
- ✅ Perfil profissional com portfólio
- ✅ Gerenciamento de especialidades
- ✅ Notificações

### Para Administradores
- ✅ Dashboard com estatísticas
- ✅ Gerenciamento de usuários
- ✅ Monitoramento de serviços e pagamentos
- ✅ Envio de notificações em massa

## 🛠️ Tecnologias

- **Node.js** - Runtime JavaScript
- **TypeScript** - Linguagem de programação
- **Express.js** - Framework web
- **MongoDB** - Banco de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Stripe** - Pagamentos
- **Socket.io** - Chat em tempo real
- **Multer** - Upload de arquivos
- **AWS S3** - Armazenamento de imagens (opcional)

## 📁 Estrutura do Projeto

```
src/
├── config/          # Configurações
├── controllers/     # Controladores
├── middlewares/     # Middlewares
├── models/          # Modelos do banco
├── routes/          # Rotas da API
├── services/        # Lógica de negócio
├── types/           # Tipos TypeScript
├── utils/           # Utilitários
├── app.ts           # Configuração do Express
├── server.ts        # Servidor principal
└── index.ts         # Ponto de entrada
```

## 🚀 Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd api
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/marcenaria
MONGODB_TEST_URI=mongodb://localhost:27017/marcenaria_test

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_REFRESH_EXPIRES_IN=30d

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

4. **Execute o projeto**

Desenvolvimento:
```bash
npm run dev
```

Produção:
```bash
npm run build
npm start
```

## 📚 Documentação da API

### Autenticação

Todas as rotas protegidas requerem o header:
```
Authorization: Bearer <token>
```

### Endpoints Principais

#### Autenticação
- `POST /api/v1/auth/register` - Registrar usuário
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh-token` - Renovar token
- `GET /api/v1/auth/profile` - Perfil do usuário

#### Usuários
- `GET /api/v1/users/profile` - Perfil do usuário
- `PUT /api/v1/users/profile` - Atualizar perfil
- `GET /api/v1/users/addresses` - Endereços do usuário
- `POST /api/v1/users/addresses` - Adicionar endereço

#### Serviços
- `POST /api/v1/services` - Criar serviço (cliente)
- `GET /api/v1/services/available` - Serviços disponíveis (profissional)
- `GET /api/v1/services/:id` - Detalhes do serviço
- `PUT /api/v1/services/:id` - Atualizar serviço

#### Orçamentos
- `POST /api/v1/quotes` - Criar orçamento (profissional)
- `GET /api/v1/quotes/client/my-quotes` - Orçamentos do cliente
- `GET /api/v1/quotes/professional/my-quotes` - Orçamentos do profissional
- `PATCH /api/v1/quotes/:id/accept` - Aceitar orçamento
- `PATCH /api/v1/quotes/:id/reject` - Rejeitar orçamento

#### Chat
- `GET /api/v1/chat/service/:serviceId/user/:userId2` - Obter/criar chat
- `POST /api/v1/chat/messages` - Enviar mensagem
- `GET /api/v1/chat/:chatId/messages` - Mensagens do chat

#### Pagamentos
- `POST /api/v1/payments/stripe` - Pagamento com cartão
- `POST /api/v1/payments/pix` - Pagamento PIX
- `POST /api/v1/payments/bank-transfer` - Transferência bancária

#### Notificações
- `GET /api/v1/notifications/my-notifications` - Notificações do usuário
- `PATCH /api/v1/notifications/:id/read` - Marcar como lida

#### Upload de Arquivos
- `POST /api/v1/upload/single` - Upload de uma imagem
- `POST /api/v1/upload/multiple` - Upload de múltiplas imagens
- `POST /api/v1/upload/fields` - Upload de campos específicos
- `POST /api/v1/upload/required/single` - Upload obrigatório de uma imagem
- `POST /api/v1/upload/required/multiple` - Upload obrigatório de múltiplas imagens

## 🧪 Testes

```bash
# Executar testes
npm test

# Executar testes com coverage
npm run test:coverage
```

## 📊 Monitoramento

- **Health Check**: `GET /api/v1/health`
- **Logs**: Morgan para desenvolvimento, Winston para produção
- **Rate Limiting**: Proteção contra spam
- **CORS**: Configurado para frontend específico

## 🔒 Segurança

- ✅ Helmet para headers de segurança
- ✅ Rate limiting
- ✅ Validação de entrada
- ✅ Sanitização de dados
- ✅ JWT com refresh tokens
- ✅ Hash de senhas com bcrypt
- ✅ CORS configurado

## 🚀 Deploy

### Docker

```bash
# Build da imagem
docker build -t marcenaria-api .

# Executar container
docker run -p 3001:3001 marcenaria-api
```

### Heroku

```bash
# Deploy
git push heroku main
```

### Vercel

```bash
# Deploy
vercel --prod
```

## 📝 Scripts Disponíveis

- `npm run dev` - Desenvolvimento com nodemon
- `npm run build` - Build para produção
- `npm start` - Iniciar em produção
- `npm test` - Executar testes
- `npm run lint` - Verificar código
- `npm run lint:fix` - Corrigir problemas de lint

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para suporte, envie um email para suporte@marcenaria.com ou abra uma issue no GitHub.
