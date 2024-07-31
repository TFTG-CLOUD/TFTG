import { Schema, model, type InferSchemaType } from 'mongoose';

const TelegramMessageSchema = new Schema({
  chatId: { type: Number, required: true },
  messageId: { type: Number, required: true },
  videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TelegramMessageSchema.index({ chatId: 1 });
TelegramMessageSchema.index({ messageId: 1 });
TelegramMessageSchema.index({ videoId: 1 });

export type TelegramMessage = InferSchemaType<typeof TelegramMessageSchema>;
export const TelegramMessage = model('TelegramMessage', TelegramMessageSchema);