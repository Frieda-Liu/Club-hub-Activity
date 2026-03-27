// server/data/Member.js
import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    // Unique 8-character ID (e.g., "20260001")
    memberId: {
      type: String,
      required: true,
      unique: true,
      minlength: 8,
      maxlength: 8,
      trim: true,
    },

    firstName: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },

    // Updated roles for the Club Hub logic
    role: {
      type: String,
      required: true,
      enum: ["admin", "leader", "member"],
      default: "member",
    },
  },
  {
    // Automatically creates 'createdAt' and 'updatedAt' fields
    timestamps: true,
  },
);

export default mongoose.model("Member", memberSchema);
