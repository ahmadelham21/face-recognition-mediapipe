<template>
  <div class="status-item">
    <p style="padding-right: 10px">{{ text }}</p>
    <div
      class="circle"
      :style="{
        backgroundColor: expression ? 'green' : 'red',
      }"
    ></div>
  </div>
</template>

<script>
export default {
  name: "Indicator",
  props: {
    text: {
      type: String,
      required: true,
    },
    expression: {
      type: Boolean,
      required: true,
    },
  },
};
</script>

<style scoped>
/* Tambahkan gaya khusus jika diperlukan */
.status p {
  font-size: 14px; /* Ubah nilai ini sesuai keinginan Anda */
}
.status-item {
  display: flex;
  align-items: center;
}

.circle {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  margin-right: 10px;
}
</style>
