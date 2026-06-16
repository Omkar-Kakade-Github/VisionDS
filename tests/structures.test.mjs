import test from "node:test";
import assert from "node:assert/strict";
import { registry, STRUCTURE_ORDER } from "../src/structures.js";

test("generators are deterministic for the same seed and config", () => {
  for (const kind of STRUCTURE_ORDER) {
    const entry = registry[kind];
    const config = { ...entry.getDefaultConfig(), seed: "deterministic", size: 7, minValue: 1, maxValue: 80 };
    assert.deepStrictEqual(entry.generateExamples(config, 3), entry.generateExamples(config, 3), kind);
  }
});

test("each generator returns valid examples", () => {
  for (const kind of STRUCTURE_ORDER) {
    const entry = registry[kind];
    const examples = entry.generateExamples({ ...entry.getDefaultConfig(), seed: "valid", size: 6 }, 3);

    assert.equal(examples.length, 3, kind);

    for (const example of examples) {
      assert.equal(example.kind, kind);
      assert.equal(example.nodes.length, 6);
      assert.ok(example.title);
      assert.ok(example.description);

      const nodeIds = new Set(example.nodes.map((node) => node.id));
      assert.equal(nodeIds.size, example.nodes.length, `${kind}: duplicate node IDs`);

      for (const edge of example.edges) {
        assert.ok(nodeIds.has(edge.source), `${kind}: missing edge source ${edge.source}`);
        assert.ok(nodeIds.has(edge.target), `${kind}: missing edge target ${edge.target}`);
      }

      if (kind === "binary-tree" || kind === "bst" || kind === "linked-list") {
        assert.equal(example.edges.length, example.nodes.length - 1, `${kind}: edge count`);
      }

      if (kind === "graph") {
        const edgeKeys = new Set(example.edges.map((edge) => [edge.source, edge.target].sort().join("-")));
        assert.equal(edgeKeys.size, example.edges.length, "graph: duplicate edges");
      }
    }
  }
});

test("layouts include every generated node", () => {
  for (const kind of STRUCTURE_ORDER) {
    const entry = registry[kind];
    const [example] = entry.generateExamples({ ...entry.getDefaultConfig(), seed: "layout", size: 5 }, 1);
    const layout = entry.layout(example);

    assert.ok(layout.width > 0, `${kind}: layout width`);
    assert.ok(layout.height > 0, `${kind}: layout height`);
    assert.equal(layout.nodes.length, example.nodes.length, `${kind}: layout node count`);

    const layoutIds = new Set(layout.nodes.map((node) => node.id));
    for (const node of example.nodes) {
      assert.ok(layoutIds.has(node.id), `${kind}: layout missing ${node.id}`);
    }
  }
});

test("trace steps only reference existing nodes and edges", () => {
  for (const kind of STRUCTURE_ORDER) {
    const entry = registry[kind];
    const [example] = entry.generateExamples({ ...entry.getDefaultConfig(), seed: "trace", size: 7 }, 1);
    const nodeIds = new Set(example.nodes.map((node) => node.id));
    const edgeIds = new Set(example.edges.map((edge) => edge.id));
    const programs = entry.getTracePrograms(example);

    assert.ok(programs.length > 0, `${kind}: programs`);

    for (const program of programs) {
      assert.ok(program.steps.length > 0, `${kind}:${program.id}: steps`);

      for (const step of program.steps) {
        for (const nodeId of [...step.activeNodeIds, ...step.visitedNodeIds]) {
          assert.ok(nodeIds.has(nodeId), `${kind}:${program.id}: missing node ${nodeId}`);
        }

        for (const edgeId of step.activeEdgeIds) {
          assert.ok(edgeIds.has(edgeId), `${kind}:${program.id}: missing edge ${edgeId}`);
        }

        for (const pointer of step.pointers) {
          assert.ok(nodeIds.has(pointer.nodeId), `${kind}:${program.id}: missing pointer node ${pointer.nodeId}`);
        }
      }
    }
  }
});
