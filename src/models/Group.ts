import mongoose, { Schema, Document, Types } from 'mongoose';

export interface GroupDocument extends Document {
  name: string;
  password: string;
  coach: Types.ObjectId; // Coach user ID
  members: Types.ObjectId[]; // Runner user IDs
  createdAt: Date;
  updatedAt: Date;
  _id: Types.ObjectId;
}

const groupSchema = new Schema<GroupDocument>({
  name: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  coach: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: true,
});

const Group = mongoose.model<GroupDocument>('Group', groupSchema);
export default Group;
