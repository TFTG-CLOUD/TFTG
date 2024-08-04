import { Schema, model, type InferSchemaType } from 'mongoose';

const VideoSchema = new Schema({
  title: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ["waiting", "transcoding", "finished", "error"],
    default: "waiting"
  },
  originalSize: { type: Number, required: true },
  afterSize: Number,
  dimensions: {
    width: { type: Number },
    height: { type: Number }
  },
  duration: { type: Number },
  notTranscoding: { type: Boolean, default: false },
  originalPath: { type: String, required: true },
  afterPath: String,
  transcodedPath: String, // path to the transcoded folder
  poster: String,
  thumbnail: String,
  screenshots: [String],
  previewVideo: String,
  metadata: Schema.Types.Mixed,
  errorMessage: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

VideoSchema.index({ title: 1 });
VideoSchema.index({ status: 1, notTranscoding: 1 });
VideoSchema.index({ duration: 1 });
VideoSchema.index({ createdAt: -1 });

VideoSchema.virtual('isTranscoded').get(function () {
  return this.status === 'finished';
});

export type Video = InferSchemaType<typeof VideoSchema>;
export const Video = model('Video', VideoSchema);