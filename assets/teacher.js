import {
  DEMO_FALLBACK_DATASET,
  buildPreviewUrl,
  createDatasetId,
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
  isDirty: true
};

const elements = {
  titleInput: document.querySelector("#titleInput"),
  descriptionInput: document.querySelector("#descriptionInput"),
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

const slotEditors = Array.from(document.querySelectorAll("[data-slot-editor]")).map((editor) => ({
  editor,
  chip: editor.querySelector("[data-slot-chip]"),
  labelInput: editor.querySelector('[data-role="slot-label"]'),
  tokenInput: editor.querySelector('[data-role="slot-token"]'),
  hintInput: editor.querySelector('[data-role="slot-hint"]'),
  colorInput: editor.querySelector('[data-role="slot-color"]'),
  wordsInput: editor.querySelector('[data-role="slot-words"]')
}));

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindEvents();
  loadDatasetIntoForm(DEMO_FALLBACK_DATASET, {
    preserveId: false,
    message: "The demo dataset is loaded. Save a preview to test it in the student page."
  });
}

function bindEvents() {
  const watchedFields = [
    elements.titleInput,
    elements.descriptionInput,
    elements.templatesInput,
    ...slotEditors.flatMap((editor) => [
      editor.labelInput,
      editor.tokenInput,
      editor.hintInput,
      editor.colorInput,
      editor.wordsInput
    ])
  ];

  watchedFields.forEach((field) => {
    field.addEventListener("input", handleFormInput);
  });

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

  state.isDirty = true;
  refreshSummary();
}

function buildFormDataset() {
  return {
    id: state.currentPreviewId,
    title: elements.titleInput.value.trim(),
    description: elements.descriptionInput.value.trim(),
    slots: slotEditors.map((editor) => ({
      id: editor.tokenInput.value.trim(),
      label: editor.labelInput.value.trim(),
      hint: editor.hintInput.value.trim(),
      color: editor.colorInput.value,
      words: parseWordLines(editor.wordsInput.value)
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

  elements.titleInput.value = normalized.title;
  elements.descriptionInput.value = normalized.description;
  elements.templatesInput.value = normalized.templates.map((template) => template.text).join("\n");

  slotEditors.forEach((editor, index) => {
    const slot = normalized.slots[index];
    editor.labelInput.value = slot.label;
    editor.tokenInput.value = slot.id;
    editor.hintInput.value = slot.hint;
    editor.colorInput.value = slot.color;
    editor.wordsInput.value = slot.words.join("\n");
  });

  refreshSummary();
  setActionStatus(options.message || "Loaded a dataset into the editor.", "info");
}

function refreshSummary() {
  const formDataset = buildFormDataset();
  const validation = validateDataset(formDataset);
  const safePreviewDataset = normalizeDataset(formDataset, {
    datasetId: state.currentPreviewId
  });
  const totalWords = formDataset.slots.reduce(
    (sum, slot) => sum + parseWordLines(slot.words).length,
    0
  );

  elements.datasetIdBadge.textContent = `Preview ID: ${state.currentPreviewId}`;
  elements.comboMetric.textContent = validation.combinationCount.toLocaleString();
  elements.templateMetric.textContent = String(formDataset.templates.length);
  elements.wordMetric.textContent = String(totalWords);

  renderTokenList(formDataset.slots);
  renderValidation(validation);
  renderSampleSentence(validation, safePreviewDataset);
  updateDirtyBadge();
  updatePreviewLink();
  syncSlotChips();
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
  const sampleWords = Object.fromEntries(
    dataset.slots.map((slot) => [slot.id, slot.words[0]])
  );
  elements.sampleSentence.textContent = fillTemplateText(firstTemplate.text, sampleWords);
}

function syncSlotChips() {
  slotEditors.forEach((editor) => {
    editor.chip.style.backgroundColor = editor.colorInput.value;
  });
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
