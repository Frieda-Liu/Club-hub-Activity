<script setup>
import { ref, onMounted, computed } from "vue";
import { useMember } from "../stores/member.js";
import { useAuthStore } from "../stores/auth.js";
import { useRouter } from "vue-router";

const router = useRouter();
const memberStore = useMember();
const auth = useAuthStore();

// State
const memberResult = computed(() => memberStore.members || []);
const selectedMember = ref(null);
const memberId = ref("");
const firstName = ref("");
const lastName = ref("");
const role = ref("member");
const statusMsg = ref("");
const statusError = ref("");

const selectMember = (m) => {
  selectedMember.value = m;
  memberId.value = m.memberId;
  firstName.value = m.firstName;
  lastName.value = m.lastName;
  role.value = m.role.toLowerCase();
};

const clearInput = () => {
  selectedMember.value = null;
  memberId.value = "";
  firstName.value = "";
  lastName.value = "";
  role.value = "member";
  statusMsg.value = "";
  statusError.value = "";
};

const refreshList = async () => {
  await memberStore.getAllMember();
};

const editMember = async () => {
  if (!selectedMember.value) return;
  if (!window.confirm(`Update details for ${memberId.value}?`)) return;

  await memberStore.addOrEditMember({
    memberId: memberId.value,
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    role: role.value,
    action: 1,
  });

  if (!memberStore.error) {
    statusMsg.value = "Member updated successfully!";
    await refreshList();
  }
  statusError.value = memberStore.error;
};

const addMember = async () => {
  if (!window.confirm(`Add ${firstName.value} to the master registry?`)) return;

  await memberStore.addOrEditMember({
    memberId: memberId.value.trim(),
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    role: role.value,
    action: 0,
  });

  if (!memberStore.error) {
    statusMsg.value = "Member added successfully!";
    clearInput();
    await refreshList();
  }
  statusError.value = memberStore.error;
};

const resetPassword = async () => {
  if (!selectedMember.value) return;
  if (!window.confirm(`Reset account for ${memberId.value}?`)) return;
  const ok = await auth.resetLogin(memberId.value);
  if (ok) statusMsg.value = "Account reset successfully!";
  statusError.value = auth.error;
};

const backToHome = () => router.push({ name: "home" });

onMounted(refreshList);
</script>

<template>
  <div class="page-wrapper">
    <header class="app-header">
      <h1>Master Member Registry</h1>
      <p class="app-subtitle">
        Global management of all Hub users and permissions.
      </p>
      <button class="secondary" @click="backToHome">Back to Home</button>
    </header>

    <section class="section card">
      <h2>{{ selectedMember ? "Edit User" : "Register New User" }}</h2>
      <form
        class="form-grid"
        @submit.prevent="selectedMember ? editMember() : addMember()"
      >
        <div class="input-group">
          <label>Member ID (8 Digits)</label>
          <input
            v-model="memberId"
            type="text"
            maxlength="8"
            required
            :disabled="!!selectedMember"
          />
        </div>
        <div class="input-group">
          <label>First Name</label>
          <input v-model="firstName" type="text" required />
        </div>
        <div class="input-group">
          <label>Last Name</label>
          <input v-model="lastName" type="text" required />
        </div>

        <div class="input-group role-management">
          <label class="group-label">System Access Level</label>
          <div class="role-grid">
            <label :class="['role-card', { active: role === 'member' }]">
              <input
                type="radio"
                v-model="role"
                value="member"
                name="role-select"
              />
              <div class="card-body">
                <span class="role-icon">👤</span>
                <div class="role-text">
                  <strong>Member</strong>
                  <small>Standard Student</small>
                </div>
              </div>
            </label>

            <label :class="['role-card', { active: role === 'leader' }]">
              <input
                type="radio"
                v-model="role"
                value="leader"
                name="role-select"
              />
              <div class="card-body">
                <span class="role-icon">🔑</span>
                <div class="role-text">
                  <strong>Leader</strong>
                  <small>TA / Organizer</small>
                </div>
              </div>
            </label>

            <label :class="['role-card', { active: role === 'admin' }]">
              <input
                type="radio"
                v-model="role"
                value="admin"
                name="role-select"
              />
              <div class="card-body">
                <span class="role-icon">🛡️</span>
                <div class="role-text">
                  <strong>Admin</strong>
                  <small>Full Control</small>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div class="button-row">
          <button type="submit" class="primary">
            {{ selectedMember ? "Save Changes" : "Add Member" }}
          </button>
          <button
            type="button"
            class="secondary"
            @click="clearInput"
            v-if="selectedMember"
          >
            Cancel
          </button>
          <button
            type="button"
            class="danger"
            @click="resetPassword"
            v-if="selectedMember"
          >
            Reset Password
          </button>
        </div>
      </form>

      <p v-if="statusMsg" class="success-text">{{ statusMsg }}</p>
      <p v-if="statusError" class="error-text">{{ statusError }}</p>
    </section>

    <section class="section">
      <div class="results" v-if="memberResult.length">
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
              v-for="m in memberResult"
              :key="m.memberId"
              @click="selectMember(m)"
              :class="{ selected: selectedMember?.memberId === m.memberId }"
            >
              <td>
                <input
                  type="radio"
                  :checked="selectedMember?.memberId === m.memberId"
                />
              </td>
              <td>{{ m.memberId }}</td>
              <td>{{ m.firstName }} {{ m.lastName }}</td>
              <td>
                <span class="role-badge" :class="m.role.toLowerCase()">{{
                  m.role
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Keeping your original card and grid layout */
.card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}
.button-row {
  grid-column: 1 / -1;
  display: flex;
  gap: 10px;
  margin-top: 1rem;
}

/* Table and Badge Styles */
.role-badge {
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}
.role-badge.admin {
  background: #fee2e2;
  color: #991b1b;
}
.role-badge.leader {
  background: #fef3c7;
  color: #92400e;
}
.role-badge.member {
  background: #dcfce7;
  color: #166534;
}

/* NEW Role Selector Styles */
.role-management {
  grid-column: 1 / -1;
  margin-top: 0.5rem;
}
.group-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #4b5563;
}
.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}
.role-card {
  cursor: pointer;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 1rem;
  transition: all 0.2s;
  background: #fff;
}
.role-card input {
  display: none;
}
.card-body {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.role-icon {
  font-size: 1.25rem;
}
.role-text {
  display: flex;
  flex-direction: column;
}
.role-text strong {
  font-size: 0.95rem;
  color: #1e293b;
}
.role-text small {
  font-size: 0.75rem;
  color: #64748b;
}

/* Selection States */
.role-card.active {
  border-color: #0d9488;
  background-color: #f0fdfa;
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.1);
}
.role-card.active strong {
  color: #0d9488;
}
.role-card.active:has(input[value="admin"]) {
  border-color: #dc2626;
  background-color: #fef2f2;
}
.role-card.active:has(input[value="admin"]) strong {
  color: #dc2626;
}

.success-text {
  color: #10b981;
  margin-top: 1rem;
  font-weight: bold;
}
.error-text {
  color: #ef4444;
  margin-top: 1rem;
  font-weight: bold;
}
tr.selected {
  background-color: #f0fdfa;
}
</style>
