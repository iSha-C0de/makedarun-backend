// routes/journalRoutes.ts
import express, { Response } from "express";
import { protect } from "../middleware/authMiddleware";
import JournalEntry, { IJournalEntry } from "../models/Journal";
import { AuthenticatedRequest } from "../types/express";
import { Parser } from "json2csv";

const router = express.Router();

/**
 * -------------------- CREATE --------------------
 * Create a new journal entry (for the logged-in user)
 */
router.post("/", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      description,
      emoji,
      distance,
      pace,
      duration,
      location,
      coach_id,
    } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!title || !distance || !duration) {
      return res.status(400).json({
        message: "Title, distance, and duration are required",
      });
    }

    const newEntry: IJournalEntry = new JournalEntry({
      user: req.user._id,
      title,
      description,
      emoji: emoji || "😊",
      distance,
      pace,
      duration,
      location,
      coach: coach_id || null,
    });

    const saved = await newEntry.save();

    res.status(201).json({
      message: "Journal entry created successfully",
      data: saved,
    });
  } catch (error: any) {
    console.error("Create journal entry error:", error);
    res.status(500).json({
      message: "Failed to create journal entry",
      error: error.message,
    });
  }
});

/**
 * -------------------- READ (own journals) --------------------
 * Get the logged-in user's journal entries with pagination
 */
router.get("/", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      JournalEntry.find({ user: req.user._id })
        .populate("coach", "userName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      JournalEntry.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      message: "Journal entries retrieved successfully",
      data: entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get journal entries error:", error);
    res.status(500).json({
      message: "Failed to retrieve journal entries",
      error: error.message,
    });
  }
});

router.get("/export", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const entries = await JournalEntry.find({ user: req.user._id }).sort({ createdAt: -1 });

    if (!entries.length) {
      return res.status(404).json({ message: "No journal entries found" });
    }

    const fields = [
      "_id",
      "title",
      "description",
      "emoji",
      "distance",
      "pace",
      "duration",
      "location",
      "coachFeedback",
      "createdAt",
      "updatedAt",
    ];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(entries);

    res.header("Content-Type", "text/csv");
    res.attachment("journal_entries.csv");
    return res.send(csv);
  } catch (error: any) {
    console.error("Export journal entries error:", error);
    res.status(500).json({ message: "Failed to export journal entries", error: error.message });
  }
});

/**
 * -------------------- READ (journals by userId) --------------------
 * Get journal entries for a specific user (for coaches/admins)
 */
router.get("/:userId", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const entries = await JournalEntry.find({ user: userId })
      .populate("coach", "userName")
      .sort({ createdAt: -1 });

    res.json({
      message: "Journal entries retrieved successfully for user",
      data: entries,
    });
  } catch (error: any) {
    console.error("Get user journal entries error:", error);
    res.status(500).json({
      message: "Failed to retrieve journal entries",
      error: error.message,
    });
  }
});

/**
 * -------------------- UPDATE FEEDBACK --------------------
 * Add or update coach feedback for a journal entry
 */
router.put("/:entryId/feedback", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { entryId } = req.params;
    const { coachFeedback } = req.body;

    if (!coachFeedback || coachFeedback.trim() === "") {
      return res.status(400).json({ message: "Feedback text is required" });
    }

    const entry = await JournalEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    // update feedback + who gave it
    entry.coachFeedback = coachFeedback;
    entry.coach = req.user._id;
    entry.coachFeedbackDate = new Date();

    const updated = await entry.save();
    await updated.populate("coach", "userName");

    res.json({
      message: "Feedback added successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Update feedback error:", error);
    res.status(500).json({
      message: "Failed to add feedback",
      error: error.message,
    });
  }
});

export default router;
