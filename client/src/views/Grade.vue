<script setup>
import { ref, onMounted, computed, Comment, watch, toRaw } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSlot } from "../stores/slot.js";
import { useGrade } from "../stores/grade.js";

const route = useRoute();
const router = useRouter();
const slot = useSlot();
const grades = useGrade();
const user = JSON.parse(localStorage.getItem("user"));
const slotId = computed(() => route.params.slotId);
const start = computed(() => route.params.start);
const formattedStart = computed(() => new Date(start.value).toLocaleString());
const thisSlot = ref(null);
const gradeList = ref([]);
const grade = ref("");
const comment = ref("");
const bonus = ref("");
const penalty = ref("");
const selectedMember = ref(null);
const thisMember = ref(null);
const thisGradeLog = ref([]);
const gradeLogMsg = ref("");
const slotMsg = ref("");

// modal state
const showModal = ref(false);
const closeModal = () => {
  showModal.value = false;
  thisMember.value = null;
};
//get slot member
const getSlotmember = async () => {
  await slot.getSlotMember(slotId.value);
};
//get member grade
const getGrade = async () => {
  await slot.getSlotMember(slotId.value);
  const rawList = toRaw(slot.slotMembers);
  await grades.getGrade(slotId.value, rawList);
  gradeList.value = grades.grades;
};
//selected member
const selectMember = (m) => {
  if (m.grade) {
    grade.value = m.grade;
  }
  if (m.comment) {
    comment.value = m.comment;
  }
  if (m.bonus) {
    bonus.value = m.bonus;
  }
  if (m.penalty) {
    penalty.value = m.penalty;
  }
  thisSlot.value = m;
  selectedMember.value = m.memberDetail;
  thisMember.value = m.memberDetail;
};
//add or update grade
const addOrUpdateGrade = async () => {
  if (!selectedMember) return;
  const gradeTime = new Date();
  await grades.addOrUpdateGrade(
    thisSlot.value.memberId,
    slotId.value,
    grade.value,
    bonus.value,
    penalty.value,
    comment.value,
    user.memberId,
    gradeTime
  );
  if (!grades.error) {
    closeModal();
    getGrade();
    getSlotmember();
  }
};
//go prev grade
const goPrev = () => {
  const currentIndex = slot.slot.findIndex(
    (s) => String(s.slotId) === String(slotId.value)
  );
  // If not found or already at the first slot, do nothing
  if (currentIndex <= 0) {
    slotMsg.value = "No previous slot";
    return;
  }

  const prevSlot = slot.slot[currentIndex - 1];

  router.push({
    name: "grade",
    params: {
      slotId: prevSlot.slotId,
      start: prevSlot.start,
    },
  });
};
//go next grade
const goNext = () => {
  const currentIndex = slot.slot.findIndex(
    (s) => String(s.slotId) === String(slotId.value)
  );

  // If not found or already at the first slot, do nothing
  if (currentIndex + 1 >= slot.slot.length) {
    slotMsg.value = "No next slot";
    return;
  }

  const nextSlot = slot.slot[currentIndex + 1];

  router.push({
    name: "grade",
    params: {
      slotId: nextSlot.slotId,
      start: nextSlot.start,
    },
  });
};
//show add modal
const showModalF = () => {
  console.log(selectedMember.value);
  if (!selectedMember.value) return;
  showModal.value = true;
};
//show grade edit log
const showLog = async () => {
  if (!selectedMember) return;
  await grades.showLog(slotId.value, thisMember.value.memberId);
  thisGradeLog.value = grades.gradeLog;
  if (grades.gradeLog.length <= 0) {
    gradeLogMsg.value = "No Log";
  }
};

const backToHome = () => {
  router.push({ name: "home" });
};

// Call automatically when page loads
onMounted(() => {
  getGrade();
  getSlotmember();
});

watch(
  slotId,
  () => {
    getGrade();
  },
  { immediate: true } // runs once on first load too
);
</script>
<template>
  <div class="page-wrapper">
    <header class="app-header">
      <h1>Grade Management</h1>
      <h4>SlotId - {{ slotId }}; Start - {{ formattedStart }}</h4>
      <button type="button" @click="backToHome">Back Home</button>
    </header>

    <section class="section">
      <div>
        <button type="button" @click="goPrev">Previous Slot</button>
        <button type="button" @click="goNext">Next Slot</button>
        <button type="button" @click="showModalF">Grade</button>
        <button type="button" @click="showLog">Show Log</button>
      </div>

      <p v-if="slotMsg">{{ slotMsg }}</p>
      <div class="results" v-if="gradeList.length">
        <table class="table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Member Id</th>
              <th>Name</th>
              <th>Role</th>
              <th>Grade</th>
              <th>Bonus</th>
              <th>Penalty</th>
              <th>Comment</th>
              <th>TA name</th>
              <th>Grade Time</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in gradeList"
              :key="m.memberId && m.slotId"
              @click="selectMember(m)"
            >
              <td>
                <input
                  type="radio"
                  name="selectedMember"
                  :checked="
                    selectedMember && selectedMember.memberId === m.memberId
                  "
                  @change.stop="selectMember(m)"
                />
              </td>
              <td>{{ m.memberId }}</td>
              <td>
                {{ m.memberDetail.firstName + " " + m.memberDetail.lastName }}
              </td>
              <td>{{ m.memberDetail.role }}</td>
              <td>{{ m.grade }}</td>
              <td>{{ m.bonus }}</td>
              <td>{{ m.penalty }}</td>
              <td>{{ m.comment }}</td>
              <td>{{ m.taName }}</td>
              <td>{{ new Date(m.gradeTime).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="gradeLogMsg">{{ gradeLogMsg }}</p>
      <div class="results" v-if="thisGradeLog.length">
        <table class="table">
          <thead>
            <tr>
              <th>TA name</th>
              <th>Grade Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in thisGradeLog">
              <td>{{ g.taId }}</td>
              <td>{{ g.gradeTime }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <!-- Modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <h3>
          Grade For:
          {{ thisMember?.firstName }}
          {{ thisMember?.lastName }}
          ({{ thisMember?.memberId }})
        </h3>
        <p v-if="grades.error" class="error">{{ grades.error }}</p>
        <p v-if="grades.message">{{ grades.message }}</p>
        <div class="modal-field">
          <label>Add Or Update</label>
          <input
            v-model="grade"
            type="number"
            min="0"
            max="99"
            placeholder="e.g., 85"
          />
        </div>

        <div class="modal-field">
          <label>Bonus</label>
          <input v-model="bonus" type="number" placeholder="e.g., 2" />
        </div>

        <div class="modal-field">
          <label>Penalty</label>
          <input v-model="penalty" type="number" placeholder="e.g., -1" />
        </div>

        <div class="modal-field">
          <label>Comment</label>
          <textarea
            v-model="comment"
            maxlength="500"
            placeholder="Comment..."
            required="true"
          ></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" @click="closeModal">Cancel</button>
          <button type="button" @click="addOrUpdateGrade">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>
