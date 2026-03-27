<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSignUp } from "../stores/signup.js";
import { useSlot } from "../stores/slot.js";
import { useAuthStore } from "../stores/auth.js";

const signUpStore = useSignUp();
const slotStore = useSlot();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

// Club Context
const clubId = route.params.clubId;
const category = route.params.category;

// User Permissions
const isAdminOrLeader = computed(
  () => auth.user?.role === "admin" || auth.user?.role === "leader",
);

// Form State
const eventName = ref("");
const openDate = ref("");
const closeDate = ref("");
const selectedSignup = ref(null);
const selectedSlot = ref(null);
const showSlot = ref(false);

// Slot Inputs
const start = ref("");
const duration = ref(30);
// const numSlots = ref(1);
const maxMembers = ref(1);

// --- Formatting Helpers ---
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  return dateStr.split("T")[0];
};

const formatDatetimeLocal = (datetime) => {
  if (!datetime) return "";
  const date = new Date(datetime);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

// --- Actions ---
const getSignups = async () => {
  await signUpStore.searchSignUp(clubId, category);
};

const getSlots = async () => {
  if (!selectedSignup.value) return;
  await slotStore.searchSlot(selectedSignup.value.sheetId);
};

const selectSignup = async (sheet) => {
  selectedSignup.value = sheet;
  showSlot.value = true;
  eventName.value = sheet.eventName;
  openDate.value = formatDate(sheet.openDate);
  closeDate.value = formatDate(sheet.closeDate);
  await getSlots();
};

const selectSlot = (s) => {
  selectedSlot.value = s;
  start.value = formatDatetimeLocal(s.start);
  duration.value = s.duration;
  // numSlots.value = 1;
  maxMembers.value = s.maxMembers;
};

const handleSaveSignup = async () => {
  if (!window.confirm("Save changes to this sign-up sheet?")) return;
  await signUpStore.addSignup(
    clubId,
    category,
    eventName.value,
    openDate.value,
    closeDate.value,
  );
  if (!signUpStore.error) await getSignups();
};

const handleDeleteSignup = async () => {
  if (!selectedSignup.value || !window.confirm("Delete this sheet?")) return;
  await signUpStore.deleteSignup(selectedSignup.value.sheetId);
  if (!signUpStore.error) {
    selectedSignup.value = null;
    showSlot.value = false;
    await getSignups();
  }
};

const handleSaveSlot = async () => {
  if (!selectedSignup.value) return;
  await slotStore.addOrEditSlot(
    selectedSignup.value.sheetId,
    start.value,
    duration.value,
    // numSlots.value,
    maxMembers.value,
    selectedSlot.value?.slotId,
  );
  if (!slotStore.error) await getSlots();
};

const deleteSlot = async () => {
  if (!selectedSlot.value || !window.confirm("Delete this slot?")) return;
  await slotStore.deleteSlot(selectedSlot.value.slotId);
  await getSlots();
};

const goToGrade = () => {
  if (!selectedSlot.value) return;
  router.push({
    name: "grade",
    params: { slotId: selectedSlot.value.slotId, start: start.value },
  });
};

onMounted(getSignups);
</script>

<template>
  <div class="page-wrapper">
    <header class="app-header">
      <h1>Activity Sign-Up Sheets</h1>
      <p class="app-subtitle">
        Club: <strong>{{ clubId }}</strong> | Category:
        <strong>{{ category }}</strong>
      </p>
      <button class="secondary" @click="router.push({ name: 'home' })">
        Back to Home
      </button>
    </header>

    <section class="section card" v-if="isAdminOrLeader">
      <div class="card-header">
        <h2>{{ selectedSignup ? "Edit Sheet" : "Create New Sheet" }}</h2>
      </div>
      <form class="form-grid" @submit.prevent="handleSaveSignup">
        <div class="input-group">
          <label>Event Name</label>
          <input
            v-model="eventName"
            type="text"
            placeholder="Weekly Workshop"
            required
          />
        </div>
        <div class="input-group">
          <label>Registration Opens</label>
          <input v-model="openDate" type="date" required />
        </div>
        <div class="input-group">
          <label>Registration Closes</label>
          <input v-model="closeDate" type="date" required />
        </div>
        <div class="button-row">
          <button type="submit" class="primary">
            {{ selectedSignup ? "Update" : "Create" }}
          </button>
          <button
            v-if="selectedSignup"
            type="button"
            class="danger"
            @click="handleDeleteSignup"
          >
            Delete
          </button>
          <button
            v-if="selectedSignup"
            type="button"
            class="secondary"
            @click="
              selectedSignup = null;
              showSlot = false;
            "
          >
            Clear
          </button>
        </div>
      </form>
    </section>

    <section class="section">
      <div class="results" v-if="signUpStore.signup.length">
        <table class="table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Activity</th>
              <th>Opens</th>
              <th>Closes</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="sheet in signUpStore.signup"
              :key="sheet.sheetId"
              @click="selectSignup(sheet)"
              :class="{ selected: selectedSignup?.sheetId === sheet.sheetId }"
            >
              <td>
                <input
                  type="radio"
                  :checked="selectedSignup?.sheetId === sheet.sheetId"
                />
              </td>
              <td>
                <strong>{{ sheet.eventName }}</strong>
              </td>
              <td>{{ formatDate(sheet.openDate) }}</td>
              <td>{{ formatDate(sheet.closeDate) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-state">No sign-up sheets found.</p>
    </section>

    <section class="section card" v-if="showSlot && isAdminOrLeader">
      <div class="card-header">
        <h2>Slot Configuration</h2>
        <span class="badge">Activity: {{ selectedSignup?.eventName }}</span>
      </div>

      <form class="slot-form-vertical" @submit.prevent="handleSaveSlot">
        <div class="vertical-stack">
          <div class="input-group">
            <label>📅 Start Time</label>
            <input v-model="start" type="datetime-local" required />
          </div>

          <div class="input-group">
            <label>⏱️ Duration (min)</label>
            <input v-model="duration" type="number" required />
          </div>

          <!-- <div class="input-group">
            <label>🔢 Slots to Create</label>
            <input v-model="numSlots" type="number" required />
            <small class="helper"
              >How many time blocks to generate back-to-back.</small
            >
          </div> -->

          <div class="input-group">
            <label>👥 Max Capacity</label>
            <input v-model="maxMembers" type="number" min="1" required />
            <small class="helper"
              >Maximum students allowed per time block.</small
            >
          </div>
        </div>

        <div class="slot-actions">
          <button type="submit" class="primary btn-large">
            {{ selectedSlot ? "Update Selected" : "Generate All Slots" }}
          </button>
          <button
            v-if="selectedSlot"
            type="button"
            class="danger"
            @click="deleteSlot"
          >
            Delete
          </button>
          <!-- <button
            v-if="selectedSlot"
            type="button"
            class="secondary"
            @click="goToGrade"
          >
            Grade
          </button> -->
        </div>
      </form>

      <div class="results mt-2" v-if="slotStore.slot.length">
        <table class="table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Time</th>
              <th>Duration</th>
              <th>Enrolled</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in slotStore.slot"
              :key="s.slotId"
              @click="selectSlot(s)"
              :class="{ selected: selectedSlot?.slotId === s.slotId }"
            >
              <td>
                <input
                  type="radio"
                  :checked="selectedSlot?.slotId === s.slotId"
                />
              </td>
              <td>
                {{
                  new Date(s.start).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                }}
              </td>
              <td>{{ s.duration }}m</td>
              <td>{{ s.members?.length || 0 }} / {{ s.maxMembers }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.mt-2 {
  margin-top: 2.5rem;
}
.card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #f1f5f9;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
}
.badge {
  background: #f0fdfa;
  color: #0d9488;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Form Layouts */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}
.vertical-stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 450px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.input-group label {
  font-weight: 600;
  color: #334155;
}
.input-group input {
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
}
.input-group input:focus {
  outline: none;
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.button-row,
.slot-actions {
  display: flex;
  gap: 12px;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}
.slot-actions {
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5rem;
}
.btn-large {
  padding: 0.8rem 2.5rem;
  font-weight: 700;
  flex-grow: 1;
}

.helper {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 2px;
}
.selected {
  background-color: #f0fdfa;
}
.empty-state {
  text-align: center;
  color: #64748b;
  padding: 3rem;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
}
</style>
