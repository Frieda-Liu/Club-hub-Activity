// server/server.js
import express from "express"; //load express
import mongoose from "mongoose"; // mangodb
import path from "path";
import { fileURLToPath } from "url";
import Club from "./data/Club.js";
import Grade from "./data/Grade.js";
import Slot from "./data/Slot.js";
import Signup from "./data/Signup.js";
import Login from "./data/Login.js";
import Member from "./data/Member.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const app = express(); //call

const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors()); // allow requests from your Vue dev server
// Parse JSON bodies
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB Atlas
const uri =
  "mongodb+srv://frieda1:Lsy19980315!@lab3.hrhuswu.mongodb.net/?retryWrites=true&w=majority&appName=lab3";

// Connect to MongoDB
mongoose
  .connect(uri, { dbName: "myApp" })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

//valide termCode input
//undefine allow "", 0 , null
function validatetion(termCode, section, courseName, memberList, memberListD) {
  //validatetion termCode, section, courseName,
  //validatetion memberList when add member
  //validatetion memberListD (onlu contain member ID) when delete member
  if (termCode !== undefined) {
    const codeNum = Number(termCode);
    if (isNaN(codeNum) || codeNum < 1 || codeNum > 9999) {
      return "Invalid termCode. Must be a number between 1 and 9999.";
    }
  }
  if (section !== undefined) {
    const codeNum = Number(section);
    if (isNaN(codeNum) || codeNum < 1 || codeNum > 9999) {
      return "Invalid section. Must be a number between 1 and 99.";
    }
  }
  if (courseName !== undefined) {
    if (typeof courseName !== "string" || courseName.length > 100) {
      return "Invalid course name. Must be a text string and cannot exceed 100 characters.";
    }
  }
  if (memberList !== undefined) {
    console.log(memberList);
    for (const member of memberList) {
      const { memberId, firstName, lastName } = member;

      if (!memberId || memberId.length != 8) {
        return (
          "Invaild memberID: " +
          memberId +
          " Must be a text string and 8 characters."
        );
      }
      if (!firstName || firstName.length > 200) {
        return (
          "Invaild first name: " +
          firstName +
          " Must be a text string and cannot exceed 200 characters."
        );
      }
      if (!lastName || lastName.length > 200) {
        return (
          "Invaild last name: " +
          lastName +
          " Must be a text string and cannot exceed 200 characters."
        );
      }

      // if (!role || role.length > 10) {
      //   return (
      //     "Invaild role: " +
      //     role +
      //     " Must be a text string and cannot exceed 10 characters."
      //   );
      // }
    }
  }
  if (memberListD !== undefined) {
    for (const member of memberListD) {
      const { memberId } = member;
      if (!memberId || memberId.length != 8) {
        return (
          "Invaild memberID: " +
          memberId +
          " Must be a text string and 8 characters."
        );
      }
    }
  }
  return false;
}
//check if user logged in
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // now you have req.user.memberId, req.user.role, etc.
    next();
  } catch (err) {
    console.error("JWT error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
//check if user is ta or admin
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (role) {
      if (req.user.role.toLowerCase() !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
    } else {
      if (
        req.user.role.toLowerCase() !== "ta" &&
        req.user.role.toLowerCase() !== "admin"
      ) {
        return res.status(403).json({ error: "Not authorized" });
      }
    }

    next();
  };
}

// --- POST /add courses ---
app.post(
  "/courses",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      const { termCode, courseName, section = 1 } = req.body;

      if (!termCode || !courseName) {
        return res
          .status(400)
          .json({ error: "Term code and Club Name is required!" });
      }

      const vaild = validatetion(termCode, section, courseName);

      // Input validation
      if (vaild) {
        return res.status(400).json({ error: vaild });
      }
      //
      const existing = await Club.findOne({ termCode, section });
      if (existing) {
        return res.status(400).json({
          error: "Club already exists for that term and section.",
        });
      }

      const newClub = await Club.create({
        termCode,
        courseName,
        section,
      });
      return res.status(201).json({
        message: "Club created successfully.",
        course: newClub,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);
// --- POST /modify courses ---
app.post(
  "/courses/edit",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      const {
        oldTermCode,
        oldSection,
        termCode,
        section = 1,
        courseName,
      } = req.body;

      // Basic validation
      if (!oldTermCode || !oldSection) {
        return res
          .status(400)
          .json({ error: "Original termCode and section are required." });
      }

      if (!courseName) {
        return res
          .status(400)
          .json({ error: "courseName is required to modify." });
      }

      // 1) Find the existing course (the one we are editing)
      const existing = await Club.findOne({
        termCode: oldTermCode,
        section: oldSection,
      });

      if (!existing) {
        return res.status(404).json({
          error: "No course found for that original term and section.",
        });
      }

      // 2) Check if there is a signup sheet attached to THIS course
      const existingSignUp = await Signup.exists({
        termCode: oldTermCode,
        section: oldSection,
      });

      // Determine if user is trying to change termCode/section
      const isChangingKey =
        Number(termCode) !== Number(oldTermCode) ||
        Number(section) !== Number(oldSection);

      // 3) If there is a signup, only allow courseName change
      if (existingSignUp && isChangingKey) {
        return res.status(400).json({
          error:
            "This course has a signup sheet; only the course name can be changed.",
        });
      }

      // 4) If no signup and key is changing, check for duplicates
      if (isChangingKey) {
        const existingNew = await Club.findOne({
          termCode,
          section,
        });

        if (existingNew) {
          return res.status(400).json({
            error:
              "Club already exists for term " +
              termCode +
              " and section " +
              section,
          });
        }
      }

      // 5) Apply changes
      existing.courseName = courseName;

      if (!existingSignUp && isChangingKey) {
        existing.termCode = termCode;
        existing.section = section;
      }

      await existing.save();

      return res.status(200).json({
        message: "Club updated successfully.",
        course: existing,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);

// --- GET /courses ---
app.get("/courses", async (req, res) => {
  try {
    const { termCode, section = 1 } = req.query;

    // Check if course exists
    let courses;
    if (termCode && section) {
      // Search by both termCode and section
      courses = await Club.find({ termCode, section });
    } else if (termCode) {
      // Search by termCode only
      courses = await Club.find({ termCode });
    } else {
      // If no parameters provided, return all courses
      courses = await Club.find();
    }
    if (courses.length === 0) {
      return res.status(404).json({ error: "No courses found." });
    }

    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// --- DELETE/courses ---
app.delete(
  "/courses",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      const { termCode, section = 1 } = req.query;
      // Input validation
      if (!termCode) {
        return res.status(400).json({ error: "termCode are required." });
      }

      const vaild = validatetion(termCode, section);
      // Input validation
      if (vaild) {
        return res.status(400).json({ error: vaild });
      }
      // Build the query dynamically
      const query = { termCode };
      if (section) {
        query.section = section; // Only include section if provided
      }
      const hasClub = await Club.findOne({ termCode, section });
      if (!hasClub) {
        return res.status(404).json({ error: "Club not found!" });
      }
      const hasSignUp = await Signup.findOne({ termCode, section });
      if (hasSignUp) {
        return res.status(400).json({
          error: "Club cannot delete. Its come with Sign UP sheet!",
        });
      }
      // Delete matching course
      const result = await Club.deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Club not found!" });
      }
      res.json({ message: "Club deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
// --- GET /courses ---
app.get("/courses/student", async (req, res) => {
  try {
    const { memberId } = req.query;

    const courses = await Club.find({
      "memberList.memberId": memberId,
    });

    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

////////////
//Member////
////////////
// --- POST /add/delete courses member---
app.post(
  "/courses/member",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      const {
        termCode,
        section = 1,
        memberList = [],
        memberId,
        firstName,
        lastName,
        role = "student",
        action = 0,
        mode = 0,
      } = req.body;
      // action 0 = add, 1 = delete
      //mode = 0 when adding just one , mode = 1 when adding a lot
      const memberListOne = {
        memberId: memberId,
        firstName: firstName,
        lastName: lastName,
        role: role,
      };
      console.log(memberList);
      // Input validation
      if (!termCode || !section) {
        return res
          .status(400)
          .json({ error: "termCode and section are required." });
      }
      let notVaild;
      //when adding the course
      if (action == 0 && mode == 1) {
        notVaild = validatetion(
          termCode,
          section,
          undefined,
          memberList,
          undefined,
        );
      }
      if (action == 0 && mode == 0) {
        notVaild = validatetion(
          termCode,
          section,
          undefined,
          [memberListOne],
          undefined,
        );
      }
      if (action == 1) {
        //when course already existing,and add member need validate the member
        notVaild = validatetion(
          termCode,
          section,
          undefined,
          undefined,
          memberList,
        );
      }
      if (notVaild) {
        return res.status(400).json({ error: notVaild });
      }
      //finding if course is exists or not
      const existing = await Club.findOne({ termCode, section });
      if (!existing) {
        return res
          .status(404)
          .json({ error: "No course found for that term and section." });
      }
      // ===== ADD Member =====
      if (action == 0) {
        if (mode == 0) {
          const memberExisted = existing.memberList?.some(
            (m) => m.memberId === memberId,
          );
          if (memberExisted) {
            return res.status(400).json({ error: "Member already existed!" });
          }
          existing.memberList.push(memberListOne);
          await existing.save();
        }
        //check if member is already exists
        //if exists then pass adding another one
        else {
          for (const member of memberList) {
            const { memberId, firstName, lastName } = member;
            const alreadyExists = existing.memberList?.some(
              (m) => m.memberId === memberId,
            );

            if (alreadyExists) {
              continue;
            }
            existing.memberList.push({
              memberId: memberId,
              firstName: firstName,
              lastName: lastName,
              role: "student",
            });
            await existing.save();
          }
        }
        return res.status(200).json({
          message: "Members processed successfully.",
          course: existing,
        });
      }
      // ===== delete member =====
      else if (action == 1) {
        const signUps = await Signup.find({ termCode, section }).lean();

        // Get all sheetIds this member might have signed up for
        const sheetIds = signUps.map((s) => s.sheetId);

        // Look for any Slot where this memberId already exists
        const existing = await Slot.findOne({
          sheetId: { $in: sheetIds },
          members: memberId,
        });

        if (existing) {
          return res
            .status(400)
            .json({ error: "Member already sign up slot!" });
        }
        // const memberIds = memberList.map((m) => m.memberId);
        const result = await Club.updateOne(
          { termCode, section },
          { $pull: { memberList: { memberId: { $in: memberId } } } },
        );
        if (result.modifiedCount === 0) {
          return res.status(404).json({
            error: "No matching members found to delete.",
          });
        }
        return res.status(200).json({
          message: `${memberId}  deleted.`,
        });
      }

      // ===== UNKNOWN ACTION =====
      else {
        return res.status(400).json({ error: "Invalid action。 " });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);
//-- Get get member list
app.get("/courses/member", async (req, res) => {
  try {
    const { termCode, section = 1 } = req.query;
    const notVaild = validatetion(termCode, section);
    if (notVaild) {
      return res.status(400).json({ error: notVaild });
    }
    // Input validation
    if (!termCode || !section) {
      return res
        .status(400)
        .json({ error: "termCode and section are required." });
    }
    const course = await Club.findOne({ termCode, section });
    if (!course) {
      return res
        .status(404)
        .json({ message: "No course found for that term and section." });
    }
    // Return the member list
    return res.status(200).json({
      message: "Member list retrieved successfully.",
      memberList: course.memberList,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

////////////
//signup////
////////////
//POST Creat signup sheet
app.post(
  "/signup",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      const {
        termCode,
        section = 1,
        assignmentName,
        notBefore,
        notAfter,
      } = req.body; //get request body
      //check request field
      if (!termCode || !section || !assignmentName) {
        return res.status(400).json({
          error: "termCode,section and assignment name are required.",
        });
      }
      //check termCode and section
      const notVaild = validatetion(termCode, section);
      if (notVaild) {
        return res.status(400).json({ error: notVaild }); //return if not vaild
      }
      if (assignmentName.length > 100) {
        return res.status(400).json({
          error: "Invaild assignment name. Must not exceed 100 character!!",
        });
      }
      //check if the course is exists
      const existing = await Club.findOne({ termCode, section });
      if (!existing) {
        return res
          .status(404)
          .json({ message: "No course found for that term and section." });
      }
      //find if the signup sheet already exists
      const signup = await Signup.findOne({ assignmentName });
      if (signup) {
        return res.status(400).json({
          error: assignmentName + " Signup sheet name already exists .",
        });
      }
      //creat new signup sheet
      const newSignUp = await Signup.create({
        termCode,
        section,
        assignmentName,
        notBefore,
        notAfter,
      });

      return res.status(201).json({
        message: "Sign up sheet created successfully.",
        signup: newSignUp,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);
//delete signup
app.delete(
  "/signup",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      //get sheetId to delete sheet
      const { sheetId } = req.query;
      //check if the sheet is vaild
      if (!sheetId || isNaN(Number(sheetId))) {
        return res.status(400).json({
          error: "Sign up sheet ID are required and must be the vaild number.",
        });
      }

      const signUps = await Signup.find({ sheetId }).lean();
      if (!signUps) {
        return res.status(404).json({ error: "No signup sheets found." });
      }
      // Get all sheetIds this member might have signed up for
      const sheetIds = signUps.map((s) => s.sheetId);
      const existedSlot = await Slot.findOne({
        sheetId: { $in: sheetIds },
      });
      if (existedSlot) {
        return res
          .status(404)
          .json({ error: "Cannot delete, the sign up sheet contain slot!" });
      }
      const result = await Signup.deleteOne({ sheetId });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "No signup sheets found." });
      }

      return res.status(200).json({
        message: "Signup sheets deleted successfully.",
        deletedCount: result.deletedCount,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);
//get signup
app.get("/signup", async (req, res) => {
  try {
    //get parameter from request body
    const { termCode, section = 1 } = req.query;
    //check vaildation of termCode and section
    if (!termCode || !section) {
      return res
        .status(400)
        .json({ error: "termCode and section are required." });
    }

    const notVaild = validatetion(termCode, section);
    if (notVaild) {
      return res.status(400).json({ error: notVaild });
    }
    //finding if sign up sheet exists
    const signup = await Signup.find({ termCode, section });
    if (signup.length === 0) {
      return res.status(404).json({ error: "No sign up sheet found." });
    }
    //successful return
    return res.status(200).json(signup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

////////////
//slot////
////////////
//vaildation Slot Param
function vaildationSlotParam(start, duration, numSlots, maxMembers) {
  if (start) {
    const startDate = new Date(start);
    if (isNaN(startDate.getTime())) {
      return "Invalid start date.";
    }
  }
  if (duration) {
    const durationNum = Number(duration);

    if (isNaN(durationNum) || durationNum < 1 || durationNum > 240) {
      return "Invalid duration. Must be a number between 1 and 240.";
    }
  }
  if (numSlots) {
    const numSlotsNum = Number(numSlots);

    if (isNaN(numSlotsNum) || numSlotsNum < 1 || numSlotsNum > 99) {
      return "Invalid numSlots. Must be a number between 1 and 99.";
    }
  }
  if (maxMembers) {
    const numSlotsNum = Number(maxMembers);

    if (isNaN(numSlotsNum) || numSlotsNum < 1 || numSlotsNum > 99) {
      return "Invalid maxMembers. Must be a number between 1 and 99.";
    }
  }
  return false;
}
//check if member id is vaild
function vaildMemberId(memberId) {
  if (memberId.length != 8) {
    return (
      "Invaild memberID: " +
      memberId +
      " Must be a text string and 8 characters."
    );
  }
  return false;
}
//check if number is vaild
function vaildNumber(number) {
  const numberV = Number(number);

  if (isNaN(numberV)) {
    return "Invalid numbers!!";
  }

  return false;
}
//get all slots under the sign up
app.get("/slot", async (req, res) => {
  try {
    //get parameter
    const { sheetId } = req.query;
    //check the validation
    if (!sheetId || isNaN(Number(sheetId))) {
      return res
        .status(400)
        .json({ error: "sheetId is required and must be a number!!!" });
    }

    //check if the sign up is exists or not
    const signup = await Signup.findOne({ sheetId });
    if (!signup) {
      return res.status(404).json({ error: "Sign up sheet is not found!!" });
    }
    //fingd the slot bu sheet id
    const slots = await Slot.find({ sheetId });
    if (!slots) {
      return res.status(404).json({ error: "Slot is not found!!" });
    }

    res.status(200).json({
      message: "Slot list retrieved successfully.",
      slotsList: slots,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
//POST Creat or modify  slot
app.post(
  "/slot",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      //get parameter
      const { sheetId, start, duration, numSlots, maxMembers, slotId } =
        req.body;

      //if slotId is provide then action is modify
      if (slotId) {
        //check if the slot is exists for modify
        const slot = await Slot.findOne({ slotId });

        if (!slot) {
          return res.status(404).json({ error: "Slot not found!!!" });
        }
        //check the validation of input
        if (start || duration) {
          const updatedStart = start ? new Date(start) : slot.start;
          const updatedDuration = duration ? Number(duration) : slot.duration;
          const newStart = updatedStart;
          const newEnd = new Date(newStart.getTime() + updatedDuration * 60000);
          if (start) {
            const errM = vaildationSlotParam(start);
            if (errM) {
              return res.status(400).json({ error: errM });
            }
          }

          if (duration) {
            const errM = vaildationSlotParam(undefined, updatedDuration);
            if (errM) {
              return res.status(400).json({ error: errM });
            }
          }

          const existingSlots = await Slot.find({
            sheetId: slot.sheetId, // or termCode/section etc. depending on your model
            slotId: { $ne: slotId }, // ignore current slot
          });
          const conflict = existingSlots.find((s) => {
            const existingStart = new Date(s.start);
            const existingEnd = new Date(
              existingStart.getTime() + Number(s.duration) * 60000,
            );

            return newStart < existingEnd && newEnd > existingStart;
          });

          if (conflict) {
            return res.status(400).json({
              error: "The slot overlaps with an existing slot.",
            });
          }
          slot.start = updatedStart;
          slot.duration = updatedDuration;
        }

        if (numSlots) {
          const errM = vaildationSlotParam(undefined, undefined, numSlots);
          if (errM) {
            return res.status(400).json({ error: errM });
          }
          slot.numSlots = numSlots;
        }
        if (maxMembers) {
          const errM = vaildationSlotParam(
            undefined,
            undefined,
            undefined,
            maxMembers,
          );
          if (errM) {
            return res.status(400).json({ error: errM });
          }
          console.log(slot.members.length);
          console.log();
          console.log();
          if (slot.members.length > maxMembers) {
            return res.status(400).json({
              error: "The slot already sign up more than max member!",
            });
          }
          slot.maxMembers = maxMembers;
        }

        slot.save(); // save change and returne

        return res.status(200).json({
          message: "Slot updated successfully",
          member: slot.members || "no member ",
        });
      }
      //required dield did not provide
      if (!sheetId || !start || !duration || !numSlots || !maxMembers) {
        return res.status(400).json({ error: "Required files is null!!" });
      }

      //check if sign up sheet is exists
      const signup = await Signup.findOne({ sheetId });
      if (!signup) {
        return res
          .status(404)
          .json({ message: "No sign up sheet found for that sheet ID." });
      }
      //check validation of input
      const errM = vaildationSlotParam(start, duration, numSlots, maxMembers);
      if (errM) {
        return res.status(400).json({ error: errM });
      }

      const newStart = new Date(start);
      const newEnd = new Date(newStart.getTime() + Number(duration) * 60000);

      const existingSlots = await Slot.find({ sheetId });
      const conflict = existingSlots.find((s) => {
        const existingStart = new Date(s.start);
        const existingEnd = new Date(
          existingStart.getTime() + Number(s.duration) * 60000,
        );

        return newStart < existingEnd && newEnd > existingStart;
      });

      if (conflict) {
        return res.status(400).json({
          error: "The slot overlaps with an existing slot.",
        });
      }
      //create slot for sign up
      const newSlot = await Slot.create({
        sheetId,
        start,
        duration,
        numSlots,
        maxMembers,
      });
      // return if successful
      const result = res.status(200).json({
        message: "Slot successfully added.",
        slot: newSlot,
      });

      return result;
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);
//get all slots under the sign up
app.delete(
  "/slot",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      //get parameter
      const { slotId } = req.query;
      //check the validation
      if (!slotId || isNaN(Number(slotId))) {
        return res
          .status(400)
          .json({ error: "Slot ID is required and must be a number!!!" });
      }

      //fingd the slot bu sheet id
      const slot = await Slot.findOne({ slotId });
      if (!slot) {
        return res.status(404).json({ error: "Slot is not found!!" });
      }
      if (slot.members.length > 0) {
        return res.status(400).json({ error: "Slot contain members!!" });
      }
      const result = await Slot.deleteOne({ slotId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "No slot found." });
      }

      return res.status(200).json({
        message: "Slot deleted successfully.",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);
//sign up a slot
app.post("/slot/signup", async (req, res) => {
  //get parameter
  const { sheetId, slotId, memberId } = req.body;
  //check required field
  if (!sheetId || !memberId || !slotId) {
    return res.status(400).json({ error: "Required files is null!!" });
  }
  //check the validation
  const notVaildsheetId = vaildNumber(sheetId);
  const notVaildslotId = vaildNumber(slotId);
  if (notVaildsheetId || notVaildslotId) {
    return res.status(400).json({ error: notVaildsheetId });
  }
  const notVaildmemberId = vaildMemberId(memberId);
  if (notVaildmemberId) {
    return res.status(400).json({ error: notVaildmemberId });
  }
  //check if sign up sheet is exists
  const signup = await Signup.findOne({ sheetId });
  if (!signup) {
    return res.status(404).json({ error: "Sign up sheet is not found!!" });
  }
  //check if slot is exists
  const slot = await Slot.findOne({ slotId });
  if (!slot) {
    return res.status(404).json({ error: "Sign up sheet is not found!!" });
  }
  //if the slot start within 1 hours
  const slotEnd = new Date(slot.start);
  slotEnd.setMinutes(slotEnd.getMinutes() + slot.duration);
  const twoHoursFromNow = new Date();
  twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 1);
  if (slotEnd <= twoHoursFromNow) {
    return res.status(400).json({
      error: "You cannot sign up for a slot that starts within 1 hours.",
    });
  }
  //check if the slot is full
  if (slot.maxMembers == slot.members.length) {
    return res.status(400).json({ error: "This slot is full" });
  }

  // check if the member sign uo the slot or not
  if (slot.members.includes(memberId)) {
    return res
      .status(400)
      .json({ error: `Member ${memberId} already exists in this slot.` });
  }

  slot.members.push(memberId);
  slot.save();
  return res.status(200).json({
    message: "Slot sign up successfully",
    slot,
  });
});
//delete slot member by give sign uo sheet ID
app.delete("/slot/member", async (req, res) => {
  try {
    //get parameter
    const { slotId, memberId } = req.query;
    //check require fileds
    if (!slotId || !memberId) {
      return res.status(400).json({ error: "Required files is null!!" });
    }
    //check the validation
    const notVaildsheetId = vaildNumber(slotId);
    if (notVaildsheetId) {
      return res.status(400).json({ error: notVaildsheetId });
    }
    const notVaildmemberId = vaildMemberId(memberId);
    if (notVaildmemberId) {
      return res.status(400).json({ error: notVaildmemberId });
    }
    //check if slot is exists
    const slot = await Slot.findOne({ slotId });
    if (!slot) {
      return res.status(404).json({ error: "Slot is not found!!" });
    }
    //check if slot starts within 2 hours
    const slotEnd = new Date(slot.start);
    slotEnd.setMinutes(slotEnd.getMinutes() + slot.duration);
    const twoHoursFromNow = new Date();
    twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2);
    if (slotEnd <= twoHoursFromNow) {
      return res.status(400).json({
        error: "You cannot leave a slot that starts within 2 hours.",
      });
    }
    // Keep track of slots where member was removed
    slot.members = slot.members.filter((m) => m !== memberId);
    await slot.save();

    // 5. Return updated slot info
    res.status(200).json({
      message: "Member removed successfully",
      slot: slot,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
//get all member  under the slot
app.get("/slot/members", async (req, res) => {
  try {
    //get request params
    const { slotId } = req.query;
    // check vaildation
    if (!slotId) {
      return res.status(400).json({ error: "slotId is null!!" });
    }
    const notVaildsheetId = vaildNumber(slotId);
    if (notVaildsheetId) {
      return res.status(400).json({ error: notVaildsheetId });
    }
    //check if slot ID exists
    const slot = await Slot.findOne({ slotId });
    if (!slot) {
      return res.status(404).json({ error: "Slot is not found!!" });
    }
    //successful
    return res.status(200).json({
      message: "members list retrieved successfully.",
      slot: slot,
      members: slot.members,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
//get slot  under the member
app.get("/slot/memberslot", async (req, res) => {
  try {
    //get request params
    const { memberId } = req.query;
    // check vaildation
    if (!memberId) {
      return res.status(400).json({ error: "memberId is null!!" });
    }

    //check if slot ID exists
    const slots = await Slot.find({ members: memberId });
    if (!slots) {
      return res.status(404).json({ error: "No slot sign up." });
    }

    const sheetIds = [...new Set(slots.map((s) => s.sheetId))];
    const sheets = await Signup.find({ sheetId: { $in: sheetIds } });
    const combined = slots.map((slot) => {
      const sheet = sheets.find((s) => s.sheetId === slot.sheetId);

      return {
        slotId: slot.slotId,
        sheetId: slot.sheetId,
        start: slot.start,
        duration: slot.duration,
        maxMembers: slot.maxMembers,
        assignmentName: sheet?.assignmentName,
        termCode: sheet?.termCode,
        section: sheet?.section,
      };
    });

    //successful
    return res.status(200).json({
      message: "members list retrieved successfully.",
      slot: combined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
//get all avaliable slot  under the member
app.get("/slot/avaliable", async (req, res) => {
  try {
    const { memberId } = req.query;
    //find all course by memberId
    const courses = await Club.find(
      { "memberList.memberId": memberId },
      { termCode: 1, section: 1 },
    ).lean();
    const courseKeys = courses.map((c) => ({
      termCode: c.termCode,
      section: c.section,
    }));
    //find all aignup under the course
    const sheets = await Signup.find({
      $or: courseKeys, // matches by termCode + section (+ courseName)
    }).lean();
    //filter out the sheetId
    const sheetIds = sheets.map((s) => s.sheetId);
    //get current time
    const now = new Date();
    //get slot that is not pass current time not full
    const slots = await Slot.find({
      sheetId: { $in: sheetIds },
    }).lean();

    const availableSlots = slots.filter((slot) => {
      // compute end time = start + duration (minutes)
      const endTime = new Date(slot.start);
      endTime.setMinutes(endTime.getMinutes() + slot.duration);

      const notFinished = endTime > now;
      const notFull = slot.members.length < slot.maxMembers;
      const notAlreadySigned = !slot.members.includes(memberId);

      return notFinished && notFull && notAlreadySigned;
    });
    const combined = availableSlots.map((slot) => {
      const sheet = sheets.find((s) => s.sheetId === slot.sheetId);

      return {
        // slot info
        slotId: slot.slotId,
        sheetId: slot.sheetId,
        start: slot.start,
        duration: slot.duration,
        maxMembers: slot.maxMembers,
        currentMembers: slot.members.length,
        assignmentName: sheet?.assignmentName,
        notBefore: sheet?.notBefore,
        notAfter: sheet?.notAfter,
        termCode: sheet?.termCode,
        section: sheet?.section,
      };
    });
    combined.sort((a, b) => new Date(a.start) - new Date(b.start));
    //successful
    return res.status(200).json({
      message: "Avaliable slot retrieved successfully.",
      avaliableSlot: combined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

//////////
//Grade//
////////
//grade a member
app.post(
  "/signup/grade",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      //get param from request
      const {
        memberId,
        slotId,
        grade,
        bonus,
        penalty,
        comment,
        taId,
        gradeTime,
      } = req.body;
      //check if the required field filled
      if (
        !memberId ||
        !slotId ||
        !grade ||
        !comment ||
        !gradeTime ||
        !bonus ||
        !penalty
      ) {
        return res.status(400).json({ error: "requied field is null!!" });
      }
      //check validation
      const notVaildslotId = vaildNumber(slotId);
      if (notVaildslotId) {
        return res.status(400).json({ error: notVaildslotId });
      }
      const notVaildmemberId = vaildMemberId(memberId);
      if (notVaildmemberId) {
        return res.status(400).json({ error: notVaildmemberId });
      }
      const notVaildTaId = vaildMemberId(taId);
      if (notVaildTaId) {
        return res.status(400).json({ error: notVaildTaId });
      }

      const slot = await Slot.findOne({ slotId });
      if (!slot) {
        return res.status(404).json({ error: "Slot is not found!!" });
      }
      const numgrade = Number(grade);

      if (isNaN(numgrade) || numgrade < 1 || numgrade > 99) {
        return res
          .status(400)
          .json({ error: "Invalid grade. Must be a number between 1 and 99." });
      }
      if (comment.length > 500) {
        return res
          .status(400)
          .json({ error: "Invalid comment. Must not exceed 500 characters." });
      }
      let exists = false;
      if (slot.members.includes(memberId)) {
        exists = true;
      }

      if (!exists) {
        return res
          .status(404)
          .json({ error: "Member did not sign up any sheet!!" });
      }
      //check if the person already graded
      //if already graded, then add the comment
      const alreadGrade = await Grade.findOne({ memberId, slotId });

      if (alreadGrade) {
        if (bonus) {
          alreadGrade.bonus = bonus;
        }
        if (penalty) {
          alreadGrade.penalty = penalty;
        }
        // if (grade) {
        //   alreadGrade.grade = grade;
        // }
        const logId = alreadGrade.gradeLog.length;

        alreadGrade.gradeLog.push({
          logId: logId + 1,
          taId: alreadGrade.taId,
          gradeTime: alreadGrade.gradeTime,
        });
        alreadGrade.comment += ";" + comment;
        alreadGrade.taId = taId;
        alreadGrade.gradeTime = gradeTime;

        await alreadGrade.save();
        return res.status(200).json({
          message: "Alread graded. Grade: " + alreadGrade.grade,
          grade: alreadGrade.grade,
        });
      }
      //else create new
      const gradee = await Grade.create({
        memberId,
        slotId,
        grade,
        bonus,
        penalty,
        comment,
        taId,
        gradeTime,
      });

      return res.status(200).json({
        message: "grade successfully grade.",
        grade: gradee,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);
//get grade table
app.get("/signup/grade", async (req, res) => {
  try {
    const { slotId } = req.query;
    let { memberIdList = [] } = req.query;

    if (!slotId) {
      return res.status(400).json({ error: "slotId is required." });
    }

    // memberIdList can be a string (single value) or an array (when sent as ?memberIdList=a&memberIdList=b)
    if (!Array.isArray(memberIdList)) {
      memberIdList = [memberIdList];
    }

    // clean empty values
    memberIdList = memberIdList.filter(Boolean);

    // 1) Get all grade records for this slot
    const gradeList = await Grade.find({ slotId });

    // 2) Get unique TA IDs from gradeList
    const taIds = [
      ...new Set(
        gradeList.map((g) => g.taId).filter((id) => id), // remove null/undefined
      ),
    ];

    // 3) Build list of all member IDs we need details for:
    //    all students in the slot + all TAs who graded them
    const uniqueMemberIds = [...new Set([...memberIdList, ...taIds])];

    // 4) Fetch all member details in one query
    const members = await Member.find({
      memberId: { $in: uniqueMemberIds },
    });

    // 5) Build lookup maps
    const memberMap = new Map(members.map((m) => [m.memberId, m]));
    const gradeMap = new Map(gradeList.map((g) => [g.memberId, g]));

    // 6) Build result for EVERY member in the slot, graded or not
    const results = memberIdList.map((id) => {
      const g = gradeMap.get(id); // may be undefined if not graded yet
      const member = memberMap.get(id) || null;
      const ta = g && g.taId ? memberMap.get(g.taId) : null;

      return {
        memberId: id,
        grade: g ? g.grade : null,
        bonus: g ? g.bonus : null,
        penalty: g ? g.penalty : null,
        comment: g ? g.comment : "",
        slotId,
        taId: g ? g.taId : null,
        taName: ta ? `${ta.firstName} ${ta.lastName}` : null,
        gradeTime: g ? g.gradeTime : null,
        graded: !!g, // true if has grade, false otherwise
        memberDetail: member,
      };
    });

    return res.status(200).json({
      message: "Success",
      grades: results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
//get grade Log table
app.get("/signup/gradeLog", async (req, res) => {
  try {
    const { slotId, memberId } = req.query;
    if (!slotId) return res.status(400).json({ error: "No Slot founded!!!" });
    const gradeList = await Grade.findOne({ slotId, memberId });
    console.log();
    return res.status(200).json({
      message: "Success",
      gradeLog: gradeList.gradeLog,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

//////////
//Login//
////////
//check log in
app.post("/login", async (req, res) => {
  try {
    const { memberId, password } = req.body;
    const member = await Login.findOne({ memberId });
    if (!member) {
      return res.status(404).json({ error: "MemberID is not found!!" });
    }
    const memberPass = member.password;
    const match = await bcrypt.compare(password, member.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const detail = await Member.findOne({ memberId });

    // payload: what you want to use for authorization later
    const payload = {
      memberId: detail.memberId,
      firstName: detail?.firstName,
      lastName: detail?.lastName,
      role: detail?.role || "student",
      changePassword: member?.changePassword,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "2h", // token valid for 2 hours
    });

    return res.status(200).json({
      message: "Login successful",
      member: payload, // or fullMember
      token, //  important
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
//change password
app.post("/login/change", async (req, res) => {
  try {
    const { memberId, oldPassword, password } = req.body;
    const member = await Login.findOne({ memberId });
    if (!member) {
      return res.status(404).json({ error: "MemberID is not found!!" });
    }

    const match = await bcrypt.compare(oldPassword, member.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    member.password = hashedPassword;
    // if (!member.changePassword) member.changePassword = true;
    member.changePassword = false;
    member.save();

    return res.status(200).json({
      message: "Password changed successful",
      member: member,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
//create new log in
app.post(
  "/login/new",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      const { memberId, password, memberList = [] } = req.body;
      const isBulk = memberList && memberList.length > 0; //is not single add, its bulk add
      console.log(memberList, isBulk);
      // Normalize to an array of members
      let result = [];
      const incomingMembers =
        memberList && memberList.length > 0
          ? memberList
          : [
              {
                memberId,
                password,
              },
            ];

      for (const m of incomingMembers) {
        const { memberId: mId, password: mPassword } = m;

        if (typeof mId !== "string" || mId.length !== 8) {
          if (!isBulk) {
            return res.status(400).json({
              error:
                "Invalid memberId: " +
                mId +
                ". Must be a text string and exactly 8 characters.",
            });
          } else {
            continue;
          }
        }
        const member = await Login.findOne({ memberId: mId });

        if (member) {
          if (!isBulk)
            return res
              .status(404)
              .json({ error: "MemberID is already sign up" });
          else continue;
        }
        const saltRounds = 10;
        const initPassword = mPassword || "123456";
        const hashedPassword = await bcrypt.hash(initPassword, saltRounds);

        const newLogin = await Login.create({
          memberId: mId,
          password: hashedPassword,
        });

        result.push(newLogin);
      }
      return res.status(200).json({
        message: "Sign up successful",
        result: result,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);
app.delete(
  "/login",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      const { memberId } = req.query;
      if (!memberId || typeof memberId !== "string") {
        return res
          .status(400)
          .json({ error: "memberId is required as a string." });
      }

      if (memberId.length !== 8) {
        return res
          .status(400)
          .json({ error: "memberId must be exactly 8 characters." });
      }
      // Delete from Login collection
      const result = await Login.deleteOne({ memberId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Member not found!" });
      }
      return res.status(200).json({
        message: "Delete successful",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);
//sign up
app.post("/newLogIn", async (req, res) => {
  try {
    const { signup } = req.body;
    if (!signup) {
      return res
        .status(404)
        .json({ error: "MemberID and password cannot be null!!" });
    }
    let newSignUp;
    for (const member of signup) {
      const [memberId, password] = member;
      const existingMember = await Member.findOne({ memberId });
      if (!existingMember) {
        returnres.status(404).json({ error: "MemberID is not found!!" });
      }
      const alreadySigned = await Login.findOne({ memberId });
      if (alreadySigned) {
        return res
          .status(400)
          .json({ error: "Member " + memberId + " already signed!!" });
      }
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      //creat new Login
      newSignUp = await Login.create({
        memberId,
        hashedPassword,
      });
      newSignUp.save();
    }

    return res.status(200).json({
      message: "Create successful",
      newSignUp: newSignUp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
//reset password
app.post(
  "/login/reset",
  requireAuth, // must be logged in
  requireRole("admin"), // must be TA or Admin
  async (req, res) => {
    try {
      const { memberId } = req.body;
      const member = await Login.findOne({ memberId });
      if (!member) {
        return res.status(404).json({ error: "MemberID is not found!!" });
      }
      const saltRounds = 10;
      member.password = await bcrypt.hash("123456", saltRounds);
      member.changePassword = true;
      await member.save();

      return res.status(200).json({
        message: "Reset successful.",
        member: member,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);

//////////
//Member//
////////
//create Member
app.post(
  "/members",
  requireAuth, // must be logged in
  requireRole(), // must be TA or Admin
  async (req, res) => {
    try {
      const {
        memberId,
        firstName,
        lastName,
        role,
        action, // 0 = add, 1 = edit
        password, // if you need it for Login table
        memberList = [], // optional list
      } = req.body;

      if (action !== 0 && action !== 1) {
        return res
          .status(400)
          .json({ error: "Invalid action (must be 0 or 1)." });
      }

      // Normalize to an array of members
      const incomingMembers =
        memberList && memberList.length > 0
          ? memberList
          : [
              {
                memberId,
                firstName,
                lastName,
                role,
                password,
              },
            ];

      const results = [];

      for (const m of incomingMembers) {
        const {
          memberId: mId,
          firstName: fName,
          lastName: lName,
          role: mRole,
          password: mPassword,
        } = m;
        // ----- validation -----
        if (!mId || !fName || !lName) {
          return res.status(400).json({
            error:
              "memberId, firstName, lastName cannot be null for any member.",
          });
        }

        if (typeof mId !== "string" || mId.length !== 8) {
          return res.status(400).json({
            error:
              "Invalid memberId: " +
              mId +
              ". Must be a text string and exactly 8 characters.",
          });
        }

        if (fName.length > 200) {
          return res.status(400).json({
            error:
              "Invalid firstName for " +
              mId +
              ". Cannot exceed 200 characters.",
          });
        }

        if (lName.length > 200) {
          return res.status(400).json({
            error:
              "Invalid lastName for " + mId + ". Cannot exceed 200 characters.",
          });
        }

        // ----- create or update -----
        let existing = await Member.findOne({ memberId: mId });
        let saved;

        if (action === 0) {
          // create
          if (existing) {
            return res.status(400).json({
              error: "Member already exists: " + mId,
            });
          }
          let role = "student";
          if (mRole) {
            role = mRole;
          }
          saved = await Member.create({
            memberId: mId,
            firstName: fName,
            lastName: lName,
            role: role,
          });
        } else {
          if (mRole.length > 10) {
            return res.status(400).json({
              error:
                "Invalid role for " + mId + ". Cannot exceed 10 characters.",
            });
          }
          // edit
          if (!existing) {
            return res.status(404).json({
              error: "Member not found for update: " + mId,
            });
          }

          existing.firstName = fName;
          existing.lastName = lName;
          existing.role = mRole;

          saved = await existing.save();
        }

        results.push(saved);
      }

      return res.status(200).json({
        message: "Create/Edit successful",
        members: results,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);
//get member
app.get("/members", async (req, res) => {
  try {
    const members = await Member.find();
    return res.status(200).json({
      message: "Get member successful",
      members: members,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
//delete member
app.delete("/members", async (req, res) => {
  try {
    const { memberId } = req.query;

    // Validation
    if (!memberId || typeof memberId !== "string") {
      return res
        .status(400)
        .json({ error: "memberId is required as a string." });
    }

    if (memberId.length !== 8) {
      return res
        .status(400)
        .json({ error: "memberId must be exactly 8 characters." });
    }

    // Delete from Member collection
    const result = await Member.deleteOne({ memberId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Member not found!" });
    }

    return res.json({ message: "Member deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});
//Get Member
app.post("/members/getMemberList", async (req, res) => {
  try {
    const { memberIdList } = req.body;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: "memberIds must be a non-empty array",
      });
    }
    for (const m of memberIds) {
      if (m.length != 8) {
        return res.status(400).json({
          error:
            "Invaild memberID: " +
            m +
            " Must be a text string and 8 characters.",
        });
      }
    }

    const members = await Member.find({
      memberId: { $in: memberIdList },
    });

    return res.status(200).json({
      message: "Create successful",
      members: members,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server running at port: ${PORT}`);
});
