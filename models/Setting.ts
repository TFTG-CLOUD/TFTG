import { Schema, model, type InferSchemaType } from 'mongoose';

const SettingSchema = new Schema({
  resolution: {
    type: String,
    required: true,
    enum: ['480p', '720p', '1080p', '4K'] // 可根据需求调整
  },
  bitrate: {
    type: Number,
    required: true,
    min: 0
  },
  frameRate: {
    type: Number,
    required: true,
    min: 0
  },
  generatePreviewVideo: {
    type: Boolean,
    default: false
  },
  watermarkImage: {
    type: String, // 存储图片路径或URL
    default: null
  },
  watermarkPosition: {
    type: String,
    enum: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
    default: 'bottomRight'
  },
  screenshotCount: {
    type: Number,
    default: 0,
    min: 0
  },
  previewVideoSize: {
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },
  posterSize: {
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },
  generateThumbnailMosaic: {
    type: Boolean,
    default: false
  }
});

export type Setting = InferSchemaType<typeof SettingSchema>;
export const Setting = model('Setting', SettingSchema);