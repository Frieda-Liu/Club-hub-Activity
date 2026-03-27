import mongoose from "mongoose";

const ClubSchema = new mongoose.Schema(
  {
    clubId: { type: String, required: true, unique: true },

    name: { type: String, required: true },

    category: { type: Number, required: true, default: 1 },

    description: { type: String, default: "Welcome to the club" },

    leaderId: { type: String },

    memberList: [
      {
        memberId: { type: String, required: true },
        firstName: String,
        lastName: String,
        role: { type: String, default: "member" }, // member, core, admin
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Club", ClubSchema);
