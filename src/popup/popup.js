const byId = (id) => document.getElementById(id);

function showDiagnosis(result) {
  byId("status").textContent = result.status;
  byId("status").dataset.status = result.status;
  byId("sheets").textContent = {
    loading: "取得中", success: "取得成功", error: "取得失敗（認証・設定・接続）",
  }[result.sheetsState] || "未確認";
  for (const [id, key] of Object.entries({
    cards: "cardCount", items: "itemCount", duplicates: "duplicateCount", attributes: "attributeCount",
  })) {
    byId(id).textContent = result[key] == null ? "—" : `${result[key]}件`;
  }
  byId("css").textContent = result.cssChecked > 0
    ? `${result.cssChecked}件検査・不一致${result.cssFailed}件`
    : "未検査（対象なし）";
  byId("reasons").replaceChildren(...result.reasons.map((reason) => {
    const li = document.createElement("li");
    li.textContent = reason;
    return li;
  }));
}

byId("options").addEventListener("click", () => chrome.runtime.openOptionsPage());

// backgroundには問い合わせず、既存のcontent scriptに一度だけ診断を依頼する。
async function diagnoseActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error("No active tab");
    const result = await chrome.tabs.sendMessage(tab.id, { type: "GET_DUPLICATE_DIAGNOSTICS" });
    if (!result?.status || !Array.isArray(result.reasons)) throw new Error("No diagnosis");
    showDiagnosis(result);
  } catch {
    showDiagnosis({
      status: "対象外",
      reasons: ["メルカリ検索画面以外、または拡張機能に接続できない状態です。メルカリの検索画面を開いてください。拡張機能を更新した直後は検索画面を再読み込みしてください。"],
    });
  }
}

diagnoseActiveTab();
