const openButton = document.querySelector("#open-side-panel");
const statusElement = document.querySelector("#status");

async function openSidePanel() {
  statusElement.textContent = "";
  const extensionApi = globalThis.chrome;

  if (!extensionApi?.sidePanel?.open || !extensionApi?.windows?.getCurrent) {
    statusElement.textContent = "Chrome 116 or newer is required for side panels.";
    return;
  }

  try {
    const currentWindow = await extensionApi.windows.getCurrent();
    await extensionApi.sidePanel.open({ windowId: currentWindow.id });
    window.close();
  } catch (error) {
    statusElement.textContent = error instanceof Error ? error.message : "Unable to open side panel.";
  }
}

openButton.addEventListener("click", openSidePanel);
