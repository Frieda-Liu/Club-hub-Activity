import express from "express";
import Signup from "../data/Signup.js"; // This is your new Event model
import Club from "../data/Club.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// --- 1. Get all events for a specific club ---
router.get("/", async (req, res) => {
  try {
    const { clubId, categoryCode } = req.query;
    let filter = {};
    if (clubId) filter.clubId = clubId;
    if (categoryCode) filter.categoryCode = categoryCode;

    const events = await Signup.find(filter).sort({ openDate: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// --- 2. Create a new event (Leader or Admin only) ---
router.post("/", requireAuth, async (req, res) => {
  try {
    const { clubId, eventName, categoryCode, location, openDate, closeDate } =
      req.body;

    // Check if club exists
    const club = await Club.findOne({ clubId });
    if (!club) return res.status(404).json({ error: "Club not found" });

    // Authorization: Only Admin or the Club Leader can post events
    if (req.user.role !== "admin" && req.user.memberId !== club.leaderId) {
      return res
        .status(403)
        .json({ error: "Only the club leader can create events" });
    }

    const newEvent = await Signup.create({
      clubId,
      eventName,
      categoryCode,
      location,
      openDate,
      closeDate,
    });

    res.status(201).json({ message: "Event published!", event: newEvent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
