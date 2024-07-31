import { Schema, model, type InferSchemaType } from 'mongoose';

const UserSchema = new Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  username: { type: String, required: true },
  telegramId: { type: Number },
  avatarUrl: { type: String, default: '/static/avatars/000f.jpg' },
  type: {
    type: String,
    enum: ["user", "operator", "admin"],
    default: "user"
  },
  isAuthenticated: {
    type: Boolean,
    default: false // 默认设置为未认证，认证通过用于博主认证和企业认证，获取发布需求的能力。
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ telegramId: 1 });
UserSchema.index({ type: 1 });
UserSchema.index({ createdAt: -1 });
export type User = InferSchemaType<typeof UserSchema>;
export const User = model('User', UserSchema);