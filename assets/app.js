import {
  countSentenceCombinations,
  fillTemplateText,
  hexToRgba,
  isDebugMode,
  loadDatasetFromLocation,
  splitTemplateText
} from "./shared.js";

const state = {
  dataset: null,
  currentIndices: {},
  currentWords: {},
  templateIndex: 0,
  spinning: false,
  reelElements: new Map(),
  pointerStart: null,
  debug: isDebugMode()
};

document.body.classList.toggle("debug-mode", state.debug);

const elements = {
  heroTitle: document.querySelector("#heroTitle"),
  heroDescription: document.querySelector("#heroDescription"),
  sourceBadge: document.querySelector("#sourceBadge"),
  combinationBadge: document.querySelector("#combinationBadge"),
  reelGrid: document.querySelector("#reelGrid"),
  spinButton: document.querySelector("#spinButton"),
  shuffleSentenceButton: document.querySelector("#shuffleSentenceButton"),
  resetWordsButton: document.querySelector("#resetWordsButton"),
  templateTitle: document.querySelector("#templateTitle"),
  templateCounter: document.querySelector("#templateCounter"),
  sentenceStage: document.querySelector("#sentenceStage"),
  sentenceText: document.querySelector("#sentenceText"),
  previousTemplateButton: document.querySelector("#previousTemplateButton"),
  nextTemplateButton: document.querySelector("#nextTemplateButton"),
  selectionSummary: document.querySelector("#selectionSummary"),
  statusMessage: document.querySelector("#statusMessage")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const { dataset, sourceLabel, statusMessage } = await loadDatasetFromLocation();

  state.dataset = dataset;
  state.templateIndex = 0;

  seedSelections();
  renderHero(sourceLabel);
  renderReels();
  bindEvents();
  updateTemplateControls();
  renderSentence({ animate: false });
  renderSelectionSummary();
  setStatus(statusMessage);
}

function bindEvents() {
  elements.spinButton.addEventListener("click", spinAllReels);
  elements.shuffleSentenceButton.addEventListener("click", () => {
    if (state.spinning) {
      return;
    }
    chooseAnotherTemplate();
    renderSentence({ animate: true });
    setStatus("New sentence frame ready. Keep the same words and read it again.");
  });
  elements.resetWordsButton.addEventListener("click", resetWords);
  elements.previousTemplateButton.addEventListener("click", () => shiftTemplate(-1));
  elements.nextTemplateButton.addEventListener("click", () => shiftTemplate(1));
  elements.sentenceStage.addEventListener("pointerdown", handlePointerDown);
  elements.sentenceStage.addEventListener("pointerup", handlePointerUp);
  elements.sentenceStage.addEventListener("pointercancel", clearPointerState);
}

function renderHero(sourceLabel) {
  elements.heroTitle.textContent = state.dataset.title;
  elements.heroDescription.textContent = state.dataset.description;
  elements.sourceBadge.textContent = sourceLabel;
  elements.combinationBadge.textContent = `${countSentenceCombinations(state.dataset).toLocaleString()} sentence combinations`;
}

function seedSelections() {
  state.dataset.slots.forEach((slot) => {
    const startingIndex = randomIndex(slot.words.length);
    state.currentIndices[slot.id] = startingIndex;
    state.currentWords[slot.id] = slot.words[startingIndex];
  });
}

function renderReels() {
  state.reelElements.clear();
  elements.reelGrid.innerHTML = "";

  state.dataset.slots.forEach((slot) => {
    const reel = document.createElement("article");
    reel.className = "reel-card";
    reel.style.setProperty("--slot-color", slot.color);

    const reelHeader = document.createElement("div");
    reelHeader.className = "reel-header";

    const labelGroup = document.createElement("div");
    const label = document.createElement("p");
    label.className = "reel-label";
    label.textContent = slot.label;
    const hint = document.createElement("p");
    hint.className = "reel-hint";
    hint.textContent = slot.hint;
    labelGroup.append(label, hint);

    const countElement = document.createElement("p");
    countElement.className = "reel-count";
    countElement.dataset.debugOnly = "";
    countElement.textContent = `1 / ${slot.words.length}`;
    reelHeader.append(labelGroup, countElement);

    const reelWindow = document.createElement("button");
    reelWindow.className = "reel-window";
    reelWindow.type = "button";
    const wordElement = document.createElement("p");
    wordElement.className = "reel-word";
    reelWindow.append(wordElement);
    reel.append(reelHeader, reelWindow);

    reelWindow.addEventListener("click", () => {
      if (state.spinning) {
        return;
      }
      shiftWord(slot.id, 1);
    });

    elements.reelGrid.append(reel);
    state.reelElements.set(slot.id, {
      card: reel,
      windowButton: reelWindow,
      wordElement,
      countElement
    });

    updateReelDisplay(slot.id, { animate: false });
  });
}

function updateReelDisplay(slotId, { animate = true } = {}) {
  const slot = findSlot(slotId);
  const reel = state.reelElements.get(slotId);

  if (!slot || !reel) {
    return;
  }

  reel.wordElement.textContent = state.currentWords[slotId];
  reel.countElement.textContent = `${state.currentIndices[slotId] + 1} / ${slot.words.length}`;
  reel.windowButton.setAttribute(
    "aria-label",
    `${slot.label}: ${state.currentWords[slotId]}. Click to switch to the next word.`
  );

  if (animate) {
    pulseElement(reel.windowButton, "is-bumped");
  }
}

function renderSentence({ animate = true } = {}) {
  const template = state.dataset.templates[state.templateIndex];
  const fragment = document.createDocumentFragment();

  splitTemplateText(template.text).forEach((segment, index) => {
    if (segment.type === "text") {
      fragment.append(document.createTextNode(segment.value));
      return;
    }

    const slot = findSlot(segment.value);
    const token = document.createElement("span");
    token.className = "sentence-token";
    token.style.setProperty("--slot-color", slot?.color || "#999999");
    token.style.backgroundColor = hexToRgba(slot?.color || "#999999", 0.18);
    token.style.borderColor = slot?.color || "#999999";
    token.textContent = slot ? state.currentWords[slot.id] : `{${segment.value}}`;

    if (slot) {
      token.dataset.slotLabel = slot.label;
    }

    if (animate) {
      token.style.animationDelay = `${index * 80}ms`;
      token.classList.add("is-updating");
    }

    fragment.append(token);
  });

  elements.templateTitle.textContent = template.label;
  elements.templateCounter.textContent = `${state.templateIndex + 1} / ${state.dataset.templates.length}`;
  elements.sentenceText.innerHTML = "";
  elements.sentenceText.append(fragment);

  if (animate) {
    pulseElement(elements.sentenceStage, "is-animating");
  }
}

function renderSelectionSummary() {
  elements.selectionSummary.innerHTML = "";

  state.dataset.slots.forEach((slot) => {
    const card = document.createElement("article");
    card.className = "selection-chip";
    card.style.setProperty("--slot-color", slot.color);
    card.style.backgroundColor = hexToRgba(slot.color, 0.16);

    const label = document.createElement("span");
    label.className = "selection-label";
    label.textContent = slot.label;

    const word = document.createElement("strong");
    word.className = "selection-word";
    word.textContent = state.currentWords[slot.id];

    card.append(label, word);
    elements.selectionSummary.append(card);
  });
}

function shiftWord(slotId, direction) {
  const slot = findSlot(slotId);
  if (!slot) {
    return;
  }

  const nextIndex =
    (state.currentIndices[slotId] + direction + slot.words.length) % slot.words.length;
  state.currentIndices[slotId] = nextIndex;
  state.currentWords[slotId] = slot.words[nextIndex];

  updateReelDisplay(slotId);
  renderSentence({ animate: true });
  renderSelectionSummary();
  setStatus(`Changed the ${slot.label.toLowerCase()} slot to "${state.currentWords[slotId]}".`);
}

async function spinAllReels() {
  if (state.spinning) {
    return;
  }

  state.spinning = true;
  updateInteractiveState();
  chooseAnotherTemplate();
  setStatus("The reels are spinning. Watch the words line up.");

  const stopTasks = state.dataset.slots.map((slot, index) =>
    spinSingleReel(slot, 900 + index * 260)
  );

  await Promise.all(stopTasks);

  state.spinning = false;
  updateInteractiveState();
  renderSentence({ animate: true });
  renderSelectionSummary();
  setStatus(`New sentence ready: ${fillTemplateText(currentTemplate().text, state.currentWords)}`);
}

function spinSingleReel(slot, duration) {
  return new Promise((resolve) => {
    const reel = state.reelElements.get(slot.id);
    let previewIndex = state.currentIndices[slot.id];

    reel.card.classList.add("is-spinning");

    const ticker = window.setInterval(() => {
      previewIndex = (previewIndex + 1) % slot.words.length;
      reel.wordElement.textContent = slot.words[previewIndex];
      reel.countElement.textContent = `${previewIndex + 1} / ${slot.words.length}`;
    }, 90);

    const stopper = window.setTimeout(() => {
      const targetIndex = randomIndex(slot.words.length);
      window.clearInterval(ticker);
      window.clearTimeout(stopper);

      state.currentIndices[slot.id] = targetIndex;
      state.currentWords[slot.id] = slot.words[targetIndex];
      reel.card.classList.remove("is-spinning");
      updateReelDisplay(slot.id);
      resolve();
    }, duration);
  });
}

function resetWords() {
  if (state.spinning) {
    return;
  }

  state.dataset.slots.forEach((slot) => {
    state.currentIndices[slot.id] = 0;
    state.currentWords[slot.id] = slot.words[0];
    updateReelDisplay(slot.id, { animate: false });
  });

  state.templateIndex = 0;
  renderSentence({ animate: true });
  renderSelectionSummary();
  updateTemplateControls();
  setStatus("Reset the slots to the first word in each reel.");
}

function shiftTemplate(direction) {
  if (state.spinning || state.dataset.templates.length < 2) {
    return;
  }

  state.templateIndex =
    (state.templateIndex + direction + state.dataset.templates.length) %
    state.dataset.templates.length;
  updateTemplateControls();
  renderSentence({ animate: true });
  setStatus("Switched to a different sentence frame with the same words.");
}

function chooseAnotherTemplate() {
  if (state.dataset.templates.length < 2) {
    return;
  }

  let nextIndex = randomIndex(state.dataset.templates.length);
  while (nextIndex === state.templateIndex) {
    nextIndex = randomIndex(state.dataset.templates.length);
  }
  state.templateIndex = nextIndex;
  updateTemplateControls();
}

function updateTemplateControls() {
  const onlyOneTemplate = state.dataset.templates.length < 2;
  elements.shuffleSentenceButton.disabled = onlyOneTemplate || state.spinning;
  elements.previousTemplateButton.disabled = onlyOneTemplate || state.spinning;
  elements.nextTemplateButton.disabled = onlyOneTemplate || state.spinning;
}

function updateInteractiveState() {
  elements.spinButton.disabled = state.spinning;
  elements.spinButton.classList.toggle("is-pulled", state.spinning);
  elements.resetWordsButton.disabled = state.spinning;
  updateTemplateControls();

  state.reelElements.forEach((reel) => {
    reel.windowButton.disabled = state.spinning;
  });
}

function handlePointerDown(event) {
  state.pointerStart = {
    x: event.clientX,
    y: event.clientY
  };
}

function handlePointerUp(event) {
  if (!state.pointerStart) {
    return;
  }

  const deltaX = event.clientX - state.pointerStart.x;
  const deltaY = event.clientY - state.pointerStart.y;
  clearPointerState();

  if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY)) {
    return;
  }

  shiftTemplate(deltaX < 0 ? 1 : -1);
}

function clearPointerState() {
  state.pointerStart = null;
}

function currentTemplate() {
  return state.dataset.templates[state.templateIndex];
}

function findSlot(slotId) {
  return state.dataset.slots.find((slot) => slot.id === slotId);
}

function setStatus(message) {
  elements.statusMessage.textContent = message;
}

function pulseElement(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function randomIndex(length) {
  return Math.floor(Math.random() * length);
}
