"use strict";

const canvas = document.querySelector("#oled-canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const screenName = document.querySelector("#screen-name");
const panelDetail = document.querySelector("#panel-detail");
const panelStage = document.querySelector("#panel-stage");
const panelSvgHost = document.querySelector("#panel-svg");
const menuButton = document.querySelector("#menu-button");
const toc = document.querySelector("#toc");
const tocBackdrop = document.querySelector("#toc-backdrop");
const manualCopy = document.querySelector(".manual-copy");
ctx.imageSmoothingEnabled = false;
const clockSource = document.createElement("canvas");
const clockSourceCtx = clockSource.getContext("2d", { willReadFrequently: true });
const clockRotated = document.createElement("canvas");
const clockRotatedCtx = clockRotated.getContext("2d", { willReadFrequently: true });
clockSource.width = clockSource.height = clockRotated.width = clockRotated.height = 16;
clockSourceCtx.imageSmoothingEnabled = false;
clockRotatedCtx.imageSmoothingEnabled = false;
const textSource = document.createElement("canvas");
const textSourceCtx = textSource.getContext("2d", { willReadFrequently: true });
textSource.width = 128;
textSource.height = 32;
textSourceCtx.imageSmoothingEnabled = false;

const imageNames = [
  "header_tempo", "header_source", "header_ports", "header_config", "header_swing",
  "clock_mini", "ext_mini", "usbc_mini", "midi_mini", "swing_mini", "bpm_mini",
  "source_internal", "source_external", "source_usb", "source_midi",
  "sign_A", "sign_B", "sign_C", "sign_D", "port_rise", "port_fall",
  "port_1", "port_2", "port_4", "port_6", "port_12", "port_24", "port_48",
  "port_run", "port_start", "port_stop", "port_reset",
  "config_sleep", "config_usb_out", "config_usb_out_off", "config_trs_out", "config_trs_out_off",
  "config_input_clock", "config_input_action", "config_update",
  "value_polarity_on", "value_polarity_off",
  ...Array.from({ length: 8 }, (_, index) => `clock_anime_${index + 1}`),
];

const images = Object.fromEntries(imageNames.map((name) => {
  const image = new Image();
  image.src = `../icons/${name}.png`;
  return [name, image];
}));

const state = {
  screen: "home",
  running: false,
  bpm: 120,
  swing: 50,
  source: 0,
  port: 0,
  portValue: 2,
  inverted: false,
  setting: 0,
  settings: { sleep: true, usb: true, trs: false, ppqn: 24, edge: "RISE", action: "PLAYSTOP", actionEdge: "RISE" },
  previousBpm: 120,
  bpmAnimationAt: 0,
  saverAt: 0,
  scroll: null,
  knobTurn: 0,
  readerScene: "home",
  readerFocus: "overview",
};

const sources = [
  ["INTERNAL", "source_internal", "clock_mini", "INT"],
  ["EXTERNAL", "source_external", "ext_mini", "EXT"],
  ["USB MIDI", "source_usb", "usbc_mini", "USB"],
  ["TRS MIDI", "source_midi", "midi_mini", "TRS"],
];
const portValues = ["1", "2", "4", "6", "12", "24", "48", "RUN", "START", "STOP", "RESET"];
const settingKeys = ["sleep", "usb", "trs", "ppqn", "edge", "action", "actionEdge", "update"];
const settingLabels = ["SLEEP", "USB MIDI", "TRS MIDI", "PPQN", "POLARITY", "ACTION", "POLARITY", "UPDATE"];

function drawImage(name, x, y, width, height) {
  const image = images[name];
  if (!image?.complete || !image.naturalWidth) return;
  ctx.drawImage(image, Math.round(x), Math.round(y), width ?? image.naturalWidth, height ?? image.naturalHeight);
}

const pixelFont = {
  A:["010","101","111","101","101"], B:["110","101","110","101","110"], C:["011","100","100","100","011"],
  D:["110","101","101","101","110"], E:["111","100","110","100","111"], F:["111","100","110","100","100"],
  G:["011","100","101","101","011"], H:["101","101","111","101","101"], I:["111","010","010","010","111"],
  J:["001","001","001","101","010"], K:["101","101","110","101","101"], L:["100","100","100","100","111"],
  M:["101","111","111","101","101"], N:["101","111","111","111","101"], O:["010","101","101","101","010"],
  P:["110","101","110","100","100"], Q:["010","101","101","011","001"], R:["110","101","110","101","101"],
  S:["011","100","010","001","110"], T:["111","010","010","010","010"], U:["101","101","101","101","111"],
  V:["101","101","101","101","010"], W:["101","101","111","111","101"], X:["101","101","010","101","101"],
  Y:["101","101","010","010","010"], Z:["111","001","010","100","111"],
  0:["111","101","101","101","111"], 1:["010","110","010","010","111"], 2:["110","001","111","100","111"],
  3:["110","001","011","001","110"], 4:["101","101","111","001","001"], 5:["111","100","110","001","110"],
  6:["011","100","111","101","111"], 7:["111","001","010","010","010"], 8:["111","101","111","101","111"],
  9:["111","101","111","001","110"], ".":["000","000","000","000","010"], "%":["101","001","010","100","101"],
  "/":["001","001","010","100","100"], " ":["000","000","000","000","000"], "- ":["000","000","111","000","000"],
};

function text(value, x, baseline, scale = 1, weight = "normal") {
  const string = String(value);
  const fontSize = Math.round(8 * scale);
  textSourceCtx.clearRect(0, 0, textSource.width, textSource.height);
  textSourceCtx.font = `${weight} ${fontSize}px Helvetica, Arial, sans-serif`;
  textSourceCtx.textBaseline = "alphabetic";
  textSourceCtx.fillStyle = "#fff";
  textSourceCtx.fillText(string, 0, Math.round(baseline));
  const width = Math.min(128, Math.ceil(textSourceCtx.measureText(string).width) + 2);
  const height = Math.min(32, Math.ceil(baseline) + 2);
  if (width <= 0 || height <= 0) return;
  const data = textSourceCtx.getImageData(0, 0, width, height).data;
  ctx.fillStyle = "#fff";
  const targetX = Math.round(x);
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    if (data[(py * width + px) * 4 + 3] > 96) ctx.fillRect(targetX + px, py, 1, 1);
  }
}

function centered(value, center, baseline, scale = 1, weight = "normal") {
  textSourceCtx.font = `${weight} ${Math.round(8 * scale)}px Helvetica, Arial, sans-serif`;
  text(value, Math.round(center - textSourceCtx.measureText(String(value)).width / 2), baseline, scale, weight);
}

function clear() { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 128, 32); }
function header(name) { drawImage(name, 0, 0); }
function scrollbar(index, count) {
  const height = Math.max(5, Math.floor(32 / count));
  const y = Math.round((index * (32 - height)) / (count - 1));
  ctx.fillStyle = "#fff";
  ctx.fillRect(125, y, 3, height);
}

function scrollProgress(kind, now) {
  const scroll = state.scroll;
  if (!scroll || scroll.kind !== kind) return null;
  const progress = Math.min(1, (now - scroll.startedAt) / 140);
  if (progress >= 1) {
    state.scroll = null;
    return null;
  }
  return progress;
}

function startScroll(kind, from, to, direction) {
  state.scroll = { kind, from, to, direction, startedAt: performance.now() };
}

function drawHome(now) {
  header("header_tempo");
  const elapsed = now - state.bpmAnimationAt;
  const roll = elapsed >= 240 ? 1 : elapsed / 240;
  const previous = state.previousBpm.toFixed(1).padStart(5, " ");
  const current = state.bpm.toFixed(1).padStart(5, " ");
  for (let index = 0; index < current.length; index++) {
    const x = 18 + index * 13;
    if (previous[index] !== current[index] && roll < 1 && current[index] !== ".") {
      text(previous[index], x, Math.round(28 - 32 * roll), 3);
      text(current[index], x, Math.round(60 - 32 * roll), 3);
    } else text(current[index], x, 28, 3);
  }
  const source = sources[state.source];
  drawImage(source[2], 98, 3);
  text(source[3], 108, 11);
  drawImage("swing_mini", 98, 21);
  text(`${state.swing}%`, 108, 29);
}

function drawSourceItem(index, centerY) {
  const [label, icon] = sources[index];
  drawImage(icon, 16, Math.round(centerY - 16));
  centered(label, 88, Math.round(centerY + 4), 1, "bold");
}

function drawSource(now) {
  header("header_source");
  const progress = scrollProgress("source", now);
  if (progress === null) drawSourceItem(state.source, 16);
  else {
    const { from, to, direction } = state.scroll;
    const travel = Math.floor(32 * progress);
    drawSourceItem(from, 16 - direction * travel);
    drawSourceItem(to, 16 + direction * (32 - travel));
  }
  scrollbar(state.source, sources.length);
}

function portIcon(valueIndex = state.portValue) {
  const value = portValues[valueIndex];
  if (["RUN", "START", "STOP", "RESET"].includes(value)) return `port_${value.toLowerCase()}`;
  return `port_${value}`;
}

function drawPortItem(port, value, inverted, y) {
  drawImage(`sign_${"ABCD"[port]}`, 16, y);
  drawImage(inverted ? "port_fall" : "port_rise", 48, y);
  drawImage(portIcon(value), 80, y);
}

function drawPort(now) {
  header("header_ports");
  const progress = scrollProgress("port", now);
  if (progress === null) drawPortItem(state.port, state.portValue, state.inverted, 0);
  else {
    const { from, to, direction } = state.scroll;
    const travel = Math.floor(32 * progress);
    drawPortItem(state.port, from, state.inverted, -direction * travel);
    drawPortItem(state.port, to, state.inverted, direction * (32 - travel));
  }
  scrollbar(state.port, 4);
}

function settingValue(key) {
  const value = state.settings[key];
  if (key === "sleep" || key === "usb" || key === "trs") return value ? "ON" : "OFF";
  if (key === "update") return "UPDATE";
  return String(value);
}

function settingIcon(key) {
  if (key === "sleep") return "config_sleep";
  if (key === "usb") return state.settings.usb ? "config_usb_out" : "config_usb_out_off";
  if (key === "trs") return state.settings.trs ? "config_trs_out" : "config_trs_out_off";
  if (["ppqn", "edge"].includes(key)) return "config_input_clock";
  if (["action", "actionEdge"].includes(key)) return "config_input_action";
  return "config_update";
}

function drawSettingsItem(index, centerY) {
  const key = settingKeys[index];
  const y = Math.round(centerY);
  drawImage(settingIcon(key), 16, y - 16);
  text(settingLabels[index], 51, y - 6, 1, "bold");
  if (key === "edge" || key === "actionEdge") drawImage(state.settings[key] === "RISE" ? "value_polarity_on" : "value_polarity_off", 50, y - 4);
  text(settingValue(key), key === "edge" || key === "actionEdge" ? 64 : 50, y + 10);
}

function drawSettings(now) {
  header("header_config");
  const progress = scrollProgress("settings", now);
  if (progress === null) drawSettingsItem(state.setting, 16);
  else {
    const { from, to, direction } = state.scroll;
    const travel = Math.floor(32 * progress);
    drawSettingsItem(from, 16 - direction * travel);
    drawSettingsItem(to, 16 + direction * (32 - travel));
  }
  scrollbar(state.setting, settingKeys.length);
}

function drawSwing() {
  header("header_swing");
  const source = sources[state.source];
  drawImage(source[2], 98, 3);
  text(source[3], 108, 11);
  drawImage("bpm_mini", 98, 21);
  text(String(state.bpm), 108, 29);
  centered(String(state.swing), 55, 28, 3);
  text("%", 74, 28, 2);
}

function drawSaver(now) {
  const elapsed = now - state.saverAt;
  const frame = 1 + Math.floor(elapsed / 140) % 8;
  const rotation = Math.floor(elapsed / (140 * 8)) % 4;
  const xMax = 112, yMax = 16;
  const bounce = (step, max) => { const phase = step % (max * 2); return phase <= max ? phase : max * 2 - phase; };
  const x = bounce(Math.floor(elapsed / 55), xMax);
  const y = bounce(Math.floor(elapsed / 83), yMax);
  const image = images[`clock_anime_${frame}`];
  if (!image?.complete || !image.naturalWidth) return;
  clockSourceCtx.clearRect(0, 0, 16, 16);
  clockSourceCtx.drawImage(image, 0, 0);
  const source = clockSourceCtx.getImageData(0, 0, 16, 16);
  const rotated = clockRotatedCtx.createImageData(16, 16);
  for (let sy = 0; sy < 16; sy++) for (let sx = 0; sx < 16; sx++) {
    const sourceOffset = (sy * 16 + sx) * 4;
    let dx = sx, dy = sy;
    if (rotation === 1) { dx = 15 - sy; dy = sx; }
    if (rotation === 2) { dx = 15 - sx; dy = 15 - sy; }
    if (rotation === 3) { dx = sy; dy = 15 - sx; }
    const targetOffset = (dy * 16 + dx) * 4;
    const on = source.data[sourceOffset] > 127;
    rotated.data[targetOffset] = rotated.data[targetOffset + 1] = rotated.data[targetOffset + 2] = on ? 255 : 0;
    rotated.data[targetOffset + 3] = 255;
  }
  clockRotatedCtx.putImageData(rotated, 0, 0);
  ctx.drawImage(clockRotated, x, y);
}

function render(now = performance.now()) {
  clear();
  if (state.screen === "saver") drawSaver(now);
  else if (state.screen === "source") drawSource(now);
  else if (state.screen === "port") drawPort(now);
  else if (state.screen === "config") drawSettings(now);
  else if (state.screen === "swing") drawSwing();
  else drawHome(now);
  screenName.textContent = state.screen === "saver" ? "SCREEN SAVER" : state.screen.toUpperCase();
  animatePanel(now);
  requestAnimationFrame(render);
}

function wake() { if (state.screen === "saver") state.screen = "home"; }
function turn(direction) {
  wake();
  if (state.screen === "source") {
    const previous = state.source;
    state.source = (state.source + direction + sources.length) % sources.length;
    if (previous !== state.source) startScroll("source", previous, state.source, direction);
  } else if (state.screen === "port") {
    const previous = state.portValue;
    state.portValue = (state.portValue + direction + portValues.length) % portValues.length;
    if (previous !== state.portValue) startScroll("port", previous, state.portValue, direction);
  } else if (state.screen === "config") {
    const previous = state.setting;
    state.setting = Math.max(0, Math.min(settingKeys.length - 1, state.setting + direction));
    if (previous !== state.setting) startScroll("settings", previous, state.setting, direction);
  }
  else if (state.screen === "swing") state.swing = Math.max(50, Math.min(75, state.swing + direction));
  else if (state.source === 0) {
    state.previousBpm = state.bpm;
    state.bpm = Math.max(30, Math.min(300, state.bpm + direction));
    state.bpmAnimationAt = performance.now();
  }
  state.knobTurn += direction * 18;
}

function encoder() {
  wake();
  if (state.screen === "home") { state.screen = "swing"; return; }
  if (state.screen === "port") { state.inverted = !state.inverted; return; }
  if (state.screen === "config") {
    const key = settingKeys[state.setting];
    if (["sleep", "usb", "trs"].includes(key)) state.settings[key] = !state.settings[key];
    else if (key === "ppqn") state.settings.ppqn = [1, 2, 4, 6, 12, 24, 48][([1, 2, 4, 6, 12, 24, 48].indexOf(state.settings.ppqn) + 1) % 7];
    else if (key === "edge" || key === "actionEdge") state.settings[key] = state.settings[key] === "RISE" ? "FALL" : "RISE";
    else if (key === "action") state.settings.action = { PLAY: "STOP", STOP: "PLAYSTOP", PLAYSTOP: "RESET", RESET: "PLAY" }[state.settings.action];
    return;
  }
  state.screen = "home";
}

function action(name) {
  if (name === "saver") { state.screen = "saver"; state.saverAt = performance.now(); return; }
  wake();
  if (name === "start") state.running = true;
  else if (name === "stop") state.running = false;
  else if (name === "source") state.screen = state.screen === "source" ? "home" : "source";
  else if (name === "port") { if (state.screen === "port") state.port = (state.port + 1) % 4; else state.screen = "port"; }
  else if (name === "config") state.screen = state.screen === "config" ? "home" : "config";
  else if (name === "tap" && state.source === 0) { state.previousBpm = state.bpm; state.bpm = 120; state.bpmAnimationAt = performance.now(); }
  else if (name === "encoder") encoder();
  else if (name === "turn-up") turn(1);
  else if (name === "turn-down") turn(-1);
}

const focusDetails = {
  overview: "各部名称",
  oled: "OLED",
  rotary: "Encoder",
  transport: "START / STOP / TAP",
  menu: "SOURCE / PORT / CONFIG",
  clock: "Clock In / Action In / Clock Out A-D",
  midi: "TRS MIDI / USB-C",
};

const panelViewBoxWidth = 171.92;
const oledRotaryBlockWidth = 121.58;

const focusOrigins = {
  overview: [50, 49, 1],
  oled: [50.55, 70.84, "fit-wide", oledRotaryBlockWidth],
  rotary: [50.55, 70.84, "fit-wide", oledRotaryBlockWidth],
  transport: [50, 85, 1.8],
  menu: [50, 58, 1.8],
  clock: [50, 21, 1.8],
  midi: [52, 42, 1.8],
};

const svgFocusGroups = {
  oled: ["oled"],
  rotary: ["rotaryknob"],
  transport: ["playbutton", "stopbutton", "tapbutton"],
  menu: ["soucebutton", "portsbutton", "configbutton"],
  clock: ["inClock", "inAction", "outA", "outB", "outC", "outD"],
  midi: ["midi-in", "midi-out", "USB"],
};

let panelSvg = null;
let panelParts = [];

function openToc(open) {
  toc.classList.toggle("is-open", open);
  tocBackdrop.hidden = !open;
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "目次を閉じる" : "目次を開く");
}

function scenePreset(screen) {
  state.screen = screen;
  state.scroll = null;
  if (screen === "home") {
    state.bpm = 120;
    state.source = 0;
  } else if (screen === "source") {
    state.source = 0;
  } else if (screen === "port") {
    state.port = 0;
    state.portValue = 2;
    state.inverted = false;
  } else if (screen === "config") {
    state.setting = 1;
  } else if (screen === "swing") {
    state.swing = 56;
  } else if (screen === "saver") {
    state.saverAt = performance.now();
  }
}

function setScene(scene, focus) {
  const unchanged = state.readerScene === scene && state.readerFocus === focus;
  state.readerScene = scene;
  state.readerFocus = focus;
  if (!unchanged) scenePreset(scene);
  panelStage.dataset.focus = focus;
  const [x, y, scaleTarget, blockWidth] = focusOrigins[focus] || focusOrigins.overview;
  const scale = panelScaleForFocus(scaleTarget, blockWidth);
  const { panX, panY } = panelPanForFocus(x, y, scale);
  panelStage.style.setProperty("--panel-pan-x", `${panX}px`);
  panelStage.style.setProperty("--panel-pan-y", `${panY}px`);
  panelStage.style.setProperty("--panel-scale", scale);
  panelDetail.textContent = focusDetails[focus] || "各部名称";
  updateSvgFocus(focus);
}

function panelScaleForFocus(scaleTarget, blockWidth) {
  if (scaleTarget !== "fit-wide") return scaleTarget;
  const panelRect = document.querySelector(".panel-reader").getBoundingClientRect();
  const width = panelStage.offsetWidth;
  const renderedBlockWidth = width * blockWidth / panelViewBoxWidth;
  const targetWidth = panelRect.width * 0.9;
  return Math.round((targetWidth / renderedBlockWidth) * 100) / 100;
}

function panelPanForFocus(xPercent, yPercent, scale) {
  const panelRect = document.querySelector(".panel-reader").getBoundingClientRect();
  const width = panelStage.offsetWidth;
  const height = panelStage.offsetHeight;
  const stageLeft = panelStage.offsetLeft;
  const stageTop = panelStage.offsetTop;
  const originX = stageLeft + width / 2;
  const originY = stageTop + height / 2;
  const focusX = stageLeft + width * xPercent / 100;
  const focusY = stageTop + height * yPercent / 100;
  return {
    panX: Math.round(panelRect.left + panelRect.width / 2 - (originX + (focusX - originX) * scale)),
    panY: Math.round(panelRect.top + panelRect.height / 2 - (originY + (focusY - originY) * scale)),
  };
}

function preparePanelSvg() {
  panelSvg = panelSvgHost.querySelector("svg");
  if (!panelSvg) return;
  panelParts = [...panelSvg.querySelectorAll("[data-name]")].filter((node) => node.closest("svg") === panelSvg);
  panelParts.forEach((part) => {
    part.style.transition = "opacity 260ms ease, filter 260ms ease";
    part.style.transformBox = "fill-box";
    part.style.transformOrigin = "center";
  });
  const knob = panelSvg.querySelector('[data-name="rotaryknob"]');
  if (knob) {
    knob.style.transformBox = "fill-box";
    knob.style.transformOrigin = "center center";
    knob.style.transition = "opacity 260ms ease, filter 260ms ease";
  }
  updateSvgFocus(state.readerFocus);
}

async function loadPanelSvg() {
  try {
    const response = await fetch("panel.svg?v=20260715n");
    panelSvgHost.innerHTML = await response.text();
    preparePanelSvg();
  } catch {
    panelSvgHost.textContent = "";
  }
}

function updateSvgFocus(focus) {
  if (!panelSvg) return;
  const activeNames = new Set(svgFocusGroups[focus] || []);
  const shouldDim = activeNames.size > 0;
  panelParts.forEach((part) => {
    const name = part.dataset.name;
    if (name === "レイヤー 1" || name === "レイヤー 2") return;
    const active = activeNames.has(name);
    part.style.opacity = !shouldDim || active ? "1" : ".2";
    part.style.filter = active ? "drop-shadow(0 0 2px rgba(0,0,0,.38))" : "none";
  });
}

function animatePanel(now) {
  if (!panelSvg) return;
  const knob = panelSvg.querySelector('[data-name="rotaryknob"]');
  if (!knob) return;
  const focusIsKnob = state.readerFocus === "rotary";
  const angle = focusIsKnob ? Math.round(Math.sin(now / 420) * 18) : 0;
  knob.style.transform = `rotate(${angle}deg)`;
}

const steps = [...document.querySelectorAll(".manual-step")];
let sceneSyncQueued = false;
function activateStep(step) {
  steps.forEach((item) => item.classList.toggle("is-active", item === step));
  setScene(step.dataset.scene || "home", step.dataset.focus || "overview");
}

function syncSceneFromScroll() {
  sceneSyncQueued = false;
  const area = manualCopy.getBoundingClientRect();
  const targetY = area.top + Math.min(96, area.height * 0.32);
  let best = steps[0];
  let bestDistance = Infinity;
  steps.forEach((step) => {
    const rect = step.getBoundingClientRect();
    if (rect.bottom < area.top + 12) return;
    const distance = Math.abs(rect.top - targetY);
    if (distance < bestDistance) {
      best = step;
      bestDistance = distance;
    }
  });
  activateStep(best);
}
function queueSceneSync() {
  if (sceneSyncQueued) return;
  sceneSyncQueued = true;
  requestAnimationFrame(syncSceneFromScroll);
}

function stepFromHash() {
  if (!location.hash) return null;
  const id = decodeURIComponent(location.hash.slice(1));
  const target = document.getElementById(id);
  return target?.classList.contains("manual-step") ? target : null;
}

function scrollToHashStep(behavior = "auto") {
  const target = stepFromHash();
  if (!target) return false;
  const index = steps.indexOf(target);
  const gap = parseFloat(getComputedStyle(manualCopy).rowGap) || 0;
  const top = steps.slice(0, index).reduce((sum, step) => sum + step.getBoundingClientRect().height + gap, 0);
  manualCopy.scrollTo({ top, behavior });
  activateStep(target);
  setTimeout(queueSceneSync, behavior === "smooth" ? 520 : 80);
  return true;
}

menuButton.addEventListener("click", () => openToc(!toc.classList.contains("is-open")));
tocBackdrop.addEventListener("click", () => openToc(false));
toc.querySelectorAll("a").forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  const href = link.getAttribute("href");
  if (href) history.pushState(null, "", href);
  scrollToHashStep("smooth");
  openToc(false);
}));
manualCopy.addEventListener("scroll", queueSceneSync, { passive: true });
window.addEventListener("resize", queueSceneSync);
window.addEventListener("hashchange", () => scrollToHashStep("auto"));
loadPanelSvg();
if (!scrollToHashStep("auto")) {
  setScene("home", "overview");
  queueSceneSync();
}

Promise.all(Object.values(images).map((image) => image.decode?.().catch(() => {}))).finally(() => requestAnimationFrame(render));
