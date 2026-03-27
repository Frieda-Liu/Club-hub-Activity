import mongoose from "mongoose";

const signupSchema = new mongoose.Schema(
  {
    sheetId: { type: Number, unique: true },
    clubId: { type: String, required: true },
    eventName: { type: String, required: true, maxlength: 100 },
    categoryCode: { type: Number, required: true, min: 1, max: 9999 },
    location: { type: String, default: "TBD", maxlength: 200 },
    openDate: { type: Date, default: null },
    closeDate: { type: Date, default: null },
  },
  { timestamps: true },
);

signupSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const lastSheet = await this.constructor
        .findOne()
        .sort({ sheetId: -1 })
        .select("sheetId")
        .lean();

      this.sheetId = (lastSheet?.sheetId || 0) + 1;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// Safeguard against OverwriteModelError
const Signup = mongoose.models.Signup || mongoose.model("Signup", signupSchema);
export default Signup;
