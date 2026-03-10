# Sentence Slot Machine

Sentence Slot Machine is a static web app for practicing vocabulary and sentence structure through a playful slot-machine interface.

It currently includes:

- a student-facing page with animated reels and sentence switching
- a teacher-facing page for authoring datasets
- a JSON dataset format that can be saved locally or exported for static hosting

## Pages

### Student Page

`index.html` loads a dataset, spins 2 to 10 word reels, and renders a sentence using the selected words.

Current student features:

- animated spin interaction
- color-coded sentence highlights
- clickable reel windows for manual word changes
- swipe or button-based sentence changes
- support for multiple static sample datasets and browser-saved previews

### Teacher Page

`teacher.html` is the authoring surface for building activities.

Current teacher features:

- edit title and description
- configure 2 to 10 slots with tokens, labels, colors, and words
- write sentence templates with placeholders such as `{subject}`
- validate templates and count possible combinations
- save datasets to browser storage
- open a live student preview
- export datasets as JSON

## Running Locally

Because the app loads JSON modules and static files, run it from a local web server rather than opening the files directly from disk.

Example options:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`
- `http://localhost:8000/teacher.html`

## Dataset Loading

The student page supports two dataset sources:

1. Static JSON files via `?data=<id>`
2. Browser-saved teacher previews via `?set=<id>`

Examples:

- `index.html?data=demo`
- `index.html?set=playground-sentences-ab12`

If no query parameter is provided, the app falls back to the bundled demo dataset.

## Sample Datasets

The repo now includes six sample datasets in `data/`. To switch between them, change only the `data` query-string value.

- `index.html?data=demo`
- `index.html?data=space-mission`
- `index.html?data=rainforest-race`
- `index.html?data=ocean-parade`
- `index.html?data=castle-quest`
- `index.html?data=science-spark`
- `index.html?data=farm-festival`

If you are running the app locally on port `8000`, the full URLs would look like:

- `http://localhost:8000/index.html?data=demo`
- `http://localhost:8000/index.html?data=space-mission`
- `http://localhost:8000/index.html?data=rainforest-race`
- `http://localhost:8000/index.html?data=ocean-parade`
- `http://localhost:8000/index.html?data=castle-quest`
- `http://localhost:8000/index.html?data=science-spark`
- `http://localhost:8000/index.html?data=farm-festival`

## Dataset Format

Datasets are plain JSON files with this shape:

```json
{
  "id": "demo",
  "title": "Playground Sentences",
  "description": "Spin the words and read the sentence out loud.",
  "slots": [
    {
      "id": "subject",
      "label": "Noun",
      "hint": "Who or what?",
      "color": "#ff7a59",
      "words": ["panda", "robot", "pirate"]
    }
  ],
  "templates": [
    {
      "id": "template-1",
      "text": "The {subject} likes to {verb} {place}."
    }
  ]
}
```

Rules:

- `slots` should contain between 2 and 10 entries
- slot `id` values must be unique and are used inside template placeholders
- each slot should have at least one word
- templates should reference slot ids inside braces

## Authoring Workflow

1. Open `teacher.html`.
2. Load the demo dataset or edit the default form values.
3. Save the activity to browser storage.
4. Open the generated preview link to test it in `index.html`.
5. Export the dataset JSON when it is ready for static hosting.
6. Place exported JSON files in `data/` and load them with `?data=<id>`.

## Project Structure

```text
.
├── PLAN.md
├── README.md
├── index.html
├── teacher.html
├── assets
│   ├── app.js
│   ├── shared.js
│   ├── styles.css
│   └── teacher.js
└── data
    ├── castle-quest.json
    ├── demo.json
    ├── farm-festival.json
    ├── ocean-parade.json
    ├── rainforest-race.json
    ├── science-spark.json
    └── space-mission.json
```

## Current Status

This repository is being built as a static MVP first. The current implementation focuses on:

- a polished front-end interaction model
- a practical teacher workflow without backend dependencies
- documentation and data structures that can later support a PHP or script-based publishing step

## Next Likely Enhancements

- static publishing script for exported datasets
- optional AI-assisted grammar tagging and sentence generation
- sentence illustration support
