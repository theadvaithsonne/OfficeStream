import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_STATUSES, USER_ROLES, type UserStatus, type UserRole } from '../lib/constants';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  googleId?: string;
  avatar?: string;
  status: UserStatus;
  officeId?: Types.ObjectId;
  role: UserRole;
  resetToken?: string;
  resetTokenExpiry?: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    googleId: { type: String },
    avatar: { type: String },
    status: { type: String, enum: USER_STATUSES, default: 'offline' },
    officeId: { type: Schema.Types.ObjectId, ref: 'Office' },
    role: { type: String, enum: USER_ROLES, default: 'member' },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    refreshTokens: { type: [String], default: [] },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(_doc: any, ret: any) {
    ret.password = undefined;
    ret.refreshTokens = undefined;
    ret.resetToken = undefined;
    ret.resetTokenExpiry = undefined;
    return ret;
  },
});

/** Returns true if the plain-text candidate matches the stored hashed password. */
userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
