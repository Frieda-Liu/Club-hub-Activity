// src/utils/validators.js

export function validateInput(fields, options = {}) {
  const {
    clubId, // Changed from termCode
    categoryCode, // Changed from section
    eventName, // Changed from assignmentName
    openDate, // Changed from notBefore
    closeDate, // Changed from notAfter
    sheetId,
    memberId,
    password,
    memberList,
    grade,
    comment,
  } = fields;

  const {
    requireClubId = false,
    requireCategory = false,
    requireEventName = false,
    requireDates = false,
    requireSheetId = false,
    requireMemberId = false,
    requirePassword = false,
    requireMemberList = false,
    requireGrade = false,
    requireComment = false,
  } = options;

  // --- Validate clubId ---
  if (requireClubId) {
    if (!clubId || clubId.trim() === "") return "Club ID is required.";
    // If your club IDs are purely numeric (like '1000'), keep this:
    if (isNaN(Number(clubId))) return "Club ID must be a valid number.";
  }

  // --- Validate categoryCode ---
  if (requireCategory) {
    if (categoryCode === undefined || categoryCode === null)
      return "Category is required.";
    if (isNaN(Number(categoryCode))) return "Category must be a number.";
    if (Number(categoryCode) <= 0) return "Category must be greater than 0.";
  }

  // --- Validate Event Name ---
  if (requireEventName) {
    if (!eventName || eventName.trim() === "") return "Event name is required.";
    if (eventName.length > 100)
      return "Event name cannot exceed 100 characters.";
  }

  // --- Validate date range ---
  if (requireDates) {
    if (!openDate) return "Registration open date is required.";
    if (!closeDate) return "Registration close date is required.";

    const start = new Date(openDate);
    const end = new Date(closeDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()))
      return "Invalid date format.";
    if (start > end) return "Open date cannot be after close date.";
  }

  // --- Validate SheetID ---
  if (requireSheetId) {
    if (sheetId === undefined || sheetId === null)
      return "Sheet ID is required.";
    if (isNaN(Number(sheetId))) return "Sheet ID must be a number.";
  }

  // --- Validate MemberId (UWO Standard: 8 digits) ---
  if (requireMemberId) {
    if (!memberId || memberId.trim() === "") return "Member ID is required.";
    if (memberId.length !== 8) return "Member ID must be exactly 8 characters.";
  }

  // --- Validate Password ---
  if (requirePassword) {
    if (!password || password.trim() === "") return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
  }

  // --- Validate Grade ---
  if (requireGrade) {
    const numGrade = Number(grade);
    if (isNaN(numGrade)) return "Grade must be a number.";
    if (numGrade < 0 || numGrade > 100)
      return "Grade must be between 0 and 100.";
  }

  // --- Validate Comment ---
  if (requireComment) {
    if (!comment || comment.trim() === "") return "Comment is required.";
    if (comment.length > 500) return "Comment cannot exceed 500 characters.";
  }

  return true; // Validation passed
}
