import mongoose, { Schema, Document } from 'mongoose';

export interface IRecording extends Document {
  roomName: string;
  officeId: string;
  egressId: string;
  filename: string;
  size: number;
  duration: number;
  recordedBy: string;
  status: 'recording' | 'processing' | 'ready' | 'failed';
  error?: string;
  createdAt: Date;
}

const RecordingSchema = new Schema<IRecording>({
  roomName:   { type: String, required: true },
  officeId:   { type: String, required: true },
  egressId:   { type: String, required: true },
  filename:   { type: String, default: '' },
  size:       { type: Number, default: 0 },
  duration:   { type: Number, default: 0 }, // seconds
  recordedBy: { type: String, required: true },
  status:     { type: String, enum: ['recording', 'processing', 'ready', 'failed'], default: 'recording' },
  error:      { type: String },
}, { timestamps: true });

export const Recording = mongoose.model<IRecording>('Recording', RecordingSchema);
