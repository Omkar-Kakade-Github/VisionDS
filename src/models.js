/**
 * @typedef {"binary-tree" | "bst" | "linked-list" | "array" | "stack" | "queue" | "graph"} StructureKind
 */

/**
 * @typedef {Object} Node
 * @property {string} id
 * @property {number|string} value
 * @property {string=} label
 */

/**
 * @typedef {Object} Edge
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {string=} label
 * @property {boolean=} directed
 */

/**
 * @typedef {Object} GeneratedExample
 * @property {string} id
 * @property {StructureKind} kind
 * @property {string} title
 * @property {string} description
 * @property {Node[]} nodes
 * @property {Edge[]} edges
 * @property {Record<string, unknown>} meta
 */

/**
 * @typedef {Object} TracePointer
 * @property {string} label
 * @property {string} nodeId
 */

/**
 * @typedef {Object} TraceStep
 * @property {string} id
 * @property {string} title
 * @property {string} detail
 * @property {string[]} activeNodeIds
 * @property {string[]} visitedNodeIds
 * @property {string[]} activeEdgeIds
 * @property {TracePointer[]} pointers
 */

/**
 * @typedef {Object} Annotation
 * @property {string} id
 * @property {"pointer" | "highlight" | "note"} type
 * @property {string} nodeId
 * @property {string} label
 * @property {string} color
 */

export const STRUCTURE_ORDER = Object.freeze([
  "binary-tree",
  "bst",
  "linked-list",
  "array",
  "stack",
  "queue",
  "graph"
]);

export const STRUCTURE_LABELS = Object.freeze({
  "binary-tree": "Binary tree",
  bst: "BST",
  "linked-list": "Linked list",
  array: "Array",
  stack: "Stack",
  queue: "Queue",
  graph: "Graph"
});
