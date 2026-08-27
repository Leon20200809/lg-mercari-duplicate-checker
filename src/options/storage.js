// 拡張機能の設定をChromeストレージへ保存・取得する。

export async function saveSettings(spreadsheet, sheetName) {
  await chrome.storage.sync.set({
    spreadsheet,
    sheetName,
  });
}

export async function loadSettings() {
  return await chrome.storage.sync.get(["spreadsheet", "sheetName"]);
}
