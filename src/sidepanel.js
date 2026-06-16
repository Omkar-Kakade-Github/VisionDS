import { registry, SHAPE_OPTIONS, STRUCTURE_LABELS, STRUCTURE_ORDER } from "./structures.js";

const STORAGE_KEY = "visionDsState";
const LEGACY_STORAGE_KEY = "structSketchState";
const SVG_KINDS = new Set(["binary-tree", "bst", "linked-list", "graph"]);
const PLAY_INTERVAL_MS = 850;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.1;
const ALLOWED_COLORS = new Set(["#176b5d", "#b05a00", "#a9333a", "#5145a8"]);

const BASE_TARGET_ACTIONS = Object.freeze([
  { value: "visit", label: "Visit target" },
  { value: "remove", label: "Remove target" },
  { value: "jump-trace", label: "Jump trace" },
  { value: "pointer", label: "Add pointer" },
  { value: "note", label: "Add note" },
  { value: "restore", label: "Restore target" }
]);

const TARGET_ACTIONS_BY_KIND = Object.freeze({
  "binary-tree": [
    { value: "visit", label: "Visit node" },
    { value: "remove-subtree", label: "Remove subtree" },
    { value: "make-root", label: "Mark as root" },
    { value: "jump-trace", label: "Jump traversal" },
    { value: "pointer", label: "Add pointer" },
    { value: "note", label: "Add note" },
    { value: "restore", label: "Restore subtree" }
  ],
  bst: [
    { value: "visit", label: "Visit node" },
    { value: "remove", label: "Delete target" },
    { value: "jump-trace", label: "Trace/search target" },
    { value: "pointer", label: "Add pointer" },
    { value: "note", label: "Add note" },
    { value: "restore", label: "Restore target" }
  ],
  "linked-list": [
    { value: "visit", label: "Visit node" },
    { value: "remove", label: "Remove node" },
    { value: "pointer", label: "Set pointer" },
    { value: "jump-trace", label: "Jump traversal" },
    { value: "note", label: "Add note" },
    { value: "restore", label: "Restore node" }
  ],
  array: [
    { value: "visit", label: "Visit index" },
    { value: "remove", label: "Remove item" },
    { value: "pointer", label: "Set index pointer" },
    { value: "jump-trace", label: "Jump scan" },
    { value: "note", label: "Add note" },
    { value: "restore", label: "Restore item" }
  ],
  stack: [
    { value: "visit", label: "Inspect item" },
    { value: "pop-through-target", label: "Pop to target" },
    { value: "pointer", label: "Mark top" },
    { value: "note", label: "Add note" },
    { value: "restore", label: "Restore popped" }
  ],
  queue: [
    { value: "visit", label: "Inspect item" },
    { value: "dequeue-through-target", label: "Dequeue to target" },
    { value: "pointer", label: "Mark front/rear" },
    { value: "note", label: "Add note" },
    { value: "restore", label: "Restore dequeued" }
  ],
  graph: [
    { value: "visit", label: "Visit vertex" },
    { value: "remove", label: "Remove vertex" },
    { value: "start-here", label: "Start here" },
    { value: "jump-trace", label: "Jump BFS/DFS" },
    { value: "pointer", label: "Add pointer" },
    { value: "note", label: "Add note" },
    { value: "restore", label: "Restore vertex" }
  ]
});

const elements = {
  headerDetail: document.querySelector("#header-detail"),
  themeToggle: document.querySelector("#theme-toggle"),
  structureSelect: document.querySelector("#structure-select"),
  configControls: document.querySelector("#config-controls"),
  generate: document.querySelector("#generate"),
  exampleCount: document.querySelector("#example-count"),
  exampleList: document.querySelector("#example-list"),
  exampleTitle: document.querySelector("#example-title"),
  exampleDetail: document.querySelector("#example-detail"),
  selectedTarget: document.querySelector("#selected-target"),
  visualizer: document.querySelector("#visualizer"),
  targetActionBar: document.querySelector("#target-action-bar"),
  targetActionDetail: document.querySelector("#target-action-detail"),
  targetActionSelect: document.querySelector("#target-action-select"),
  targetActionLabel: document.querySelector("#target-action-label"),
  applyTargetAction: document.querySelector("#apply-target-action"),
  resetTargetOps: document.querySelector("#reset-target-ops"),
  clearTarget: document.querySelector("#clear-target"),
  zoomOut: document.querySelector("#zoom-out"),
  zoomRange: document.querySelector("#zoom-range"),
  zoomIn: document.querySelector("#zoom-in"),
  zoomReset: document.querySelector("#zoom-reset"),
  traceSelect: document.querySelector("#trace-select"),
  traceReset: document.querySelector("#trace-reset"),
  tracePrev: document.querySelector("#trace-prev"),
  tracePlay: document.querySelector("#trace-play"),
  traceNext: document.querySelector("#trace-next"),
  traceProgress: document.querySelector("#trace-progress"),
  traceCount: document.querySelector("#trace-count"),
  traceStep: document.querySelector("#trace-step"),
  annotationLabel: document.querySelector("#annotation-label"),
  annotationColor: document.querySelector("#annotation-color"),
  addPointer: document.querySelector("#add-pointer"),
  addHighlight: document.querySelector("#add-highlight"),
  addNote: document.querySelector("#add-note"),
  clearAnnotations: document.querySelector("#clear-annotations"),
  annotationList: document.querySelector("#annotation-list")
};

let state = createDefaultState();
let playTimer = 0;
let saveTimer = 0;

init();

async function init() {
  populateStructureSelect();
  bindEvents();

  const savedState = await loadState();
  state = mergeState(savedState);

  if (!state.examples.length) {
    regenerateExamples();
  } else {
    syncSelectedExample();
  }

  render();
}

function createDefaultState() {
  const kind = "binary-tree";
  return {
    kind,
    configs: {
      [kind]: registry[kind].getDefaultConfig()
    },
    exampleCount: 3,
    examples: [],
    selectedExampleId: "",
    selectedNodeId: "",
    selectedTraceId: "",
    traceStepIndex: 0,
    canvasZoom: 1,
    theme: "light",
    targetOperationsByExample: {},
    annotationsByExample: {}
  };
}

function mergeState(savedState) {
  const base = createDefaultState();
  if (!savedState || typeof savedState !== "object") {
    return base;
  }

  const kind = registry[savedState.kind] ? savedState.kind : base.kind;
  const merged = {
    ...base,
    ...savedState,
    kind,
    configs: {
      ...base.configs,
      ...(savedState.configs || {})
    },
    targetOperationsByExample: savedState.targetOperationsByExample || {},
    annotationsByExample: savedState.annotationsByExample || {}
  };

  if (!merged.configs[kind]) {
    merged.configs[kind] = registry[kind].getDefaultConfig();
  }

  merged.exampleCount = clampNumber(merged.exampleCount, 1, 8);
  merged.canvasZoom = normalizeZoom(merged.canvasZoom);
  merged.theme = merged.theme === "dark" ? "dark" : "light";
  return merged;
}

function populateStructureSelect() {
  elements.structureSelect.innerHTML = STRUCTURE_ORDER
    .map((kind) => `<option value="${kind}">${escapeHtml(STRUCTURE_LABELS[kind])}</option>`)
    .join("");
}

function bindEvents() {
  elements.structureSelect.addEventListener("change", () => {
    stopTrace({ render: false });
    state.kind = elements.structureSelect.value;
    if (!state.configs[state.kind]) {
      state.configs[state.kind] = registry[state.kind].getDefaultConfig();
    }
    state.selectedNodeId = "";
    state.selectedTraceId = "";
    state.traceStepIndex = 0;
    regenerateExamples();
    render();
    scheduleSave();
  });

  elements.generate.addEventListener("click", () => {
    stopTrace({ render: false });
    regenerateExamples();
    render();
    scheduleSave();
  });

  elements.exampleCount.addEventListener("input", () => {
    state.exampleCount = clampNumber(elements.exampleCount.value, 1, 8);
    scheduleSave();
  });

  elements.configControls.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
      return;
    }

    const key = target.dataset.configKey;
    if (!key) {
      return;
    }

    const config = getCurrentConfig();
    config[key] = target.type === "number" ? Number(target.value) : target.value;
    state.configs[state.kind] = config;
    scheduleSave();
  });

  elements.exampleList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-example-id]");
    if (!button) {
      return;
    }

    stopTrace({ render: false });
    state.selectedExampleId = button.dataset.exampleId;
    state.selectedNodeId = "";
    state.selectedTraceId = "";
    state.traceStepIndex = 0;
    syncSelectedExample();
    render();
    scheduleSave();
  });

  elements.visualizer.addEventListener("click", (event) => {
    const target = event.target.closest("[data-node-id]");
    if (!target) {
      return;
    }

    state.selectedNodeId = target.dataset.nodeId;
    renderSelection();
    scheduleSave();
  });

  elements.targetActionSelect.addEventListener("change", () => {
    updateTargetActionPlaceholder();
  });

  elements.applyTargetAction.addEventListener("click", () => {
    applyTargetAction();
  });

  elements.resetTargetOps.addEventListener("click", () => {
    resetTargetOperations();
  });

  elements.clearTarget.addEventListener("click", () => {
    clearSelectedTarget();
  });

  elements.traceSelect.addEventListener("change", () => {
    const nextTraceId = elements.traceSelect.value;
    stopTrace({ render: false });
    state.selectedTraceId = nextTraceId;
    state.traceStepIndex = 0;
    renderVisualizer();
    renderTrace();
    scheduleSave();
  });

  elements.traceReset.addEventListener("click", () => {
    stopTrace({ render: false });
    state.traceStepIndex = 0;
    renderVisualizer();
    renderTrace();
    scheduleSave();
  });

  elements.tracePrev.addEventListener("click", () => {
    stopTrace({ render: false });
    state.traceStepIndex = Math.max(0, state.traceStepIndex - 1);
    renderVisualizer();
    renderTrace();
    scheduleSave();
  });

  elements.traceNext.addEventListener("click", () => {
    stopTrace({ render: false });
    advanceTrace();
    scheduleSave();
  });

  elements.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    scheduleSave();
  });

  elements.zoomRange.addEventListener("input", () => {
    setCanvasZoom(Number(elements.zoomRange.value) / 100);
  });

  elements.zoomOut.addEventListener("click", () => {
    setCanvasZoom(state.canvasZoom - ZOOM_STEP);
  });

  elements.zoomIn.addEventListener("click", () => {
    setCanvasZoom(state.canvasZoom + ZOOM_STEP);
  });

  elements.zoomReset.addEventListener("click", () => {
    setCanvasZoom(1);
  });

  elements.tracePlay.addEventListener("click", () => {
    if (playTimer) {
      stopTrace();
    } else {
      startTrace();
    }
  });

  elements.addPointer.addEventListener("click", () => addAnnotation("pointer"));
  elements.addHighlight.addEventListener("click", () => addAnnotation("highlight"));
  elements.addNote.addEventListener("click", () => addAnnotation("note"));

  elements.clearAnnotations.addEventListener("click", () => {
    const example = getSelectedExample();
    if (!example) {
      return;
    }
    state.annotationsByExample[example.id] = [];
    renderVisualizer();
    renderAnnotations();
    scheduleSave();
  });

  elements.annotationList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-annotation]");
    if (!button) {
      return;
    }
    const example = getSelectedExample();
    if (!example) {
      return;
    }
    state.annotationsByExample[example.id] = getAnnotations(example.id).filter((annotation) => annotation.id !== button.dataset.removeAnnotation);
    renderVisualizer();
    renderAnnotations();
    scheduleSave();
  });
}

function regenerateExamples() {
  const entry = registry[state.kind];
  state.examples = entry.generateExamples(getCurrentConfig(), state.exampleCount);
  state.selectedExampleId = state.examples[0]?.id || "";
  state.selectedNodeId = "";
  state.selectedTraceId = "";
  state.traceStepIndex = 0;
  state.targetOperationsByExample = {};
}

function syncSelectedExample() {
  if (!state.examples.some((example) => example.id === state.selectedExampleId)) {
    state.selectedExampleId = state.examples[0]?.id || "";
  }
}

function render() {
  const config = getCurrentConfig();
  applyTheme();
  elements.structureSelect.value = state.kind;
  elements.headerDetail.textContent = STRUCTURE_LABELS[state.kind];
  elements.exampleCount.value = String(state.exampleCount);

  renderConfigControls(config);
  renderExamples();
  updateZoomControls();
  syncTraceSelection();
  renderVisualizer();
  renderTrace();
  renderAnnotations();
}

function renderConfigControls(config) {
  const shapes = SHAPE_OPTIONS[state.kind] || [];
  elements.configControls.innerHTML = `
    ${numberControl("size", "Size", config.size, 1)}
    ${numberControl("minValue", "Min", config.minValue, -9999)}
    <label>
      <span>Shape</span>
      <select data-config-key="shape">
        ${shapes.map(([value, label]) => `<option value="${value}" ${value === config.shape ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
      </select>
    </label>
    <label>
      <span>Seed</span>
      <input data-config-key="seed" type="text" value="${escapeHtml(config.seed)}" maxlength="28">
    </label>
  `;
}

function numberControl(key, label, value, min, max) {
  const maxAttribute = max === undefined ? "" : ` max="${max}"`;
  return `
    <label>
      <span>${label}</span>
      <input data-config-key="${key}" type="number" min="${min}"${maxAttribute} step="1" value="${Number(value)}">
    </label>
  `;
}

function renderExamples() {
  elements.exampleList.innerHTML = state.examples
    .map((example) => `
      <button class="example-chip ${example.id === state.selectedExampleId ? "is-active" : ""}" type="button" data-example-id="${escapeHtml(example.id)}">
        <strong>${escapeHtml(example.title)}</strong>
        <span>${escapeHtml(example.description)}</span>
      </button>
    `)
    .join("");
}

function renderVisualizer() {
  const example = getSelectedExample();
  if (!example) {
    elements.exampleTitle.textContent = "No example";
    elements.exampleDetail.textContent = "";
    elements.visualizer.innerHTML = "";
    return;
  }

  elements.exampleTitle.textContent = example.title;
  elements.exampleDetail.textContent = example.description;

  if (SVG_KINDS.has(example.kind)) {
    renderSvgExample(example);
  } else {
    renderLinearExample(example);
  }

  renderSelection();
}

function renderSvgExample(example) {
  const layout = registry[example.kind].layout(example);
  const scaledWidth = Math.round(layout.width * state.canvasZoom);
  const scaledHeight = Math.round(layout.height * state.canvasZoom);
  const nodePositions = new Map(layout.nodes.map((node) => [node.id, node]));
  const traceStep = getCurrentTraceStep();
  const operationState = getTargetOperationState(example.id);
  const operationVisited = new Set(operationState.visitedNodeIds);
  const removed = new Set(operationState.removedNodeIds);
  const annotations = getAnnotations(example.id);
  const highlightColors = new Map(
    annotations
      .filter((annotation) => annotation.type === "highlight")
      .map((annotation) => [annotation.nodeId, annotation.color])
  );
  const highlighted = new Set([
    ...(traceStep?.activeNodeIds || []),
    ...highlightColors.keys()
  ]);
  const visited = new Set([...(traceStep?.visitedNodeIds || []), ...operationVisited]);
  const activeEdges = new Set(traceStep?.activeEdgeIds || []);

  elements.visualizer.innerHTML = `
    <svg class="structure-svg" width="${scaledWidth}" height="${scaledHeight}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeHtml(example.title)}">
      <defs>
        <marker id="arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z"></path>
        </marker>
      </defs>
      <g class="edges">
        ${layout.edges
          .filter((edge) => !removed.has(edge.source) && !removed.has(edge.target))
          .map((edge) => renderSvgEdge(edge, nodePositions, activeEdges.has(edge.id))).join("")}
      </g>
      <g class="nodes">
        ${layout.nodes.map((node) => renderSvgNode(node, {
          active: highlighted.has(node.id),
          visited: visited.has(node.id),
          selected: state.selectedNodeId === node.id,
          removed: removed.has(node.id),
          color: highlightColors.get(node.id)
        })).join("")}
      </g>
      <g class="badges">
        ${renderSvgPointers(layout.nodes, traceStep?.pointers || [], "trace")}
        ${renderSvgPointers(layout.nodes, annotations.filter((annotation) => annotation.type === "pointer"), "annotation")}
        ${renderSvgNotes(layout.nodes, annotations.filter((annotation) => annotation.type === "note"))}
      </g>
    </svg>
  `;
}

function renderSvgEdge(edge, nodePositions, active) {
  const source = nodePositions.get(edge.source);
  const target = nodePositions.get(edge.target);
  if (!source || !target) {
    return "";
  }

  const marker = edge.directed === false ? "" : " marker-end=\"url(#arrow-head)\"";
  return `
    <g class="edge ${active ? "is-active" : ""}">
      <line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}"${marker}></line>
      ${edge.label ? `<text x="${(source.x + target.x) / 2}" y="${(source.y + target.y) / 2 - 7}">${escapeHtml(edge.label)}</text>` : ""}
    </g>
  `;
}

function renderSvgNode(node, flags) {
  const classes = [
    "node",
    flags.active ? "is-active" : "",
    flags.visited ? "is-visited" : "",
    flags.removed ? "is-removed" : "",
    flags.selected ? "is-selected" : ""
  ].filter(Boolean).join(" ");

  const style = flags.color ? ` style="stroke:${safeColor(flags.color, "#176b5d")}"` : "";

  return `
    <g class="${classes}" data-node-id="${escapeHtml(node.id)}" tabindex="0" role="button" aria-label="Node ${escapeHtml(String(node.value))}">
      <circle cx="${node.x}" cy="${node.y}" r="24"${style}></circle>
      <text x="${node.x}" y="${node.y + 5}">${escapeHtml(String(node.value))}</text>
      ${flags.removed ? `<line class="remove-mark" x1="${node.x - 18}" y1="${node.y - 18}" x2="${node.x + 18}" y2="${node.y + 18}"></line>` : ""}
    </g>
  `;
}

function renderSvgPointers(nodes, pointers, className) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return pointers
    .map((pointer, index) => {
      const node = byId.get(pointer.nodeId);
      if (!node) {
        return "";
      }
      const y = node.y - 39 - index * 2;
      const fill = safeColor(pointer.color, className === "annotation" ? "#5145a8" : "#176b5d");
      return `
        <g class="badge ${className}" data-node-id="${escapeHtml(node.id)}">
          <rect x="${node.x - 32}" y="${y - 15}" width="64" height="22" rx="6" style="fill:${fill}"></rect>
          <text x="${node.x}" y="${y}">${escapeHtml(shortLabel(pointer.label, 12))}</text>
        </g>
      `;
    })
    .join("");
}

function renderSvgNotes(nodes, notes) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return notes
    .map((note) => {
      const node = byId.get(note.nodeId);
      if (!node) {
        return "";
      }
      return `
        <g class="note-badge" data-node-id="${escapeHtml(node.id)}">
          <rect x="${node.x + 24}" y="${node.y - 42}" width="118" height="30" rx="7" style="stroke:${safeColor(note.color, "#b05a00")}"></rect>
          <text x="${node.x + 83}" y="${node.y - 22}">${escapeHtml(shortLabel(note.label, 15))}</text>
        </g>
      `;
    })
    .join("");
}

function renderLinearExample(example) {
  const layout = registry[example.kind].layout(example);
  const scaledWidth = Math.round(layout.width * state.canvasZoom);
  const scaledHeight = Math.round(layout.height * state.canvasZoom);
  const traceStep = getCurrentTraceStep();
  const active = new Set(traceStep?.activeNodeIds || []);
  const operationState = getTargetOperationState(example.id);
  const visited = new Set([...(traceStep?.visitedNodeIds || []), ...operationState.visitedNodeIds]);
  const removed = new Set(operationState.removedNodeIds);
  const annotations = getAnnotations(example.id);
  const highlightColors = new Map(
    annotations
      .filter((annotation) => annotation.type === "highlight")
      .map((annotation) => [annotation.nodeId, annotation.color])
  );
  const highlights = new Set(highlightColors.keys());
  const pointers = [...(traceStep?.pointers || []), ...annotations.filter((annotation) => annotation.type === "pointer")];
  const notes = annotations.filter((annotation) => annotation.type === "note");

  const className = example.kind === "stack" ? "linear stack-view" : "linear row-view";
  const orderedNodes = example.kind === "stack" ? [...example.nodes].reverse() : example.nodes;

  elements.visualizer.innerHTML = `
    <div class="linear-frame" style="width:${scaledWidth}px;height:${scaledHeight}px">
      <div class="${className}" style="width:${layout.width}px;min-height:${layout.height}px;transform:scale(${state.canvasZoom})">
        ${orderedNodes.map((node, visualIndex) => renderCell(node, {
          active: active.has(node.id) || highlights.has(node.id),
          visited: visited.has(node.id),
          selected: state.selectedNodeId === node.id,
          removed: removed.has(node.id),
          highlightColor: highlightColors.get(node.id),
          pointers: pointers.filter((pointer) => pointer.nodeId === node.id),
          notes: notes.filter((note) => note.nodeId === node.id),
          index: example.kind === "stack" ? example.nodes.length - visualIndex - 1 : visualIndex
        })).join("")}
      </div>
    </div>
  `;
}

function renderCell(node, flags) {
  const classes = [
    "cell",
    flags.active ? "is-active" : "",
    flags.visited ? "is-visited" : "",
    flags.removed ? "is-removed" : "",
    flags.selected ? "is-selected" : ""
  ].filter(Boolean).join(" ");

  const style = flags.highlightColor ? ` style="border-color:${safeColor(flags.highlightColor, "#176b5d")}"` : "";

  return `
    <button class="${classes}" type="button" data-node-id="${escapeHtml(node.id)}"${style}>
      <span class="cell-label">${node.label ? escapeHtml(node.label) : flags.index}</span>
      <strong>${escapeHtml(String(node.value))}</strong>
      ${flags.removed ? `<span class="cell-state">removed</span>` : ""}
      <span class="cell-pointers">${flags.pointers.map((pointer) => `<em style="background:${safeColor(pointer.color, "#176b5d")}">${escapeHtml(shortLabel(pointer.label, 9))}</em>`).join("")}</span>
      ${flags.notes.map((note) => `<span class="cell-note" style="border-color:${safeColor(note.color, "#b05a00")}">${escapeHtml(shortLabel(note.label, 12))}</span>`).join("")}
    </button>
  `;
}

function renderSelection() {
  const example = getSelectedExample();
  const node = example?.nodes.find((item) => item.id === state.selectedNodeId);
  elements.selectedTarget.textContent = node ? `Target: ${node.value}` : "No target";

  elements.visualizer.querySelectorAll("[data-node-id]").forEach((element) => {
    element.classList.toggle("is-selected", element.dataset.nodeId === state.selectedNodeId);
  });

  renderTargetActions();
}

function syncTraceSelection() {
  const programs = getTracePrograms();
  if (!programs.some((program) => program.id === state.selectedTraceId)) {
    state.selectedTraceId = programs[0]?.id || "";
    state.traceStepIndex = 0;
  }

  const currentProgram = programs.find((program) => program.id === state.selectedTraceId);
  const maxIndex = Math.max(0, (currentProgram?.steps.length || 1) - 1);
  state.traceStepIndex = Math.min(state.traceStepIndex, maxIndex);

  elements.traceSelect.innerHTML = programs
    .map((program) => `<option value="${escapeHtml(program.id)}" ${program.id === state.selectedTraceId ? "selected" : ""}>${escapeHtml(program.label)}</option>`)
    .join("");
}

function renderTrace() {
  syncTraceSelection();
  const program = getCurrentTraceProgram();
  const step = getCurrentTraceStep();
  const total = program?.steps.length || 0;
  const current = total ? state.traceStepIndex + 1 : 0;

  elements.traceProgress.max = String(Math.max(1, total));
  elements.traceProgress.value = String(current);
  elements.traceCount.textContent = `${current} / ${total}`;
  elements.tracePrev.disabled = state.traceStepIndex <= 0;
  elements.traceNext.disabled = !program || state.traceStepIndex >= total - 1;
  elements.traceReset.disabled = !program || state.traceStepIndex === 0;
  elements.tracePlay.disabled = !program || total <= 1;
  elements.tracePlay.textContent = playTimer ? "Pause" : "Play";

  elements.traceStep.innerHTML = step
    ? `<strong>${escapeHtml(step.title)}</strong><span>${escapeHtml(step.detail)}</span>`
    : "<span>No trace available.</span>";
}

function renderAnnotations() {
  const example = getSelectedExample();
  const annotations = example ? getAnnotations(example.id) : [];

  elements.annotationList.innerHTML = annotations.length
    ? annotations.map((annotation) => `
      <div class="annotation-item">
        <span class="color-dot" style="background:${safeColor(annotation.color, "#176b5d")}"></span>
        <strong>${escapeHtml(annotation.type)}</strong>
        <span>${escapeHtml(annotation.label)}</span>
        <button type="button" data-remove-annotation="${escapeHtml(annotation.id)}">Remove</button>
      </div>
    `).join("")
    : `<p class="empty">No annotations.</p>`;
}

function addAnnotation(type, labelOverride) {
  const example = getSelectedExample();
  const selectedNodeId = state.selectedNodeId;
  if (!example || !selectedNodeId) {
    elements.selectedTarget.textContent = "Select a target first";
    return;
  }

  const labelSource = labelOverride === undefined ? elements.annotationLabel.value.trim() : labelOverride;
  const label = labelSource || defaultAnnotationLabel(type);
  const annotation = {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    nodeId: selectedNodeId,
    label,
    color: elements.annotationColor.value
  };

  state.annotationsByExample[example.id] = [...getAnnotations(example.id), annotation];
  elements.annotationLabel.value = "";
  elements.targetActionLabel.value = "";
  renderVisualizer();
  renderAnnotations();
  scheduleSave();
}

function defaultAnnotationLabel(type) {
  if (type === "pointer") {
    return "ptr";
  }
  if (type === "highlight") {
    return "mark";
  }
  return "note";
}

function startTrace() {
  if (playTimer) {
    return;
  }

  playTimer = window.setInterval(() => {
    const program = getCurrentTraceProgram();
    if (!program || state.traceStepIndex >= program.steps.length - 1) {
      stopTrace();
      return;
    }
    advanceTrace();
  }, PLAY_INTERVAL_MS);

  renderTrace();
}

function stopTrace({ render = true } = {}) {
  if (playTimer) {
    window.clearInterval(playTimer);
    playTimer = 0;
  }
  if (render) {
    renderTrace();
  }
}

function advanceTrace() {
  const program = getCurrentTraceProgram();
  if (!program) {
    return;
  }

  state.traceStepIndex = Math.min(program.steps.length - 1, state.traceStepIndex + 1);
  renderVisualizer();
  renderTrace();
}

function getCurrentConfig() {
  if (!state.configs[state.kind]) {
    state.configs[state.kind] = registry[state.kind].getDefaultConfig();
  }
  const config = { ...state.configs[state.kind] };
  config.size = Math.max(1, toInteger(config.size, 7));
  config.minValue = toInteger(config.minValue, 1);
  config.maxValue = config.minValue + Math.max(99, config.size * 3);
  return config;
}

function getSelectedExample() {
  return state.examples.find((example) => example.id === state.selectedExampleId) || state.examples[0] || null;
}

function getTracePrograms() {
  const example = getSelectedExample();
  return example ? registry[example.kind].getTracePrograms(example) : [];
}

function getCurrentTraceProgram() {
  return getTracePrograms().find((program) => program.id === state.selectedTraceId) || null;
}

function getCurrentTraceStep() {
  const program = getCurrentTraceProgram();
  return program?.steps[state.traceStepIndex] || null;
}

function getAnnotations(exampleId) {
  return state.annotationsByExample[exampleId] || [];
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveState, 180);
}

async function saveState() {
  const extensionApi = globalThis.chrome;
  if (!extensionApi?.storage?.local) {
    return;
  }
  await extensionApi.storage.local.set({ [STORAGE_KEY]: state });
}

async function loadState() {
  const extensionApi = globalThis.chrome;
  if (!extensionApi?.storage?.local) {
    return null;
  }

  const result = await extensionApi.storage.local.get([STORAGE_KEY, LEGACY_STORAGE_KEY]);
  return result[STORAGE_KEY] || result[LEGACY_STORAGE_KEY] || null;
}

function setCanvasZoom(value) {
  state.canvasZoom = normalizeZoom(value);
  updateZoomControls();
  renderVisualizer();
  scheduleSave();
}

function updateZoomControls() {
  const percent = Math.round(state.canvasZoom * 100);
  elements.zoomRange.value = String(percent);
  elements.zoomOut.disabled = state.canvasZoom <= MIN_ZOOM;
  elements.zoomIn.disabled = state.canvasZoom >= MAX_ZOOM;
  elements.zoomReset.textContent = `${percent}%`;
}

function renderTargetActions(message) {
  const example = getSelectedExample();
  const node = example?.nodes.find((item) => item.id === state.selectedNodeId);
  elements.targetActionBar.hidden = !node;

  if (!node) {
    elements.targetActionDetail.textContent = "Select a node to choose an action.";
    return;
  }

  populateTargetActions(example);
  elements.targetActionDetail.textContent = message || `Node ${node.value} is selected.`;
  updateTargetActionPlaceholder();
}

function applyTargetAction() {
  const example = getSelectedExample();
  const node = example?.nodes.find((item) => item.id === state.selectedNodeId);
  if (!node) {
    renderTargetActions("Select a node first.");
    return;
  }

  const action = elements.targetActionSelect.value;
  const label = elements.targetActionLabel.value.trim();

  if (action === "jump-trace") {
    jumpTraceToTarget(node.id);
    return;
  }

  if (action === "pointer" || action === "note") {
    addAnnotation(action, label);
    renderTargetActions(`${targetActionLabel(action)} added to node ${node.value}.`);
    return;
  }

  applyStructureOperation(example, node.id, action, label);
}

function applyStructureOperation(example, nodeId, action, label) {
  const node = example.nodes.find((item) => item.id === nodeId);
  const nodeLabel = node?.value ?? nodeId;

  if (action === "visit") {
    markVisited(example.id, [nodeId]);
    renderVisualizer();
    renderTargetActions(`Visited node ${nodeLabel}.`);
    scheduleSave();
    return;
  }

  if (action === "remove" || action === "remove-subtree") {
    const targetIds = action === "remove-subtree" ? getSubtreeNodeIds(example, nodeId) : [nodeId];
    markRemoved(example.id, targetIds);
    renderVisualizer();
    renderTargetActions(action === "remove-subtree" ? `Removed ${targetIds.length} subtree node(s).` : `Removed node ${nodeLabel}.`);
    scheduleSave();
    return;
  }

  if (action === "pop-through-target") {
    const targetIds = getStackPopNodeIds(example, nodeId);
    markRemoved(example.id, targetIds);
    renderVisualizer();
    renderTargetActions(`Popped ${targetIds.length} stack item(s).`);
    scheduleSave();
    return;
  }

  if (action === "dequeue-through-target") {
    const targetIds = getQueueDequeueNodeIds(example, nodeId);
    markRemoved(example.id, targetIds);
    renderVisualizer();
    renderTargetActions(`Dequeued ${targetIds.length} queue item(s).`);
    scheduleSave();
    return;
  }

  if (action === "make-root" || action === "start-here") {
    addAnnotation("pointer", label || (action === "make-root" ? "root" : "start"));
    renderTargetActions(action === "make-root" ? `Marked ${nodeLabel} as root.` : `Marked ${nodeLabel} as start.`);
    return;
  }

  if (action === "restore") {
    restoreTargets(example.id, getRestoreNodeIds(example, nodeId));
    renderVisualizer();
    renderTargetActions(`Restored node ${nodeLabel}.`);
    scheduleSave();
  }
}

function jumpTraceToTarget(nodeId) {
  const program = getCurrentTraceProgram();
  if (!program) {
    renderTargetActions("No trace is available for this example.");
    return;
  }

  const stepIndex = program.steps.findIndex((step) => (
    step.activeNodeIds.includes(nodeId)
      || step.visitedNodeIds.includes(nodeId)
      || step.pointers.some((pointer) => pointer.nodeId === nodeId)
  ));

  if (stepIndex === -1) {
    renderTargetActions("The current trace does not touch this target.");
    return;
  }

  stopTrace({ render: false });
  state.traceStepIndex = stepIndex;
  renderVisualizer();
  renderTrace();
  renderTargetActions(`Trace moved to step ${stepIndex + 1}.`);
  scheduleSave();
}

function clearSelectedTarget() {
  state.selectedNodeId = "";
  renderSelection();
  scheduleSave();
}

function resetTargetOperations() {
  const example = getSelectedExample();
  if (!example) {
    return;
  }

  state.targetOperationsByExample[example.id] = createEmptyOperationState();
  renderVisualizer();
  renderTargetActions("Target operations reset for this example.");
  scheduleSave();
}

function updateTargetActionPlaceholder() {
  const placeholders = {
    visit: "optional label",
    remove: "optional label",
    "remove-subtree": "optional label",
    "pop-through-target": "optional label",
    "dequeue-through-target": "optional label",
    "make-root": "root",
    "start-here": "start",
    pointer: "ptr",
    note: "note",
    "jump-trace": "label optional",
    restore: "label optional"
  };
  elements.targetActionLabel.placeholder = placeholders[elements.targetActionSelect.value] || "target";
  elements.targetActionLabel.disabled = !["pointer", "note", "make-root", "start-here"].includes(elements.targetActionSelect.value);
}

function targetActionLabel(action) {
  if (action === "pointer") {
    return "Pointer";
  }
  if (action === "note") {
    return "Note";
  }
  return "Highlight";
}

function populateTargetActions(example) {
  const actions = TARGET_ACTIONS_BY_KIND[example.kind] || BASE_TARGET_ACTIONS;
  const currentValue = elements.targetActionSelect.value;
  elements.targetActionSelect.innerHTML = actions
    .map((action) => `<option value="${escapeHtml(action.value)}">${escapeHtml(action.label)}</option>`)
    .join("");

  elements.targetActionSelect.value = actions.some((action) => action.value === currentValue)
    ? currentValue
    : actions[0]?.value || "visit";
}

function getTargetOperationState(exampleId) {
  const stateForExample = state.targetOperationsByExample[exampleId] || createEmptyOperationState();
  return {
    visitedNodeIds: Array.isArray(stateForExample.visitedNodeIds) ? stateForExample.visitedNodeIds : [],
    removedNodeIds: Array.isArray(stateForExample.removedNodeIds) ? stateForExample.removedNodeIds : []
  };
}

function setTargetOperationState(exampleId, nextState) {
  state.targetOperationsByExample[exampleId] = {
    visitedNodeIds: [...new Set(nextState.visitedNodeIds)],
    removedNodeIds: [...new Set(nextState.removedNodeIds)]
  };
}

function createEmptyOperationState() {
  return { visitedNodeIds: [], removedNodeIds: [] };
}

function markVisited(exampleId, nodeIds) {
  const operationState = getTargetOperationState(exampleId);
  setTargetOperationState(exampleId, {
    ...operationState,
    visitedNodeIds: [...operationState.visitedNodeIds, ...nodeIds]
  });
}

function markRemoved(exampleId, nodeIds) {
  const operationState = getTargetOperationState(exampleId);
  const removedIds = new Set([...operationState.removedNodeIds, ...nodeIds]);
  setTargetOperationState(exampleId, {
    visitedNodeIds: operationState.visitedNodeIds.filter((nodeId) => !removedIds.has(nodeId)),
    removedNodeIds: [...removedIds]
  });
}

function restoreTargets(exampleId, nodeIds) {
  const restoreIds = new Set(nodeIds);
  const operationState = getTargetOperationState(exampleId);
  setTargetOperationState(exampleId, {
    visitedNodeIds: operationState.visitedNodeIds.filter((nodeId) => !restoreIds.has(nodeId)),
    removedNodeIds: operationState.removedNodeIds.filter((nodeId) => !restoreIds.has(nodeId))
  });
}

function getSubtreeNodeIds(example, rootNodeId) {
  const childrenBySource = new Map();
  for (const edge of example.edges) {
    const children = childrenBySource.get(edge.source) || [];
    children.push(edge.target);
    childrenBySource.set(edge.source, children);
  }

  const result = [];
  const stack = [rootNodeId];
  while (stack.length) {
    const nodeId = stack.pop();
    result.push(nodeId);
    stack.push(...(childrenBySource.get(nodeId) || []));
  }
  return result;
}

function getStackPopNodeIds(example, targetNodeId) {
  const targetIndex = example.nodes.findIndex((node) => node.id === targetNodeId);
  return targetIndex === -1 ? [targetNodeId] : example.nodes.slice(targetIndex).map((node) => node.id);
}

function getQueueDequeueNodeIds(example, targetNodeId) {
  const targetIndex = example.nodes.findIndex((node) => node.id === targetNodeId);
  return targetIndex === -1 ? [targetNodeId] : example.nodes.slice(0, targetIndex + 1).map((node) => node.id);
}

function getRestoreNodeIds(example, targetNodeId) {
  return example.kind === "binary-tree" ? getSubtreeNodeIds(example, targetNodeId) : [targetNodeId];
}

function applyTheme() {
  document.body.dataset.theme = state.theme;
  elements.themeToggle.textContent = state.theme === "dark" ? "Light" : "Dark";
  elements.themeToggle.title = state.theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

function normalizeZoom(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 1;
  }
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, number));
  return Math.round(clamped * 10) / 10;
}

function clampNumber(value, min, max) {
  const parsed = Number.parseInt(String(value), 10);
  const number = Number.isFinite(parsed) ? parsed : min;
  return Math.min(max, Math.max(min, number));
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeColor(value, fallback) {
  return ALLOWED_COLORS.has(value) ? value : fallback;
}

function shortLabel(value, maxLength) {
  const label = String(value || "");
  return label.length > maxLength ? `${label.slice(0, Math.max(0, maxLength - 1))}.` : label;
}
