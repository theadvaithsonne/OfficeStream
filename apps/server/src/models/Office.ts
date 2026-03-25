import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInviteCode {
  code: string;
  createdBy: Types.ObjectId;
  expiresAt?: Date;
  uses: number;
  maxUses?: number;
}

export interface IOffice extends Document {
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  members: Types.ObjectId[];
  inviteCodes: IInviteCode[];
  maxRoomParticipants: number;
  createdAt: Date;
  updatedAt: Date;
}

const inviteCodeSchema = new Schema<IInviteCode>(
  {
    code: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date },
    uses: { type: Number, default: 0 },
    maxUses: { type: Number },
  },
  { _id: false }
);

const officeSchema = new Schema<IOffice>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    inviteCodes: { type: [inviteCodeSchema], default: [] },
    maxRoomParticipants: { type: Number, default: 100 },
  },
  { timestamps: true }
);

export const Office = mongoose.model<IOffice>('Office', officeSchema);
