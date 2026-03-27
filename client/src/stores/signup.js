import { defineStore } from "pinia";
import { validateInput } from "../utils/validators.js";
import { apiUrl } from "../config/api.js";
import { useAuthStore } from "./auth.js";

export const useSignUp = defineStore("signUp", {
  state: () => ({
    signup: [],
    loading: false,
    error: null,
    message: null,
  }),
  actions: {
    // 1. Get Sign-up Sheets for a Club
    async searchSignUp(clubId, category = 1) {
      const auth = useAuthStore();
      this.loading = true;
      this.error = null;

      // Logic: Ensure category defaults to 1 if missing
      const activeCategory = category || 1;

      try {
        const params = new URLSearchParams({
          clubId: clubId, // Backend expects clubId now
          category: activeCategory,
        });

        const res = await fetch(apiUrl(`/signup?${params.toString()}`), {
          headers: {
            // Added Authorization even for GET to prevent "req.user undefined" errors
            Authorization: auth.token ? `Bearer ${auth.token}` : "",
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch sign-up sheets");
        }

        // Backend returns either an array directly or { signup: [] }
        this.signup = Array.isArray(data) ? data : data.signup || [];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // 2. Add/Create a New Sign-up Sheet
    async addSignup(clubId, category, assignmentName, notBefore, notAfter) {
      const auth = useAuthStore();
      this.loading = true;
      this.error = null;

      try {
        const res = await fetch(apiUrl("/signup"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            clubId, // Renamed from termCode
            category: category || 1, // Renamed from section
            assignmentName,
            notBefore,
            notAfter,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Creation failed");
        }

        this.message = data.message;
        // Optionally update the list immediately
        if (data.signup) this.signup = data.signup;

        return true;
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.loading = false;
      }
    },

    // 3. Delete a Specific Sign-up Sheet
    async deleteSignup(sheetId) {
      const auth = useAuthStore();
      this.loading = true;
      this.error = null;

      try {
        // We'll use a path parameter for delete as it's cleaner REST practice
        const res = await fetch(apiUrl(`/signup/${sheetId}`), {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Delete failed");
        }

        this.message = data.message;
        // Filter out the deleted item from the local state
        this.signup = this.signup.filter((s) => s.sheetId !== sheetId);
        return true;
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.loading = false;
      }
    },
  },
});
