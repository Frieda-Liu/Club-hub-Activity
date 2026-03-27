import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

// Import your views
import Login from "../views/Login.vue";
import HomePage from "../views/HomePage.vue";
import ManageMember from "../views/ManageMember.vue";
import EditPassword from "../views/EditPassword.vue";
import ClubPage from "../views/Club.vue";
import MembersPage from "../views/Member.vue";
import SignupPage from "../views/Signup.vue";
import SlotPage from "../views/Slot.vue";
import GradePage from "../views/Grade.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "login", component: Login },
    { path: "/home", name: "home", component: HomePage },
    { path: "/manage-member", name: "manage-member", component: ManageMember },
    { path: "/edit-password", name: "edit-password", component: EditPassword },
    { path: "/club", name: "club", component: ClubPage },
    {
      // Updated params for better Club Hub semantics
      path: "/member/:clubId/:category",
      name: "member",
      component: MembersPage,
    },
    {
      path: "/signup/:clubId/:category",
      name: "signup",
      component: SignupPage,
    },
    {
      path: "/slot",
      name: "slot",
      component: SlotPage,
    },
    {
      path: "/grade/:slotId/:start",
      name: "grade",
      component: GradePage,
    },
  ],
});

// --- Navigation Guards ---
router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();
  const userRole = auth.user?.role?.toLowerCase();

  // 1. Authentication Check
  if (!auth.token && to.name !== "login") {
    return next({ name: "login" });
  }

  // 2. First Login / Password Reset Force
  if (auth.token && auth.user?.changePassword && to.name !== "edit-password") {
    return next({ name: "edit-password" });
  }

  // 3. Login Page Redirection (If already authenticated)
  if (auth.token && to.name === "login" && !auth.user?.changePassword) {
    return next({ name: "home" });
  }

  // 4. Role-Based Access Control (RBAC)
  const adminOnly = ["manage-member"];
  const managementOnly = ["club", "signup", "member"];

  if (adminOnly.includes(to.name) && userRole !== "admin") {
    alert("Administrators only.");
    return next({ name: "home" });
  }

  if (managementOnly.includes(to.name) && userRole === "member") {
    alert("Authorized personnel only.");
    return next({ name: "home" });
  }

  next();
});

export default router;
