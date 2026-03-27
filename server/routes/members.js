import express from "express";
import Member from "../data/Member.js"; // Import the schema you just shared
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// --- 1. Create a Member (Admin Only) ---
// Use this in Postman: POST http://localhost:3000/api/members
// --- 1. Add or Edit Member (Upsert 逻辑) ---
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { memberId, firstName, lastName, role, action } = req.body;

    if (!memberId)
      return res.status(400).json({ error: "Member ID is required" });

    // 逻辑：如果 action 为 1 (Edit)，执行更新
    if (action === 1) {
      const updatedMember = await Member.findOneAndUpdate(
        { memberId: memberId }, // 查询条件
        { firstName, lastName, role }, // 更新内容
        { new: true }, // 返回更新后的对象
      );

      if (!updatedMember)
        return res.status(404).json({ error: "Member not found to edit" });

      return res.json({
        message: "Member updated successfully",
        member: updatedMember,
      });
    }

    // 逻辑：如果 action 为 0 (Add)，先检查是否存在，再创建
    const existing = await Member.findOne({ memberId });
    if (existing) {
      return res.status(400).json({ error: "Member ID already exists!" });
    }

    const newMember = await Member.create({
      memberId,
      firstName,
      lastName,
      role: role || "member",
    });

    res.status(201).json({
      message: "Member created successfully",
      member: newMember,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
// --- 2. Get All Members (For Leaders/Admins) ---
// Use this in Postman: GET http://localhost:3000/api/members
router.get("/", async (req, res) => {
  try {
    const members = await Member.find().sort({ lastName: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

export default router;
