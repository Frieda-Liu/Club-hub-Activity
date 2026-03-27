<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import { useSignUp } from "../stores/signup.js";
import { useSlot } from "../stores/slot.js";

const router = useRouter();
const auth = useAuthStore();
const eventStore = useSignUp();
const slotStore = useSlot();

// State
const memberId = ref("");
const password = ref("");
const clubId = ref("");
const categoryCode = ref("");
const expandedSheets = ref(new Set());

// Updated Login Logic for "First-Time" account creation
const handleLogin = async () => {
  await auth.login(memberId.value, password.value);

  if (!auth.error && auth.user) {
    /* LOGIC CHANGE: 
       If auth.user.changePassword is true, it means the server 
       just created a Login record for this Member for the first time.
    */
    if (auth.user.changePassword) {
      // Redirect to a "Complete Profile" or "Change Password" page
      router.push({ name: "edit-password" });
    } else {
      // Returning user: go to dashboard
      router.push({ name: "home" });
    }
  }
};

// Search Logic
const handleSearch = async () => {
  await eventStore.searchSignUp(clubId.value, categoryCode.value);
};

// Toggle logic remains the same
const toggleExpand = async (sheetId) => {
  const set = new Set(expandedSheets.value);
  if (set.has(sheetId)) {
    set.delete(sheetId);
  } else {
    await slotStore.searchSlot(sheetId);
    set.add(sheetId);
  }
  expandedSheets.value = set;
};

const isExpanded = (sheetId) => expandedSheets.value.has(sheetId);
</script>

<template>
  <div class="page">
    <header class="app-header">
      <h1>Club Activity Hub</h1>
      <p class="app-subtitle">
        Welcome! Enter your Member ID to access your club activities.
      </p>
    </header>

    <section class="section">
      <div class="sheet" style="padding: 1.5rem; margin-bottom: 2rem">
        <h2 style="margin-top: 0">Member Login</h2>
        <p
          v-if="!auth.user"
          style="font-size: 0.85rem; color: #666; margin-bottom: 1rem"
        >
          Note: If this is your first time logging in, the password you enter
          will become your permanent password.
        </p>

        <form class="form" @submit.prevent="handleLogin">
          <div class="field narrow">
            <span>Member ID</span>
            <input
              v-model="memberId"
              type="text"
              placeholder="8-digit ID"
              required
              maxlength="8"
            />
          </div>
          <div class="field narrow">
            <span>Password</span>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" :disabled="auth.loading">
            {{ auth.loading ? "Authenticating..." : "Login / Activate" }}
          </button>
        </form>

        <p v-if="auth.error" class="error">{{ auth.error }}</p>
        <div v-if="auth.user" class="info">
          <p>
            Logged in as:
            <strong>{{ auth.user.firstName }} {{ auth.user.lastName }}</strong>
          </p>
          <p
            v-if="auth.user.changePassword"
            style="color: #b91c1c; font-weight: bold"
          >
            New account detected! Redirecting to password setup...
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Public Activity Search</h2>
      <div class="form">
        <div class="field narrow">
          <span>Club ID</span>
          <input v-model="clubId" type="text" placeholder="e.g., CHESS" />
        </div>
        <div class="field narrow">
          <span>Category</span>
          <input v-model="categoryCode" type="text" placeholder="e.g., 1" />
        </div>
        <button @click="handleSearch">Find Events</button>
      </div>

      <div class="results" v-if="eventStore.signup.length">
        <div
          v-for="event in eventStore.signup"
          :key="event.sheetId"
          class="sheet"
          style="margin-bottom: 0.75rem"
        >
          <button class="sheet-header" @click="toggleExpand(event.sheetId)">
            <div class="sheet-toggle">
              <strong>{{ event.eventName }}</strong>
              <span class="sheet-meta">Club: {{ event.clubId }}</span>
            </div>
            <span>{{ isExpanded(event.sheetId) ? "▲" : "▼" }}</span>
          </button>

          <div v-if="isExpanded(event.sheetId)" class="slots">
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in slotStore.slot" :key="s.slotId">
                  <td>{{ s.start?.split("T")[0] }}</td>
                  <td>
                    <span
                      :class="
                        s.members?.length >= s.maxMembers ? 'error' : 'info'
                      "
                    >
                      {{
                        s.members?.length >= s.maxMembers ? "Full" : "Available"
                      }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
