// src/stores/auth.js
import { defineStore } from "pinia";
import { validateInput } from "../utils/validators.js";
import { apiUrl } from "../config/api.js";
import { useAuthStore } from "./auth.js";

export const useGrade = defineStore("grade", {
  state: () => ({
    error: null,
    message: null,
    grades: [],
    gradeLog: [],
  }),
  actions: {
    //get member grade
    async getGrade(slotId, memberIdList) {
      this.error = null;
      this.message = null;
      // Validate input BEFORE fetch
      const valid = validateInput({ slotId }, { requireSlotId: true });
      if (valid !== true) {
        this.error = valid;
        this.loading = false;
        return false;
      }
      try {
        const params = new URLSearchParams({
          slotId: slotId,
          memberIdList: memberIdList,
        });
        // `http://localhost:3000/signup/grade?${params.toString()}`
        const res = await fetch(apiUrl(`/signup/grade?${params.toString()}`));
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          this.error = data.error || "Searh failed";
          throw new Error(this.error);
        }
        this.message = data.message;
        this.grades = data.grades;
      } catch (err) {
        this.error = err?.message || "Network error";
      }
    },
    //add or edit grade
    async addOrUpdateGrade(
      memberId,
      slotId,
      grade,
      bonus,
      penalty,
      comment,
      taId,
      gradeTime
    ) {
      const auth = useAuthStore();
      this.error = null;
      this.message = null;
      // Validate input BEFORE fetch
      const valid = validateInput(
        { grade, comment },
        { requiredGrade: true, requiredComment: true }
      );

      if (valid !== true) {
        this.error = valid;
        return false;
      }
      try {
        const body = JSON.stringify({
          memberId,
          slotId,
          grade,
          bonus,
          penalty,
          comment,
          taId,
          gradeTime,
        });
        //"http://localhost:3000/signup/grade"
        const res = await fetch(apiUrl("/signup/grade"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: auth.token ? `Bearer ${auth.token}` : "",
          },
          body: body,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          this.error = data.error || "Change/Add failed";
          throw new Error(this.error);
        }
        this.message = data.message;
        return true;
      } catch (err) {
        console.log(err);
        this.error = err?.message;
      }
    },
    //show edit grade log
    async showLog(slotId, memberId) {
      this.error = null;
      this.message = null;
      // Validate input BEFORE fetch
      const valid = validateInput({ slotId }, { requireSlotId: true });
      if (valid !== true) {
        this.error = valid;
        this.loading = false;
        return false;
      }
      try {
        const params = new URLSearchParams({
          slotId: slotId,
          memberId: memberId,
        });
        // `http://localhost:3000/signup/gradeLog?${params.toString()}`
        const res = await fetch(
          apiUrl(`/signup/gradeLog?${params.toString()}`)
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          this.error = data.error || "Searh failed";
          throw new Error(this.error);
        }
        this.message = data.message;
        this.gradeLog = data.gradeLog;
      } catch (err) {
        this.error = err?.message || "Network error";
      }
    },
  },
});
