import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

export default defineNuxtPlugin(async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    outputFaceBlendshapes: true,
    runningMode: "IMAGE",
    numFaces: 1,
  });

  //   console.log(faceLandmarker, "halooooo");

  return {
    provide: {
      faceLandmarker,
    },
  };
});
