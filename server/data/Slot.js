import mongoose from "mongoose";

//define slot
const slotSchema = new mongoose.Schema({
  slotId: { type: Number, unique: true },
  sheetId: { type: Number, required: true },
  start: { type: Date, required: true },
  duration: { type: Number, required: true, min: 1, max: 240 },
  // numSlots: { type: Number, required: true, min: 1, max: 99 },
  maxMembers: { type: Number, required: true, min: 1, max: 99 },
  members: [{ type: String, maxlength: 8 }], // member IDs who signed up
});

// // Auto-generate slotId before saving
slotSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastSlot = await this.constructor
      .findOne()
      .sort({ slotId: -1 })
      .select("slotId");
    this.slotId = lastSlot ? lastSlot.slotId + 1 : 1;
  }
  next();
});

export default mongoose.model("Slot", slotSchema);
