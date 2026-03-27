import { defineStore } from "pinia";
import { validateInput } from "../utils/validators.js";
import { useAuthStore } from "./auth.js";
import { apiUrl } from "../config/api.js";

export const useMember = defineStore("member", {
  state: () => ({
    error: null,
    message: null,
    members: [],
    loading: false,
  }),
  actions: {
    // Search for specific members by a list of IDs
    async searchMember(memberIdList) {
      this.loading = true;
      this.error = null;
      this.message = null;

      const valid = validateInput(
        { memberIdList },
        { requirememberIdList: true },
      );
      if (valid !== true) {
        this.error = valid;
        this.loading = false;
        return false;
      }

      try {
        const res = await fetch(apiUrl("/members/getMemberList"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIdList }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Search failed");

        this.members = data.members;
        this.message = data.message;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // Get the Master Registry of all members
    async getAllMember() {
      const auth = useAuthStore();
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(apiUrl("/members"), {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const data = await res.json();

        if (Array.isArray(data)) {
          this.members = data;
        } else if (data.members) {
          this.members = data.members;
        } else {
          this.members = [];
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // Global Add/Edit (For the Master Member Registry)
    async addOrEditMember({
      memberId,
      firstName,
      lastName,
      role,
      memberList = [],
      action,
    }) {
      const auth = useAuthStore();
      if (!auth.token) {
        this.error = "Session expired. Please log in again.";
        return false;
      }

      this.loading = true;
      this.error = null;

      try {
        let body;
        if (memberList.length > 0 && action === 0) {
          body = JSON.stringify({ memberList, action });
        } else {
          body = JSON.stringify({
            memberId,
            firstName,
            lastName,
            role,
            action,
          });
        }

        const res = await fetch(apiUrl("/members"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${auth.token}`,
          },
          body: body,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Operation failed");

        this.message = data.message;
        return true;
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.loading = false;
      }
    },

    // Permanent delete from Master Registry (Admin Only)
    async deleteMember(memberId) {
      const auth = useAuthStore();
      this.error = null;

      const valid = validateInput({ memberId }, { requireMemberId: true });
      if (valid !== true) {
        this.error = valid;
        return false;
      }

      try {
        const params = new URLSearchParams({ memberId });
        const res = await fetch(apiUrl(`/members?${params.toString()}`), {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Delete failed");

        this.message = data.message;
        return true;
      } catch (err) {
        this.error = err.message;
        return false;
      }
    },
  },
});
