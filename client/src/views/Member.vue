<script setup>
import { useRoute, useRouter } from "vue-router";
import { ref, onMounted, computed } from "vue";
import { useClubStore } from "../stores/club.js";
import { useMember } from "../stores/member.js";
import { useAuthStore } from "../stores/auth.js";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const memberStore = useMember();
const clubStore = useClubStore();

// State
const memberId = ref("");
const firstName = ref("");
const lastName = ref("");
const selectedMember = ref(null);
const error = ref("");

// Use the new param names from your router
const clubId = route.params.clubId;
const category = route.params.category;

// Use a computed property for the list so it stays reactive
const memberList = computed(() => clubStore.memberList || []);

const selectMember = (m) => {
  selectedMember.value = m;
  memberId.value = m.memberId;
  firstName.value = m.firstName;
  lastName.value = m.lastName || "";
};

const getMembers = async () => {
  // Action renamed in club.js
  await clubStore.getClubRoster(clubId, category);
};

// --- Add Single Member ---
const addMember = async () => {
  if (!memberId.value || memberId.value.length !== 8) {
    alert("Member ID must be 8 characters.");
    return;
  }

  const ok = window.confirm(`Add ${firstName.value} to this organization?`);
  if (!ok) return;

  // 1. Ensure they exist in the Master Member profile
  await memberStore.addOrEditMember({
    memberId: memberId.value.trim(),
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    role: "member",
    action: 0, // Add to registry if not there
  });

  // 2. Link them to this specific Club/Activity
  // FIX: Action renamed from addMember to updateMemberRoster
  await clubStore.updateMemberRoster({
    clubId: clubId, // Backend expects 'termCode' as the key for clubId
    category: category,
    memberId: memberId.value.trim(),
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    role: "member",
    action: 0, // 0 = add
    mode: 0, // 0 = single
  });

  if (!clubStore.error) {
    // Clear Form & Refresh
    memberId.value = "";
    firstName.value = "";
    lastName.value = "";
    await getMembers();
  } else {
    alert(clubStore.error);
  }
};

const deleteMemberFromRoster = async () => {
  if (!selectedMember.value) return;
  if (
    !window.confirm(`Remove ${selectedMember.value.memberId} from this roster?`)
  )
    return;

  // Action renamed in club.js
  await clubStore.updateMemberRoster({
    clubId: clubId,
    category: category,
    memberId: selectedMember.value.memberId,
    action: 1, // 1 = remove
  });

  if (!clubStore.error) {
    selectedMember.value = null;
    await getMembers();
  }
};

const backToHome = () => router.push({ name: "home" });

onMounted(getMembers);
</script>

<template>
  <div class="page-wrapper">
    <header class="app-header">
      <h1>Roster Management</h1>
      <p class="app-subtitle">
        Organization: <strong>{{ clubId }}</strong> | Category:
        <strong>{{ category }}</strong>
      </p>
      <button class="secondary" @click="backToHome">Back to Home</button>
    </header>

    <section class="section card">
      <h2>Add Member to Roster</h2>
      <p class="info">Enter an 8-digit ID to enroll a member in this club.</p>
      <form class="form-row" @submit.prevent="addMember">
        <input
          v-model="memberId"
          type="text"
          placeholder="8-Digit ID"
          maxlength="8"
          required
        />
        <input v-model="firstName" placeholder="First Name" required />
        <input v-model="lastName" placeholder="Last Name" required />
        <button type="submit" class="primary">Enroll Member</button>
      </form>
    </section>

    <section class="section">
      <div class="header-with-action">
        <h2>Current Roster</h2>
        <button
          v-if="selectedMember"
          class="danger"
          @click="deleteMemberFromRoster"
        >
          Remove Selected
        </button>
      </div>

      <div class="results" v-if="memberList.length">
        <table class="table">
          <thead>
            <tr>
              <th>Select</th>
              <th>ID</th>
              <th>Full Name</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in memberList"
              :key="m.memberId"
              @click="selectMember(m)"
              :class="{
                'selected-row': selectedMember?.memberId === m.memberId,
              }"
            >
              <td>
                <input
                  type="radio"
                  name="roster-select"
                  :checked="selectedMember?.memberId === m.memberId"
                />
              </td>
              <td>{{ m.memberId }}</td>
              <td>{{ m.firstName }} {{ m.lastName }}</td>
              <td>
                <span class="role-badge">{{ m.role }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-state">
        No members have been enrolled in this activity yet.
      </p>
    </section>
  </div>
</template>

<style scoped>
.header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}
.form-row {
  display: flex;
  gap: 12px;
  margin-top: 1rem;
  flex-wrap: wrap;
}
.role-badge {
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
}
.selected-row {
  background-color: #f0fdfa;
}
button.danger {
  background-color: #ef4444;
  padding: 0.5rem 1rem;
}
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #64748b;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
}
</style>
