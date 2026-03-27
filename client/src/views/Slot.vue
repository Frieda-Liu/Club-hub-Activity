<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useSlot } from "../stores/slot.js";
import { useClubStore } from "../stores/club.js";
import { useAuthStore } from "../stores/auth.js";

const router = useRouter();
const auth = useAuthStore();
const clubStore = useClubStore();
const slotStore = useSlot();

// --- State ---
const myClubs = ref([]);
const myEnrolledSlots = ref([]);
const availableSlots = ref([]);
const selectedEnrolledSlot = ref(null);
const selectedNewSlot = ref(null);
const statusMsg = ref("");

// --- User Context ---
const memberId = computed(() => auth.user?.memberId);

// --- Data Fetching ---
const refreshData = async () => {
  if (!memberId.value) return;

  // 1. Get clubs (Updated function name from your store)
  await clubStore.getClubsByMember(memberId.value);
  myClubs.value = clubStore.clubs || [];

  // 2. Get slots the member has already joined
  await slotStore.getMemberSlot(memberId.value);
  myEnrolledSlots.value = slotStore.memberSlot || [];

  // 3. Get slots available for joining
  await slotStore.getAvaliableSlot(memberId.value);
  availableSlots.value = slotStore.avaliableSlot || [];
};

// --- Actions ---
const handleLeave = async () => {
  if (!selectedEnrolledSlot.value) return;

  const ok = window.confirm(
    `Cancel registration for: ${selectedEnrolledSlot.value.eventName || "this event"}?`,
  );
  if (!ok) return;

  await slotStore.leaveSlot(memberId.value, selectedEnrolledSlot.value.slotId);
  if (!slotStore.error) {
    statusMsg.value = "Successfully left the activity.";
    selectedEnrolledSlot.value = null;
    await refreshData();
  } else {
    statusMsg.value = slotStore.error;
  }
};

const handleJoin = async () => {
  if (!selectedNewSlot.value) return;

  await slotStore.joinSlot(
    selectedNewSlot.value.sheetId,
    selectedNewSlot.value.slotId,
    memberId.value,
  );

  if (!slotStore.error) {
    statusMsg.value = "Successfully joined!";
    selectedNewSlot.value = null;
    await refreshData();
  } else {
    statusMsg.value = slotStore.error;
  }
};

const backToHome = () => router.push({ name: "home" });

onMounted(() => {
  if (!auth.user) {
    router.push({ name: "login" });
    return;
  }
  refreshData();
});
</script>

<template>
  <div class="page-wrapper">
    <header class="app-header">
      <h1>My Club Hub</h1>
      <p class="status-banner" v-if="statusMsg">{{ statusMsg }}</p>
      <button class="secondary" @click="backToHome">Back to Home</button>
    </header>

    <section class="section card">
      <h2>My Organizations</h2>
      <div v-if="myClubs.length">
        <table class="table">
          <thead>
            <tr>
              <th>Club ID</th>
              <th>Name</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in myClubs" :key="c.clubId">
              <td>{{ c.clubId || c.termCode }}</td>
              <td>
                <strong>{{ c.name || c.clubName }}</strong>
              </td>
              <td>{{ c.section || c.category }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-state">You aren't a member of any clubs yet.</p>
    </section>

    <section class="section card">
      <h2>My Event Registrations</h2>
      <div v-if="myEnrolledSlots.length">
        <div class="action-bar">
          <button
            class="danger"
            @click="handleLeave"
            :disabled="!selectedEnrolledSlot"
          >
            Cancel Registration
          </button>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Event</th>
              <th>Time</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in myEnrolledSlots"
              :key="s.slotId"
              @click="selectedEnrolledSlot = s"
              :class="{ selected: selectedEnrolledSlot?.slotId === s.slotId }"
            >
              <td>
                <input
                  type="radio"
                  :checked="selectedEnrolledSlot?.slotId === s.slotId"
                />
              </td>
              <td>{{ s.eventName || s.assignmentName }}</td>
              <td>
                {{
                  new Date(s.start).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                }}
              </td>
              <td>{{ s.duration }} mins</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-state">No upcoming events scheduled.</p>
    </section>

    <section class="section card highlight">
      <h2>Available Activities</h2>
      <div v-if="availableSlots.length">
        <div class="action-bar">
          <button
            class="primary"
            @click="handleJoin"
            :disabled="!selectedNewSlot"
          >
            Join Selected Activity
          </button>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Activity</th>
              <th>Time</th>
              <th>Remaining Spots</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in availableSlots"
              :key="s.slotId"
              @click="selectedNewSlot = s"
              :class="{ selected: selectedNewSlot?.slotId === s.slotId }"
            >
              <td>
                <input
                  type="radio"
                  :checked="selectedNewSlot?.slotId === s.slotId"
                />
              </td>
              <td>
                <strong>{{ s.eventName || s.assignmentName }}</strong>
              </td>
              <td>
                {{
                  new Date(s.start).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                }}
              </td>
              <td>
                {{ (s.maxMembers || 0) - (s.members?.length || 0) }} spots left
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-state">Check back later for new activities!</p>
    </section>
  </div>
</template>

<style scoped>
.card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
}
.highlight {
  border-left: 5px solid #0d9488;
}
.action-bar {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end;
}
.selected {
  background-color: #f0fdfa;
}
.status-banner {
  background: #ecfdf5;
  color: #065f46;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 600;
}
.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 2rem;
  border: 2px dashed #f1f5f9;
  border-radius: 12px;
}
</style>
