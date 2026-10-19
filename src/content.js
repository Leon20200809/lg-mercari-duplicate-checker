// メルカリ検索結果のDOM変化を監視し、描画された商品情報を取得する。

/** 商品URLからメルカリの商品IDを抽出する。 */
function extractItemId(href) {
  const match = href.match(/\/item\/(m\d+)/);

  return match ? match[1] : null;
}

/** 現在DOMに描画されているメルカリ商品情報を収集する。 */
function collectMercariItems() {
  const cards = [...document.querySelectorAll('li[data-testid="item-cell"]')];

  return cards
    .map((card) => {
      const link = card.querySelector('a[data-testid="thumbnail-link"]');

      if (!link) {
        return null;
      }

      const itemId = extractItemId(link.href);

      if (!itemId) {
        return null;
      }

      const nameElement = card.querySelector(
        '[data-testid="thumbnail-item-name"]',
      );

      const imageElement = card.querySelector("img");

      return {
        itemId,
        card,
        url: link.href,
        name: nameElement?.textContent?.trim() ?? "",
        thumbnailUrl: imageElement?.src ?? "",
      };
    })
    .filter(Boolean);
}

let lastItemCount = -1;
let debounceTimer = null;

let existingItemIds = new Set();
let sheetsState = "loading";
let sheetsError = "";

/** 表示は変更せず、取得済みIDと現在のDOMだけを検査する。 */
function diagnoseMercariDisplay() {
  if (location.origin !== "https://jp.mercari.com" || location.pathname !== "/search") {
    return { status: "対象外", reasons: ["メルカリの検索画面で開いてください。"] };
  }

  const items = collectMercariItems();
  const cardCount = document.querySelectorAll('li[data-testid="item-cell"]').length;
  const duplicates = items.filter((item) => existingItemIds.has(item.itemId));
  const marked = [...document.querySelectorAll('[data-lg-duplicate="true"]')];
  const expectedPictures = new Set(duplicates.map((item) =>
    item.card.querySelector("picture > img")?.parentElement,
  ).filter(Boolean));
  const missingCount = duplicates.filter((item) =>
    item.card.querySelector("picture > img")?.parentElement?.dataset.lgDuplicate !== "true",
  ).length;
  const unexpectedCount = marked.filter((element) => !expectedPictures.has(element)).length;
  let cssChecked = 0;
  let cssFailed = 0;

  for (const picture of expectedPictures) {
    if (picture.dataset.lgDuplicate !== "true") continue;
    cssChecked++;
    if (!hasDuplicateStyles(picture)) cssFailed++;
  }

  const reasons = [];
  if (sheetsState === "error") {
    reasons.push(`Google Sheets取得失敗：${sheetsError}`);
    reasons.push("拡張機能のオプションで設定・接続確認をしてください。確認後、検索画面を再読み込みしてください。");
  }
  if (cardCount !== items.length) reasons.push("商品カードの一部から商品IDを取得できません。メルカリのDOM構造が変わった可能性があります。");
  if (sheetsState === "success") {
    if (missingCount) reasons.push(`重複表示属性が${missingCount}件不足しています。画像DOMの変更や表示処理の未反映が考えられます。`);
    if (unexpectedCount) reasons.push(`重複対象の画像以外に表示属性が${unexpectedCount}件あります。表示が古い可能性があります。`);
    if (cssFailed) reasons.push(`CSS表示条件が${cssFailed}件一致しません。拡張機能のCSS未反映やページ側のスタイル変更が考えられます。`);
  }

  let status = "要確認";
  if (!reasons.length) {
    if (sheetsState === "loading") {
      status = "確認中・判定不能";
      reasons.push("Google Sheetsから取得中です。少し待ってPopupを開き直してください。");
    } else if (!items.length) {
      status = "確認中・判定不能";
      reasons.push("商品を取得できませんでした。検索結果0件・読み込み中・商品DOMの変更を区別できません。画面の商品表示を確認してください。");
    } else if (!duplicates.length) {
      status = "確認中・判定不能";
      reasons.push("重複商品が0件のため、重複表示を検査できません。");
    } else {
      status = "正常";
      reasons.push("検査した重複商品の表示属性とCSS条件に異常はありません。");
    }
  } else {
    reasons.push("DOM・表示の問題は検索画面を再読み込みして確認してください。改善しない場合はDOM/CSSの確認が必要です。");
  }

  return {
    status, reasons, sheetsState,
    cardCount, itemCount: items.length,
    duplicateCount: sheetsState === "success" ? duplicates.length : null,
    attributeCount: marked.length, missingCount, unexpectedCount,
    cssChecked, cssFailed,
  };
}

/** 計算済みスタイルの検査。重なりや他要素による遮蔽までは保証しない。 */
function hasDuplicateStyles(picture) {
  const base = getComputedStyle(picture);
  const before = getComputedStyle(picture, "::before");
  const after = getComputedStyle(picture, "::after");
  const visible = (style) => style.display !== "none" &&
    style.visibility === "visible" && Number(style.opacity) > 0;
  const bounds = picture.getBoundingClientRect();
  const background = before.backgroundColor.replace(/\s/g, "");
  return visible(base) && visible(before) && visible(after) &&
    bounds.width > 0 && bounds.height > 0 && base.position === "relative" &&
    before.content === '\"\"' && after.content.replace(/^['\"]|['\"]$/g, "") === "重複！" &&
    before.position === "absolute" && after.position === "absolute" &&
    [before.top, before.right, before.bottom, before.left].every((value) => value === "0px") &&
    background === "rgba(0,0,0,0.55)" &&
    after.color.replace(/\s/g, "") === "rgb(255,77,79)" &&
    Math.abs(parseFloat(after.top) - bounds.height / 2) <= 1 &&
    Math.abs(parseFloat(after.left) - bounds.width / 2) <= 1 &&
    parseFloat(after.fontSize) > 0 && after.transform !== "none" &&
    Number(before.zIndex) > 0 && Number(after.zIndex) > Number(before.zIndex) &&
    before.pointerEvents === "none" && after.pointerEvents === "none";
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "GET_DUPLICATE_DIAGNOSTICS") return;
  try {
    sendResponse(diagnoseMercariDisplay());
  } catch {
    sendResponse({ status: "確認中・判定不能", reasons: ["診断を完了できませんでした。検索画面を再読み込みして確認してください。"] });
  }
});

/** 現在表示中の商品を登録済みIDと照合し、重複件数を確認する。 */
function inspectMercariDom() {
  const items = collectMercariItems();

  if (items.length === lastItemCount) {
    return;
  }

  lastItemCount = items.length;

  const duplicateItems = items.filter((item) =>
    existingItemIds.has(item.itemId),
  );

  renderDuplicateItems(duplicateItems);

  console.log("[LG] 重複確認", {
    displayedItems: items.length,
    duplicateItems: duplicateItems.length,
  });

  console.log("[LG] 重複商品一覧", duplicateItems);
}

/** 重複商品の画像に重複表示用の属性を付ける。 */
function renderDuplicateItems(duplicateItems) {
  document
    .querySelectorAll('[data-lg-duplicate="true"]')
    .forEach((element) => {
      element.removeAttribute("data-lg-duplicate");
    });

  duplicateItems.forEach((item) => {
    const picture = item.card.querySelector("picture > img")?.parentElement;

    if (!picture) {
      return;
    }

    picture.dataset.lgDuplicate = "true";
  });
}

/** DOM監視を開始し、商品追加時の連続処理をデバウンスする。 */
function observeMercariDom() {
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      inspectMercariDom();
    }, 200);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

/** backgroundから登録済みの商品IDを取得する。 */
function requestExistingItemIds() {
  chrome.runtime.sendMessage(
    {
      type: "GET_EXISTING_ITEM_IDS",
    },
    (response) => {
      const connectionError = chrome.runtime.lastError?.message;
      if (connectionError || !response?.ok) {
        sheetsState = "error";
        sheetsError = connectionError || response?.error || "取得結果を受信できませんでした。";
        console.error("[LG] 登録済み商品ID取得失敗", response?.error);

        return;
      }

      existingItemIds = new Set(response.itemIds);
      sheetsState = "success";

      lastItemCount = -1;

      console.log("[LG] 登録済み商品ID取得", existingItemIds.size);

      inspectMercariDom();
    },
  );
}

requestExistingItemIds();

observeMercariDom();
inspectMercariDom();
