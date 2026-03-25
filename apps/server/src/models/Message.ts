import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  from: string;
  to: string;   // userId for DMs
  content: string;
  type: 'text' | 'file';
  read: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    from:    { type: String, required: true, index: true },
    to:      { type: String, required: true, index: true },
    content: { type: String, required: true },
    type:    { type: String, enum: ['text', 'file'], default: 'text' },
    read:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for fast conversation queries
MessageSchema.index({ from: 1, to: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
