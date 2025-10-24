import { Schema, model, Document, Types } from "mongoose";

// Define the TypeScript interface for the document
export interface IJournalEntry extends Document {
  user: Types.ObjectId; // reference to User
  title: string;
  description?: string;
  emoji: string;
  distance: number; // in meters
  pace?: number; // in km/h
  duration: number; // in seconds
  location?: string;
  coachFeedback?: string;
  coach?: Types.ObjectId; // reference to User (coach)
  coachFeedbackDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema
const journalEntrySchema = new Schema<IJournalEntry>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 255,
    },
    description: {
      type: String,
    },
    emoji: {
      type: String,
      default: "😊",
      maxlength: 10,
    },
    distance: {
      type: Number,
      required: true,
      min: 0,
    },
    pace: {
      type: Number,
      min: 0,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      type: String,
    },
    coachFeedback: {
      type: String,
    },
    coach: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    coachFeedbackDate: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Indexes
journalEntrySchema.index({ user: 1 }); // idx_journal_user_id
journalEntrySchema.index({ createdAt: -1 }); // idx_journal_created_at
journalEntrySchema.index(
  { coach: 1 },
  { partialFilterExpression: { coachFeedback: { $exists: true, $ne: null } } }
); // idx_journal_coach_feedback

// Create the model
const JournalEntry = model<IJournalEntry>("JournalEntry", journalEntrySchema);

export default JournalEntry;
