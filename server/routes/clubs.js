import express from "express";
import Club from "../data/Club.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// --- 1. Get Club List ---
router.get("/", async (req, res) => {
  try {
    const { clubId, category } = req.query;

    const clubs = await Club.find({ clubId, category });
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch club registry" });
  }
});

// --- 2. Create New Club (Admin Only) ---
// Simplified: Only requires ID and Name
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { clubId, name, category, description } = req.body;

    // Validation: only core identity fields
    if (!clubId || !name) {
      return res.status(400).json({ error: "Club ID and Name are required" });
    }

    const existing = await Club.findOne({ clubId });
    if (existing) {
      return res
        .status(400)
        .json({ error: "This Club ID is already registered" });
    }

    const newClub = await Club.create({
      clubId,
      name,
      category: category || 1,
      description: description || "",
      leaderId: "", // Set to empty string; to be assigned later by Admin
    });

    res.status(201).json({
      message: "Club created successfully",
      club: newClub,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 3. Manage Roster ---
router.post("/member", requireAuth, async (req, res) => {
  try {
    const { clubId, memberId, firstName, lastName, action, memberList, mode } =
      req.body;

    const club = await Club.findOne({ clubId: clubId });
    if (!club) return res.status(404).json({ error: "Club not found" });

    // Permission Logic:
    // If no leader is assigned yet, ONLY an Admin can manage the roster.
    // If a leader IS assigned, both Admin and Leader can manage it.
    const isAuthorized =
      req.user.role === "admin" ||
      (club.leaderId && req.user.memberId === club.leaderId);

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Unauthorized: You do not have permission to manage this roster",
      });
    }

    if (mode === 1 && Array.isArray(memberList)) {
      if (action === 0) {
        memberList.forEach((m) => {
          const exists = club.memberList.some(
            (em) => em.memberId === m.memberId,
          );
          if (!exists) club.memberList.push(m);
        });
      }
    } else {
      if (action === 0) {
        const exists = club.memberList.some((m) => m.memberId === memberId);
        if (exists)
          return res.status(400).json({ error: "Member already enrolled" });
        club.memberList.push({ memberId, firstName, lastName });
      } else if (action === 1) {
        club.memberList = club.memberList.filter(
          (m) => m.memberId !== memberId,
        );
      }
    }

    await club.save();
    res.json({ message: "Roster updated", memberList: club.memberList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. Get Roster ---
router.get("/member", requireAuth, async (req, res) => {
  try {
    const { clubId } = req.query;
    const club = await Club.findOne({ clubId: clubId });

    if (!club) return res.status(404).json({ error: "Club not found" });

    // Same authorization logic as above
    const isAuthorized =
      req.user.role === "admin" ||
      (club.leaderId && req.user.memberId === club.leaderId);

    if (!isAuthorized) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ memberList: club.memberList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clubs/student?memberId=12345678
// GET /api/clubs/student?memberId=frieda11
router.get("/student", requireAuth, async (req, res) => {
  try {
    const { memberId } = req.query;

    if (!memberId) {
      return res.status(400).json({ error: "memberId is required" });
    }

    const enrolledClubs = await Club.find({
      "memberList.memberId": memberId,
    }).lean();

    res.status(200).json(enrolledClubs);
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
export default router;
