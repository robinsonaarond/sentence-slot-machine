import {
  DEMO_FALLBACK_DATASET,
  MAX_SLOT_COUNT,
  MIN_SLOT_COUNT,
  buildPreviewUrl,
  createDatasetId,
  createDefaultSlot,
  downloadJson,
  fillTemplateText,
  hexToRgba,
  normalizeDataset,
  parseTemplateLines,
  parseWordLines,
  slugify,
  validateDataset,
  saveDatasetToStorage
} from "./shared.js";

const state = {
  currentPreviewId: "",
  lastSavedId: null,
  isDirty: true,
  slots: []
};

const elements = {
  titleInput: document.querySelector("#titleInput"),
  descriptionInput: document.querySelector("#descriptionInput"),
  slotEditors: document.querySelector("#slotEditors"),
  slotEditorTemplate: document.querySelector("#slotEditorTemplate"),
  slotCountBadge: document.querySelector("#slotCountBadge"),
  addSlotButton: document.querySelector("#addSlotButton"),
  templatesInput: document.querySelector("#templatesInput"),
  loadDemoButton: document.querySelector("#loadDemoButton"),
  savePreviewButton: document.querySelector("#savePreviewButton"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  datasetIdBadge: document.querySelector("#datasetIdBadge"),
  dirtyBadge: document.querySelector("#dirtyBadge"),
  actionStatus: document.querySelector("#actionStatus"),
  comboMetric: document.querySelector("#comboMetric"),
  templateMetric: document.querySelector("#templateMetric"),
  wordMetric: document.querySelector("#wordMetric"),
  tokenList: document.querySelector("#tokenList"),
  sampleSentence: document.querySelector("#sampleSentence"),
  validationList: document.querySelector("#validationList"),
  openPreviewLink: document.querySelector("#openPreviewLink"),
  previewStatus: document.querySelector("#previewStatus")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindEvents();
  loadDatasetIntoForm(DEMO_FALLBACK_DATASET, {
    preserveId: false,
    message: "The demo dataset is loaded. Save a preview to test it in the student page."
  });
}

function bindEvents() {
  [elements.titleInput, elements.descriptionInput, elements.templatesInput].forEach((field) => {
    field.addEventListener("input", handleFormInput);
  });

  elements.slotEditors.addEventListener("input", handleFormInput);
  elements.slotEditors.addEventListener("click", handleSlotEditorClick);
  elements.addSlotButton.addEventListener("click", addSlot);

  elements.loadDemoButton.addEventListener("click", () => {
    loadDatasetIntoForm(DEMO_FALLBACK_DATASET, {
      preserveId: false,
      message: "Reloaded the demo dataset into the editor."
    });
  });
  elements.savePreviewButton.addEventListener("click", savePreview);
  elements.exportButton.addEventListener("click", exportDataset);
  elements.importInput.addEventListener("change", handleImport);
  elements.openPreviewLink.addEventListener("click", (event) => {
    if (elements.openPreviewLink.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
    }
  });
}

function handleFormInput(event) {
  if (event.target.matches('[data-role="slot-token"]')) {
    event.target.value = slugify(event.target.value);
  }

  const editor = event.target.closest("[data-slot-editor]");
  if (editor) {
    syncSlotFromEditor(editor);
  }

  state.isDirty = true;
  refreshSummary();
}

function handleSlotEditorClick(event) {
  const removeButton = event.target.closest('[data-action="remove-slot"]');
  if (!removeButton || removeButton.disabled) {
    return;
  }

  const editor = removeButton.closest("[data-slot-editor]");
  const index = Number(editor?.dataset.slotEditor);
  if (!Number.isInteger(index)) {
    return;
  }

  removeSlot(index);
}

function buildFormDataset() {
  return {
    id: state.currentPreviewId,
    title: elements.titleInput.value.trim(),
    description: elements.descriptionInput.value.trim(),
    slots: state.slots.map((slot) => ({
      id: slot.id.trim(),
      label: slot.label.trim(),
      hint: slot.hint.trim(),
      color: slot.color,
      words: [...slot.words]
    })),
    templates: parseTemplateLines(elements.templatesInput.value).map((text, index) => ({
      id: `template-${index + 1}`,
      label: `Sentence ${index + 1}`,
      text
    }))
  };
}

function loadDatasetIntoForm(dataset, options = {}) {
  const previewId = options.preserveId
    ? slugify(dataset.id || "") || createDatasetId(dataset.title || "sentence-set")
    : createDatasetId(dataset.title || "sentence-set");

  const normalized = normalizeDataset(
    {
      ...dataset,
      id: previewId
    },
    {
      datasetId: previewId
    }
  );

  state.currentPreviewId = normalized.id;
  state.lastSavedId = null;
  state.isDirty = true;
  state.slots = normalized.slots.map(cloneSlot);

  elements.titleInput.value = normalized.title;
  elements.descriptionInput.value = normalized.description;
  elements.templatesInput.value = normalized.templates.map((template) => template.text).join("\n");

  renderSlotEditors();
  refreshSummary();
  setActionStatus(options.message || "Loaded a dataset into the editor.", "info");
}

function refreshSummary() {
  const formDataset = buildFormDataset();
  const validation = validateDataset(formDataset);
  const safePreviewDataset = normalizeDataset(formDataset, {
    datasetId: state.currentPreviewId
  });
  const totalWords = formDataset.slots.reduce((sum, slot) => sum + slot.words.length, 0);

  elements.datasetIdBadge.textContent = `Preview ID: ${state.currentPreviewId}`;
  elements.comboMetric.textContent = validation.combinationCount.toLocaleString();
  elements.templateMetric.textContent = String(formDataset.templates.length);
  elements.wordMetric.textContent = String(totalWords);

  renderTokenList(formDataset.slots);
  renderValidation(validation);
  renderSampleSentence(validation, safePreviewDataset);
  updateDirtyBadge();
  updatePreviewLink();
  updateSlotControls();
}

function renderSlotEditors() {
  elements.slotEditors.innerHTML = "";

  state.slots.forEach((slot, index) => {
    const editor = elements.slotEditorTemplate.content.firstElementChild.cloneNode(true);
    editor.dataset.slotEditor = String(index);

    editor.querySelector("[data-slot-index]").textContent = `Slot ${index + 1}`;
    editor.querySelector("[data-slot-chip]").style.backgroundColor = slot.color;
    editor.querySelector('[data-role="slot-label"]').value = slot.label;
    editor.querySelector('[data-role="slot-token"]').value = slot.id;
    editor.querySelector('[data-role="slot-hint"]').value = slot.hint;
    editor.querySelector('[data-role="slot-color"]').value = slot.color;
    editor.querySelector('[data-role="slot-words"]').value = slot.words.join("\n");

    const removeButton = editor.querySelector('[data-action="remove-slot"]');
    removeButton.disabled = state.slots.length <= MIN_SLOT_COUNT;
    removeButton.setAttribute("aria-label", `Remove slot ${index + 1}`);

    elements.slotEditors.append(editor);
  });

  updateSlotControls();
}

function addSlot() {
  if (state.slots.length >= MAX_SLOT_COUNT) {
    return;
  }

  const usedIds = new Set(state.slots.map((slot) => slugify(slot.id)).filter(Boolean));
  const slot = createDefaultSlot(state.slots.length, usedIds);

  state.slots.push(cloneSlot(slot));
  state.isDirty = true;

  renderSlotEditors();
  refreshSummary();
  setActionStatus(`Added {${slot.id}}. Update a sentence template to use it.`, "info");
}

function removeSlot(index) {
  if (state.slots.length <= MIN_SLOT_COUNT) {
    return;
  }

  const [removedSlot] = state.slots.splice(index, 1);
  state.isDirty = true;

  renderSlotEditors();
  refreshSummary();
  setActionStatus(`Removed {${removedSlot.id}}. Update any templates that still reference it.`, "info");
}

function syncSlotFromEditor(editor) {
  const index = Number(editor.dataset.slotEditor);
  const slot = state.slots[index];
  if (!slot) {
    return;
  }

  slot.label = editor.querySelector('[data-role="slot-label"]').value.trim();
  slot.id = editor.querySelector('[data-role="slot-token"]').value.trim();
  slot.hint = editor.querySelector('[data-role="slot-hint"]').value.trim();
  slot.color = editor.querySelector('[data-role="slot-color"]').value;
  slot.words = parseWordLines(editor.querySelector('[data-role="slot-words"]').value);

  editor.querySelector("[data-slot-chip]").style.backgroundColor = slot.color;
}

function updateSlotControls() {
  const count = state.slots.length;
  elements.slotCountBadge.textContent = `${count} ${count === 1 ? "slot" : "slots"}`;
  elements.addSlotButton.disabled = count >= MAX_SLOT_COUNT;
  elements.addSlotButton.setAttribute("aria-disabled", count >= MAX_SLOT_COUNT ? "true" : "false");
}

function renderTokenList(slots) {
  elements.tokenList.innerHTML = "";

  slots.forEach((slot, index) => {
    const token = slugify(slot.id || "");
    const label = slot.label || `Slot ${index + 1}`;
    const chip = document.createElement("article");
    chip.className = "token-chip";
    chip.style.backgroundColor = hexToRgba(slot.color || "#999999", 0.16);
    chip.style.borderColor = slot.color || "#999999";

    const chipLabel = document.createElement("strong");
    chipLabel.textContent = label;

    const chipToken = document.createElement("span");
    chipToken.textContent = token ? `{${token}}` : "Add a token";

    chip.append(chipLabel, chipToken);
    elements.tokenList.append(chip);
  });
}

function renderValidation(validation) {
  elements.validationList.innerHTML = "";

  if (!validation.issues.length && !validation.warnings.length) {
    const clean = document.createElement("div");
    clean.className = "notice notice-success";
    clean.textContent = "Looks good. This dataset is ready to save or export.";
    elements.validationList.append(clean);
    return;
  }

  validation.issues.forEach((issue) => {
    const item = document.createElement("div");
    item.className = "notice notice-error";
    item.textContent = issue;
    elements.validationList.append(item);
  });

  validation.warnings.forEach((warning) => {
    const item = document.createElement("div");
    item.className = "notice notice-warning";
    item.textContent = warning;
    elements.validationList.append(item);
  });
}

function renderSampleSentence(validation, dataset) {
  if (validation.issues.length) {
    elements.sampleSentence.textContent = "Fix the validation issues to preview a sentence.";
    return;
  }

  const firstTemplate = dataset.templates[0];
  const sampleWords = Object.fromEntries(dataset.slots.map((slot) => [slot.id, slot.words[0]]));
  elements.sampleSentence.textContent = fillTemplateText(firstTemplate.text, sampleWords);
}

function updateDirtyBadge() {
  if (state.lastSavedId && !state.isDirty) {
    elements.dirtyBadge.textContent = "Preview saved";
    elements.dirtyBadge.className = "info-badge info-badge-success";
    return;
  }

  if (state.lastSavedId && state.isDirty) {
    elements.dirtyBadge.textContent = "Preview needs saving";
    elements.dirtyBadge.className = "info-badge info-badge-warning";
    return;
  }

  elements.dirtyBadge.textContent = "Unsaved preview";
  elements.dirtyBadge.className = "info-badge";
}

function updatePreviewLink() {
  if (!state.lastSavedId) {
    elements.openPreviewLink.href = "index.html";
    elements.openPreviewLink.setAttribute("aria-disabled", "true");
    elements.previewStatus.textContent =
      "Save a preview to create a live student link from this browser.";
    return;
  }

  elements.openPreviewLink.href = buildPreviewUrl(state.lastSavedId);
  elements.openPreviewLink.setAttribute("aria-disabled", "false");
  elements.previewStatus.textContent = state.isDirty
    ? "The saved preview is older than the form. Save again to refresh the student page."
    : "Student preview ready. Open it in a new tab to test the experience.";
}

function savePreview() {
  const formDataset = buildFormDataset();
  const validation = validateDataset(formDataset);

  if (validation.issues.length) {
    renderValidation(validation);
    setActionStatus("Fix the validation issues before saving a preview.", "error");
    return;
  }

  const dataset = normalizeDataset(formDataset, {
    datasetId: state.currentPreviewId
  });
  saveDatasetToStorage(dataset);
  state.lastSavedId = dataset.id;
  state.isDirty = false;
  refreshSummary();
  setActionStatus("Saved this dataset to browser storage for live preview.", "success");
}

function exportDataset() {
  const formDataset = buildFormDataset();
  const validation = validateDataset(formDataset);

  if (validation.issues.length) {
    renderValidation(validation);
    setActionStatus("Fix the validation issues before exporting JSON.", "error");
    return;
  }

  const dataset = normalizeDataset(formDataset, {
    datasetId: state.currentPreviewId
  });
  downloadJson(`${dataset.id}.json`, dataset);
  setActionStatus(`Exported ${dataset.id}.json.`, "success");
}

async function handleImport(event) {
  const [file] = event.target.files;
  event.target.value = "";

  if (!file) {
    return;
  }

  try {
    const content = await file.text();
    const parsed = JSON.parse(content);
    loadDatasetIntoForm(parsed, {
      preserveId: true,
      message: `Imported ${file.name}. Save a preview to test it in the student page.`
    });
  } catch (error) {
    setActionStatus("That file could not be read as JSON.", "error");
  }
}

function setActionStatus(message, tone) {
  elements.actionStatus.textContent = message;
  elements.actionStatus.dataset.tone = tone;
}

function cloneSlot(slot) {
  return {
    id: slot.id,
    label: slot.label,
    hint: slot.hint,
    color: slot.color,
    words: [...slot.words]
  };
}
