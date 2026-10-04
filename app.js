const VISION_VERSION = "0.10.14";
const VISION_MODULE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}`;
const VISION_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`;
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const video = document.getElementById("camera");
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d", { alpha: false });

const els = {
  appShell: document.getElementById("appShell"),
  startCamera: document.getElementById("startCamera"),
  calibrateInput: document.getElementById("calibrateInput"),
  startTask: document.getElementById("startTask"),
  endTask: document.getElementById("endTask"),
  resetSession: document.getElementById("resetSession"),
  toCameraSettings: document.getElementById("toCameraSettings"),
  backHome: document.getElementById("backHome"),
  backSettingsFromCamera: document.getElementById("backSettingsFromCamera"),
  backSettings: document.getElementById("backSettings"),
  resultHome: document.getElementById("resultHome"),
  retryTask: document.getElementById("retryTask"),
  message: document.getElementById("message"),
  trackingStatus: document.getElementById("trackingStatus"),
  aiDot: document.getElementById("aiDot"),
  aiStatus: document.getElementById("aiStatus"),
  selectedTaskTitle: document.getElementById("selectedTaskTitle"),
  selectedTaskLead: document.getElementById("selectedTaskLead"),
  difficulty: document.getElementById("difficulty"),
  goalType: document.getElementById("goalType"),
  goalCount: document.getElementById("goalCount"),
  goalSeconds: document.getElementById("goalSeconds"),
  customSettings: document.getElementById("customSettings"),
  detailSettings: document.getElementById("detailSettings"),
  holdSeconds: document.getElementById("holdSeconds"),
  shiftRange: document.getElementById("shiftRange"),
  targetSize: document.getElementById("targetSize"),
  reachMode: document.getElementById("reachMode"),
  fallObject: document.getElementById("fallObject"),
  fallSpeed: document.getElementById("fallSpeed"),
  fallCount: document.getElementById("fallCount"),
  reachRadius: document.getElementById("reachRadius"),
  reachRadiusMirror: document.getElementById("reachRadiusMirror"),
  invaderMotion: document.getElementById("invaderMotion"),
  trailShape: document.getElementById("trailShape"),
  trailPlacement: document.getElementById("trailPlacement"),
  trailSpeed: document.getElementById("trailSpeed"),
  brushSize: document.getElementById("brushSize"),
  shipWave: document.getElementById("shipWave"),
  treasurePlacement: document.getElementById("treasurePlacement"),
  holdValue: document.getElementById("holdValue"),
  rangeValue: document.getElementById("rangeValue"),
  targetSizeValue: document.getElementById("targetSizeValue"),
  fallSpeedValue: document.getElementById("fallSpeedValue"),
  fallCountValue: document.getElementById("fallCountValue"),
  reachValue: document.getElementById("reachValue"),
  reachValueTreasure: document.getElementById("reachValueTreasure"),
  trailSpeedValue: document.getElementById("trailSpeedValue"),
  brushValue: document.getElementById("brushValue"),
  scoreReadout: document.getElementById("scoreReadout"),
  hitReadout: document.getElementById("hitReadout"),
  timeReadout: document.getElementById("timeReadout"),
  resultCurrent: document.getElementById("resultCurrent"),
  resultCurrentDetail: document.getElementById("resultCurrentDetail"),
  resultNext: document.getElementById("resultNext"),
  resultNextDetail: document.getElementById("resultNextDetail"),
  resultTraining: document.getElementById("resultTraining"),
  resultTrainingDetail: document.getElementById("resultTrainingDetail"),
  resultExpert: document.getElementById("resultExpert"),
  resultExpertDetail: document.getElementById("resultExpertDetail"),
  taskCards: Array.from(document.querySelectorAll("[data-task]")),
  modeSettings: Array.from(document.querySelectorAll("[data-settings]")),
  screenPanels: Array.from(document.querySelectorAll("[data-screen-panel]")),
  reachDetails: Array.from(document.querySelectorAll("[data-reach-kind]")),
  wheelPickers: Array.from(document.querySelectorAll("[data-picker-target]")),
};

const presets = {
  easy: {
    hold: 0.7,
    range: 22,
    target: 48,
    fallSpeed: 0.75,
    fallCount: 1,
    reach: 58,
    trailSpeed: 0.45,
    brush: 66,
    shipWave: "calm",
  },
  normal: {
    hold: 1.0,
    range: 28,
    target: 38,
    fallSpeed: 1.0,
    fallCount: 2,
    reach: 48,
    trailSpeed: 0.7,
    brush: 54,
    shipWave: "normal",
  },
  hard: {
    hold: 1.4,
    range: 34,
    target: 30,
    fallSpeed: 1.35,
    fallCount: 3,
    reach: 40,
    trailSpeed: 0.95,
    brush: 44,
    shipWave: "strong",
  },
};

const taskNames = {
  fall: "落下リーチ",
  invader: "ターゲット退治",
  hold: "だるまさん保持",
  trail: "追いかけロード",
  wipe: "窓ふきリーチ",
  ship: "船バランス",
  treasure: "宝箱リーチ",
};

const taskPackages = {
  reach: {
    label: "リーチチャレンジ",
    lead: "落下・宝箱・窓ふきから、手を伸ばす課題を選びます。",
  },
  invader: {
    label: "ターゲット退治",
    lead: "体の入力点をターゲットに重ね、重心移動で狙う課題です。",
  },
  hold: {
    label: "だるまさん保持",
    lead: "移動した後に指定位置で止まり、姿勢を保つ課題です。",
  },
  ship: {
    label: "船バランス",
    lead: "ランダムに傾く船を、重心移動で水平に戻す課題です。",
  },
  trail: {
    label: "追いかけロード",
    lead: "丸や棒をゆっくり追い、連続的な重心移動を練習します。",
  },
};

const state = {
  view: { w: 960, h: 540, ratio: 1 },
  cameraReady: false,
  screen: "home",
  taskKey: "reach",
  mode: "fall",
  phase: "idle",
  countdown: 0,
  sessionTime: 0,
  score: 0,
  hits: 0,
  misses: 0,
  ai: {
    status: "loading",
    error: "",
    pose: null,
    hand: null,
    lastVideoTime: -1,
  },
  estimates: {
    aim: null,
    balance: null,
    upper: null,
    hands: [],
    posture: "unknown",
    poseConfidence: 0,
    handConfidence: 0,
  },
  input: {
    point: null,
    source: "manual",
    confidence: 0,
    movement: 0,
  },
  neutral: {
    aim: null,
    balance: null,
    upper: null,
    manual: null,
  },
  calibrationCaptured: false,
  manualX: 0.5,
  manualY: 0.55,
  controlX: 0.5,
  controlY: 0.5,
  keys: new Set(),
  stats: makeStats(),
  fall: { items: [], spawnClock: 0, bursts: [] },
  invader: { targets: [], spawnClock: 0, bursts: [] },
  hold: { target: null, hold: 0 },
  trail: { phase: 0, target: { x: 0.5, y: 0.5 }, creditClock: 0 },
  wipe: { cells: [], cols: 22, rows: 14, cleared: 0, ready: false },
  ship: { targetTilt: 0, tilt: 0, hold: 0, changeClock: 0, bursts: [] },
  treasure: { targets: [], spawnClock: 0, bursts: [] },
  lastFrame: performance.now(),
  lastInputTick: performance.now(),
};

function makeStats() {
  return {
    samples: 0,
    sumX: 0,
    sumY: 0,
    leftTime: 0,
    rightTime: 0,
    upTime: 0,
    downTime: 0,
    steadyTime: 0,
    maxLeft: 0,
    maxRight: 0,
    maxUp: 0,
    maxDown: 0,
    hitLeft: 0,
    hitRight: 0,
    missLeft: 0,
    missRight: 0,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  state.view = { w: rect.width, h: rect.height, ratio };
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function coverCrop(sourceW, sourceH, destW, destH) {
  if (!sourceW || !sourceH) return { sx: 0, sy: 0, sw: 1, sh: 1 };
  const sourceRatio = sourceW / sourceH;
  const destRatio = destW / destH;
  if (sourceRatio > destRatio) {
    const sw = sourceH * destRatio;
    return { sx: (sourceW - sw) / 2, sy: 0, sw, sh: sourceH };
  }
  const sh = sourceW / destRatio;
  return { sx: 0, sy: (sourceH - sh) / 2, sw: sourceW, sh };
}

function landmarkScore(landmark) {
  const visibility = landmark.visibility ?? 1;
  const presence = landmark.presence ?? 1;
  return clamp(Math.min(visibility, presence), 0, 1);
}

function isVisible(landmark, minScore = 0.28) {
  return Boolean(landmark) && landmarkScore(landmark) >= minScore;
}

function landmarkToStage(landmark) {
  const { w, h } = state.view;
  const crop = coverCrop(video.videoWidth, video.videoHeight, w, h);
  const rawX = landmark.x * video.videoWidth;
  const rawY = landmark.y * video.videoHeight;
  const unmirroredX = ((rawX - crop.sx) / crop.sw) * w;
  return {
    x: clamp(w - unmirroredX, 0, w),
    y: clamp(((rawY - crop.sy) / crop.sh) * h, 0, h),
    score: landmarkScore(landmark),
  };
}

function averagePoints(points) {
  if (!points.length) return null;
  const totalScore = points.reduce((sum, point) => sum + (point.score || 1), 0);
  const safeTotal = totalScore || points.length;
  return {
    x: points.reduce((sum, point) => sum + point.x * (point.score || 1), 0) / safeTotal,
    y: points.reduce((sum, point) => sum + point.y * (point.score || 1), 0) / safeTotal,
    score: clamp(totalScore / points.length, 0, 1),
  };
}

function averageLandmarks(landmarks, indices, minScore = 0.28) {
  const points = indices
    .map((index) => landmarks[index])
    .filter((landmark) => isVisible(landmark, minScore))
    .map(landmarkToStage);
  return averagePoints(points);
}

function drawMirroredVideo(targetCtx, w, h) {
  if (!state.cameraReady || video.readyState < 2) {
    targetCtx.fillStyle = "#070814";
    targetCtx.fillRect(0, 0, w, h);
    return;
  }
  const crop = coverCrop(video.videoWidth, video.videoHeight, w, h);
  targetCtx.save();
  targetCtx.translate(w, 0);
  targetCtx.scale(-1, 1);
  targetCtx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
  targetCtx.restore();
}

async function initAI() {
  setAIStatus("loading", "姿勢AI 読み込み中");
  try {
    const vision = await import(VISION_MODULE);
    const fileset = await vision.FilesetResolver.forVisionTasks(VISION_WASM);
    const [pose, hand] = await Promise.all([
      vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.45,
        minPosePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      }),
      vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.35,
        minHandPresenceConfidence: 0.35,
        minTrackingConfidence: 0.35,
      }),
    ]);
    state.ai.pose = pose;
    state.ai.hand = hand;
    state.ai.status = "ready";
    setAIStatus("ready", "姿勢AI 準備完了");
  } catch (error) {
    state.ai.status = "error";
    state.ai.error = error?.message || "読み込みに失敗しました";
    setAIStatus("error", "姿勢AI 読み込み失敗");
    showMessage("姿勢AIを読み込めません", "ネットワーク接続を確認してください。矢印キーでは動作確認できます。");
  }
}

function setAIStatus(status, label) {
  els.aiDot.classList.toggle("ready", status === "ready");
  els.aiDot.classList.toggle("error", status === "error");
  els.aiStatus.textContent = label;
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showMessage("このブラウザではカメラを利用できません", "localhost または HTTPS で開いてください");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    video.srcObject = stream;
    await video.play();
    state.cameraReady = true;
    els.startCamera.textContent = "カメラ動作中";
    els.startCamera.disabled = true;
    hideMessage();
  } catch (error) {
    showMessage("カメラを開始できません", error.message || "ブラウザの権限を確認してください");
  }
}

function updateTracking(now) {
  updateManualPosition();
  const canEstimate =
    state.cameraReady &&
    state.ai.status === "ready" &&
    state.ai.pose &&
    state.ai.hand &&
    video.readyState >= 2 &&
    video.currentTime !== state.ai.lastVideoTime;

  if (canEstimate) {
    state.ai.lastVideoTime = video.currentTime;
    try {
      const poseResult = state.ai.pose.detectForVideo(video, now);
      const handResult = state.ai.hand.detectForVideo(video, now);
      updateEstimatesFromResults(poseResult, handResult);
      autoCalibrateIfReady();
    } catch (error) {
      state.ai.status = "error";
      state.ai.error = error?.message || "推定中にエラーが発生しました";
      setAIStatus("error", "姿勢AI エラー");
    }
  } else if (!state.cameraReady || state.ai.status !== "ready") {
    state.estimates.poseConfidence = 0;
    state.estimates.handConfidence = 0;
    state.estimates.hands = [];
  }
  updateControlInput(now);
}

function updateEstimatesFromResults(poseResult, handResult) {
  const landmarks = poseResult.landmarks?.[0] || null;
  if (!landmarks) {
    state.estimates.aim = null;
    state.estimates.balance = null;
    state.estimates.upper = null;
    state.estimates.poseConfidence = Math.max(0, state.estimates.poseConfidence - 0.06);
    state.estimates.hands = handPointsFromHandLandmarker(handResult);
    state.estimates.handConfidence = confidenceFromHands(state.estimates.hands);
    return;
  }

  const aim = averageLandmarks(landmarks, [1, 4], 0.2) || averageLandmarks(landmarks, [0], 0.2);
  const shoulders = averageLandmarks(landmarks, [11, 12], 0.26);
  const hips = averageLandmarks(landmarks, [23, 24], 0.22);
  const knees = averageLandmarks(landmarks, [25, 26], 0.18);
  const ankles = averageLandmarks(landmarks, [27, 28], 0.16);
  const posture = estimatePosture(shoulders, hips, knees, ankles);
  const balance = estimateBalancePoint(shoulders, hips, posture);
  const upper = shoulders || aim;
  const hands = [...handPointsFromHandLandmarker(handResult), ...handPointsFromPose(landmarks)].filter(
    (point) => point.score > 0.18
  );

  state.estimates.aim = aim;
  state.estimates.balance = balance;
  state.estimates.upper = upper;
  state.estimates.hands = hands;
  state.estimates.posture = posture;
  state.estimates.poseConfidence = Math.max(aim?.score || 0, balance?.score || 0, upper?.score || 0);
  state.estimates.handConfidence = confidenceFromHands(hands);
}

function estimatePosture(shoulders, hips, knees, ankles) {
  const h = state.view.h || 1;
  if (hips && ankles && (ankles.y - hips.y) / h > 0.28) return "standing";
  if (hips && knees) {
    const legDrop = (knees.y - hips.y) / h;
    if (legDrop > 0.19) return "standing";
    if (legDrop > -0.04 && legDrop < 0.16) return "seated";
  }
  if (shoulders && hips) return (hips.y - shoulders.y) / h > 0.25 ? "standing" : "seated";
  return "unknown";
}

function estimateBalancePoint(shoulders, hips, posture) {
  if (shoulders && hips) {
    const mix = posture === "seated" ? 0.48 : 0.62;
    return {
      x: lerp(shoulders.x, hips.x, mix),
      y: lerp(shoulders.y, hips.y, mix),
      score: clamp((shoulders.score + hips.score) / 2, 0, 1),
    };
  }
  if (shoulders) {
    const offset = posture === "seated" ? 0.14 : 0.22;
    return {
      x: shoulders.x,
      y: clamp(shoulders.y + state.view.h * offset, 0, state.view.h),
      score: shoulders.score * 0.72,
    };
  }
  return null;
}

function handPointsFromPose(landmarks) {
  const hands = [];
  const left = averageLandmarks(landmarks, [15, 17, 19, 21], 0.18);
  const right = averageLandmarks(landmarks, [16, 18, 20, 22], 0.18);
  if (left) hands.push({ ...left, label: "left", source: "pose" });
  if (right) hands.push({ ...right, label: "right", source: "pose" });
  return hands;
}

function handPointsFromHandLandmarker(handResult) {
  const hands = [];
  const handLandmarks = handResult.landmarks || [];
  handLandmarks.forEach((landmarks, handIndex) => {
    const handedness = handResult.handednesses?.[handIndex]?.[0];
    const label = handedness?.displayName || handedness?.categoryName || `hand${handIndex + 1}`;
    const score = clamp(handedness?.score ?? 0.7, 0, 1);
    [0, 4, 8, 12, 16, 20].forEach((index) => {
      const point = landmarkToStage(landmarks[index]);
      hands.push({ ...point, score: Math.min(score, point.score || score), label, source: "hand" });
    });
  });
  return hands;
}

function confidenceFromHands(hands) {
  if (!hands.length) return 0;
  return clamp(Math.max(...hands.map((hand) => hand.score)), 0, 1);
}

function autoCalibrateIfReady() {
  if (state.calibrationCaptured || state.estimates.poseConfidence < 0.3) return;
  captureNeutralFromEstimates();
  state.calibrationCaptured = true;
}

function captureNeutralFromEstimates() {
  ["aim", "balance", "upper"].forEach((source) => {
    const point = state.estimates[source];
    if (point) state.neutral[source] = { x: point.x, y: point.y };
  });
  if (state.input.point) state.neutral[state.input.source] = { x: state.input.point.x, y: state.input.point.y };
}

function updateManualPosition() {
  const speed = 0.012;
  if (state.keys.has("ArrowLeft")) state.manualX -= speed;
  if (state.keys.has("ArrowRight")) state.manualX += speed;
  if (state.keys.has("ArrowUp")) state.manualY -= speed;
  if (state.keys.has("ArrowDown")) state.manualY += speed;
  state.manualX = clamp(state.manualX, 0.02, 0.98);
  state.manualY = clamp(state.manualY, 0.08, 0.92);
}

function desiredInputSource() {
  if (state.mode === "invader") return "aim";
  if (state.mode === "fall" || state.mode === "wipe" || state.mode === "treasure") return "balance";
  return state.estimates.posture === "seated" ? "upper" : "balance";
}

function updateControlInput(now) {
  const keyboardActive = isKeyboardActive();
  const desiredSource = desiredInputSource();
  const estimatedPoint = state.estimates[desiredSource];
  const useManual =
    keyboardActive ||
    !estimatedPoint ||
    estimatedPoint.score < 0.18 ||
    !state.cameraReady ||
    state.ai.status !== "ready";
  const source = useManual ? "manual" : desiredSource;
  const point = useManual
    ? {
        x: state.manualX * state.view.w,
        y: state.manualY * state.view.h,
        score: keyboardActive ? 0.72 : 0.1,
      }
    : estimatedPoint;
  setControlPoint(point, source, now);
}

function isKeyboardActive() {
  return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].some((key) => state.keys.has(key));
}

function setControlPoint(point, source, now) {
  const sourceChanged = state.input.source !== source;
  const previous = sourceChanged ? null : state.input.point;
  const next = previous
    ? { x: lerp(previous.x, point.x, 0.38), y: lerp(previous.y, point.y, 0.38), score: point.score }
    : point;
  const dt = Math.max(0.016, (now - state.lastInputTick) / 1000);

  if (previous) {
    const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
    state.input.movement = lerp(state.input.movement, distance / dt, 0.22);
  } else {
    state.input.movement = 0;
  }

  state.lastInputTick = now;
  state.input.point = next;
  state.input.source = source;
  state.input.confidence = lerp(state.input.confidence, point.score || 0, 0.24);
  if (!state.neutral[source]) state.neutral[source] = { x: next.x, y: next.y };

  const neutral = state.neutral[source] || { x: state.view.w / 2, y: state.view.h * 0.55 };
  const seated = state.estimates.posture === "seated";
  const rangeX = state.view.w * (Number(els.shiftRange.value) / 100) * (seated ? 0.82 : 1);
  const rangeY = state.view.h * (Number(els.shiftRange.value) / 100) * (seated ? 0.62 : 0.82);
  state.controlX = clamp(0.5 + (next.x - neutral.x) / (2 * rangeX), 0, 1);
  state.controlY = clamp(0.5 + (next.y - neutral.y) / (2 * rangeY), 0, 1);
}

function calibrateInput() {
  captureNeutralFromEstimates();
  if (state.input.point) state.neutral[state.input.source] = { x: state.input.point.x, y: state.input.point.y };
  state.controlX = 0.5;
  state.controlY = 0.5;
  state.calibrationCaptured = true;
}

function applyDifficultyPreset() {
  if (els.customSettings.checked) {
    updateCustomFields();
    return;
  }
  const preset = presets[els.difficulty.value] || presets.normal;
  els.holdSeconds.value = String(preset.hold);
  els.shiftRange.value = String(preset.range);
  els.targetSize.value = String(preset.target);
  els.fallSpeed.value = String(preset.fallSpeed);
  els.fallCount.value = String(preset.fallCount);
  els.reachRadius.value = String(preset.reach);
  if (els.reachRadiusMirror) els.reachRadiusMirror.value = String(preset.reach);
  els.trailSpeed.value = String(preset.trailSpeed);
  els.brushSize.value = String(preset.brush);
  if (els.shipWave) els.shipWave.value = preset.shipWave;
  updateCustomFields();
}

function updateCustomFields() {
  const enabled = els.customSettings.checked;
  els.detailSettings.hidden = !enabled;
  [
    els.holdSeconds,
    els.shiftRange,
    els.targetSize,
    els.fallSpeed,
    els.fallCount,
    els.reachRadius,
    els.reachRadiusMirror,
    els.trailSpeed,
    els.brushSize,
  ].filter(Boolean).forEach((input) => {
    input.disabled = !enabled;
  });
}

function initWheelPickers() {
  els.wheelPickers.forEach((picker) => {
    const min = Number(picker.dataset.min);
    const max = Number(picker.dataset.max);
    const step = Number(picker.dataset.step || 1);
    const unit = picker.dataset.unit || "";
    const target = document.getElementById(picker.dataset.pickerTarget);
    if (!target) return;

    picker.replaceChildren();
    for (let value = min; value <= max; value += step) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "wheel-option";
      option.dataset.value = String(value);
      option.setAttribute("role", "option");
      option.textContent = `${value}${unit}`;
      option.addEventListener("click", () => setWheelValue(picker, value, true));
      picker.append(option);
    }

    let timer = 0;
    picker.addEventListener("scroll", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => syncWheelFromScroll(picker), 90);
    });
    setWheelValue(picker, Number(target.value || min), false);
  });
}

function setWheelValue(picker, value, shouldScroll) {
  const target = document.getElementById(picker.dataset.pickerTarget);
  if (!target) return;
  const options = Array.from(picker.querySelectorAll(".wheel-option"));
  const closest = options.reduce((best, option) => {
    const distance = Math.abs(Number(option.dataset.value) - value);
    return !best || distance < best.distance ? { option, distance } : best;
  }, null)?.option;
  if (!closest) return;
  target.value = closest.dataset.value;
  options.forEach((option) => {
    const selected = option === closest;
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-selected", String(selected));
  });
  if (shouldScroll) {
    closest.scrollIntoView({ block: "center", behavior: "smooth" });
  } else {
    requestAnimationFrame(() => closest.scrollIntoView({ block: "center" }));
  }
}

function syncWheelFromScroll(picker) {
  const pickerCenter = picker.getBoundingClientRect().top + picker.clientHeight / 2;
  const options = Array.from(picker.querySelectorAll(".wheel-option"));
  const closest = options.reduce((best, option) => {
    const rect = option.getBoundingClientRect();
    const distance = Math.abs(rect.top + rect.height / 2 - pickerCenter);
    return !best || distance < best.distance ? { option, distance } : best;
  }, null)?.option;
  if (closest) setWheelValue(picker, Number(closest.dataset.value), false);
}

function refreshWheelPickers() {
  els.wheelPickers.forEach((picker) => {
    const target = document.getElementById(picker.dataset.pickerTarget);
    if (target) setWheelValue(picker, Number(target.value), false);
  });
}

function modeForTask(taskKey) {
  return taskKey === "reach" ? els.reachMode.value : taskKey;
}

function currentTaskLabel() {
  return state.taskKey === "reach"
    ? `${taskPackages.reach.label}：${taskNames[state.mode]}`
    : taskPackages[state.taskKey]?.label || taskNames[state.mode];
}

function selectTask(taskKey, nextScreen = "settings") {
  state.taskKey = taskKey;
  state.mode = modeForTask(taskKey);
  state.phase = "idle";
  state.input.point = null;
  els.taskCards.forEach((button) => button.classList.toggle("active", button.dataset.task === taskKey));
  updateSelectedTaskCopy();
  setScreen(nextScreen);
  updateSettingsVisibility();
  resetTaskState();
  setResultIdle();
  showMessage(currentTaskLabel(), "設定を確認し、課題開始を押すと3カウント後に始まります");
}

function updateSelectedTaskCopy() {
  const task = taskPackages[state.taskKey] || taskPackages.reach;
  els.selectedTaskTitle.textContent = task.label;
  els.selectedTaskLead.textContent = task.lead;
}

function setScreen(screen) {
  state.screen = screen;
  els.appShell.dataset.screen = screen;
  els.screenPanels.forEach((panel) => {
    const screens = (panel.dataset.screenPanel || "").split(/\s+/);
    panel.hidden = !screens.includes(screen);
  });
  if (screen === "camera" || screen === "play") requestAnimationFrame(resizeCanvas);
  if (screen === "settings") requestAnimationFrame(refreshWheelPickers);
  updateSettingsVisibility();
}

function updateSettingsVisibility() {
  els.modeSettings.forEach((section) => {
    section.hidden = section.dataset.settings !== state.taskKey || state.screen !== "settings";
  });
  updateReachSettingsVisibility();
}

function updateReachSettingsVisibility() {
  els.reachDetails.forEach((section) => {
    section.hidden = section.dataset.reachKind !== state.mode;
  });
}

function changeReachMode() {
  if (state.taskKey !== "reach") return;
  state.mode = els.reachMode.value;
  updateSelectedTaskCopy();
  updateSettingsVisibility();
  resetTaskState();
  setResultIdle();
  showMessage(currentTaskLabel(), "設定を確認し、課題開始を押すと3カウント後に始まります");
}

function syncReachRadius(source) {
  if (!els.reachRadiusMirror) return;
  if (source === "mirror") els.reachRadius.value = els.reachRadiusMirror.value;
  else els.reachRadiusMirror.value = els.reachRadius.value;
}

function goHome() {
  state.phase = "idle";
  state.countdown = 0;
  resetTaskState();
  setResultIdle();
  setScreen("home");
}

function goSettings() {
  state.phase = "idle";
  state.countdown = 0;
  resetTaskState();
  setResultIdle();
  setScreen("settings");
  showMessage(currentTaskLabel(), "設定を確認し、課題開始を押すと3カウント後に始まります");
}

function goCameraSettings() {
  state.mode = modeForTask(state.taskKey);
  state.phase = "idle";
  state.countdown = 0;
  resetTaskState();
  setResultIdle();
  setScreen("camera");
  showMessage("カメラ設定", "カメラを開始し、正面を向いてこの姿勢を基準にしてください");
}

function resetTaskState() {
  state.fall = { items: [], spawnClock: 0, bursts: [] };
  state.invader = { targets: [], spawnClock: 0, bursts: [] };
  state.hold = { target: null, hold: 0 };
  state.trail = { phase: 0, target: { x: 0.5, y: 0.5 }, creditClock: 0 };
  state.ship = { targetTilt: 0, tilt: 0, hold: 0, changeClock: 0, bursts: [] };
  state.treasure = { targets: [], spawnClock: 0, bursts: [] };
  initWipe();
  nextHoldTarget();
  nextShipTilt();
}

function startTask() {
  state.mode = modeForTask(state.taskKey);
  setScreen("play");
  state.phase = "countdown";
  state.countdown = 3.2;
  state.sessionTime = 0;
  state.score = 0;
  state.hits = 0;
  state.misses = 0;
  state.stats = makeStats();
  resetTaskState();
  calibrateInput();
  hideMessage();
  setResultIdle();
}

function endTask(reason = "manual") {
  if (state.phase === "finished") return;
  state.phase = "finished";
  state.countdown = 0;
  buildResultSummary(reason);
  setScreen("result");
}

function resetSession() {
  state.phase = "idle";
  state.countdown = 0;
  state.sessionTime = 0;
  state.score = 0;
  state.hits = 0;
  state.misses = 0;
  state.stats = makeStats();
  resetTaskState();
  setResultIdle();
  setScreen("settings");
  showMessage(currentTaskLabel(), "設定を確認し、課題開始を押すと3カウント後に始まります");
}

function setResultIdle() {
  els.resultCurrent.textContent = "まだ結果はありません";
  els.resultCurrentDetail.textContent = "課題終了後に表示します。";
  els.resultNext.textContent = `${difficultyName()}で開始`;
  els.resultNextDetail.textContent = "成功数や左右差から自動で提案します。";
  els.resultTraining.textContent = currentTaskLabel();
  els.resultTrainingDetail.textContent = "課題設定を確認すると、推奨訓練も切り替わります。";
  if (els.resultExpert) els.resultExpert.textContent = "左右差と保持を確認";
  if (els.resultExpertDetail) {
    els.resultExpertDetail.textContent = "課題終了後に、反応側・保持安定性・次の課題候補を表示します。";
  }
}

function difficultyName() {
  return els.difficulty.options[els.difficulty.selectedIndex]?.textContent || "ふつう";
}

function updateGame(dt) {
  if (state.phase === "countdown") {
    state.countdown -= dt;
    if (state.countdown <= 0) {
      state.phase = "active";
      state.sessionTime = 0;
    }
    return;
  }
  if (state.phase !== "active") return;

  state.sessionTime += dt;
  recordBalanceSample(dt);
  if (state.mode === "fall") updateFall(dt);
  if (state.mode === "invader") updateInvader(dt);
  if (state.mode === "hold") updateHold(dt);
  if (state.mode === "trail") updateTrail(dt);
  if (state.mode === "wipe") updateWipe(dt);
  if (state.mode === "ship") updateShip(dt);
  if (state.mode === "treasure") updateTreasure(dt);
  checkCompletion();
}

function checkCompletion() {
  if (state.mode === "wipe" && wipeProgress() >= 0.86) {
    endTask("clear");
    return;
  }
  if (els.goalType.value === "time" && state.sessionTime >= Number(els.goalSeconds.value)) {
    endTask("time");
    return;
  }
  if (els.goalType.value === "count" && state.hits >= Number(els.goalCount.value)) {
    endTask("count");
  }
}

function recordBalanceSample(dt) {
  const s = state.stats;
  const dx = state.controlX - 0.5;
  const dy = state.controlY - 0.5;
  s.samples += 1;
  s.sumX += dx;
  s.sumY += dy;
  if (dx < -0.08) s.leftTime += dt;
  if (dx > 0.08) s.rightTime += dt;
  if (dy < -0.08) s.upTime += dt;
  if (dy > 0.08) s.downTime += dt;
  if (state.input.movement < steadyThreshold() || state.input.source === "manual") s.steadyTime += dt;
  s.maxLeft = Math.max(s.maxLeft, clamp(-dx * 200, 0, 100));
  s.maxRight = Math.max(s.maxRight, clamp(dx * 200, 0, 100));
  s.maxUp = Math.max(s.maxUp, clamp(-dy * 200, 0, 100));
  s.maxDown = Math.max(s.maxDown, clamp(dy * 200, 0, 100));
}

function steadyThreshold() {
  if (els.difficulty.value === "easy") return 235;
  if (els.difficulty.value === "hard") return 146;
  return 188;
}

function recordOutcome(normX, success) {
  const s = state.stats;
  if (normX < 0.5) {
    if (success) s.hitLeft += 1;
    else s.missLeft += 1;
  } else if (success) {
    s.hitRight += 1;
  } else {
    s.missRight += 1;
  }
}

function activeHands() {
  const hands = state.estimates.hands.filter((hand) => hand.score > 0.2);
  if (hands.length) return hands;
  if (isKeyboardActive() || !state.cameraReady) {
    return [
      {
        x: state.manualX * state.view.w,
        y: state.manualY * state.view.h,
        score: 0.5,
        label: "manual",
        source: "manual",
      },
    ];
  }
  return [];
}

function updateFall(dt) {
  const maxItems = Number(els.fallCount.value);
  state.fall.spawnClock -= dt;
  if (state.fall.spawnClock <= 0 && state.fall.items.length < maxItems) {
    state.fall.spawnClock = (0.58 + Math.random() * 0.45) / Math.max(1, maxItems * 0.42);
    state.fall.items.push(spawnFallItem());
  }

  const hands = activeHands();
  const reach = Number(els.reachRadius.value);
  const kept = [];
  for (const item of state.fall.items) {
    item.y += item.speed * dt;
    item.spin += dt * 3;
    const ix = item.x * state.view.w;
    const touched = hands.find((hand) => Math.hypot(hand.x - ix, hand.y - item.y) < item.r + reach);
    if (touched) {
      if (item.hazard) {
        state.score = Math.max(0, state.score - 10);
        state.misses += 1;
        recordOutcome(item.x, false);
        state.fall.bursts.push({ x: ix, y: item.y, life: 0.28, color: "rgba(255, 107, 129, 0.9)" });
      } else {
        state.score += 10;
        state.hits += 1;
        recordOutcome(item.x, true);
        state.fall.bursts.push({ x: ix, y: item.y, life: 0.28, color: "rgba(115, 214, 119, 0.95)" });
      }
      continue;
    }
    if (item.y > state.view.h + item.r) {
      if (!item.hazard) {
        state.score = Math.max(0, state.score - 2);
        state.misses += 1;
        recordOutcome(item.x, false);
      }
      continue;
    }
    kept.push(item);
  }
  state.fall.items = kept;
  state.fall.bursts = state.fall.bursts
    .map((burst) => ({ ...burst, life: burst.life - dt }))
    .filter((burst) => burst.life > 0);
}

function spawnFallItem() {
  const type = els.fallObject.value;
  const kindMap = {
    food: ["apple", "orange", "carrot", "rice"],
    shapes: ["circle", "diamond", "square", "triangle"],
    gems: ["star", "gem", "orb", "spark"],
  };
  const kinds = kindMap[type] || kindMap.food;
  const base = els.difficulty.value === "easy" ? 108 : els.difficulty.value === "hard" ? 178 : 142;
  return {
    x: 0.08 + Math.random() * 0.84,
    y: -30,
    r: 18 + Math.random() * 13,
    speed: base * Number(els.fallSpeed.value) * (0.82 + Math.random() * 0.48),
    hazard: Math.random() < 0.13,
    spin: Math.random() * Math.PI,
    kind: kinds[Math.floor(Math.random() * kinds.length)],
  };
}

function updateInvader(dt) {
  state.invader.spawnClock -= dt;
  if (state.invader.spawnClock <= 0 && state.invader.targets.length < 5) {
    state.invader.spawnClock = els.difficulty.value === "easy" ? 1.2 : els.difficulty.value === "hard" ? 0.62 : 0.86;
    state.invader.targets.push(spawnTarget());
  }

  const cursor = state.input.point;
  const size = Number(els.targetSize.value);
  const kept = [];
  for (const target of state.invader.targets) {
    updateMovingTarget(target, dt);
    const hit = cursor && Math.hypot(cursor.x - target.x * state.view.w, cursor.y - target.y * state.view.h) < size;
    if (hit) {
      state.score += 12;
      state.hits += 1;
      recordOutcome(target.x, true);
      state.invader.bursts.push({ x: target.x * state.view.w, y: target.y * state.view.h, life: 0.25 });
      continue;
    }
    target.life -= dt;
    if (target.life <= 0) {
      state.misses += 1;
      recordOutcome(target.x, false);
      continue;
    }
    kept.push(target);
  }
  state.invader.targets = kept;
  state.invader.bursts = state.invader.bursts
    .map((burst) => ({ ...burst, life: burst.life - dt }))
    .filter((burst) => burst.life > 0);
}

function spawnTarget() {
  return {
    x: 0.14 + Math.random() * 0.72,
    y: 0.16 + Math.random() * 0.42,
    vx: Math.random() > 0.5 ? 0.08 : -0.08,
    phase: Math.random() * Math.PI * 2,
    life: els.difficulty.value === "hard" ? 5.2 : els.difficulty.value === "easy" ? 8.5 : 6.5,
  };
}

function updateMovingTarget(target, dt) {
  if (els.invaderMotion.value === "static") return;
  const speed = els.invaderMotion.value === "slow" ? 0.45 : 0.85;
  target.phase += dt * speed;
  target.x += target.vx * dt * speed;
  target.y += Math.sin(target.phase) * 0.0025 * speed;
  if (target.x < 0.09 || target.x > 0.91) {
    target.vx *= -1;
    target.x = clamp(target.x, 0.09, 0.91);
  }
  target.y = clamp(target.y, 0.12, 0.72);
}

function nextHoldTarget() {
  const choices = [
    { x: 0.22, y: 0.5 },
    { x: 0.78, y: 0.5 },
    { x: 0.5, y: 0.28 },
    { x: 0.5, y: 0.72 },
    { x: 0.32, y: 0.34 },
    { x: 0.68, y: 0.34 },
  ];
  state.hold.target = choices[Math.floor(Math.random() * choices.length)];
  state.hold.hold = 0;
}

function updateHold(dt) {
  if (!state.hold.target) nextHoldTarget();
  const target = state.hold.target;
  const distance = Math.hypot(state.controlX - target.x, state.controlY - target.y);
  const steady = state.input.movement < steadyThreshold() || state.input.source === "manual";
  if (distance < 0.11 && steady) state.hold.hold += dt;
  else if (distance < 0.15) state.hold.hold = Math.max(0, state.hold.hold - dt * 0.2);
  else state.hold.hold = Math.max(0, state.hold.hold - dt * 0.85);

  if (state.hold.hold >= Number(els.holdSeconds.value)) {
    state.score += 12;
    state.hits += 1;
    recordOutcome(target.x, true);
    nextHoldTarget();
  }
}

function updateTrail(dt) {
  state.trail.phase += dt * Number(els.trailSpeed.value);
  const placement = trailPlacement();
  const span = placement.span;
  state.trail.target = {
    x: clamp(placement.x + Math.sin(state.trail.phase) * span.x, 0.12, 0.88),
    y: clamp(placement.y + Math.cos(state.trail.phase * 0.75) * span.y, 0.18, 0.82),
  };
  const target = state.trail.target;
  const size = Number(els.targetSize.value);
  const area = playArea();
  const tx = area.x + target.x * area.w;
  const ty = area.y + target.y * area.h;
  const cx = area.x + state.controlX * area.w;
  const cy = area.y + state.controlY * area.h;
  const distance = Math.hypot(cx - tx, cy - ty);
  if (distance < size) state.trail.creditClock += dt;
  else state.trail.creditClock = Math.max(0, state.trail.creditClock - dt * 0.6);
  if (state.trail.creditClock > 0.28) {
    state.trail.creditClock = 0;
    state.score += 3;
    state.hits += 1;
    recordOutcome(target.x, true);
  }
}

function trailPlacement() {
  const key = els.trailPlacement.value;
  const base = {
    center: { x: 0.5, y: 0.5 },
    left: { x: 0.33, y: 0.5 },
    right: { x: 0.67, y: 0.5 },
    upper: { x: 0.5, y: 0.34 },
    lower: { x: 0.5, y: 0.66 },
  }[key] || { x: 0.5, y: 0.5 };
  return { ...base, span: { x: 0.16, y: 0.05 } };
}

function initWipe() {
  const cols = 22;
  const rows = 14;
  state.wipe = {
    cells: Array.from({ length: cols * rows }, () => true),
    cols,
    rows,
    cleared: 0,
    ready: true,
  };
}

function updateWipe() {
  const hands = activeHands();
  if (!hands.length) return;
  const area = wipeArea();
  const brush = Number(els.brushSize.value);
  hands.forEach((hand) => {
    state.wipe.cells.forEach((filled, index) => {
      if (!filled) return;
      const col = index % state.wipe.cols;
      const row = Math.floor(index / state.wipe.cols);
      const cx = area.x + ((col + 0.5) / state.wipe.cols) * area.w;
      const cy = area.y + ((row + 0.5) / state.wipe.rows) * area.h;
      if (Math.hypot(hand.x - cx, hand.y - cy) < brush) {
        state.wipe.cells[index] = false;
        state.wipe.cleared += 1;
        state.score += 1;
        if (state.wipe.cleared % 8 === 0) {
          state.hits += 1;
          recordOutcome(cx / state.view.w, true);
        }
      }
    });
  });
}

function nextShipTilt() {
  const profile = shipProfile();
  const sign = Math.random() > 0.5 ? 1 : -1;
  state.ship.targetTilt = sign * (profile.minTilt + Math.random() * (profile.maxTilt - profile.minTilt));
  state.ship.hold = 0;
  state.ship.changeClock = profile.interval;
}

function shipProfile() {
  const wave = els.shipWave?.value || "normal";
  const byWave = {
    calm: { minTilt: 0.22, maxTilt: 0.46, interval: 8.8, tolerance: 0.2 },
    normal: { minTilt: 0.34, maxTilt: 0.68, interval: 7.0, tolerance: 0.16 },
    strong: { minTilt: 0.48, maxTilt: 0.86, interval: 5.6, tolerance: 0.13 },
  }[wave];
  return byWave || { minTilt: 0.34, maxTilt: 0.68, interval: 7.0, tolerance: 0.16 };
}

function shipNetTilt() {
  const correction = (state.controlX - 0.5) * 2;
  return clamp(state.ship.targetTilt - correction, -1, 1);
}

function updateShip(dt) {
  if (!state.ship.changeClock) nextShipTilt();
  const profile = shipProfile();
  const netTilt = shipNetTilt();
  state.ship.tilt = lerp(state.ship.tilt, netTilt, 0.12);
  state.ship.changeClock -= dt;

  if (Math.abs(netTilt) <= profile.tolerance) state.ship.hold += dt;
  else state.ship.hold = Math.max(0, state.ship.hold - dt * 0.7);

  if (state.ship.hold >= Number(els.holdSeconds.value)) {
    state.score += 12;
    state.hits += 1;
    recordOutcome(state.ship.targetTilt < 0 ? 0.25 : 0.75, true);
    state.ship.bursts.push({ x: state.view.w / 2, y: state.view.h * 0.54, life: 0.42, ok: true });
    nextShipTilt();
  } else if (state.ship.changeClock <= 0) {
    state.misses += 1;
    recordOutcome(state.ship.targetTilt < 0 ? 0.25 : 0.75, false);
    state.ship.bursts.push({ x: state.view.w / 2, y: state.view.h * 0.54, life: 0.34, ok: false });
    nextShipTilt();
  }

  state.ship.bursts = state.ship.bursts
    .map((burst) => ({ ...burst, life: burst.life - dt }))
    .filter((burst) => burst.life > 0);
}

function updateTreasure(dt) {
  const maxTargets = els.difficulty.value === "hard" ? 3 : els.difficulty.value === "easy" ? 1 : 2;
  state.treasure.spawnClock -= dt;
  if (state.treasure.spawnClock <= 0 && state.treasure.targets.length < maxTargets) {
    state.treasure.spawnClock = els.difficulty.value === "hard" ? 0.6 : 0.92;
    state.treasure.targets.push(spawnTreasureTarget());
  }

  const hands = activeHands();
  const reach = Number(els.reachRadius.value);
  const kept = [];
  for (const target of state.treasure.targets) {
    target.life -= dt;
    target.bob += dt * 3.6;
    const touched = hands.find((hand) => Math.hypot(hand.x - target.x, hand.y - target.y) < target.r + reach);
    if (touched) {
      state.score += 10;
      state.hits += 1;
      recordOutcome(target.x / state.view.w, true);
      state.treasure.bursts.push({ x: target.x, y: target.y, life: 0.36, color: "#ffd35a" });
      continue;
    }
    if (target.life <= 0) {
      state.misses += 1;
      recordOutcome(target.x / state.view.w, false);
      continue;
    }
    kept.push(target);
  }
  state.treasure.targets = kept;
  state.treasure.bursts = state.treasure.bursts
    .map((burst) => ({ ...burst, life: burst.life - dt }))
    .filter((burst) => burst.life > 0);
}

function spawnTreasureTarget() {
  const area = playArea();
  const placement = treasurePlacementBounds();
  const x = area.x + (placement.xMin + Math.random() * (placement.xMax - placement.xMin)) * area.w;
  const y = area.y + (placement.yMin + Math.random() * (placement.yMax - placement.yMin)) * area.h;
  const size = Number(els.targetSize.value);
  const maxLife = els.difficulty.value === "hard" ? 4.8 : els.difficulty.value === "easy" ? 8.2 : 6.2;
  return {
    x,
    y,
    r: size * (els.difficulty.value === "easy" ? 0.92 : els.difficulty.value === "hard" ? 0.68 : 0.78),
    life: maxLife,
    maxLife,
    bob: Math.random() * Math.PI * 2,
  };
}

function treasurePlacementBounds() {
  const placement = els.treasurePlacement?.value || "all";
  const bounds = {
    all: { xMin: 0.1, xMax: 0.9, yMin: 0.15, yMax: 0.82 },
    left: { xMin: 0.08, xMax: 0.42, yMin: 0.18, yMax: 0.78 },
    right: { xMin: 0.58, xMax: 0.92, yMin: 0.18, yMax: 0.78 },
    upper: { xMin: 0.18, xMax: 0.82, yMin: 0.12, yMax: 0.44 },
    lower: { xMin: 0.18, xMax: 0.82, yMin: 0.56, yMax: 0.88 },
  };
  return bounds[placement] || bounds.all;
}

function wipeProgress() {
  if (!state.wipe.cells.length) return 0;
  return state.wipe.cleared / state.wipe.cells.length;
}

function draw() {
  const { w, h } = state.view;
  drawMirroredVideo(ctx, w, h);
  drawDimOverlay(w, h);
  drawRetroFrame(w, h);
  if (state.screen === "camera") {
    drawCameraSetupOverlay();
    return;
  }
  if (state.mode === "fall") drawFall();
  if (state.mode === "invader") drawInvader();
  if (state.mode === "hold") drawHold();
  if (state.mode === "trail") drawTrail();
  if (state.mode === "wipe") drawWipe();
  if (state.mode === "ship") drawShip();
  if (state.mode === "treasure") drawTreasure();
  drawInputOverlay();
  drawPhaseOverlay();
}

function drawCameraSetupOverlay() {
  if (!state.input.point) return;
  drawSimpleInputDot(state.input.point.x, state.input.point.y);
}

function drawDimOverlay(w, h) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "rgba(7, 8, 20, 0.24)");
  gradient.addColorStop(0.5, "rgba(7, 8, 20, 0.03)");
  gradient.addColorStop(1, "rgba(7, 8, 20, 0.34)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawRetroFrame(w, h) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 211, 90, 0.28)";
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.restore();
}

function drawFall() {
  state.fall.items.forEach((item) => drawFallObject(item, item.x * state.view.w, item.y));
  state.fall.bursts.forEach((burst) => {
    ctx.save();
    ctx.globalAlpha = clamp(burst.life / 0.28, 0, 1);
    ctx.strokeStyle = burst.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, 22 + (0.28 - burst.life) * 86, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawFallObject(item, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(item.spin);
  if (item.hazard) {
    ctx.fillStyle = "rgba(255, 107, 129, 0.94)";
    ctx.strokeStyle = "rgba(255, 247, 223, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(-item.r * 0.7, -item.r * 0.7, item.r * 1.4, item.r * 1.4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (item.kind === "apple" || item.kind === "orange" || item.kind === "orb") {
    ctx.fillStyle = item.kind === "apple" ? "#ff5d73" : "#ffd35a";
    ctx.strokeStyle = "#fff7df";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, item.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (item.kind === "carrot" || item.kind === "triangle") {
    ctx.fillStyle = "#ff9d53";
    ctx.strokeStyle = "#fff7df";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -item.r);
    ctx.lineTo(item.r, item.r);
    ctx.lineTo(-item.r, item.r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (item.kind === "diamond" || item.kind === "gem") {
    ctx.fillStyle = "#73d677";
    ctx.strokeStyle = "#fff7df";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -item.r);
    ctx.lineTo(item.r, 0);
    ctx.lineTo(0, item.r);
    ctx.lineTo(-item.r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (item.kind === "star" || item.kind === "spark") {
    drawStar(0, 0, item.r * 0.45, item.r, "#ffd35a");
  } else {
    ctx.fillStyle = "#5ec6ff";
    ctx.strokeStyle = "#fff7df";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-item.r, -item.r, item.r * 2, item.r * 2, 6);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawStar(x, y, inner, outer, fill) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = "#fff7df";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawInvader() {
  const size = Number(els.targetSize.value);
  state.invader.targets.forEach((target) => {
    drawAlien(target.x * state.view.w, target.y * state.view.h, size);
  });
  state.invader.bursts.forEach((burst) => {
    ctx.save();
    ctx.globalAlpha = clamp(burst.life / 0.25, 0, 1);
    ctx.strokeStyle = "#ffd35a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, 34 + (0.25 - burst.life) * 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawAlien(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#73d677";
  ctx.strokeStyle = "#fff7df";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-size, -size * 0.62, size * 2, size * 1.24, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#101018";
  ctx.beginPath();
  ctx.arc(-size * 0.36, -size * 0.08, Math.max(3, size * 0.12), 0, Math.PI * 2);
  ctx.arc(size * 0.36, -size * 0.08, Math.max(3, size * 0.12), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHold() {
  if (!state.hold.target) nextHoldTarget();
  const area = playArea();
  const target = state.hold.target;
  const tx = area.x + target.x * area.w;
  const ty = area.y + target.y * area.h;
  const cx = area.x + state.controlX * area.w;
  const cy = area.y + state.controlY * area.h;
  const progress = clamp(state.hold.hold / Number(els.holdSeconds.value), 0, 1);
  const size = Number(els.targetSize.value);

  ctx.save();
  drawPlayArea(area);
  ctx.fillStyle = "rgba(255, 211, 90, 0.18)";
  ctx.strokeStyle = "#ffd35a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(tx, ty, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#73d677";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(tx, ty, size + 11, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.stroke();
  drawCursor(cx, cy, 17);
  ctx.restore();
}

function drawTrail() {
  const area = playArea();
  const target = state.trail.target;
  const tx = area.x + target.x * area.w;
  const ty = area.y + target.y * area.h;
  const cx = area.x + state.controlX * area.w;
  const cy = area.y + state.controlY * area.h;
  const size = Number(els.targetSize.value);

  ctx.save();
  drawPlayArea(area);
  ctx.fillStyle = "rgba(184, 132, 255, 0.22)";
  ctx.strokeStyle = "#b884ff";
  ctx.lineWidth = 4;
  if (els.trailShape.value === "bar") {
    ctx.beginPath();
    ctx.roundRect(tx - size * 1.4, ty - size * 0.35, size * 2.8, size * 0.7, 8);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(tx, ty, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  drawCursor(cx, cy, 16);
  ctx.restore();
}

function drawWipe() {
  const area = wipeArea();
  ctx.save();
  ctx.fillStyle = "rgba(255, 107, 129, 0.48)";
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.strokeStyle = "rgba(255, 247, 223, 0.36)";
  ctx.lineWidth = 3;
  ctx.strokeRect(area.x, area.y, area.w, area.h);
  state.wipe.cells.forEach((filled, index) => {
    if (!filled) return;
    const col = index % state.wipe.cols;
    const row = Math.floor(index / state.wipe.cols);
    const x = area.x + (col / state.wipe.cols) * area.w;
    const y = area.y + (row / state.wipe.rows) * area.h;
    const w = area.w / state.wipe.cols + 0.5;
    const h = area.h / state.wipe.rows + 0.5;
    ctx.fillStyle = row % 2 === 0 ? "rgba(255, 107, 129, 0.72)" : "rgba(128, 125, 145, 0.72)";
    ctx.fillRect(x, y, w, h);
  });
  ctx.fillStyle = "#fff7df";
  ctx.font = "900 18px ui-rounded, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(wipeProgress() * 100)}%`, area.x + area.w / 2, area.y + 30);
  ctx.restore();
}

function drawShip() {
  const area = playArea();
  const cx = area.x + area.w / 2;
  const waterY = area.y + area.h * 0.66;
  const profile = shipProfile();
  const progress = clamp(state.ship.hold / Number(els.holdSeconds.value), 0, 1);
  const tilt = state.ship.tilt * 0.46;
  const level = Math.abs(shipNetTilt()) <= profile.tolerance;

  ctx.save();
  drawPlayArea(area);
  ctx.fillStyle = "rgba(94, 198, 255, 0.18)";
  ctx.fillRect(area.x, waterY, area.w, area.h * 0.34);
  drawWave(area.x, waterY + 12, area.w, 8, "#5ec6ff", 0.45);
  drawWave(area.x, waterY + 34, area.w, 7, "#fff7df", 0.22);

  ctx.strokeStyle = level ? "#73d677" : "rgba(255, 211, 90, 0.78)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(area.x + area.w * 0.2, area.y + 48);
  ctx.lineTo(area.x + area.w * 0.8, area.y + 48);
  ctx.stroke();
  ctx.fillStyle = "#fff7df";
  ctx.font = "900 16px ui-rounded, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(level ? "水平キープ" : "船を水平へ", cx, area.y + 34);

  ctx.save();
  ctx.translate(cx, waterY - 18);
  ctx.rotate(tilt);
  ctx.fillStyle = "#ffd35a";
  ctx.strokeStyle = "#fff7df";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-86, -16, 172, 38, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#b66a45";
  ctx.beginPath();
  ctx.moveTo(-92, 4);
  ctx.lineTo(92, 4);
  ctx.lineTo(58, 42);
  ctx.lineTo(-58, 42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#fff7df";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -70);
  ctx.lineTo(0, -10);
  ctx.stroke();
  ctx.fillStyle = "#73d677";
  ctx.beginPath();
  ctx.moveTo(2, -66);
  ctx.lineTo(54, -30);
  ctx.lineTo(2, -12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 247, 223, 0.42)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - 78, area.y + area.h - 46, 156, 20, 10);
  ctx.stroke();
  ctx.fillStyle = level ? "#73d677" : "#ffd35a";
  ctx.fillRect(cx - 76, area.y + area.h - 44, 152 * progress, 16);

  state.ship.bursts.forEach((burst) => {
    ctx.save();
    ctx.globalAlpha = clamp(burst.life / 0.42, 0, 1);
    ctx.strokeStyle = burst.ok ? "#73d677" : "#ff6b81";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, 30 + (0.42 - burst.life) * 110, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

function drawWave(x, y, width, amp, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= width; i += 8) {
    const py = y + Math.sin(i * 0.045 + performance.now() * 0.003) * amp;
    if (i === 0) ctx.moveTo(x + i, py);
    else ctx.lineTo(x + i, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTreasure() {
  const area = playArea();
  ctx.save();
  drawPlayArea(area);
  ctx.fillStyle = "rgba(255, 211, 90, 0.12)";
  ctx.fillRect(area.x, area.y, area.w, area.h);
  state.treasure.targets.forEach((target) => {
    drawTreasureChest(target.x, target.y + Math.sin(target.bob) * 4, target.r, target.life, target.maxLife);
  });
  state.treasure.bursts.forEach((burst) => {
    ctx.save();
    ctx.globalAlpha = clamp(burst.life / 0.36, 0, 1);
    drawStar(burst.x, burst.y, 9, 24 + (0.36 - burst.life) * 72, burst.color);
    ctx.restore();
  });
  ctx.restore();
}

function drawTreasureChest(x, y, size, life, maxLife) {
  const w = size * 2.1;
  const h = size * 1.38;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(16, 16, 24, 0.32)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.58, w * 0.45, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b66a45";
  ctx.strokeStyle = "#fff7df";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h * 0.28, w, h * 0.68, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffd35a";
  ctx.fillRect(-w / 2 + 8, -h * 0.02, w - 16, h * 0.16);
  ctx.fillStyle = "#5ec6ff";
  ctx.strokeStyle = "#fff7df";
  ctx.beginPath();
  ctx.roundRect(-10, -3, 20, 18, 4);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = life < 1.4 ? "#ff6b81" : "#73d677";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, size + 13, -Math.PI / 2, -Math.PI / 2 + clamp(life / maxLife, 0, 1) * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPlayArea(area) {
  ctx.strokeStyle = "rgba(255, 247, 223, 0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(area.x, area.y, area.w, area.h);
}

function playArea() {
  const { w, h } = state.view;
  return { x: w * 0.14, y: h * 0.16, w: w * 0.72, h: h * 0.64 };
}

function wipeArea() {
  const { w, h } = state.view;
  return { x: w * 0.09, y: h * 0.13, w: w * 0.82, h: h * 0.72 };
}

function drawInputOverlay() {
  if (!state.input.point) return;
  if (state.mode !== "invader") return;
  const { x, y } = state.input.point;
  drawCursor(x, y, 22);
}

function drawSimpleInputDot(x, y) {
  ctx.save();
  ctx.fillStyle = "rgba(94, 198, 255, 0.26)";
  ctx.strokeStyle = "#5ec6ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff7df";
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCursor(x, y, size) {
  ctx.save();
  ctx.strokeStyle = "#5ec6ff";
  ctx.fillStyle = "rgba(94, 198, 255, 0.14)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size - 9, y);
  ctx.lineTo(x + size + 9, y);
  ctx.moveTo(x, y - size - 9);
  ctx.lineTo(x, y + size + 9);
  ctx.stroke();
  ctx.restore();
}

function drawPhaseOverlay() {
  if (state.phase === "countdown") {
    const value = Math.max(1, Math.ceil(state.countdown));
    drawBigOverlay(String(value), "#ffd35a", "READY");
  } else if (state.phase === "finished") {
    drawBigOverlay("FINISH", "#73d677", "RESULT");
  } else if (state.phase === "idle") {
    drawSmallStagePrompt();
  }
}

function drawBigOverlay(main, color, sub) {
  const { w, h } = state.view;
  ctx.save();
  ctx.fillStyle = "rgba(16, 16, 24, 0.52)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.font = "900 86px ui-rounded, system-ui, sans-serif";
  ctx.fillText(main, w / 2, h / 2);
  ctx.fillStyle = "#fff7df";
  ctx.font = "900 18px ui-rounded, system-ui, sans-serif";
  ctx.fillText(sub, w / 2, h / 2 + 42);
  ctx.restore();
}

function drawSmallStagePrompt() {
  if (!state.cameraReady) return;
  const { w, h } = state.view;
  ctx.save();
  ctx.fillStyle = "rgba(16, 16, 24, 0.42)";
  ctx.fillRect(0, h - 70, w, 70);
  ctx.fillStyle = "#fff7df";
  ctx.font = "900 18px ui-rounded, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${taskNames[state.mode]}を選択中`, w / 2, h - 40);
  ctx.fillStyle = "#c8bfd0";
  ctx.font = "700 13px ui-rounded, system-ui, sans-serif";
  ctx.fillText("課題開始で3カウント後にスタート", w / 2, h - 18);
  ctx.restore();
}

function updateReadouts() {
  els.scoreReadout.textContent = String(state.score);
  els.hitReadout.textContent = String(state.hits);
  const remain =
    els.goalType.value === "time"
      ? Math.max(0, Number(els.goalSeconds.value) - state.sessionTime)
      : state.sessionTime;
  els.timeReadout.textContent = `${Math.round(remain)}s`;
  els.holdValue.textContent = `${Number(els.holdSeconds.value).toFixed(1)}s`;
  els.rangeValue.textContent = `${els.shiftRange.value}%`;
  els.targetSizeValue.textContent = `${els.targetSize.value}px`;
  els.fallSpeedValue.textContent = `${Number(els.fallSpeed.value).toFixed(1)}x`;
  els.fallCountValue.textContent = els.fallCount.value;
  els.reachValue.textContent = `${els.reachRadius.value}px`;
  if (els.reachValueTreasure) els.reachValueTreasure.textContent = `${els.reachRadius.value}px`;
  els.trailSpeedValue.textContent = `${Number(els.trailSpeed.value).toFixed(1)}x`;
  els.brushValue.textContent = `${els.brushSize.value}px`;
  updateTrackingStatus();
}

function updateTrackingStatus() {
  if (state.screen === "camera") {
    els.trackingStatus.textContent = "カメラ設定中";
  } else if (state.phase === "countdown") {
    els.trackingStatus.textContent = "カウントダウン中";
  } else if (state.phase === "active") {
    els.trackingStatus.textContent = `${taskNames[state.mode]} 実施中`;
  } else if (state.phase === "finished") {
    els.trackingStatus.textContent = "結果表示中";
  } else if (!state.cameraReady) {
    els.trackingStatus.textContent = "カメラ待機中";
  } else if (state.ai.status === "loading") {
    els.trackingStatus.textContent = "姿勢AI 読み込み中";
  } else if (state.ai.status === "error") {
    els.trackingStatus.textContent = "姿勢AI エラー";
  } else {
    els.trackingStatus.textContent = "準備OK";
  }
}

function buildResultSummary(reason) {
  const total = state.hits + state.misses;
  const accuracy = total ? Math.round((state.hits / total) * 100) : 0;
  const s = state.stats;
  const leftPower = s.maxLeft + s.hitLeft * 5 - s.missLeft * 2;
  const rightPower = s.maxRight + s.hitRight * 5 - s.missRight * 2;
  const steadyRate = state.sessionTime ? s.steadyTime / state.sessionTime : 0;
  const leftAttempts = s.hitLeft + s.missLeft;
  const rightAttempts = s.hitRight + s.missRight;

  els.resultCurrent.textContent = `${state.hits}成功 / 正確性 ${accuracy}%`;
  els.resultCurrentDetail.textContent = `${taskNames[state.mode]}を${Math.round(state.sessionTime)}秒実施。スコアは${state.score}です。`;
  if (els.resultExpert) els.resultExpert.textContent = "左右差と保持を確認";
  if (els.resultExpertDetail) {
    els.resultExpertDetail.textContent =
      `左側${leftAttempts}回、右側${rightAttempts}回の反応を記録。保持安定は${Math.round(steadyRate * 100)}%です。`;
  }

  if (state.sessionTime < 5 && state.hits === 0) {
    els.resultNext.textContent = "もう少し長く実施";
    els.resultNextDetail.textContent = "10秒以上実施すると左右差と推奨設定が安定して出せます。";
    els.resultTraining.textContent = taskNames[state.mode];
    els.resultTrainingDetail.textContent = "同じ課題で、開始後に少し動いてから終了してください。";
    if (els.resultExpert) els.resultExpert.textContent = "判定材料が少なめ";
    if (els.resultExpertDetail) {
      els.resultExpertDetail.textContent = "10秒以上の実施または3成功以上があると、左右差と次回設定の提案が安定します。";
    }
    return;
  }

  if (leftPower + 14 < rightPower) {
    els.resultNext.textContent = "左側を少しやさしく";
    els.resultNextDetail.textContent = "次回は左側配置、かんたんまたはふつうで成功数を増やす設定がおすすめです。";
    els.resultTraining.textContent = "宝箱リーチ";
    els.resultTrainingDetail.textContent =
      "左側へのリーチ量を小さめから増やします。片側反応の低下がある場合は、立位ではふらつきに注意します。";
    if (els.resultExpert) els.resultExpert.textContent = "左側の反応を重点確認";
    if (els.resultExpertDetail) {
      els.resultExpertDetail.textContent =
        "左方向への重心移動またはリーチ反応が弱い可能性があります。座位で成功数を確保し、支持物ありの立位へ段階づけます。";
    }
  } else if (rightPower + 14 < leftPower) {
    els.resultNext.textContent = "右側を少しやさしく";
    els.resultNextDetail.textContent = "右側配置でターゲットを大きめにし、確実に触れる設定から始めましょう。";
    els.resultTraining.textContent = "宝箱リーチ";
    els.resultTrainingDetail.textContent =
      "右側に出る宝箱を開ける設定で、視覚探索とリーチ方向の再学習を組み合わせます。";
    if (els.resultExpert) els.resultExpert.textContent = "右側の反応を重点確認";
    if (els.resultExpertDetail) {
      els.resultExpertDetail.textContent =
        "右方向への反応速度や移動量が低い可能性があります。右側配置を大きめターゲットから始め、ふらつきを観察します。";
    }
  } else if (steadyRate < 0.42 && state.mode !== "fall" && state.mode !== "wipe") {
    els.resultNext.textContent = "保持を短めに";
    els.resultNextDetail.textContent = "保持時間を短く、ターゲットを大きめにして成功体験を作る設定がおすすめです。";
    els.resultTraining.textContent = "だるまさん保持";
    els.resultTrainingDetail.textContent =
      "支持基底面の中で止まる練習です。保持が難しい場合は座位から始め、静止時間を段階的に伸ばします。";
    if (els.resultExpert) els.resultExpert.textContent = "移動後保持が課題";
    if (els.resultExpertDetail) {
      els.resultExpertDetail.textContent =
        "移動後に静止する時間が短い傾向です。保持時間を短く、入力点の移動幅を小さくして反復します。";
    }
  } else if (accuracy >= 80 && reason !== "manual") {
    els.resultNext.textContent = "ひとつ難しく";
    els.resultNextDetail.textContent = "次回は難易度を一段階上げるか、成功数を+5しても良さそうです。";
    els.resultTraining.textContent = "船バランス";
    els.resultTrainingDetail.textContent =
      "視覚的な傾きに合わせて重心を戻す課題へ進みます。座位で安定してから立位へ発展できます。";
    if (els.resultExpert) els.resultExpert.textContent = "難易度を上げてもよい状態";
    if (els.resultExpertDetail) {
      els.resultExpertDetail.textContent =
        "成功率が高く、次回はターゲット縮小、保持時間延長、または船バランスで外乱要素を追加できます。";
    }
  } else {
    els.resultNext.textContent = "同じ設定で再挑戦";
    els.resultNextDetail.textContent = "成功率を安定させてから、速度や移動幅を上げる流れが良さそうです。";
    els.resultTraining.textContent = taskNames[state.mode];
    els.resultTrainingDetail.textContent = "今回と同じ課題で、姿勢を整えて基準セットしてから再開します。";
    if (els.resultExpert) els.resultExpert.textContent = "同条件で安定化";
    if (els.resultExpertDetail) {
      els.resultExpertDetail.textContent =
        "左右差は大きくありません。成功率が安定するまで同条件で反復し、その後に速度または移動幅を上げます。";
    }
  }
}

function showMessage(title, detail) {
  els.message.replaceChildren();
  const titleNode = document.createElement("strong");
  const detailNode = document.createElement("span");
  titleNode.textContent = title;
  detailNode.textContent = detail;
  els.message.append(titleNode, detailNode);
  els.message.classList.remove("hidden");
}

function hideMessage() {
  els.message.classList.add("hidden");
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - state.lastFrame) / 1000));
  state.lastFrame = now;
  updateTracking(now);
  updateGame(dt);
  draw();
  updateReadouts();
  requestAnimationFrame(frame);
}

els.startCamera.addEventListener("click", startCamera);
els.calibrateInput.addEventListener("click", calibrateInput);
els.startTask.addEventListener("click", startTask);
els.endTask.addEventListener("click", () => endTask("manual"));
els.resetSession.addEventListener("click", resetSession);
els.toCameraSettings.addEventListener("click", goCameraSettings);
els.backHome.addEventListener("click", goHome);
els.backSettingsFromCamera.addEventListener("click", goSettings);
els.backSettings.addEventListener("click", goSettings);
els.resultHome.addEventListener("click", goHome);
els.retryTask.addEventListener("click", startTask);
els.difficulty.addEventListener("change", applyDifficultyPreset);
els.customSettings.addEventListener("change", applyDifficultyPreset);
els.reachMode.addEventListener("change", changeReachMode);
els.reachRadius.addEventListener("input", () => syncReachRadius("main"));
els.reachRadiusMirror.addEventListener("input", () => syncReachRadius("mirror"));
els.taskCards.forEach((button) => {
  button.addEventListener("click", () => selectTask(button.dataset.task));
});
window.addEventListener("keydown", (event) => {
  if (event.key.startsWith("Arrow")) {
    state.keys.add(event.key);
    event.preventDefault();
  }
});
window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key);
});
window.addEventListener("resize", resizeCanvas);

if (!("roundRect" in CanvasRenderingContext2D.prototype)) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + width, y, x + width, y + height, r);
    this.arcTo(x + width, y + height, x, y + height, r);
    this.arcTo(x, y + height, x, y, r);
    this.arcTo(x, y, x + width, y, r);
    return this;
  };
}

resizeCanvas();
applyDifficultyPreset();
initWheelPickers();
resetTaskState();
syncReachRadius("main");
updateSelectedTaskCopy();
setScreen("home");
setResultIdle();
initAI();
requestAnimationFrame(frame);
