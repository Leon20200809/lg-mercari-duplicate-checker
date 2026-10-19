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
      if (!response?.ok) {
        console.error("[LG] 登録済み商品ID取得失敗", response?.error);

        return;
      }

      existingItemIds = new Set(response.itemIds);

      lastItemCount = -1;

      console.log("[LG] 登録済み商品ID取得", existingItemIds.size);

      inspectMercariDom();
    },
  );
}

requestExistingItemIds();

observeMercariDom();
inspectMercariDom();
