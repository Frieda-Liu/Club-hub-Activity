import mongoose from "mongoose";

const loginSchema = new mongoose.Schema({
  memberId: {
    type: String,
    required: true,
    unique: true,
    minlength: 8,
    maxlength: 8,
  },
  password: {
    type: String,
    required: true,
  },
  changePassword: {
    type: Boolean,
    default: true,
  },
});

export default mongoose.model("Login", loginSchema);
