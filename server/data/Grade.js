import mongoose from "mongoose";
// Grade sub-schema
const gradeSchema = new mongoose.Schema(
  {
    memberId: { type: String, maxlength: 8, required: true },
    slotId: { type: Number, required: true },
    grade: { type: Number, required: true, min: 0, max: 99 },
    bonus: { type: Number, required: true, min: 0, max: 99 },
    penalty: { type: Number, required: true },
    comment: { type: String, required: true, maxlength: 500 },
    taId: { type: String, maxlength: 8, minlength: 8 },
    taFirstName: { type: String, maxlength: 200 },
    taLastName: { type: String, maxlength: 200 },
    gradeTime: { type: Date, default: null },
    gradeLog: [
      {
        logId: { type: Number },
        taId: { type: String, maxlength: 8, minlength: 8 },
        gradeTime: { type: Date, default: null },
      },
    ],
  },
  { default: [] }
);

export default mongoose.model("Grade", gradeSchema);
