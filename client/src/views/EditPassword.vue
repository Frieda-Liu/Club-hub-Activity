<script setup>
import { ref, computed } from "vue";
import { useAuthStore } from "../stores/auth.js";
import { useRouter } from "vue-router";

const router = useRouter();
const auth = useAuthStore();

// State
const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

// Logic: Is this a first-time activation?
const isFirstLogin = computed(() => auth.user?.changePassword === true);

const handleUpdate = async () => {
  // 1. Basic Validation
  if (newPassword.value.length < 6) {
    auth.error = "New password must be at least 6 characters";
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    auth.error = "New passwords do not match";
    return;
  }

  const message = isFirstLogin.value
    ? "Confirming your new password and activating your account?"
    : "Are you sure you want to change your password?";

  if (!window.confirm(message)) return;

  // 2. Call the Store
  // Note: For first login, oldPassword will be the one they just used to 'login'
  const success = await auth.updatePassword(
    newPassword.value,
    oldPassword.value,
  );

  if (success) {
    alert("Password updated! Please log in again with your new password.");
    auth.logout();
    router.push({ name: "login" });
  }
};

const cancel = () => {
  // If it's the first login, they CANNOT cancel (per our Router Guard)
  if (isFirstLogin.value) {
    alert("You must set a new password to activate your account.");
    return;
  }
  router.push({ name: "home" });
};
</script>

<template>
  <div class="page-wrapper">
    <section class="section card">
      <header class="form-header">
        <h2>
          {{ isFirstLogin ? "Activate Your Account" : "Change Password" }}
        </h2>
        <p v-if="isFirstLogin" class="info-text">
          This is your first time logging in. Please set a secure password to
          continue.
        </p>
        <p v-else>
          Updating security for: <strong>{{ auth.user?.memberId }}</strong>
        </p>
      </header>

      <form class="form" @submit.prevent="handleUpdate">
        <div class="field">
          <label>Current Password</label>
          <input
            type="password"
            v-model="oldPassword"
            placeholder="The password you just used"
            required
          />
        </div>

        <div class="field">
          <label>New Password</label>
          <input
            type="password"
            v-model="newPassword"
            placeholder="Min 6 characters"
            required
          />
        </div>

        <div class="field">
          <label>Confirm New Password</label>
          <input
            type="password"
            v-model="confirmPassword"
            placeholder="Repeat new password"
            required
          />
        </div>

        <div class="button-group">
          <button type="submit" class="primary" :disabled="auth.loading">
            {{
              auth.loading
                ? "Processing..."
                : isFirstLogin
                  ? "Activate Account"
                  : "Update Password"
            }}
          </button>
          <button type="button" class="secondary" @click="cancel">
            Cancel
          </button>
        </div>
      </form>

      <p v-if="auth.error" class="error-box">{{ auth.error }}</p>
    </section>
  </div>
</template>

<style scoped>
.card {
  max-width: 450px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
.form-header {
  margin-bottom: 1.5rem;
  text-align: center;
}
.info-text {
  color: #0d9488;
  font-weight: 500;
  font-size: 0.9rem;
}
.field {
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
}
.field label {
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
  color: #475569;
}
.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}
.error-box {
  margin-top: 1rem;
  color: #b91c1c;
  font-size: 0.9rem;
  text-align: center;
}
</style>
