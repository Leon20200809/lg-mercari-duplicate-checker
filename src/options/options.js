// 設定画面の入力・保存・復元・接続確認を制御する。

import { loadSettings, saveSettings } from "./storage.js";

import { getGoogleToken, readMercariUrls } from "./sheets.js";

const spreadsheetInput = document.querySelector("#spreadsheet");
const sheetNameInput = document.querySelector("#sheet-name");

const saveButton = document.querySelector("#save-settings");
const saveResult = document.querySelector("#save-result");

const authButton = document.querySelector("#auth-test");
const authResult = document.querySelector("#auth-result");

async function restoreSettings() {
  const settings = await loadSettings();

  spreadsheetInput.value = settings.spreadsheet ?? "";
  sheetNameInput.value = settings.sheetName ?? "";
}

saveButton.addEventListener("click", async () => {
  const spreadsheet = spreadsheetInput.value.trim();
  const sheetName = sheetNameInput.value.trim();

  if (!spreadsheet || !sheetName) {
    saveResult.textContent = "スプレッドシートとシート名を入力してください。";

    return;
  }

  await saveSettings(spreadsheet, sheetName);

  saveResult.textContent = "設定を保存しました。";
});

authButton.addEventListener("click", async () => {
  const spreadsheet = spreadsheetInput.value.trim();
  const sheetName = sheetNameInput.value.trim();

  if (!spreadsheet || !sheetName) {
    authResult.textContent = "スプレッドシートとシート名を入力してください。";

    return;
  }

  authResult.textContent = "接続確認中...";

  try {
    const token = await getGoogleToken();

    const values = await readMercariUrls(token, spreadsheet, sheetName);

    console.log("F8:F 読み取り成功");
    console.log(values);

    authResult.textContent = `接続成功：${values.length}行取得`;
  } catch (error) {
    console.error(error);

    authResult.textContent = `接続失敗：${error.message}`;
  }
});

restoreSettings();
