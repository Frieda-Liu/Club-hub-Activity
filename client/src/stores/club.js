import { defineStore } from "pinia";
import { validateInput } from "../utils/validators.js";
import { useAuthStore } from "./auth.js";
import { apiUrl } from "../config/api.js";

export const useClubStore = defineStore("clubs", {
  state: () => ({
    clubs: [], // Main list of clubs/organizations
    memberList: [], // Roster for a specific club
    loading: false,
    error: null,
    message: null,
  }),

  actions: {
    // 1. Search for specific clubs or by category
    async searchClubs(clubId, category = 1) {
      this.loading = true;
      this.message = null;
      this.error = null;

      const valid = validateInput(
        { termCode: clubId, section: category || 1 },
        { requireTermCode: true, requireSection: true },
      );

      if (valid !== true) {
        this.error = valid;
        this.loading = false;
        return false;
      }

      try {
        const params = new URLSearchParams({
          clubId: clubId,
          category: category || 1,
        });

        const res = await fetch(apiUrl(`/clubs?${params.toString()}`));
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          this.error = data.error || "Search failed";
          return false;
        }
        this.clubs = data;
      } catch (err) {
        this.error = "Network error";
      } finally {
        this.loading = false;
      }
    },

    // 2. Get all registered clubs in the system
    async getAllClubs() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(apiUrl("/clubs"));
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data.error || "Failed to fetch clubs");
        this.clubs = data;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // 3. Add a new Club (Admin Only)
    async addClub(clubId, name, category = 1) {
      const auth = useAuthStore();
      this.error = null;

      try {
        const res = await fetch(apiUrl("/clubs"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            clubId: clubId,
            name: name,
            category: category || 1,
            description: "",
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Add failed");

        this.message = data.message;
        await this.getAllClubs(); // Refresh state
        return true;
      } catch (err) {
        this.error = err.message;
        return false;
      }
    },

    // 4. Get the member roster for a specific club
    async getClubRoster(clubId, category = 1) {
      const auth = useAuthStore();
      this.error = null;
      try {
        const params = new URLSearchParams({
          clubId: clubId,
          category: category || 1,
        });

        // const res = await fetch(apiUrl(`/clubs/member?${params.toString()}`));
        const res = await fetch(apiUrl(`/clubs/member?${params.toString()}`), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data.error || "Failed to get members");
        this.memberList = data.memberList;
      } catch (err) {
        this.error = err.message;
      }
    },

    // 5. Add or Remove a member from a roster
    async updateMemberRoster(payload) {
      const auth = useAuthStore();
      this.error = null;
      try {
        const res = await fetch(apiUrl("/clubs/member"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Roster update failed");
        this.message = data.message;
      } catch (err) {
        this.error = err.message;
      }
    },

    // 6. Get all clubs a specific member is currently in

    async getClubsByMember(memberId) {
      const auth = useAuthStore();
      this.loading = true;
      try {
        const params = new URLSearchParams({ memberId });
        const res = await fetch(apiUrl(`/clubs/student?${params.toString()}`), {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to fetch your clubs");

        this.clubs = data; // Updates the 'clubs' state for the UI
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },
});
