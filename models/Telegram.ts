import { Schema, model, type InferSchemaType } from 'mongoose';

const TelegramSchema = new Schema({
  TranscodingBotToken: { type: String, required: true },
  maxVideoDuration: { type: Number, required: true }, // Duatation can handle
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export type Telegram = InferSchemaType<typeof TelegramSchema>;
export const Telegram = model('Telegram', TelegramSchema);