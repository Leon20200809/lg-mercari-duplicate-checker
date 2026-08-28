// メルカリDOMとGoogle Sheetsの橋渡しを担当する。

import {
  createExistingItemIdSet,
  getGoogleToken,
  readMercariUrls,
} from "./services/sheets.js";

import { loadSettings } from "./services/storage.js";

/** Google Sheetsから登録済みのメルカリ商品IDを取得する。 */
async function getExistingItemIds() {
  const { spreadsheet, sheetName } = await loadSettings();

  if (!spreadsheet || !sheetName) {
    throw new Error("Google Sheetsの設定がありません。");
  }

  const token = await getGoogleToken(false);

  const values = await readMercariUrls(token, spreadsheet, sheetName);

  const itemIdSet = createExistingItemIdSet(values);

  return [...itemIdSet];
}

/** content.jsからのメッセージを処理する。 */
function handleMessage(message, sender, sendResponse) {
  if (message.type !== "GET_EXISTING_ITEM_IDS") {
    return;
  }

  getExistingItemIds()
    .then((itemIds) => {
      sendResponse({
        ok: true,
        itemIds,
      });
    })
    .catch((error) => {
      console.error("[LG] 登録済み商品ID取得失敗", error);

      sendResponse({
        ok: false,
        error: error.message,
      });
    });

  return true;
}

chrome.runtime.onMessage.addListener(handleMessage);
