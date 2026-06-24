import mongoose from 'mongoose';
import { config } from '../config/config';
import { User } from '../models/User';

const email = process.argv[2] || 'admin@email.com';
const newPassword = process.argv[3] || '123456';

async function resetPassword() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Conectado ao banco de dados');

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`Usuário não encontrado: ${email}`);
      process.exit(1);
    }

    user.password = newPassword;
    await user.save();

    console.log(`Senha redefinida com sucesso para ${email}`);
    console.log(`Nova senha: ${newPassword}`);
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword();
