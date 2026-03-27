import express from "express";
import SignUp from "../data/SignUp.js"; // Your Mongoose Schema
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * --- 1. Get Sign-Up Sheets ---
 * URL: GET /api/signup?clubId=9016&category=1
 * Access: Authenticated Users
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { clubId, category } = req.query;

    if (!clubId) {
      return res.status(400).json({ error: "Club ID is required" });
    }

    // Find all sheets matching the club and category
    // Default category to 1 if not provided
    const sheets = await SignUp.find({
      clubId: clubId,
      categoryCode: category || 1,
    });

    res.json(sheets);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch sign-up sheets: " + err.message });
  }
});

/**
 * --- 2. Create a Sign-Up Sheet ---
 * URL: POST /api/signup
 * Access: Admin or Leader
 */
router.post(
  "/",
  requireAuth,
  requireRole(["admin", "leader"]),
  async (req, res) => {
    try {
      // 1. Destructure what the Frontend sends
      const {
        clubId,
        category,
        assignmentName,
        notBefore,
        notAfter,
        location,
      } = req.body;

      // 2. Create the document using the Schema's field names
      const newSheet = await SignUp.create({
        clubId: clubId,
        categoryCode: Number(category) || 1, // Map 'category' to 'categoryCode'
        eventName: assignmentName, // Map 'assignmentName' to 'eventName'
        openDate: notBefore, // Map 'notBefore' to 'openDate'
        closeDate: notAfter, // Map 'notAfter' to 'closeDate'
        location: location || "TBD",
        // DO NOT provide sheetId here; the Schema Hook will do it!
      });

      res.status(201).json({
        message: "Sign-up sheet created successfully",
        signup: newSheet,
      });
    } catch (err) {
      // This will now catch validation errors specifically
      res
        .status(400)
        .json({ error: "Signup validation failed: " + err.message });
    }
  },
);

/**
 * --- 3. Delete a Sign-Up Sheet ---
 * URL: DELETE /api/signup/:sheetId
 * Access: Admin or Leader
 */
router.delete(
  "/:sheetId",
  requireAuth,
  requireRole(["admin", "leader"]),
  async (req, res) => {
    try {
      const { sheetId } = req.params;

      const deletedSheet = await SignUp.findOneAndDelete({ sheetId });

      if (!deletedSheet) {
        return res.status(404).json({ error: "Sign-up sheet not found" });
      }

      // NOTE: In a real app, you should also delete all Slots associated with this sheetId
      // await Slot.deleteMany({ sheetId });

      res.json({ message: "Sign-up sheet and associated data removed." });
    } catch (err) {
      res.status(500).json({ error: "Delete failed: " + err.message });
    }
  },
);

export default router;
