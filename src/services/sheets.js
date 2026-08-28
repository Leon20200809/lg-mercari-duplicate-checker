// Google認証とGoogle Sheets APIへのアクセスを担当する。

export async function getGoogleToken() {
  const result = await chrome.identity.getAuthToken({
    interactive: true,
  });

  if (!result.token) {
    throw new Error("アクセストークンを取得できませんでした。");
  }

  return result.token;
}

export async function readMercariUrls(token, spreadsheet, sheetName) {
  const spreadsheetId = extractSpreadsheetId(spreadsheet);
  const range = `'${sheetName}'!F8:F`;

  const endpoint =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}` +
    `/values/${encodeURIComponent(range)}`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Sheets API error: ${response.status}`);
  }

  const data = await response.json();

  return data.values ?? [];
}

function extractSpreadsheetId(spreadsheet) {
  const match = spreadsheet.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);

  return match ? match[1] : spreadsheet;
}

/** Sheetsから取得したURL一覧をメルカリ商品IDのSetへ変換する。 */
export function createExistingItemIdSet(values) {
  const itemIds = values
    .flat()
    .map((url) => {
      const match = url?.match(/\/item\/(m\d+)/);

      return match ? match[1] : null;
    })
    .filter(Boolean);

  return new Set(itemIds);
}
