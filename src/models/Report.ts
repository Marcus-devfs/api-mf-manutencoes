import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  _id: string;
  reporterId: string;
  reportedUserId: string;
  chatId?: string;
  messageId?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>({
  reporterId: {
    type: String,
    required: true,
    ref: 'User',
    index: true,
  },
  reportedUserId: {
    type: String,
    required: true,
    ref: 'User',
    index: true,
  },
  chatId: {
    type: String,
    ref: 'Chat',
    default: null,
  },
  messageId: {
    type: String,
    ref: 'ChatMessage',
    default: null,
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'inappropriate_content',
      'scam',
      'other',
    ],
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

reportSchema.index({ reporterId: 1, reportedUserId: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);
