import express from "express";
import Slot from "../data/Slot.js";
import Club from "../data/Club.js";
import Signup from "../data/Signup.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// --- 1. Get slots for a specific Sheet (sheetId) ---
// Matches: store.searchSlot(sheetId)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { sheetId } = req.query;
    if (!sheetId) return res.status(400).json({ error: "sheetId required" });

    const slots = await Slot.find({ sheetId }).sort({ start: 1 });

    // Note: Pinia store expects { slotsList: [...] }
    res.json({ slotsList: slots });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

// --- 2. Create/Generate Slots (Leader/Admin) ---
// Matches: store.addOrEditSlot(...)
// routes/slot.js
router.post(
  "/",
  requireAuth,
  requireRole(["admin", "leader"]),
  async (req, res) => {
    try {
      const { sheetId, start, duration, maxMembers } = req.body;

      // 获取当前最大的 slotId
      const lastSlot = await Slot.findOne()
        .sort({ slotId: -1 })
        .select("slotId")
        .lean();
      let nextId = lastSlot ? lastSlot.slotId + 1 : 1;

      const newSlot = new Slot({
        slotId: nextId,
        sheetId: Number(sheetId),
        start: new Date(start),
        duration: Number(duration),
        maxMembers: Number(maxMembers),
        members: [],
      });

      await newSlot.save();
      res
        .status(201)
        .json({ message: "Slot created successfully", slot: newSlot });
    } catch (err) {
      res.status(500).json({ error: "Failed to create slot: " + err.message });
    }
  },
);

// --- 3. Delete a Slot ---
router.delete(
  "/",
  requireAuth,
  requireRole(["admin", "leader"]),
  async (req, res) => {
    try {
      const { slotId } = req.query;
      await Slot.findOneAndDelete({ slotId });
      res.json({ message: "Slot deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// --- 4. Get Members for a Slot (Grading) ---
router.get("/members", requireAuth, async (req, res) => {
  try {
    const { slotId } = req.query;
    const slot = await Slot.findOne({ slotId });
    if (!slot) return res.status(404).json({ error: "Slot not found" });

    // In a real app, you might want to .populate('members') to get names
    res.json({ members: slot.members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// routes/slot.js

router.get("/avaliable", requireAuth, async (req, res) => {
  try {
    const memberId = req.user.memberId; // Security: Use the JWT memberId
    const now = new Date();

    // 1. Find all Clubs/Organizations the member belongs to
    // We only need the clubId and categoryCode to find related sign-up sheets
    const clubs = await Club.find(
      { "memberList.memberId": memberId },
      // { clubId: 1, categoryCode: 1 },
    ).lean();

    console.log(JSON.stringify(clubs, null, 2));

    if (!clubs.length) {
      return res.json({
        message: "No clubs found for this member",
        avaliableSlot: [],
      });
    }

    // 2. Map clubs to a query format for Signup sheets
    const clubFilter = clubs.map((c) => ({
      clubId: c.clubId,
      categoryCode: c.category,
    }));
    // 3. Find all Sign-up Sheets for those clubs
    const sheets = await Signup.find({ $or: clubFilter }).lean();
    const sheetIds = sheets.map((s) => s.sheetId);

    // 4. Find all Slots belonging to those sheets
    const slots = await Slot.find({ sheetId: { $in: sheetIds } }).lean();

    // 5. Filter for "Actually Available"
    const available = slots.filter((slot) => {
      const startTime = new Date(slot.start);
      const endTime = new Date(startTime.getTime() + slot.duration * 60000);

      const isFuture = endTime > now; // Activity hasn't ended
      const isNotFull = slot.members.length < slot.maxMembers; // Still has room
      const notJoined = !slot.members.includes(memberId); // Student hasn't joined yet

      return isFuture && isNotFull && notJoined;
    });

    // 6. Combine Slot data with Sheet names (for the UI)
    const combined = available.map((slot) => {
      const sheet = sheets.find((s) => s.sheetId === slot.sheetId);
      return {
        ...slot,
        eventName: sheet?.eventName || "Unnamed Activity",
        openDate: sheet?.openDate,
        closeDate: sheet?.closeDate,
      };
    });

    // Sort by start time (soonest first)
    combined.sort((a, b) => new Date(a.start) - new Date(b.start));

    res.json({
      message: "Available slots retrieved successfully",
      avaliableSlot: combined,
    });
  } catch (err) {
    console.error("Error in /avaliable:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// GET /api/slot/memberslot?memberId=12345678
router.get("/memberslot", async (req, res) => {
  try {
    const { memberId } = req.query;

    if (!memberId) {
      return res.status(400).json({ error: "memberId is required" });
    }

    // 1. 查找所有包含该成员 ID 的 Slot
    const slots = await Slot.find({ members: memberId }).lean();

    if (!slots || slots.length === 0) {
      return res.status(200).json({ message: "No slots joined.", slot: [] });
    }

    // 2. 获取这些 Slot 对应的所有 SheetId (去重)
    const sheetIds = [...new Set(slots.map((s) => s.sheetId))];

    // 3. 查找对应的 Signup Sheet 信息，拿到活动名称
    const sheets = await Signup.find({ sheetId: { $in: sheetIds } }).lean();

    // 4. 将 Slot 数据和 Sheet 数据合并 (Manual Join)
    const combined = slots.map((slot) => {
      const sheet = sheets.find((s) => s.sheetId === slot.sheetId);
      return {
        slotId: slot.slotId,
        sheetId: slot.sheetId,
        start: slot.start,
        duration: slot.duration,
        maxMembers: slot.maxMembers,
        // 这里带上活动名称，前端 Table 才能显示
        eventName: sheet?.eventName || sheet?.assignmentName || "Unknown Event",
        clubId: sheet?.clubId || sheet?.termCode,
      };
    });

    res.status(200).json({
      message: "Member's slots retrieved successfully.",
      slot: combined, // 注意：这里的 Key 要和 Store 对应
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// POST /api/slot/signup
router.post("/signup", requireAuth, async (req, res) => {
  try {
    const { sheetId, slotId } = req.body;
    const memberId = req.user.memberId; // 🛡️ Security: Get ID from the verified JWT

    // 1. Basic Validation
    if (!sheetId || !slotId) {
      return res.status(400).json({ error: "Missing sheetId or slotId" });
    }

    // 2. Find the Slot
    const slot = await Slot.findOne({ slotId: Number(slotId) });
    if (!slot) {
      return res
        .status(404)
        .json({ error: "The requested time slot does not exist." });
    }

    // 3. Logic Check: Is it too late to sign up? (1-hour rule)
    const now = new Date();
    const startTime = new Date(slot.start);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    if (startTime < oneHourFromNow) {
      return res.status(400).json({
        error:
          "Registration closed. You cannot join within 1 hour of the start time.",
      });
    }

    // 4. Logic Check: Is the slot already full?
    if (slot.members.length >= slot.maxMembers) {
      return res.status(400).json({ error: "This slot is currently full." });
    }

    // 5. Logic Check: Is the user already in this specific slot?
    if (slot.members.includes(memberId)) {
      return res
        .status(400)
        .json({ error: "You are already registered for this slot." });
    }

    // 6. Optional: Check if user is in a DIFFERENT slot for the same sheet
    // (Prevents one student from hogging multiple times for the same assignment)
    const otherSlot = await Slot.findOne({
      sheetId: Number(sheetId),
      members: memberId,
    });
    if (otherSlot) {
      return res.status(400).json({
        error: "You have already joined a different time for this activity.",
      });
    }

    // 7. Success: Add the member and save
    slot.members.push(memberId);
    await slot.save();

    res.status(200).json({
      message: "Successfully signed up!",
      slot: slot,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error during signup." });
  }
});

// DELETE /api/slot/member
router.delete("/member", requireAuth, async (req, res) => {
  try {
    // 1. Get parameters from the URL query string
    const { slotId, memberId } = req.query;

    if (!slotId || !memberId) {
      return res.status(400).json({ error: "Missing slotId or memberId" });
    }

    // 2. Find the specific slot
    const slot = await Slot.findOne({ slotId: Number(slotId) });
    if (!slot) {
      return res.status(404).json({ error: "Slot not found" });
    }

    // 3. Logic Check: Cancellation Deadline (2-hour rule)
    // As a Software Engineer, it's good to prevent "no-shows" right before the event
    const now = new Date();
    const startTime = new Date(slot.start);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (startTime < twoHoursFromNow) {
      return res.status(400).json({
        error: "Cannot cancel within 2 hours of the start time.",
      });
    }

    // 4. Remove the member from the array
    // We use .filter() to create a new array without that specific ID
    const originalLength = slot.members.length;
    slot.members = slot.members.filter((id) => id !== memberId);

    // If the length didn't change, the member wasn't in the list
    if (slot.members.length === originalLength) {
      return res.status(404).json({ error: "Member not found in this slot" });
    }

    // 5. Save the changes
    await slot.save();

    res.status(200).json({
      message: "Successfully left the activity.",
      slot: slot,
    });
  } catch (err) {
    console.error("Delete member error:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
export default router;
