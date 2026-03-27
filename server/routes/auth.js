import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Login from "../data/Login.js";
import Member from "../data/Member.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

router.post("/login", async (req, res) => {
  try {
    const { memberId, password } = req.body;

    // 1. First, check if the person is even a Member at Western/Club Hub
    const memberDetail = await Member.findOne({ memberId });
    if (!memberDetail) {
      return res
        .status(401)
        .json({ error: "Member ID not recognized. Please contact an admin." });
    }

    // 2. Check if they have set up a Login account yet
    let loginInfo = await Login.findOne({ memberId });

    if (!loginInfo) {
      // --- FIRST LOGIN LOGIC ---
      console.log(
        `First time login for ${memberId}. Creating login credentials...`,
      );

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      loginInfo = await Login.create({
        memberId,
        password: hashedPassword,
        changePassword: false, // They just set it, so no need to change immediately
      });
    } else {
      // --- RETURNING USER LOGIC ---
      const isMatch = await bcrypt.compare(password, loginInfo.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid password" });
      }
    }

    // 3. Prepare JWT Payload
    const payload = {
      memberId: memberDetail.memberId,
      firstName: memberDetail.firstName,
      lastName: memberDetail.lastName,
      role: memberDetail.role || "member",
      changePassword: loginInfo.changePassword,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });

    res.json({
      message: "Login successful",
      member: payload,
      token,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { memberId } = req.user;

    const user = await Login.findOne({ memberId });
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.changePassword = false;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 3. Delete a Member (Admin Only) ---
// DELETE http://localhost:3000/api/auth?memberId=20260001
router.delete("/reset/:memberId", requireAuth, async (req, res) => {
  try {
    // Get from params instead of query
    const { memberId } = req.params;

    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required" });
    }

    const deleted = await Login.findOneAndDelete({ memberId });

    if (!deleted) {
      return res
        .status(404)
        .json({ error: "No login record found for this ID" });
    }

    res.json({
      message: `Login credentials for ${memberId} removed. User must re-activate.`,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

export default router;
