import mongoose, { Document, Schema, Types } from 'mongoose';

// ✅ Interface using plain TypeScript types
export interface UserDocument extends Document {
  _id: Types.ObjectId;
  userName: string;
  password: string;
  role: 'runner' | 'coach' | 'admin';
  goal: number;
  emailAdd?: string;
  contactNum?: string;
  address?: string;
  group?: string;
  progress: number;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Mongoose schema using proper Mongoose syntax
const userSchema = new Schema<UserDocument>({
  userName: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['runner', 'coach', 'admin'], required: true },
  goal: { type: Number, default: 1 },
  emailAdd: { type: String },
  contactNum: { type: String },
  address: { type: String },
  group: { type: String, default: undefined },
  progress: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: false }, 
}, {
  timestamps: true,
});

// ✅ Export both the model and the type
const User = mongoose.model<UserDocument>('User', userSchema);
export { User };
export default User;
