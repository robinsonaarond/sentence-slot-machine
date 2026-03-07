# Sentence Slot Machine Plan

## Vision

Build a playful, classroom-friendly web app that helps children understand how vocabulary words fit into sentence structure by turning sentence building into a slot-machine game.

## Product Goals

- Make grammar feel visual, tactile, and fun for ages 4 to 10
- Help students connect vocabulary words to their roles in a sentence
- Keep the student experience simple enough for touchscreens and laptops
- Give teachers a lightweight way to author and preview word sets without needing a backend-heavy workflow

## Delivery Strategy

### Phase 1: MVP

Deliver a static-first web app that works directly in a browser and can be hosted by Apache without a build step.

MVP scope:

- Student-facing slot machine page
- Teacher-facing authoring page
- JSON-based dataset format
- Local browser save and preview workflow
- Sample dataset for immediate testing

### Phase 2: Publishing Workflow

After the MVP is stable:

- Add a lightweight script or backend endpoint to publish teacher-created datasets into static JSON files
- Support sharable dataset URLs without relying on browser storage
- Add validation around malformed templates and duplicate slot tokens

### Phase 3: AI Assist

Future work:

- AI grammar tagging for imported vocabulary lists
- AI-generated sentence suggestions
- Optional sentence illustrations or image prompts

## Functional Scope

### Student Page

- Show a bright, playful slot machine with three reels
- Assign each reel to a grammar role
- Spin all reels with a lever-like control
- Randomly select words from the active dataset
- Render a sentence template using the selected words
- Highlight chosen words with reel-matched colors
- Allow students to adjust each reel manually
- Allow swiping or tapping to move between compatible sentence templates

### Teacher Page

- Edit the activity title and supporting description
- Configure three slots with labels, tokens, colors, and word lists
- Author sentence templates using placeholder tokens
- Validate templates against the available slots
- Estimate how many sentence combinations are possible
- Save the dataset to browser storage
- Export the dataset as JSON for static hosting
- Open a live student preview from the current dataset

## Technical Plan

### Architecture

Use a static site with plain HTML, CSS, and JavaScript modules:

- `index.html`: student experience
- `teacher.html`: teacher authoring tool
- `assets/styles.css`: shared visual system and responsive layout
- `assets/shared.js`: dataset loading, parsing, storage, and validation helpers
- `assets/app.js`: student-page behavior
- `assets/teacher.js`: teacher-page behavior
- `data/demo.json`: sample dataset

### Why Static First

- Fits the Apache hosting goal immediately
- Keeps deployment simple
- Avoids choosing a framework before the interaction model is proven
- Makes the student page easy to cache and distribute

### Dataset Model

Each activity is represented as JSON with:

- `id`: unique dataset identifier
- `title`: student-facing activity title
- `description`: short supporting text
- `slots`: three slot definitions
- `templates`: sentence templates containing placeholder tokens

Example structure:

```json
{
  "id": "demo",
  "title": "Playground Sentences",
  "description": "Spin the words and read the sentence out loud.",
  "slots": [
    {
      "id": "subject",
      "label": "Noun",
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

## Interaction Plan

### Student Experience

1. Load a dataset from a static JSON file or browser storage.
2. Pick an initial word for each reel.
3. Render the slot machine and matching sentence.
4. Spin the reels with staggered stop timings.
5. Animate the sentence transition when selections change.
6. Let students cycle words on individual reels and swipe between sentence templates.

### Teacher Workflow

1. Start from the demo dataset or a blank configuration.
2. Edit slot labels, tokens, colors, and words.
3. Add sentence templates using those tokens.
4. Review validation feedback and combination counts.
5. Save to local browser storage for preview.
6. Export JSON when the activity is ready to publish.

## Milestones

### Milestone 1

- Rewrite project docs
- Create the static file structure
- Add a demo dataset

### Milestone 2

- Build the student page
- Implement reel interactions and sentence rendering
- Add touch-friendly template navigation

### Milestone 3

- Build the teacher authoring page
- Add browser save, preview, and export
- Add validation and summary metrics

### Milestone 4

- Smoke test the flow end to end
- Tighten documentation to match the shipped behavior

## Risks and Constraints

- A static app cannot publish new server files by itself; export or a separate publish step is required
- Teacher-created previews stored in browser storage are device-local unless exported
- Sentence quality depends on well-authored templates and compatible word lists
- Young users need large tap targets and simple motion; polish should not reduce clarity

## Immediate Next Build

The current implementation target is a fully functional static MVP with:

- one polished student page
- one polished teacher page
- local preview and JSON export
- one bundled demo dataset
