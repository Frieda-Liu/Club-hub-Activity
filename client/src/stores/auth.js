import { defineStore } from "pinia";
import { validateInput } from "../utils/validators.js";
import { apiUrl } from "../config/api.js";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || null,
    user: JSON.parse(localStorage.getItem("user")) || null,
    user: (() => {
      const stored = localStorage.getItem("user");
      if (!stored || stored === "undefined") return null;
      try {
        return JSON.parse(stored);
      } catch {
        localStorage.removeItem("user");
        return null;
      }
    })(),
    token: localStorage.getItem("token") || null, // Load token from storage on init
    loading: false,
    error: null,
    message: null,
  }),

  actions: {
    // 1. Login Logic (Handles first-time auto-registration)
    async login(memberId, password) {
      this.loading = true;
      this.error = null;

      const valid = validateInput({ memberId }, { requireMemberId: true });
      if (valid !== true) {
        this.error = valid;
        this.loading = false;
        return false;
      }

      try {
        // Pointing to your new auth route
        const res = await fetch(apiUrl("/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, password }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          this.error = data.error || "Login failed";
          return false;
        }

        // Store the result
        this.message = data.message;
        this.user = data.member;
        this.token = data.token;

        // Persist to browser
        localStorage.setItem("user", JSON.stringify(this.user));
        localStorage.setItem("token", this.token);

        return true;
      } catch (err) {
        this.error = "Network error: " + err.message;
        return false;
      } finally {
        this.loading = false;
      }
    },

    // 2. Change Password Logic
    async updatePassword(newPassword, oldPassword = "") {
      this.loading = true;
      this.error = null;

      try {
        const res = await fetch(apiUrl("/auth/change-password"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`, // Send JWT token
          },
          body: JSON.stringify({ oldPassword, newPassword }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          this.error = data.error || "Password update failed";
          return false;
        }

        // After changing password, we usually logout to force fresh login
        this.logout();
        return true;
      } catch (err) {
        this.error = "Network error";
        return false;
      } finally {
        this.loading = false;
      }
    },

    // 3. Logout
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    },

    // 4. Reset Account (Admin only - Deletes Login record)
    async resetLogin(memberId) {
      this.loading = true;
      this.error = null;
      try {
        // Ensure this path matches your backend mounting (e.g., /api/auth/reset/...)
        const res = await fetch(apiUrl(`/auth/reset/${memberId}`), {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Reset failed");

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
