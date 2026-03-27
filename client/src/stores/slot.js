import { defineStore } from "pinia";
import { useAuthStore } from "./auth.js";
import { apiUrl } from "../config/api.js";

export const useSlot = defineStore("slot", {
  state: () => ({
    slot: [], // All slots for a specific signup sheet (Admin view)
    loading: false,
    error: null,
    message: null,
    slotMembers: [], // Member IDs for a specific slot
    memberSlot: [], // Slots the current user has already joined
    avaliableSlot: [], // New activities available for the user to join
  }),

  actions: {
    // 1. Fetch available slots based on the member's club memberships
    async getAvaliableSlot(memberId) {
      const auth = useAuthStore();
      this.loading = true;
      this.error = null;
      try {
        const params = new URLSearchParams({ memberId });
        const res = await fetch(
          apiUrl(`/slot/avaliable?${params.toString()}`),
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          },
        );

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to load available activities");

        // Ensure this matches the key 'avaliableSlot' from your backend response
        this.avaliableSlot = data.avaliableSlot || [];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // 2. Fetch slots the user is already registered for
    async getMemberSlot(memberId) {
      const auth = useAuthStore();
      this.loading = true;
      try {
        const params = new URLSearchParams({ memberId });
        const res = await fetch(
          apiUrl(`/slot/memberslot?${params.toString()}`),
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          },
        );
        const data = await res.json();

        // Backend returns { slot: [...] } for joined items
        this.memberSlot = data.slot || [];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // 3. Join an activity
    async joinSlot(sheetId, slotId, memberId) {
      const auth = useAuthStore();
      this.error = null;
      try {
        const res = await fetch(apiUrl("/slot/signup"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            sheetId: Number(sheetId),
            slotId: Number(slotId),
            memberId,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Join failed");

        this.message = data.message;
        return true;
      } catch (err) {
        this.error = err.message;
        return false;
      }
    },

    // 4. Leave an activity
    async leaveSlot(memberId, slotId) {
      const auth = useAuthStore();
      this.error = null;
      try {
        const params = new URLSearchParams({
          slotId: Number(slotId),
          memberId,
        });
        const res = await fetch(apiUrl(`/slot/member?${params.toString()}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${auth.token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Leave failed");

        this.message = data.message;
        return true;
      } catch (err) {
        this.error = err.message;
        return false;
      }
    },

    // 5. Admin: Search slots by Sheet ID
    async searchSlot(sheetId) {
      const auth = useAuthStore();
      this.loading = true;
      try {
        const params = new URLSearchParams({ sheetId });
        const res = await fetch(apiUrl(`/slot?${params.toString()}`), {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const data = await res.json();
        this.slot = data.slotsList || [];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    async getAvaliableSlot(memberId) {
      const auth = useAuthStore();
      this.loading = true;
      this.error = null;
      try {
        const params = new URLSearchParams({ memberId });
        const res = await fetch(
          apiUrl(`/slot/avaliable?${params.toString()}`),
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          },
        );

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to load available activities");

        // Ensure this matches the key 'avaliableSlot' from your backend response
        this.avaliableSlot = data.avaliableSlot || [];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },
});
