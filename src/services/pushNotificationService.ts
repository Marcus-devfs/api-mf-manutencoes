import { PushToken, IPushTokenModel } from '../models/PushToken';
import { User } from '../models/User';
import { IChatMessage, IPushToken } from '../types';

interface ExpoNotificationPayload {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: any;
  badge?: number;
  channelId?: string;
}

export class PushNotificationService {
  // Enviar notificação para um token específico
  static async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: any,
    badge?: number
  ): Promise<boolean> {
    try {
      const payload: ExpoNotificationPayload = {
        to: token,
        sound: 'default',
        title,
        body,
        data,
        badge
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json() as any;
      
      if (result.data && result.data[0] && result.data[0].status === 'error') {
        console.error('Erro ao enviar notificação:', result.data[0].message);
        
        // Se o token é inválido, desativar
        if (result.data[0].details?.error === 'DeviceNotRegistered') {
          await this.deactivateToken(token);
        }
        
        return false;
      }

      console.log('✅ Notificação enviada com sucesso:', result);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar notificação push:', error);
      return false;
    }
  }

  // Enviar notificação para múltiplos tokens
  static async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: any,
    badge?: number
  ): Promise<{ success: number; failed: number }> {
    if (tokens.length === 0) {
      return { success: 0, failed: 0 };
    }

    try {
      const payload = {
        to: tokens,
        sound: 'default',
        title,
        body,
        data,
        badge
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json() as any;
      
      let success = 0;
      let failed = 0;

      if (result.data) {
        for (const receipt of result.data) {
          if (receipt.status === 'error') {
            failed++;
            console.error('Erro ao enviar notificação:', receipt.message);
            
            // Desativar tokens inválidos
            if (receipt.details?.error === 'DeviceNotRegistered') {
              await this.deactivateToken(receipt.details.expoPushToken);
            }
          } else {
            success++;
          }
        }
      }

      console.log(`📤 Notificações enviadas: ${success} sucesso, ${failed} falhas`);
      return { success, failed };
    } catch (error) {
      console.error('❌ Erro ao enviar notificações push:', error);
      return { success: 0, failed: tokens.length };
    }
  }

  // Enviar notificação para um usuário específico
  static async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: any,
    badge?: number
  ): Promise<{ success: number; failed: number }> {
    try {
      const tokens = await PushToken.find({ userId, isActive: true });
      const tokenStrings = tokens.map((t: any) => t.token);
      
      if (tokenStrings.length === 0) {
        console.log(`⚠️ Nenhum token ativo encontrado para o usuário ${userId}`);
        return { success: 0, failed: 0 };
      }

      return await this.sendToTokens(tokenStrings, title, body, data, badge);
    } catch (error) {
      console.error('❌ Erro ao enviar notificação para usuário:', error);
      return { success: 0, failed: 0 };
    }
  }

  // Enviar notificação de chat
  static async sendChatNotification(
    receiverId: string,
    senderName: string,
    message: string,
    chatId: string,
    serviceTitle?: string
  ): Promise<boolean> {
    try {
      const title = `Nova mensagem de ${senderName}`;
      const body = message.length > 100 ? `${message.substring(0, 100)}...` : message;
      const data = {
        type: 'chat',
        chatId,
        senderName,
        serviceTitle: serviceTitle || 'Serviço'
      };

      const result = await this.sendToUser(receiverId, title, body, data);
      return result.success > 0;
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de chat:', error);
      return false;
    }
  }

  // Registrar token de push
  static async registerToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceInfo?: any
  ): Promise<IPushTokenModel> {
    try {
      // Desativar tokens antigos do mesmo usuário
      await PushToken.updateMany(
        { userId, token: { $ne: token } },
        { isActive: false }
      );

      // Verificar se o token já existe
      let pushToken = await PushToken.findOne({ token, isActive: true });
      
      if (pushToken) {
        // Atualizar token existente
        pushToken.userId = userId;
        pushToken.platform = platform;
        pushToken.isActive = true;
        pushToken.deviceInfo = deviceInfo;
        pushToken.updatedAt = new Date();
        await pushToken.save();
      } else {
        // Criar novo token
        pushToken = new PushToken({
          userId,
          token,
          platform,
          deviceInfo,
          isActive: true
        });
        await pushToken.save();
      }

      console.log(`📱 Token de push registrado para usuário ${userId}`);
      return pushToken;
    } catch (error) {
      console.error('❌ Erro ao registrar token de push:', error);
      throw error;
    }
  }

  // Desativar token
  static async deactivateToken(token: string): Promise<void> {
    try {
      await PushToken.updateOne({ token }, { isActive: false });
      console.log(`📱 Token desativado: ${token}`);
    } catch (error) {
      console.error('❌ Erro ao desativar token:', error);
    }
  }

  // Desativar todos os tokens de um usuário
  static async deactivateUserTokens(userId: string): Promise<void> {
    try {
      await PushToken.updateMany({ userId }, { isActive: false });
      console.log(`📱 Todos os tokens do usuário ${userId} foram desativados`);
    } catch (error) {
      console.error('❌ Erro ao desativar tokens do usuário:', error);
    }
  }

  // Obter contagem de mensagens não lidas para badge
  static async getUnreadCountForBadge(userId: string): Promise<number> {
    try {
      // Aqui você pode implementar a lógica para contar mensagens não lidas
      // Por enquanto, retornamos 0
      return 0;
    } catch (error) {
      console.error('❌ Erro ao obter contagem de mensagens não lidas:', error);
      return 0;
    }
  }
}
