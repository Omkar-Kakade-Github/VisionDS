# VisionDS

VisionDS is a Manifest V3 Chrome extension for generating, visualizing, and tracing data structure examples in a side panel.

## Load The Extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select this folder: `/home/blaze/Blaze/Projects/VisionDS`.
5. Click the extension action and choose **Open Side Panel**.

## Supported Structures

- Binary tree
- BST
- Linked list
- Array
- Stack
- Queue
- Simple graph

## Tests

The tests use Node's built-in test runner and no external packages:

```bash
npm test
```

This environment does not currently have `node` or `npm` installed, so the test command must be run in a local shell with Node available.
