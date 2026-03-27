<script setup>
import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import { useClubStore } from "../stores/club.js"; // Updated to use the new store

const router = useRouter();
const auth = useAuthStore();
const clubStore = useClubStore(); // Store renamed

// State
const clubId = ref("");
const category = ref("");
const clubName = ref("");
const selectedClub = ref(null);

// UI Helpers - Reactive to the new store state
const isAdmin = computed(() => auth.user?.role === "admin");
const clubResult = computed(() => clubStore.clubs); // Direct reactive link to store state

const selectClub = (c) => {
  selectedClub.value = c;
  clubId.value = c.clubId; // Matches new backend schema
  category.value = c.category;
  clubName.value = c.name || "";
};

// Search Clubs - Using renamed action
const handleSearch = async () => {
  await clubStore.searchClubs(clubId.value, category.value || 1);
};

// Add New Club/Activity - Using renamed action
const handleAddClub = async () => {
  if (!clubId.value || !clubName.value)
    return alert("Please enter ID and Name");

  const ok = window.confirm(`Register new club: ${clubName.value}?`);
  if (!ok) return;

  const success = await clubStore.addClub(
    clubId.value,
    clubName.value,
    category.value || 1,
  );
  if (success) {
    clubId.value = "";
    clubName.value = "";
    category.value = "";
  }
};

// Navigation Functions
const viewMembers = () => {
  if (!selectedClub.value) return;
  router.push({
    name: "member",
    params: {
      clubId: selectedClub.value.clubId,
      category: selectedClub.value.category,
    },
  });
};

const manageEvents = () => {
  if (!selectedClub.value) return;
  router.push({
    name: "signup",
    params: {
      clubId: selectedClub.value.clubId,
      category: selectedClub.value.category,
    },
  });
};

const backToHome = () => router.push({ name: "home" });

onMounted(async () => {
  // Security check: Only Admins or Leaders should be here
  if (auth.user?.role === "member") {
    alert("Access Denied");
    router.push({ name: "home" });
    return;
  }
  await clubStore.getAllClubs(); // Using renamed action
});
</script>

<template>
  <div class="page-wrapper">
    <header class="app-header">
      <h1>Club & Activity Management</h1>
      <p class="app-subtitle">
        Official portal for managing organization registries and event rosters.
      </p>
      <button class="secondary" @click="backToHome">Return Home</button>
    </header>

    <section class="section card">
      <h2>Register or Find Organizations</h2>
      <form class="form-grid" @submit.prevent="handleSearch">
        <div class="input-group">
          <label>Club ID (4 digits)</label>
          <input v-model="clubId" type="text" placeholder="e.g. 9016" />
        </div>
        <div class="input-group">
          <label>Category Code</label>
          <input v-model="category" type="number" placeholder="1" />
        </div>
        <div class="input-group">
          <label>Organization Name</label>
          <input
            v-model="clubName"
            type="text"
            placeholder="e.g. Software Eng Society"
          />
        </div>

        <div class="action-bar">
          <button type="submit" class="primary" :disabled="clubStore.loading">
            {{ clubStore.loading ? "Searching..." : "Search" }}
          </button>
          <button
            type="button"
            class="success"
            @click="handleAddClub"
            v-if="isAdmin"
          >
            Add New
          </button>
        </div>
      </form>
      <p v-if="clubStore.error" class="error">{{ clubStore.error }}</p>
    </section>

    <section class="section card" v-if="selectedClub">
      <h2>Management Actions for: {{ selectedClub.name }}</h2>
      <div class="button-row">
        <button @click="viewMembers">Manage Member List</button>
        <button @click="manageEvents">Manage Event Slots</button>
        <button class="danger" v-if="isAdmin">Delete Organization</button>
      </div>
    </section>

    <section class="section">
      <div class="results-table" v-if="clubResult.length">
        <table class="table">
          <thead>
            <tr>
              <th>Select</th>
              <th>ID</th>
              <th>Organization Name</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in clubResult"
              :key="c.clubId"
              @click="selectClub(c)"
              :class="{ 'selected-row': selectedClub?.clubId === c.clubId }"
            >
              <td>
                <input
                  type="radio"
                  name="selectedClub"
                  :checked="selectedClub?.clubId === c.clubId"
                />
              </td>
              <td>{{ c.clubId }}</td>
              <td>{{ c.name }}</td>
              <td>{{ c.category }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="!clubStore.loading" class="no-results">
        No clubs found matching your criteria.
      </p>
    </section>
  </div>
</template>

<style scoped>
.form-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
}
.action-bar,
.button-row {
  display: flex;
  gap: 10px;
  margin-top: 1rem;
}
.card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}
button.success {
  background-color: #10b981;
}
button.danger {
  background-color: #ef4444;
}
.selected-row {
  background-color: #f0fdfa;
}
.error {
  color: #ef4444;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}
</style>
