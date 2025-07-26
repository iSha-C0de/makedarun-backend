import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  action: { type: String, required: true }, // create, update, delete
  performedBy: { type: String, required: true }, // userName or userId
  role: { type: String, required: true }, // admin/coach/etc
  targetUserId: { type: String, required: false },
  details: { type: Object, required: false },
  timestamp: { type: Date, default: Date.now },
},{ timestamps: true });

const Audit = mongoose.model('Audit', auditSchema);
export default Audit;
