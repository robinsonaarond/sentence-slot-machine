export const STORAGE_PREFIX = "sentence-slot-machine:dataset:";

const DEFAULT_SLOT_BLUEPRINTS = [
  {
    id: "subject",
    label: "Noun",
    hint: "Who or what?",
    color: "#ff7a59",
    words: ["panda", "robot", "pirate"]
  },
  {
    id: "verb",
    label: "Verb",
    hint: "What are they doing?",
    color: "#14b8a6",
    words: ["juggles", "paints", "balances"]
  },
  {
    id: "place",
    label: "Place",
    hint: "Where does it happen?",
    color: "#4f46e5",
    words: ["at recess", "on the moon", "in the library"]
  }
];

export const DEMO_FALLBACK_DATASET = {
  id: "demo",
  title: "Playground Parade",
  description:
    "Pull the lever, read the sentence, and see how each word fits into the story.",
  slots: [
    {
      id: "subject",
      label: "Noun",
      hint: "Who or what?",
      color: "#ff7a59",
      words: ["panda", "robot", "pirate", "unicorn", "dinosaur"]
    },
    {
      id: "verb",
      label: "Verb",
      hint: "What are they doing?",
      color: "#14b8a6",
      words: ["juggles", "paints", "whispers to", "balances", "tickles"]
    },
    {
      id: "place",
      label: "Place",
      hint: "Where does it happen?",
      color: "#4f46e5",
      words: [
        "at recess",
        "on the moon",
        "in the library",
        "under the slide",
        "by the snack table"
      ]
    }
  ],
  templates: [
    {
      id: "template-1",
      label: "Story line",
      text: "The {subject} {verb} {place}."
    },
    {
      id: "template-2",
      label: "Question",
      text: "Can the {subject} {verb} {place} today?"
    },
    {
      id: "template-3",
      label: "Daily routine",
      text: "Every afternoon, the {subject} {verb} {place}."
    },
    {
      id: "template-4",
      label: "Surprise moment",
      text: "Look out: the {subject} suddenly {verb} {place}!"
    }
  ]
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value : String(value ?? "");
}

function normalizeColor(value, fallback) {
  const text = asString(value).trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) {
    if (text.length === 4) {
      return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`.toLowerCase();
    }
    return text.toLowerCase();
  }
  return fallback;
}

function uniquePreserveOrder(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function defaultTemplateFromSlots(slots) {
  const [first, second, third] = slots.map((slot) => slot.id);
  return `The {${first}} likes to {${second}} {${third}}.`;
}

function normalizeTemplate(template, index) {
  const rawTemplate = template && typeof template === "object" ? template : { text: template };
  const text = asString(rawTemplate.text).trim();

  if (!text) {
    return null;
  }

  const label = asString(rawTemplate.label).trim() || `Sentence ${index + 1}`;
  const id = slugify(rawTemplate.id || label || `template-${index + 1}`) || `template-${index + 1}`;

  return {
    id,
    label,
    text
  };
}

function normalizeSlot(slot, index, usedIds) {
  const blueprint =
    DEFAULT_SLOT_BLUEPRINTS[index] ||
    DEFAULT_SLOT_BLUEPRINTS[DEFAULT_SLOT_BLUEPRINTS.length - 1];
  const rawSlot = slot && typeof slot === "object" ? slot : {};

  let id = slugify(rawSlot.id || rawSlot.token || rawSlot.label || blueprint.id) || `slot-${index + 1}`;
  if (usedIds.has(id)) {
    let suffix = 2;
    while (usedIds.has(`${id}-${suffix}`)) {
      suffix += 1;
    }
    id = `${id}-${suffix}`;
  }
  usedIds.add(id);

  const words = parseWordLines(rawSlot.words);

  return {
    id,
    label: asString(rawSlot.label).trim() || blueprint.label,
    hint: asString(rawSlot.hint).trim() || blueprint.hint,
    color: normalizeColor(rawSlot.color, blueprint.color),
    words: words.length ? words : [...blueprint.words]
  };
}

export function slugify(value) {
  return asString(value)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function createDatasetId(title = "sentence-set") {
  const base = slugify(title) || "sentence-set";
  const stamp = Date.now().toString(36).slice(-5);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${stamp}${suffix}`;
}

export function parseWordLines(value) {
  const lines = asArray(value).length
    ? asArray(value).map((entry) => asString(entry).trim())
    : asString(value)
        .split(/\r?\n/)
        .map((entry) => entry.trim());

  return uniquePreserveOrder(lines.filter(Boolean));
}

export function parseTemplateLines(value) {
  return asString(value)
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseTemplateTokens(text) {
  const tokens = [];
  const matcher = /\{([a-z0-9_-]+)\}/gi;
  let match = matcher.exec(asString(text));

  while (match) {
    tokens.push(match[1]);
    match = matcher.exec(asString(text));
  }

  return uniquePreserveOrder(tokens);
}

export function splitTemplateText(text) {
  const segments = [];
  const source = asString(text);
  const matcher = /\{([a-z0-9_-]+)\}/gi;
  let lastIndex = 0;
  let match = matcher.exec(source);

  while (match) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: source.slice(lastIndex, match.index)
      });
    }

    segments.push({
      type: "slot",
      value: match[1]
    });

    lastIndex = matcher.lastIndex;
    match = matcher.exec(source);
  }

  if (lastIndex < source.length) {
    segments.push({
      type: "text",
      value: source.slice(lastIndex)
    });
  }

  return segments;
}

export function fillTemplateText(text, selectionMap) {
  return splitTemplateText(text)
    .map((segment) => {
      if (segment.type === "text") {
        return segment.value;
      }
      return selectionMap[segment.value] ?? `{${segment.value}}`;
    })
    .join("");
}

export function hexToRgba(hexColor, alpha = 1) {
  const normalized = normalizeColor(hexColor, "#000000").replace("#", "");
  const channels =
    normalized.length === 3
      ? normalized.split("").map((part) => part + part)
      : normalized.match(/.{2}/g);

  if (!channels) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const [red, green, blue] = channels.map((channel) => Number.parseInt(channel, 16));
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function normalizeDataset(raw = DEMO_FALLBACK_DATASET, options = {}) {
  const source = raw && typeof raw === "object" ? raw : DEMO_FALLBACK_DATASET;
  const usedIds = new Set();
  const slots = asArray(source.slots)
    .slice(0, 3)
    .map((slot, index) => normalizeSlot(slot, index, usedIds));

  while (slots.length < 3) {
    slots.push(normalizeSlot({}, slots.length, usedIds));
  }

  const templates = asArray(source.templates)
    .map((template, index) => normalizeTemplate(template, index))
    .filter(Boolean);

  return {
    id: slugify(options.datasetId || source.id) || createDatasetId(source.title || "sentence-set"),
    title: asString(source.title || source.name).trim() || DEMO_FALLBACK_DATASET.title,
    description:
      asString(source.description).trim() || DEMO_FALLBACK_DATASET.description,
    slots,
    templates: templates.length
      ? templates
      : [
          {
            id: "template-1",
            label: "Sentence 1",
            text: defaultTemplateFromSlots(slots)
          }
        ]
  };
}

export function validateDataset(raw) {
  const issues = [];
  const warnings = [];
  const source = raw && typeof raw === "object" ? raw : {};
  const slots = asArray(source.slots);
  const templates = asArray(source.templates)
    .map((template) => normalizeTemplate(template, 0))
    .filter(Boolean);

  if (!asString(source.title).trim()) {
    warnings.push("Add a title so students know what activity they are playing.");
  }

  if (slots.length !== 3) {
    issues.push("The current student page expects exactly three slots.");
  }

  const slotWordsById = new Map();
  const seenIds = new Set();
  const orderedIds = [];

  slots.slice(0, 3).forEach((slot, index) => {
    const slotObject = slot && typeof slot === "object" ? slot : {};
    const id = slugify(slotObject.id || slotObject.token || slotObject.label || "");
    const label = asString(slotObject.label).trim() || `Slot ${index + 1}`;
    const words = parseWordLines(slotObject.words);

    if (!id) {
      issues.push(`${label} needs a lowercase token such as "subject" or "verb".`);
    } else if (seenIds.has(id)) {
      issues.push(`The token "${id}" is used more than once. Each slot token must be unique.`);
    } else {
      seenIds.add(id);
      orderedIds.push(id);
      slotWordsById.set(id, words.length);
    }

    if (!words.length) {
      issues.push(`${label} needs at least one word.`);
    }
  });

  if (!templates.length) {
    issues.push("Add at least one sentence template.");
  }

  let combinationCount = 0;

  templates.forEach((template, index) => {
    const tokens = parseTemplateTokens(template.text);

    if (!tokens.length) {
      warnings.push(`Template ${index + 1} has no slot tokens.`);
      combinationCount += 1;
      return;
    }

    const unknownTokens = tokens.filter((token) => !slotWordsById.has(token));
    if (unknownTokens.length) {
      issues.push(
        `Template ${index + 1} uses unknown token${unknownTokens.length > 1 ? "s" : ""}: ${unknownTokens
          .map((token) => `{${token}}`)
          .join(", ")}.`
      );
    }

    const knownTokens = uniquePreserveOrder(tokens.filter((token) => slotWordsById.has(token)));
    const templateCount = knownTokens.reduce(
      (product, token) => product * Math.max(slotWordsById.get(token) || 0, 1),
      1
    );
    combinationCount += templateCount;
  });

  orderedIds.forEach((id) => {
    const usedByAnyTemplate = templates.some((template) => parseTemplateTokens(template.text).includes(id));
    if (!usedByAnyTemplate) {
      warnings.push(`Token {${id}} is not used in any sentence template.`);
    }
  });

  return {
    issues,
    warnings,
    combinationCount
  };
}

export function countSentenceCombinations(datasetLike) {
  return validateDataset(datasetLike).combinationCount;
}

export function buildStoredDatasetKey(datasetId) {
  return `${STORAGE_PREFIX}${datasetId}`;
}

export function saveDatasetToStorage(dataset) {
  window.localStorage.setItem(buildStoredDatasetKey(dataset.id), JSON.stringify(dataset));
}

export function loadStoredDataset(datasetId) {
  const raw = window.localStorage.getItem(buildStoredDatasetKey(datasetId));
  if (!raw) {
    return null;
  }

  return normalizeDataset(JSON.parse(raw), { datasetId });
}

export function buildPreviewUrl(datasetId) {
  const url = new URL("index.html", window.location.href);
  url.searchParams.set("set", datasetId);
  return url.toString();
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function loadRemoteDataset(datasetId) {
  const safeId = slugify(datasetId) || "demo";
  const response = await fetch(`./data/${encodeURIComponent(safeId)}.json`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Could not load dataset "${safeId}".`);
  }

  const json = await response.json();
  return normalizeDataset(json, { datasetId: safeId });
}

export async function loadDatasetFromLocation(search = window.location.search) {
  const params = new URLSearchParams(search);
  const savedSetId = slugify(params.get("set") || "");

  if (savedSetId) {
    try {
      const savedDataset = loadStoredDataset(savedSetId);
      if (savedDataset) {
        return {
          dataset: savedDataset,
          sourceLabel: `Saved preview: ${savedSetId}`,
          statusMessage: "Loaded a saved preview from this browser."
        };
      }
    } catch (error) {
      return {
        dataset: normalizeDataset(DEMO_FALLBACK_DATASET),
        sourceLabel: "Fallback demo dataset",
        statusMessage: "The saved preview could not be read. Showing the built-in demo instead."
      };
    }
  }

  const requestedDataId = slugify(params.get("data") || "demo") || "demo";

  try {
    const dataset = await loadRemoteDataset(requestedDataId);
    return {
      dataset,
      sourceLabel:
        requestedDataId === "demo"
          ? "Bundled demo dataset"
          : `Static dataset: ${requestedDataId}`,
      statusMessage:
        savedSetId && savedSetId !== requestedDataId
          ? `Saved preview "${savedSetId}" was not found, so the app loaded "${requestedDataId}" instead.`
          : "Loaded a static dataset."
    };
  } catch (error) {
    return {
      dataset: normalizeDataset(DEMO_FALLBACK_DATASET),
      sourceLabel: "Fallback demo dataset",
      statusMessage: `Could not load "${requestedDataId}". Showing the built-in demo instead.`
    };
  }
}
