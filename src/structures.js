import { createSeededRandom, randomInt, shuffle } from "./random.js";
import { STRUCTURE_LABELS, STRUCTURE_ORDER } from "./models.js";

const MIN_SIZE = 1;
const MAX_SIZE = 16;

export { STRUCTURE_LABELS, STRUCTURE_ORDER };

export const SHAPE_OPTIONS = Object.freeze({
  "binary-tree": [
    ["balanced", "Balanced"],
    ["random", "Random"],
    ["skewed", "Skewed"]
  ],
  bst: [
    ["random", "Random"],
    ["balanced", "Balanced"],
    ["ascending", "Ascending"]
  ],
  "linked-list": [
    ["random", "Random"],
    ["sorted", "Sorted"],
    ["alternating", "Alternating"]
  ],
  array: [
    ["random", "Random"],
    ["sorted", "Sorted"],
    ["nearly-sorted", "Nearly sorted"]
  ],
  stack: [
    ["random", "Random"],
    ["ascending", "Ascending"],
    ["descending", "Descending"]
  ],
  queue: [
    ["random", "Random"],
    ["ascending", "Ascending"],
    ["descending", "Descending"]
  ],
  graph: [
    ["connected", "Connected"],
    ["sparse", "Sparse"],
    ["dense", "Dense"]
  ]
});

export const registry = Object.freeze({
  "binary-tree": createBinaryTreeRegistry(),
  bst: createBstRegistry(),
  "linked-list": createLinkedListRegistry(),
  array: createArrayRegistry(),
  stack: createStackRegistry(),
  queue: createQueueRegistry(),
  graph: createGraphRegistry()
});

function baseConfig(shape) {
  return {
    size: 7,
    minValue: 1,
    maxValue: 99,
    seed: "student",
    shape
  };
}

function normalizeConfig(config, fallbackShape) {
  const normalized = {
    ...baseConfig(fallbackShape),
    ...config
  };

  normalized.size = clamp(toInteger(normalized.size, 7), MIN_SIZE, MAX_SIZE);
  normalized.minValue = toInteger(normalized.minValue, 1);
  normalized.maxValue = toInteger(normalized.maxValue, 99);
  normalized.seed = String(normalized.seed || "student");

  if (normalized.maxValue < normalized.minValue) {
    [normalized.minValue, normalized.maxValue] = [normalized.maxValue, normalized.minValue];
  }

  if (normalized.maxValue - normalized.minValue + 1 < normalized.size) {
    normalized.maxValue = normalized.minValue + normalized.size + 8;
  }

  return normalized;
}

function createBinaryTreeRegistry() {
  return {
    kind: "binary-tree",
    label: STRUCTURE_LABELS["binary-tree"],
    getDefaultConfig: () => baseConfig("balanced"),
    generateExamples(config, count) {
      return generateCount(config, count, "balanced", "binary-tree", generateBinaryTreeExample);
    },
    layout: layoutTree,
    getTracePrograms: getBinaryTreeTracePrograms
  };
}

function createBstRegistry() {
  return {
    kind: "bst",
    label: STRUCTURE_LABELS.bst,
    getDefaultConfig: () => baseConfig("random"),
    generateExamples(config, count) {
      return generateCount(config, count, "random", "bst", generateBstExample);
    },
    layout: layoutTree,
    getTracePrograms: getBstTracePrograms
  };
}

function createLinkedListRegistry() {
  return {
    kind: "linked-list",
    label: STRUCTURE_LABELS["linked-list"],
    getDefaultConfig: () => ({ ...baseConfig("random"), size: 6 }),
    generateExamples(config, count) {
      return generateCount(config, count, "random", "linked-list", generateLinkedListExample);
    },
    layout: layoutLinkedList,
    getTracePrograms: getLinkedListTracePrograms
  };
}

function createArrayRegistry() {
  return {
    kind: "array",
    label: STRUCTURE_LABELS.array,
    getDefaultConfig: () => ({ ...baseConfig("random"), size: 8 }),
    generateExamples(config, count) {
      return generateCount(config, count, "random", "array", generateArrayExample);
    },
    layout: layoutLinear,
    getTracePrograms: getArrayTracePrograms
  };
}

function createStackRegistry() {
  return {
    kind: "stack",
    label: STRUCTURE_LABELS.stack,
    getDefaultConfig: () => ({ ...baseConfig("random"), size: 6 }),
    generateExamples(config, count) {
      return generateCount(config, count, "random", "stack", generateStackExample);
    },
    layout: layoutLinear,
    getTracePrograms: getStackTracePrograms
  };
}

function createQueueRegistry() {
  return {
    kind: "queue",
    label: STRUCTURE_LABELS.queue,
    getDefaultConfig: () => ({ ...baseConfig("random"), size: 6 }),
    generateExamples(config, count) {
      return generateCount(config, count, "random", "queue", generateQueueExample);
    },
    layout: layoutLinear,
    getTracePrograms: getQueueTracePrograms
  };
}

function createGraphRegistry() {
  return {
    kind: "graph",
    label: STRUCTURE_LABELS.graph,
    getDefaultConfig: () => ({ ...baseConfig("connected"), size: 7 }),
    generateExamples(config, count) {
      return generateCount(config, count, "connected", "graph", generateGraphExample);
    },
    layout: layoutGraph,
    getTracePrograms: getGraphTracePrograms
  };
}

function generateCount(config, count, fallbackShape, kind, generator) {
  const normalized = normalizeConfig(config, fallbackShape);
  const safeCount = clamp(toInteger(count, 3), 1, 8);
  const examples = [];

  for (let index = 0; index < safeCount; index += 1) {
    const random = createSeededRandom(`${normalized.seed}:${kind}:${index}`);
    examples.push(generator(normalized, random, index));
  }

  return examples;
}

function generateValues(config, random, count) {
  const values = new Set();
  while (values.size < count) {
    values.add(randomInt(random, config.minValue, config.maxValue));
  }
  return [...values];
}

function generateBinaryTreeExample(config, random, exampleIndex) {
  const values = generateValues(config, random, config.size);
  const nodes = values.map((value, index) => ({ id: `n${index}`, value }));
  const edges = [];
  const slots = [{ parentId: "n0", side: "L" }, { parentId: "n0", side: "R" }];

  if (config.shape === "balanced") {
    for (let index = 1; index < nodes.length; index += 1) {
      const parentIndex = Math.floor((index - 1) / 2);
      const side = index % 2 === 1 ? "L" : "R";
      edges.push(makeEdge(parentIndex, index, side));
    }
  } else if (config.shape === "skewed") {
    for (let index = 1; index < nodes.length; index += 1) {
      const side = index % 2 === 1 ? "L" : "R";
      edges.push(makeEdge(index - 1, index, side));
    }
  } else {
    for (let index = 1; index < nodes.length; index += 1) {
      const slotIndex = randomInt(random, 0, slots.length - 1);
      const slot = slots.splice(slotIndex, 1)[0];
      edges.push({
        id: `e${slot.parentId}-${nodes[index].id}`,
        source: slot.parentId,
        target: nodes[index].id,
        label: slot.side,
        directed: true
      });
      slots.push({ parentId: nodes[index].id, side: "L" }, { parentId: nodes[index].id, side: "R" });
    }
  }

  return {
    id: `binary-tree-${config.seed}-${exampleIndex}`,
    kind: "binary-tree",
    title: `Binary tree ${exampleIndex + 1}`,
    description: `${nodes.length} nodes, ${titleCase(config.shape)} shape`,
    nodes,
    edges,
    meta: { rootId: "n0" }
  };
}

function makeEdge(parentIndex, childIndex, side) {
  return {
    id: `en${parentIndex}-n${childIndex}`,
    source: `n${parentIndex}`,
    target: `n${childIndex}`,
    label: side,
    directed: true
  };
}

function generateBstExample(config, random, exampleIndex) {
  const values = generateValues(config, random, config.size);
  const sortedValues = [...values].sort((left, right) => left - right);
  const insertionOrder =
    config.shape === "balanced"
      ? medianOrder(sortedValues)
      : config.shape === "ascending"
        ? sortedValues
        : shuffle(random, sortedValues);
  const root = buildBstTree(insertionOrder);
  const nodes = [];
  const edges = [];

  collectBst(root, nodes, edges);

  const existingTarget = random.choice(sortedValues);
  let insertValue = randomInt(random, config.minValue, config.maxValue + config.size + 16);
  while (sortedValues.includes(insertValue)) {
    insertValue += 1;
  }

  return {
    id: `bst-${config.seed}-${exampleIndex}`,
    kind: "bst",
    title: `BST ${exampleIndex + 1}`,
    description: `${nodes.length} nodes, target ${existingTarget}, insert ${insertValue}`,
    nodes,
    edges,
    meta: {
      rootId: root.id,
      searchValue: existingTarget,
      insertValue
    }
  };
}

function buildBstTree(values) {
  let nextId = 0;
  let root = null;

  for (const value of values) {
    const node = { id: `n${nextId}`, value, left: null, right: null };
    nextId += 1;

    if (!root) {
      root = node;
      continue;
    }

    let current = root;
    while (current) {
      if (value < current.value) {
        if (!current.left) {
          current.left = node;
          break;
        }
        current = current.left;
      } else {
        if (!current.right) {
          current.right = node;
          break;
        }
        current = current.right;
      }
    }
  }

  return root;
}

function collectBst(node, nodes, edges) {
  if (!node) {
    return;
  }

  nodes.push({ id: node.id, value: node.value });

  if (node.left) {
    edges.push({ id: `e${node.id}-${node.left.id}`, source: node.id, target: node.left.id, label: "L", directed: true });
    collectBst(node.left, nodes, edges);
  }

  if (node.right) {
    edges.push({ id: `e${node.id}-${node.right.id}`, source: node.id, target: node.right.id, label: "R", directed: true });
    collectBst(node.right, nodes, edges);
  }
}

function medianOrder(values) {
  const order = [];

  function visit(items) {
    if (!items.length) {
      return;
    }
    const middle = Math.floor(items.length / 2);
    order.push(items[middle]);
    visit(items.slice(0, middle));
    visit(items.slice(middle + 1));
  }

  visit(values);
  return order;
}

function generateLinkedListExample(config, random, exampleIndex) {
  let values = generateValues(config, random, config.size);
  if (config.shape === "sorted") {
    values = values.sort((left, right) => left - right);
  } else if (config.shape === "alternating") {
    values = values.sort((left, right) => left - right);
    const low = values.filter((_, index) => index % 2 === 0);
    const high = values.filter((_, index) => index % 2 === 1).reverse();
    values = low.flatMap((value, index) => high[index] === undefined ? [value] : [value, high[index]]);
  }

  const nodes = values.map((value, index) => ({ id: `n${index}`, value }));
  const edges = nodes.slice(1).map((node, index) => ({
    id: `en${index}-${node.id}`,
    source: `n${index}`,
    target: node.id,
    label: "next",
    directed: true
  }));

  return {
    id: `linked-list-${config.seed}-${exampleIndex}`,
    kind: "linked-list",
    title: `Linked list ${exampleIndex + 1}`,
    description: `${nodes.length} nodes, head ${nodes[0].value}`,
    nodes,
    edges,
    meta: {
      headId: nodes[0].id,
      tailId: nodes[nodes.length - 1].id
    }
  };
}

function generateArrayExample(config, random, exampleIndex) {
  const values = shapeValues(generateValues(config, random, config.size), config.shape, random);
  const nodes = values.map((value, index) => ({ id: `n${index}`, value, label: String(index) }));
  const searchValue = random.choice(values);

  return {
    id: `array-${config.seed}-${exampleIndex}`,
    kind: "array",
    title: `Array ${exampleIndex + 1}`,
    description: `${nodes.length} items, target ${searchValue}`,
    nodes,
    edges: [],
    meta: { searchValue }
  };
}

function generateStackExample(config, random, exampleIndex) {
  const values = shapeValues(generateValues(config, random, config.size), config.shape, random);
  const nodes = values.map((value, index) => ({ id: `n${index}`, value, label: index === values.length - 1 ? "top" : "" }));
  const pushValue = randomInt(random, config.minValue, config.maxValue + config.size + 16);

  return {
    id: `stack-${config.seed}-${exampleIndex}`,
    kind: "stack",
    title: `Stack ${exampleIndex + 1}`,
    description: `${nodes.length} items, top ${nodes[nodes.length - 1].value}`,
    nodes,
    edges: [],
    meta: {
      topId: nodes[nodes.length - 1].id,
      pushValue
    }
  };
}

function generateQueueExample(config, random, exampleIndex) {
  const values = shapeValues(generateValues(config, random, config.size), config.shape, random);
  const nodes = values.map((value, index) => ({
    id: `n${index}`,
    value,
    label: index === 0 ? "front" : index === values.length - 1 ? "rear" : ""
  }));
  const enqueueValue = randomInt(random, config.minValue, config.maxValue + config.size + 16);

  return {
    id: `queue-${config.seed}-${exampleIndex}`,
    kind: "queue",
    title: `Queue ${exampleIndex + 1}`,
    description: `${nodes.length} items, front ${nodes[0].value}`,
    nodes,
    edges: [],
    meta: {
      frontId: nodes[0].id,
      rearId: nodes[nodes.length - 1].id,
      enqueueValue
    }
  };
}

function shapeValues(values, shape, random) {
  if (shape === "sorted" || shape === "ascending") {
    return [...values].sort((left, right) => left - right);
  }

  if (shape === "descending") {
    return [...values].sort((left, right) => right - left);
  }

  if (shape === "nearly-sorted") {
    const sorted = [...values].sort((left, right) => left - right);
    if (sorted.length > 2) {
      const index = randomInt(random, 0, sorted.length - 2);
      [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]];
    }
    return sorted;
  }

  return values;
}

function generateGraphExample(config, random, exampleIndex) {
  const nodes = generateValues(config, random, config.size).map((value, index) => ({ id: `n${index}`, value }));
  const edges = [];
  const seen = new Set();

  function addEdge(sourceIndex, targetIndex) {
    const source = Math.min(sourceIndex, targetIndex);
    const target = Math.max(sourceIndex, targetIndex);
    const key = `${source}-${target}`;
    if (source === target || seen.has(key)) {
      return false;
    }
    seen.add(key);
    edges.push({
      id: `en${source}-n${target}`,
      source: `n${source}`,
      target: `n${target}`,
      directed: false
    });
    return true;
  }

  if (config.shape === "connected" || config.shape === "dense") {
    for (let index = 1; index < nodes.length; index += 1) {
      addEdge(index - 1, index);
    }
  }

  const maxEdges = (nodes.length * (nodes.length - 1)) / 2;
  const targetEdges =
    config.shape === "dense"
      ? Math.min(maxEdges, Math.max(nodes.length + 2, Math.floor(maxEdges * 0.55)))
      : config.shape === "sparse"
        ? Math.max(nodes.length - 2, Math.floor(nodes.length * 0.8))
        : Math.max(nodes.length - 1, nodes.length + 1);

  let attempts = 0;
  while (edges.length < targetEdges && attempts < maxEdges * 4) {
    addEdge(randomInt(random, 0, nodes.length - 1), randomInt(random, 0, nodes.length - 1));
    attempts += 1;
  }

  return {
    id: `graph-${config.seed}-${exampleIndex}`,
    kind: "graph",
    title: `Graph ${exampleIndex + 1}`,
    description: `${nodes.length} vertices, ${edges.length} edges`,
    nodes,
    edges,
    meta: {
      startId: nodes[0].id,
      directed: false
    }
  };
}

function layoutTree(example) {
  const children = getTreeChildren(example);
  const byId = nodeMap(example);
  const positioned = [];
  let cursor = 0;
  let maxDepth = 0;

  function visit(nodeId, depth) {
    const childSet = children.get(nodeId) || {};
    if (childSet.L) {
      visit(childSet.L, depth + 1);
    }

    const xIndex = cursor;
    cursor += 1;
    maxDepth = Math.max(maxDepth, depth);
    positioned.push({
      ...byId.get(nodeId),
      x: 70 + xIndex * 82,
      y: 56 + depth * 92
    });

    if (childSet.R) {
      visit(childSet.R, depth + 1);
    }
  }

  visit(example.meta.rootId, 0);

  return {
    width: Math.max(520, 140 + Math.max(1, cursor) * 82),
    height: Math.max(240, 120 + (maxDepth + 1) * 92),
    nodes: positioned,
    edges: example.edges
  };
}

function layoutLinkedList(example) {
  const nodes = example.nodes.map((node, index) => ({
    ...node,
    x: 74 + index * 96,
    y: 96
  }));

  return {
    width: Math.max(520, 140 + example.nodes.length * 96),
    height: 190,
    nodes,
    edges: example.edges
  };
}

function layoutGraph(example) {
  const centerX = 320;
  const centerY = 220;
  const radius = Math.min(168, 58 + example.nodes.length * 12);
  const nodes = example.nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / example.nodes.length - Math.PI / 2;
    return {
      ...node,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });

  return {
    width: 640,
    height: 440,
    nodes,
    edges: example.edges
  };
}

function layoutLinear(example) {
  return {
    width: Math.max(360, example.nodes.length * 78),
    height: example.kind === "stack" ? Math.max(260, example.nodes.length * 50) : 160,
    nodes: example.nodes.map((node, index) => ({ ...node, index })),
    edges: []
  };
}

function getBinaryTreeTracePrograms(example) {
  const traversals = [
    ["preorder", "Preorder", preorderIds(example)],
    ["inorder", "Inorder", inorderIds(example)],
    ["postorder", "Postorder", postorderIds(example)],
    ["level-order", "Level-order", levelOrderIds(example)]
  ];

  return traversals.map(([id, label, order]) => ({
    id,
    label,
    steps: visitSteps(example, order, label)
  }));
}

function getBstTracePrograms(example) {
  return [
    {
      id: "search",
      label: `Search ${example.meta.searchValue}`,
      steps: bstSearchSteps(example, Number(example.meta.searchValue))
    },
    {
      id: "insert",
      label: `Insert ${example.meta.insertValue}`,
      steps: bstInsertSteps(example, Number(example.meta.insertValue))
    }
  ];
}

function getLinkedListTracePrograms(example) {
  return [
    {
      id: "traverse",
      label: "Traverse",
      steps: visitSteps(example, example.nodes.map((node) => node.id), "Linked-list traversal")
    }
  ];
}

function getArrayTracePrograms(example) {
  const target = Number(example.meta.searchValue);
  const steps = [];
  const visited = [];

  for (const node of example.nodes) {
    steps.push(makeStep({
      id: `scan-${node.id}`,
      title: `Inspect index ${node.label}`,
      detail: Number(node.value) === target ? `${node.value} matches target ${target}.` : `${node.value} does not match ${target}.`,
      activeNodeIds: [node.id],
      visitedNodeIds: [...visited],
      pointers: [{ label: "i", nodeId: node.id }]
    }));
    visited.push(node.id);
    if (Number(node.value) === target) {
      break;
    }
  }

  return [{ id: "linear-scan", label: `Linear scan ${target}`, steps }];
}

function getStackTracePrograms(example) {
  const topId = String(example.meta.topId);
  return [
    {
      id: "pop",
      label: "Pop",
      steps: [
        makeStep({
          id: "pop-top",
          title: "Read top",
          detail: `Top value is ${getNode(example, topId)?.value}.`,
          activeNodeIds: [topId],
          pointers: [{ label: "top", nodeId: topId }]
        }),
        makeStep({
          id: "pop-remove",
          title: "Remove top",
          detail: "The top item leaves the stack.",
          visitedNodeIds: [topId],
          pointers: [{ label: "top", nodeId: topId }]
        })
      ]
    },
    {
      id: "push",
      label: `Push ${example.meta.pushValue}`,
      steps: [
        makeStep({
          id: "push-locate",
          title: "Locate top",
          detail: "The new item is placed above the current top.",
          activeNodeIds: [topId],
          pointers: [{ label: "top", nodeId: topId }]
        }),
        makeStep({
          id: "push-place",
          title: "Place item",
          detail: `Push value ${example.meta.pushValue}.`,
          visitedNodeIds: [topId],
          pointers: [{ label: "old top", nodeId: topId }]
        })
      ]
    }
  ];
}

function getQueueTracePrograms(example) {
  const frontId = String(example.meta.frontId);
  const rearId = String(example.meta.rearId);
  return [
    {
      id: "dequeue",
      label: "Dequeue",
      steps: [
        makeStep({
          id: "dequeue-front",
          title: "Read front",
          detail: `Front value is ${getNode(example, frontId)?.value}.`,
          activeNodeIds: [frontId],
          pointers: [{ label: "front", nodeId: frontId }]
        }),
        makeStep({
          id: "dequeue-remove",
          title: "Remove front",
          detail: "The front item leaves the queue.",
          visitedNodeIds: [frontId],
          pointers: [{ label: "front", nodeId: frontId }]
        })
      ]
    },
    {
      id: "enqueue",
      label: `Enqueue ${example.meta.enqueueValue}`,
      steps: [
        makeStep({
          id: "enqueue-rear",
          title: "Locate rear",
          detail: "The new item is placed after the rear.",
          activeNodeIds: [rearId],
          pointers: [{ label: "rear", nodeId: rearId }]
        }),
        makeStep({
          id: "enqueue-place",
          title: "Place item",
          detail: `Enqueue value ${example.meta.enqueueValue}.`,
          visitedNodeIds: [rearId],
          pointers: [{ label: "old rear", nodeId: rearId }]
        })
      ]
    }
  ];
}

function getGraphTracePrograms(example) {
  return [
    {
      id: "bfs",
      label: "BFS",
      steps: graphTraversalSteps(example, "bfs")
    },
    {
      id: "dfs",
      label: "DFS",
      steps: graphTraversalSteps(example, "dfs")
    }
  ];
}

function visitSteps(example, order, label) {
  const visited = [];
  return order.map((nodeId, index) => {
    const node = getNode(example, nodeId);
    const step = makeStep({
      id: `${label.toLowerCase().replaceAll(" ", "-")}-${index}`,
      title: `Visit ${node?.value ?? nodeId}`,
      detail: `${label}: step ${index + 1} of ${order.length}.`,
      activeNodeIds: [nodeId],
      visitedNodeIds: [...visited],
      pointers: [{ label: "current", nodeId }]
    });
    visited.push(nodeId);
    return step;
  });
}

function bstSearchSteps(example, target) {
  const children = getTreeChildren(example);
  const steps = [];
  const visited = [];
  let currentId = String(example.meta.rootId);

  while (currentId) {
    const node = getNode(example, currentId);
    const childSet = children.get(currentId) || {};
    const nextId = target < Number(node.value) ? childSet.L : childSet.R;
    const relation = target === Number(node.value) ? "matches" : target < Number(node.value) ? "go left" : "go right";

    steps.push(makeStep({
      id: `search-${currentId}`,
      title: `Compare with ${node.value}`,
      detail: `${target} ${relation} at ${node.value}.`,
      activeNodeIds: [currentId],
      visitedNodeIds: [...visited],
      activeEdgeIds: nextId ? [edgeBetween(example, currentId, nextId)?.id].filter(Boolean) : [],
      pointers: [{ label: "current", nodeId: currentId }]
    }));

    visited.push(currentId);
    if (target === Number(node.value)) {
      break;
    }
    currentId = nextId || "";
  }

  return steps;
}

function bstInsertSteps(example, value) {
  const children = getTreeChildren(example);
  const steps = [];
  const visited = [];
  let currentId = String(example.meta.rootId);
  let parentId = currentId;
  let side = "L";

  while (currentId) {
    const node = getNode(example, currentId);
    const childSet = children.get(currentId) || {};
    parentId = currentId;
    side = value < Number(node.value) ? "L" : "R";
    const nextId = childSet[side];

    steps.push(makeStep({
      id: `insert-${currentId}`,
      title: `Compare with ${node.value}`,
      detail: `${value} ${side === "L" ? "is smaller" : "is greater or equal"}; ${nextId ? "continue" : "insert here"}.`,
      activeNodeIds: [currentId],
      visitedNodeIds: [...visited],
      activeEdgeIds: nextId ? [edgeBetween(example, currentId, nextId)?.id].filter(Boolean) : [],
      pointers: [{ label: "current", nodeId: currentId }]
    }));

    visited.push(currentId);
    currentId = nextId || "";
  }

  steps.push(makeStep({
    id: "insert-place",
    title: `Attach ${value}`,
    detail: `New value becomes the ${side === "L" ? "left" : "right"} child of ${getNode(example, parentId)?.value}.`,
    activeNodeIds: [parentId],
    visitedNodeIds: visited,
    pointers: [{ label: "parent", nodeId: parentId }]
  }));

  return steps;
}

function graphTraversalSteps(example, mode) {
  const adjacency = graphAdjacency(example);
  const startId = String(example.meta.startId || example.nodes[0].id);
  const seen = new Set([startId]);
  const visited = [];
  const frontier = [startId];
  const steps = [];

  while (frontier.length) {
    const currentId = mode === "bfs" ? frontier.shift() : frontier.pop();
    const neighbors = adjacency.get(currentId) || [];
    const newlySeen = [];

    for (const neighbor of neighbors) {
      if (!seen.has(neighbor.nodeId)) {
        seen.add(neighbor.nodeId);
        newlySeen.push(neighbor);
        frontier.push(neighbor.nodeId);
      }
    }

    steps.push(makeStep({
      id: `${mode}-${currentId}`,
      title: `Visit ${getNode(example, currentId)?.value}`,
      detail: newlySeen.length ? `Discover ${newlySeen.map((item) => getNode(example, item.nodeId)?.value).join(", ")}.` : "No new vertices discovered.",
      activeNodeIds: [currentId, ...newlySeen.map((item) => item.nodeId)],
      visitedNodeIds: [...visited],
      activeEdgeIds: newlySeen.map((item) => item.edgeId),
      pointers: [{ label: mode.toUpperCase(), nodeId: currentId }]
    }));

    visited.push(currentId);
  }

  return steps;
}

function preorderIds(example) {
  const order = [];
  const children = getTreeChildren(example);
  walkPreorder(String(example.meta.rootId), children, order);
  return order;
}

function inorderIds(example) {
  const order = [];
  const children = getTreeChildren(example);
  walkInorder(String(example.meta.rootId), children, order);
  return order;
}

function postorderIds(example) {
  const order = [];
  const children = getTreeChildren(example);
  walkPostorder(String(example.meta.rootId), children, order);
  return order;
}

function levelOrderIds(example) {
  const order = [];
  const children = getTreeChildren(example);
  const queue = [String(example.meta.rootId)];

  while (queue.length) {
    const nodeId = queue.shift();
    order.push(nodeId);
    const childSet = children.get(nodeId) || {};
    if (childSet.L) {
      queue.push(childSet.L);
    }
    if (childSet.R) {
      queue.push(childSet.R);
    }
  }

  return order;
}

function walkPreorder(nodeId, children, order) {
  if (!nodeId) {
    return;
  }
  order.push(nodeId);
  const childSet = children.get(nodeId) || {};
  walkPreorder(childSet.L, children, order);
  walkPreorder(childSet.R, children, order);
}

function walkInorder(nodeId, children, order) {
  if (!nodeId) {
    return;
  }
  const childSet = children.get(nodeId) || {};
  walkInorder(childSet.L, children, order);
  order.push(nodeId);
  walkInorder(childSet.R, children, order);
}

function walkPostorder(nodeId, children, order) {
  if (!nodeId) {
    return;
  }
  const childSet = children.get(nodeId) || {};
  walkPostorder(childSet.L, children, order);
  walkPostorder(childSet.R, children, order);
  order.push(nodeId);
}

function getTreeChildren(example) {
  const children = new Map();
  for (const edge of example.edges) {
    const childSet = children.get(edge.source) || {};
    childSet[edge.label === "R" ? "R" : "L"] = edge.target;
    children.set(edge.source, childSet);
  }
  return children;
}

function graphAdjacency(example) {
  const adjacency = new Map(example.nodes.map((node) => [node.id, []]));
  for (const edge of example.edges) {
    adjacency.get(edge.source)?.push({ nodeId: edge.target, edgeId: edge.id });
    adjacency.get(edge.target)?.push({ nodeId: edge.source, edgeId: edge.id });
  }

  for (const neighbors of adjacency.values()) {
    neighbors.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  }

  return adjacency;
}

function makeStep(step) {
  return {
    id: step.id,
    title: step.title,
    detail: step.detail,
    activeNodeIds: step.activeNodeIds || [],
    visitedNodeIds: step.visitedNodeIds || [],
    activeEdgeIds: step.activeEdgeIds || [],
    pointers: step.pointers || []
  };
}

function nodeMap(example) {
  return new Map(example.nodes.map((node) => [node.id, node]));
}

function getNode(example, nodeId) {
  return nodeMap(example).get(nodeId);
}

function edgeBetween(example, source, target) {
  return example.edges.find((edge) => edge.source === source && edge.target === target);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function titleCase(value) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
