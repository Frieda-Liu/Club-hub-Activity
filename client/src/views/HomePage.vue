<script setup>
import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

const router = useRouter();
const auth = useAuthStore();

// Use computed properties to stay reactive to the Pinia store
const userId = computed(() => auth.user?.memberId || "Guest");
const isAdmin = computed(() => auth.user?.role?.toLowerCase() === "admin");
const isLeader = computed(() => auth.user?.role?.toLowerCase() === "leader");

const manageClubActivities = () => {
  router.push({ name: "club" });
};

const manageMember = () => {
  router.push({ name: "manage-member" });
};

const changePassword = () => {
  router.push({ name: "edit-password" });
};

const logOut = () => {
  const ok = window.confirm(`Are you sure you want to Logout?`);
  if (!ok) return;

  auth.logout();
  router.push({ name: "login" });
};

const goMyActivities = () => {
  router.push({ name: "slot" });
};

onMounted(() => {
  // If the user somehow lands here without being logged in, kick them to login
  if (!auth.user) {
    router.push({ name: "login" });
  }
});
</script>

<template>
  <div class="page-wrapper">
    <header class="app-header">
      <h1>Home</h1>
      <h5>Welcome, {{ auth.user?.firstName || "User" }} ({{ userId }})</h5>
    </header>

    <section class="section">
      <div class="button-group">
        <button type="button" @click="goMyActivities">My Activities</button>

        <button type="button" @click="changePassword">Security Settings</button>

        <button type="button" @click="manageMember" v-if="isAdmin">
          Manage Members
        </button>

        <button
          type="button"
          @click="manageClubActivities"
          v-if="isLeader || isAdmin"
        >
          Manage Club Activities
        </button>

        <hr />

        <button type="button" class="secondary" @click="logOut">Log Out</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.button-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 300px;
  margin: 0 auto;
}

button {
  width: 100%;
  padding: 0.75rem;
}

.secondary {
  background-color: #64748b;
}
</style>
