import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/config';
import { User } from '../models/User';
import { Service } from '../models/Service';
import { Quote } from '../models/Quote';
import { Chat, ChatMessage } from '../models/Chat';

const seedData = async () => {
  try {
    // Connect to database
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to database');

    // Check if data already exists to prevent data loss
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Users already exist in database. Skipping seed to prevent data loss.');
      return;
    }

    // Clear existing data (only if we validly decided to re-seed, though we returned above)
    // Commented out to be extra safe:
    // await User.deleteMany({});
    // await Service.deleteMany({});
    // await Quote.deleteMany({});
    // await Chat.deleteMany({});
    // await ChatMessage.deleteMany({});
    console.log('Starting seed process...');

    // Create users
    const hashedPassword = await bcrypt.hash('123456', 10);

    const users = [
      {
        name: 'João Silva',
        email: 'joao@email.com',
        password: hashedPassword,
        phone: '(11) 99999-9999',
        userType: 'client',
        address: {
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
        },
        totalServices: 12,
      },
      {
        name: 'Maria Santos',
        email: 'maria@email.com',
        password: hashedPassword,
        phone: '(11) 88888-8888',
        userType: 'client',
        address: {
          street: 'Av. Paulista, 1000',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-000',
        },
        totalServices: 8,
      },
      {
        name: 'Carlos Marceneiro',
        email: 'carlos@email.com',
        password: hashedPassword,
        phone: '(11) 77777-7777',
        userType: 'professional',
        address: {
          street: 'Rua Augusta, 500',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01305-000',
        },
        rating: 4.8,
        totalServices: 25,
        specialties: ['Reparo de portas', 'Instalação de móveis', 'Regulagem de armários'],
      },
      {
        name: 'Pedro Especialista',
        email: 'pedro@email.com',
        password: hashedPassword,
        phone: '(11) 66666-6666',
        userType: 'professional',
        address: {
          street: 'Rua Oscar Freire, 200',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01426-000',
        },
        rating: 4.9,
        totalServices: 30,
        specialties: ['Instalação de TV', 'Montagem de móveis', 'Reparo de gavetas'],
      },
      {
        name: 'Ana Profissional',
        email: 'ana@email.com',
        password: hashedPassword,
        phone: '(11) 55555-5555',
        userType: 'professional',
        address: {
          street: 'Rua Bela Cintra, 300',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01415-000',
        },
        rating: 4.7,
        totalServices: 18,
        specialties: ['Design de móveis', 'Restauração', 'Pintura de móveis'],
      },
      {
        name: 'Administrador',
        email: 'admin@email.com',
        password: hashedPassword,
        phone: '(11) 00000-0000',
        userType: 'admin',
        role: 'admin', // Garantindo que o role seja salvo corretamente
        address: {
          street: 'Sede Administrativa',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01000-000',
        },
      },
    ];

    const createdUsers = await User.insertMany(users);
    console.log('Created users:', createdUsers.length);

    // Create services
    const services = [
      {
        title: 'Instalação de Porta e TV',
        description: 'Eu preciso de um profissional para fazer uma instalação de uma TV de 55 na sala e instalar a porta do quarto.',
        category: 'instalacao',
        priority: 'medium',
        status: 'pending',
        address: {
          title: 'Casa Principal',
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
        },
        budget: { min: 300, max: 400 },
        clientId: createdUsers[0]._id,
        images: [],
      },
      {
        title: 'Reparo de Armário de Cozinha',
        description: 'Porta do armário quebrou e precisa de reparo. É um armário de madeira.',
        category: 'reparos',
        priority: 'high',
        status: 'pending',
        address: {
          title: 'Apartamento',
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-000',
        },
        budget: { min: 150, max: 250 },
        clientId: createdUsers[1]._id,
        images: [],
      },
      {
        title: 'Regulagem de Porta de Correr',
        description: 'Porta de correr do guarda-roupa não está deslizando bem, precisa de regulagem.',
        category: 'reparos',
        priority: 'low',
        status: 'pending',
        address: {
          title: 'Casa',
          street: 'Rua Augusta',
          number: '500',
          neighborhood: 'Consolação',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01305-000',
        },
        budget: { min: 80, max: 120 },
        clientId: createdUsers[0]._id,
        images: [],
      },
      {
        title: 'Montagem de Mesa de Escritório',
        description: 'Preciso montar uma mesa de escritório que comprei online. Vem com instruções.',
        category: 'moveis',
        priority: 'medium',
        status: 'pending',
        address: {
          title: 'Escritório',
          street: 'Rua Oscar Freire',
          number: '200',
          neighborhood: 'Jardins',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01426-000',
        },
        budget: { min: 100, max: 150 },
        clientId: createdUsers[1]._id,
        images: [],
      },
      {
        title: 'Reparo de Gaveta de Cômoda',
        description: 'A gaveta da cômoda não está abrindo direito, precisa de ajuste.',
        category: 'reparos',
        priority: 'low',
        status: 'pending',
        address: {
          title: 'Quarto',
          street: 'Rua Bela Cintra',
          number: '300',
          neighborhood: 'Jardins',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01415-000',
        },
        budget: { min: 60, max: 100 },
        clientId: createdUsers[0]._id,
        images: [],
      },
    ];

    const createdServices = await Service.insertMany(services);
    console.log('Created services:', createdServices.length);

    // Create quotes
    const quotes = [
      {
        serviceId: createdServices[0]._id,
        professionalId: createdUsers[2]._id,
        clientId: createdUsers[0]._id,
        title: 'Instalação de Porta e TV',
        description: 'Vou instalar a TV de 55 polegadas na sala com suporte articulado e instalar a porta do quarto com dobradiças novas. Trabalho com qualidade e garantia.',
        materials: [
          { name: 'Suporte articulado', quantity: 1, unit: 'unidade', price: 50 },
          { name: 'Dobradiças', quantity: 4, unit: 'unidade', price: 20 },
          { name: 'Parafusos', quantity: 20, unit: 'unidade', price: 10 }
        ],
        labor: {
          description: 'Instalação e montagem',
          hours: 4,
          pricePerHour: 50,
          total: 200
        },
        totalPrice: 350,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'pending',
        paymentStatus: 'pending',
      },
      {
        serviceId: createdServices[0]._id,
        professionalId: createdUsers[3]._id,
        clientId: createdUsers[0]._id,
        title: 'Instalação de Porta e TV',
        description: 'Instalação profissional da TV e porta. Inclui material de qualidade e limpeza do local após o serviço.',
        materials: [
          { name: 'Suporte premium', quantity: 1, unit: 'unidade', price: 80 },
          { name: 'Dobradiças de qualidade', quantity: 4, unit: 'unidade', price: 30 },
          { name: 'Ferramentas', quantity: 1, unit: 'caixa', price: 20 }
        ],
        labor: {
          description: 'Instalação profissional',
          hours: 3,
          pricePerHour: 60,
          total: 180
        },
        totalPrice: 380,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending',
        paymentStatus: 'pending',
      },
      {
        serviceId: createdServices[1]._id,
        professionalId: createdUsers[2]._id,
        clientId: createdUsers[1]._id,
        title: 'Reparo de Armário de Cozinha',
        description: 'Reparo do armário com material de qualidade. Vou trocar a dobradiça e ajustar o alinhamento.',
        materials: [
          { name: 'Dobradiças novas', quantity: 2, unit: 'unidade', price: 25 },
          { name: 'Cola para madeira', quantity: 1, unit: 'unidade', price: 15 },
          { name: 'Lixa', quantity: 2, unit: 'unidade', price: 10 }
        ],
        labor: {
          description: 'Reparo e ajuste',
          hours: 2,
          pricePerHour: 50,
          total: 100
        },
        totalPrice: 200,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'accepted',
        paymentStatus: 'pending',
      },
      {
        serviceId: createdServices[2]._id,
        professionalId: createdUsers[4]._id,
        clientId: createdUsers[0]._id,
        title: 'Regulagem de Porta de Correr',
        description: 'Regulagem completa da porta de correr. Vou limpar o trilho e ajustar as rodinhas.',
        materials: [
          { name: 'Lubrificante', quantity: 1, unit: 'unidade', price: 15 },
          { name: 'Rodinhas novas', quantity: 4, unit: 'unidade', price: 20 }
        ],
        labor: {
          description: 'Regulagem e limpeza',
          hours: 1,
          pricePerHour: 40,
          total: 40
        },
        totalPrice: 100,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'rejected',
        paymentStatus: 'pending',
      },
      {
        serviceId: createdServices[3]._id,
        professionalId: createdUsers[3]._id,
        clientId: createdUsers[1]._id,
        title: 'Montagem de Mesa de Escritório',
        description: 'Montagem profissional da mesa seguindo as instruções. Garantia de qualidade.',
        materials: [
          { name: 'Ferramentas necessárias', quantity: 1, unit: 'caixa', price: 0 }
        ],
        labor: {
          description: 'Montagem profissional',
          hours: 1.5,
          pricePerHour: 50,
          total: 75
        },
        totalPrice: 120,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending',
        paymentStatus: 'pending',
      },
    ];

    const createdQuotes = await Quote.insertMany(quotes);
    console.log('Created quotes:', createdQuotes.length);

    // Create chats
    const chats = [
      {
        serviceId: createdServices[0]._id,
        participants: [createdUsers[0]._id, createdUsers[2]._id],
      },
      {
        serviceId: createdServices[1]._id,
        participants: [createdUsers[1]._id, createdUsers[2]._id],
      },
    ];

    const createdChats = await Chat.insertMany(chats);
    console.log('Created chats:', createdChats.length);

    // Create messages
    const messages = [
      {
        chatId: createdChats[0]._id,
        senderId: createdUsers[2]._id,
        receiverId: createdUsers[0]._id,
        message: 'Olá! Vi seu serviço de instalação de TV e porta. Posso ajudar!',
        type: 'text',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        chatId: createdChats[0]._id,
        senderId: createdUsers[0]._id,
        receiverId: createdUsers[2]._id,
        message: 'Perfeito! Qual o valor que você cobra?',
        type: 'text',
        createdAt: new Date(Date.now() - 3000000), // 50 minutes ago
      },
      {
        chatId: createdChats[0]._id,
        senderId: createdUsers[2]._id,
        receiverId: createdUsers[0]._id,
        message: 'R$ 350,00 incluindo material e garantia de 3 meses.',
        type: 'text',
        createdAt: new Date(Date.now() - 2400000), // 40 minutes ago
      },
      {
        chatId: createdChats[1]._id,
        senderId: createdUsers[1]._id,
        receiverId: createdUsers[2]._id,
        message: 'Obrigado por aceitar meu orçamento! Quando podemos agendar?',
        type: 'text',
        createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
      },
    ];

    const createdMessages = await ChatMessage.insertMany(messages);
    console.log('Created messages:', createdMessages.length);

    console.log('Seed data created successfully!');
    console.log('\nTest accounts:');
    console.log('Client: joao@email.com / 123456');
    console.log('Professional: carlos@email.com / 123456');
    console.log('Professional: pedro@email.com / 123456');
    console.log('Professional: ana@email.com / 123456');
    console.log('Admin: admin@email.com / 123456');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

// Run seed if called directly
if (require.main === module) {
  seedData();
}

export { seedData };
