import mongoose, { Document, Schema } from 'mongoose';

export interface RunDocument extends Document {
  user: mongoose.Types.ObjectId;
  distance: number; // Distance in meters
  duration: number; // Duration in minutes
  date: Date;
  pace?: number; // Pace in km/h (kilometers per hour)
  location?: string; // Now stores "Start Location → End Location" format
  createdAt: Date;
  updatedAt: Date;
}

const runSchema = new Schema<RunDocument>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  distance: { 
    type: Number, 
    required: true,
    min: [10, 'Distance must be at least 10 meters'], // Updated minimum to 10 meters
    validate: {
      validator: function(v: number) {
        return v >= 10;
      },
      message: 'Distance must be at least 10 meters'
    }
  }, // Distance in meters
  duration: { 
    type: Number, 
    required: true,
    min: [0.01, 'Duration must be greater than 0'],
    validate: {
      validator: function(v: number) {
        return v > 0;
      },
      message: 'Duration must be greater than 0'
    }
  }, // Duration in minutes
  date: { type: Date, default: Date.now },
  pace: { 
    type: Number,
    validate: {
      validator: function(v: number) {
        return !v || (v >= 0.5 && v <= 15); // Realistic running pace range
      },
      message: 'Pace must be between 0.5 and 15 km/h for realistic running'
    }
  }, // Pace in km/h
  location: { 
    type: String,
    maxlength: [500, 'Location string cannot exceed 500 characters']
  }, // Location name in format "Start → End"
}, {
  timestamps: true,
});

// Add index for better query performance
runSchema.index({ user: 1, date: -1 });

const Run = mongoose.model<RunDocument>('Run', runSchema);
export default Run;