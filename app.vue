<template>
  <div>
    <video ref="video" autoplay playsinline muted></video>
    <canvas ref="canvas"></canvas>

    <!-- <div v-if="state.neutralLandmarks">
      <ul>
        <li v-for="category in state.neutralLandmarks" :key="category.index">
          {{ category.categoryName }} :
          {{ category.score.toFixed(5) }}
        </li>
      </ul>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div> -->
    <div class="status">
      <Indicator
        text="tersenyum"
        :expression="state.expression.tersenyum"
      ></Indicator>
      <Indicator
        text="berkedip"
        :expression="state.expression.berkedip"
      ></Indicator>
      <Indicator
        text="Menoleh kiri"
        :expression="state.expression.posisiKiri"
      ></Indicator>
      <Indicator
        text="Menoleh kanan"
        :expression="state.expression.posisiKanan"
      ></Indicator>

      <!-- <p>koordinat : {{ state.neutralLandmarks.jawOpen }}</p> -->
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";

const video = ref(null);
const canvas = ref(null);

const state = reactive({
  checked: {
    smile: false,
    blink: false,
    center: false,
    left: false,
    right: false,
    nod: false,
  },
  position: {
    x: 0,
    y: 0,
    z: 0,
  },
  expression: {
    posisiTengah: null,
    tersenyum: false,
    berkedip: false,
    posisiKanan: false,
    posisiKiri: false,
    mengangguk: false,
  },
  smileDuration: 0,
  isSmiling: false,
  smileStartTime: null,
  Liveness: false,
  faceMovement: "Tidak ada",
  previousNosePosition: null,
  blinkStartTime: null,
  isBlinking: false,
  neutralLandmarks: null,
  setNeutral: false,
  centerPositionStartTime: null,
  photoCaptured: false,
});

const uploadToTelegram = (photoDataUrl) => {
  const botToken = ""; // Ganti dengan token bot Anda
  const chatId = ""; // Ganti dengan ID chat tujuan
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

  // Mengonversi Data URL ke Blob
  const base64Data = photoDataUrl.split(",")[1];
  const binaryData = atob(base64Data);
  const arrayBuffer = new Uint8Array(binaryData.length);
  for (let i = 0; i < binaryData.length; i++) {
    arrayBuffer[i] = binaryData.charCodeAt(i);
  }
  const blob = new Blob([arrayBuffer], { type: "image/png" });

  // Membuat FormData untuk mengirim data file
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("photo", blob, "captured-photo.png");

  // Mengirim Permintaan POST ke API Telegram
  fetch(url, {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.ok) {
        console.log("Foto berhasil diunggah ke Telegram!");
      } else {
        console.error("Gagal mengunggah foto:", data.description);
      }
    })
    .catch((error) => {
      console.error("Terjadi kesalahan saat mengunggah foto:", error);
    });
};

const calibrate = async () => {
  try {
    const videoElement = video.value;
    const { $detector } = useNuxtApp();
    const detector = $detector;

    if (!detector || !videoElement) {
      console.error("Detector atau elemen video tidak ditemukan.");
      return;
    }

    const faces = await detector.estimateFaces(videoElement, {
      flipHorizontal: false,
    });

    state.neutralLandmarks = faces[0].keypoints[1];
    state.setNeutral = true;
    console.log(state.neutralLandmarks);
  } catch (e) {
    console.error("Error in detecting faces:", e);
  } // Reset kalibrasi
};

const capturePhoto = () => {
  const canvasElement = canvas.value;
  const videoElement = video.value;

  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  const context = canvasElement.getContext("2d");
  // Terapkan efek cermin dengan membalik skala horizontal
  context.save(); // Simpan state awal
  context.scale(-1, 1); // Balik horizontal
  context.drawImage(
    videoElement,
    -videoElement.videoWidth, // Pindahkan posisi gambar ke kiri
    0,
    videoElement.videoWidth,
    videoElement.videoHeight
  );
  context.restore(); // Kembalikan state awal untuk operasi berikutnya

  const dataURL = canvasElement.toDataURL("image/png");
  console.log("Foto captured:", dataURL);
  // uploadToTelegram(dataURL); // Upload ke Telegram

  // Anda bisa mengunggah dataURL ke server atau memproses lebih lanjut
};

const checkLiveness = () => {
  if (state.expression.tersenyum) {
    state.checked.smile = true;
  }
  if (state.expression.berkedip) {
    state.checked.blink = true;
  }
  if (state.expression.posisiTengah) {
    state.checked.center = true;
  }
  if (state.expression.posisiKanan) {
    state.checked.right = true;
  }
  if (state.expression.posisiKiri) {
    state.checked.left = true;
  }
  if (state.expression.mengangguk) {
    state.checked.nod = true;
  }

  const allChecked = Object.values(state.checked).every(
    (value) => value === true
  );

  // if (allChecked && !state.photoCaptured) {
  //   console.log("Semua kondisi terpenuhi, capturing foto...");
  //   capturePhoto();
  //   state.photoCaptured = true; // Menandai bahwa foto sudah diambil
  // }
  if (state.checked.smile && !state.photoCaptured) {
    capturePhoto();
    state.photoCaptured = true;
  }
};

const detectLandmarks = async (detector, videoElement, context) => {
  if (!detector) {
    console.error("Detector is not initialized.");
    return;
  }

  try {
    const landmarks = await detector.detect(videoElement);
    // console.log(landmarks.faceLandmarks);
    if (landmarks.faceBlendshapes[0]) {
      const faces = landmarks.faceBlendshapes[0].categories;
      state.neutralLandmarks = faces.reduce((acc, { categoryName, score }) => {
        acc[categoryName] = score;
        return acc;
      }, {});

      // state.expression.berkedip = state.neutralLandmarks.eyeBlinkLeft > 0.4;
      state.expression.berkedip = computed(
        () =>
          state.neutralLandmarks.eyeBlinkLeft > 0.4 &&
          state.neutralLandmarks.eyeBlinkRight > 0.4
      );

      state.expression.tersenyum = computed(
        () =>
          state.neutralLandmarks.mouthSmileLeft > 0.1 ||
          state.neutralLandmarks.mouthSmileRight > 0.1
      );

      state.expression.posisiKiri = computed(
        () => state.neutralLandmarks.jawLeft > 0.005
      );

      state.expression.posisiKanan = state.neutralLandmarks.jawRight > 0.001;

      state.expression.mengangguk = computed(
        () => state.expression.jawOpen > 0.0001
      );
    }

    // faces.forEach((face) => {
    //   face.keypoints
    //     // .filter(
    //     //   (keypoint, index) =>
    //     //     (keypoint.name === "lips" && (index === 61 || index === 308)) ||
    //     //     (keypoint.name === "rightEye" &&
    //     //       (index === 159 || index === 144)) ||
    //     //     (keypoint.name === "leftEye" && (index === 386 || index === 373)) ||
    //     //     index === 1
    //     //   // Hanya pilih indeks 61 dan 291
    //     // )
    //     .forEach((keypoint) => {
    //       const [x, y] = [keypoint.x, keypoint.y];
    //       context.beginPath();
    //       context.arc(x, y, 2, 0, 2 * Math.PI);
    //       context.fillStyle = "red";
    //       context.fill();
    //     });

    //   const keypoints = face.keypoints;

    //   state.expression.tersenyum = smileCheck(
    //     keypoints,
    //     state.expression.tersenyum
    //   );

    //   // if (isCurrentlySmiling) {
    //   //   if (!state.isSmiling) {
    //   //     state.expression.tersenyum = true;
    //   //     state.smileStartTime = Date.now();
    //   //   } else {
    //   //     state.smileDuration = (Date.now() - state.smileStartTime) / 1000;
    //   //   }
    //   // } else {
    //   //   state.expression.tersenyum = false;
    //   //   state.smileStartTime = null;
    //   //   state.smileDuration = 0;
    //   //   state.faceMovement = "Tidak ada";
    //   // }

    //   state.expression.berkedip = blinkingCheck(keypoints);

    //   const nose = keypoints[1];

    //   // state.position = nose;

    //   state.expression.posisiTengah = nose.z >= -64 && nose.z <= -52;

    //   if (state.neutralLandmarks) {
    //     if (state.neutralLandmarks.x - nose.x < -50) {
    //       state.expression.posisiKiri = true;
    //     } else {
    //       state.expression.posisiKiri = false;
    //     }

    //     if (state.neutralLandmarks.x - nose.x > 50) {
    //       state.expression.posisiKanan = true;
    //     } else {
    //       state.expression.posisiKanan = false;
    //     }

    //     if (state.neutralLandmarks.y - nose.y < -5) {
    //       state.expression.mengangguk = true;
    //     } else {
    //       state.expression.mengangguk = false;
    //     }
    //   }

    //   // if (state.expression.posisiTengah) {
    //   //   if (!state.setNeutral) {
    //   //     calibrate();
    //   //   }
    //   // } else {
    //   //   state.setNeutral = false;
    //   //   state.neutralLandmarks = null;
    //   // }

    //   // console.log(keypoints.filter((keypoint) => keypoint.name === "lips"));

    //   // const rightEyeIndicate = [];
    //   // keypoints.forEach((keypoint, index) => {
    //   //   if (keypoint.name === "leftEye") {
    //   //     rightEyeIndicate.push(index); // Menambahkan indeks yang memenuhi kondisi
    //   //   }
    //   // });

    //   // console.log("mata kanan", keypoints[1]);
    // });

    // checkLiveness();
  } catch (error) {
    console.error("Error detecting landmarks:", error);
  }

  requestAnimationFrame(() => detectLandmarks(detector, videoElement, context));
};

onMounted(async () => {
  const videoElement = video.value;
  const canvasElement = canvas.value;
  const context = canvasElement.getContext("2d");

  const { $faceLandmarker } = useNuxtApp();
  const detector = $faceLandmarker;

  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    videoElement.srcObject = stream;

    videoElement.addEventListener("loadeddata", async () => {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      detectLandmarks(detector, videoElement, context);
    });
  });
});
</script>

<style scoped>
video,
canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px; /* Ukuran diameter lingkaran */
  height: 360px; /* Sama dengan width untuk bentuk bulat */
  transform: translate(-50%, -50%) scaleX(-1); /* Memusatkan dan membalik */
  border-radius: 50%; /* Membuat elemen menjadi bulat */
  object-fit: cover; /* Memastikan isi sesuai tanpa distorsi */
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); /* Opsional: Efek bayangan */
}

.controls {
  position: absolute;
  top: 20px;
  left: 20px;
}

.status {
  position: absolute;
  bottom: 20px;
  left: 20px;
  color: white;
  font-size: 18px;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 10px;
  border-radius: 5px;
}

.click-button {
  position: absolute;
  top: 50px;
  left: 50px;
  z-index: 1000; /* Menambahkan z-index agar tombol berada di atas elemen lain */
  background-color: #4caf50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.click-button:hover {
  background-color: #45a049;
}
.center-line {
  position: absolute;
  background-color: red; /* Warna garis tengah */
  z-index: 999; /* Pastikan garis berada di atas elemen lain */
}

.center-line.vertical {
  top: 0;
  left: 50%;
  height: 100%;
  width: 2px; /* Ketebalan garis vertikal */
  transform: translateX(-50%); /* Agar garis pas di tengah secara horizontal */
}

.center-line.horizontal {
  top: 50%;
  left: 0;
  width: 100%;
  height: 2px; /* Ketebalan garis horizontal */
  transform: translateY(-50%); /* Agar garis pas di tengah secara vertikal */
}
.status-circle-green {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: green;
  display: inline-block;
  margin-left: 10px;
}

.status-circle-red {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: red;
  display: inline-block;
  margin-left: 10px;
}
</style>
