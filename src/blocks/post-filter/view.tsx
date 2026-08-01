import apiFetch from "@wordpress/api-fetch";
import {
	restTaxonomies,
	getPeriodQuery,
	ensureCtx,
	subscribe,
	setState,
} from "itmar-block-packages";

// リロード判定（新旧ブラウザ対応）
const __itmar_isReload__ = (() => {
	try {
		const nav = performance.getEntriesByType("navigation")[0] as
			| PerformanceNavigationTiming
			| undefined;

		return nav?.type === "reload";
	} catch {
		return false;
	}
})();

// リロード時は「必ずフィルタ無し」で開始する
if (__itmar_isReload__) {
	window.__itmar_force_reset_filters__ = true;

	// query を必ず消す（URLSearchParamsは使わない）
	if (window.location.search) {
		history.replaceState(
			null,
			"",
			window.location.pathname + window.location.hash,
		);
	}
}

// URL の terms を読み取る
function readTermsParamFromUrl() {
	// URLのクリーン化
	const FORCE_RESET_FLAG = "__itmar_force_reset_filters__";

	(function guardBadQuery() {
		const s = window.location.search || "";

		// terms=%25... は「%」がエンコードされている＝二重エンコードの典型
		const bad = s.includes("terms=%25") || s.length > 2000;

		if (bad) {
			window[FORCE_RESET_FLAG] = true;

			// URLSearchParamsを使わずにクエリを全除去（落ちる前に止血）
			const clean = window.location.pathname + window.location.hash;
			history.replaceState(null, "", clean);
		}
	})();

	const params = new URLSearchParams(window.location.search);
	const termsRaw = params.get("terms");
	if (!termsRaw) return null;

	try {
		return JSON.parse(decodeURIComponent(termsRaw));
	} catch {
		return null;
	}
}

// termParamObj（URLのterms）→ termQueryObj（[{taxonomy, term:{id,slug,name}}]）へ
function paramToObject(prm, taxArray) {
	if (!prm || !taxArray) return [];

	return Object.entries(prm)
		.filter(([key]) => key !== "tax_relation")
		.flatMap(([key, value]) => {
			// value は "1,2" or number or array など混在し得る前提で吸収
			const values = Array.isArray(value)
				? value
				: typeof value === "string"
				? value.split(",").map(Number)
				: [value];

			return values.flatMap((val) =>
				taxArray.flatMap((tax) =>
					tax.terms
						.filter((term) => term.id === Number(val))
						.map((term) => ({
							taxonomy: tax.value,
							term: { id: term.id, slug: term.slug, name: term.name },
						})),
				),
			);
		});
}

// checkbox（name=slug）から taxonomy を親 group の class で推測する
function getTaxonomyFromCheckbox(checkbox, taxArray) {
	const parentGroup = checkbox.closest(".wp-block-itmar-design-group");
	if (!parentGroup) return null;

	const classes = Array.from(parentGroup.classList);
	const taxonomy = classes.find((className) =>
		taxArray.find((obj) => obj.value === className),
	);

	return taxonomy || null;
}

// 現在チェックされている checkbox から termQueryObj を作る
function buildTermQueryObj(filterContainer, taxArray) {
	const checked = Array.from(
		filterContainer.querySelectorAll(
			'.itmar_filter_checkbox input[type="checkbox"]:checked',
		),
	) as HTMLInputElement[];

	const result = [];
	for (const cb of checked) {
		const slug = cb.getAttribute("name"); // ★slug or id
		if (!slug) continue;
		const taxonomy = getTaxonomyFromCheckbox(cb, taxArray);
		if (!taxonomy) continue;

		const tax = taxArray.find((t) => t.value === taxonomy);
		const term = tax?.terms?.find((t) => String(t.slug || t.id) === slug);
		if (!term) continue;

		result.push({
			taxonomy,
			term: { id: term.id, slug: term.slug, name: term.name },
		});
	}
	return result;
}

function removeCheckboxBlock(checkbox: HTMLInputElement) {
	const filterCheckboxElement = checkbox.closest(".itmar_filter_checkbox");
	if (!filterCheckboxElement) return;

	const blockElement = filterCheckboxElement.parentElement;
	const next = blockElement?.nextElementSibling;

	if (blockElement) {
		blockElement.remove();
		if (
			next &&
			next.tagName === "DIV" &&
			next.childElementCount === 0 &&
			(next.textContent || "").trim() === ""
		) {
			next.remove();
		}
		return;
	}

	filterCheckboxElement.remove();
}

function updateCheckboxLabel(
	blockElement: Element,
	termKey: string,
	termLabelMap: Map<string, string>,
) {
	const input = blockElement.querySelector<HTMLInputElement>(
		'input[type="checkbox"]',
	);
	if (!input) return null;

	input.setAttribute("name", termKey);
	input.checked = false;

	const labelDiv = input.parentElement?.nextElementSibling;
	if (labelDiv && labelDiv.tagName === "DIV") {
		labelDiv.textContent = termLabelMap.get(termKey) || termKey;
		return input;
	}

	const fallback = blockElement.querySelector(".itmar_filter_checkbox div");
	if (fallback) fallback.textContent = termLabelMap.get(termKey) || termKey;
	return input;
}

function findTaxonomyGroups(filterContainer: Element, taxValue: string) {
	return Array.from(
		filterContainer.querySelectorAll(".wp-block-itmar-design-group"),
	).filter(
		(group) =>
			group.classList.contains("itmar_filterItem_group") &&
			group.classList.contains(taxValue),
	);
}

// taxArray に存在しない checkbox を削除（元コードの意図を踏襲）
function pruneInvalidCheckboxes(filterContainer: Element, taxArray) {
	const taxValues = taxArray.map((tax) => tax.value);
	const staticFilterValues = ["search", "date"];

	Array.from(
		filterContainer.querySelectorAll(".wp-block-itmar-design-group"),
	).forEach((group) => {
		if (!group.classList.contains("itmar_filterItem_group")) return;

		const isCurrentTaxGroup = taxValues.some((value) =>
			group.classList.contains(value),
		);
		const isStaticFilterGroup = staticFilterValues.some((value) =>
			group.classList.contains(value),
		);

		if (!isCurrentTaxGroup && !isStaticFilterGroup) group.remove();
	});

	taxArray.forEach((tax) => {
		const taxGroups = findTaxonomyGroups(filterContainer, tax.value);
		const taxGroup = taxGroups[0];
		if (!taxGroup) return;

		taxGroups.slice(1).forEach((group) => group.remove());

		const termKeys = (tax.terms || []).map((term) =>
			String(term.slug || term.id),
		);
		const termLabelMap = new Map();
		(tax.terms || []).forEach((term) => {
			const key = String(term.slug || term.id);
			const label = String(term.name || key);
			termLabelMap.set(key, label);
		});

		const checkboxes = taxGroup.querySelectorAll(
			'.itmar_filter_checkbox input[type="checkbox"]',
		);
		const renderedSet = new Set();
		let template: Element | null = null;

		Array.from(checkboxes as NodeListOf<HTMLInputElement>).forEach(
			(checkbox) => {
				const checkboxName = checkbox.getAttribute("name");
				const blockElement = checkbox.closest(".itmar_filter_checkbox")
					?.parentElement;

				if (blockElement && !template) {
					template = blockElement.cloneNode(true) as Element;
				}

				if (!checkboxName || !termKeys.includes(checkboxName)) {
					removeCheckboxBlock(checkbox);
					return;
				}

				renderedSet.add(String(checkboxName));
			},
		);

		if (!template) return;

		const frag = document.createDocumentFragment();
		for (const termKey of termKeys) {
			if (renderedSet.has(termKey)) continue;

			const clone = template.cloneNode(true) as Element;
			const input = updateCheckboxLabel(clone, termKey, termLabelMap);
			if (!input) continue;

			frag.appendChild(clone);
			frag.appendChild(document.createElement("div"));
			renderedSet.add(termKey);
		}

		taxGroup.appendChild(frag);
	});
}

//タームチェックによるフィルタ実行関数
function initTermCheckboxes(filterRoot, pickupId) {
	// filterRoot が実際に checkbox を持つコンテナ（あなたの元コードの filterContainer 相当）
	const filterContainer = filterRoot; // 必要なら filterRoot.querySelector(...) に変えてOK

	// 1回だけ初期化するためのフラグ
	let initialized = false;

	subscribe(pickupId, (ctx) => {
		if (initialized) return;

		const selectedSlug = ctx.dataset?.selected_slug; // pickup が register したら入る

		if (!selectedSlug) return;

		// taxArray を ctx.cache に保存して使い回す
		if (ctx.cache?.taxonomies) {
			const taxArray = ctx.cache.taxonomies;
			setupUI(taxArray);
			initialized = true;
			return;
		}

		(async () => {
			let taxArray = null;
			try {
				if (selectedSlug != "product_category") {
					//WordPressタクソノミーの取得
					const data = await restTaxonomies(selectedSlug);

					taxArray = data.map((res) => ({
						value: res.slug,
						label: res.name,
						terms: res.terms,
					}));
				} else if (selectedSlug === "product_category") {
					//Shopify商品カテゴリの取得
					const data = await apiFetch({
						path: "/itmar-ec-relate/v1/get-collections",
					});

					// data が配列じゃないケースも潰す
					const arr = Array.isArray(data) ? data : [];
					const catArray = arr.map((res) => ({
						id: res.id,
						count: res.count,
						name: res.fullName,
					}));
					taxArray = [
						{
							value: selectedSlug,
							label: "Product Categories",
							terms: catArray,
						},
					];
				}
				ctx.cache.taxonomies = taxArray;
				if (taxArray) setupUI(taxArray);
				initialized = true;
			} catch (e) {
				// 失敗時のハンドリング（必要なら）
				console.error(e);
			}
		})();
	});

	function setupUI(taxArray) {
		// ① 不要 checkbox を削除
		pruneInvalidCheckboxes(filterContainer, taxArray);

		// ② URL の terms があるなら checked を復元
		const termParamObj = readTermsParamFromUrl();
		if (termParamObj) {
			const termQueryObj = paramToObject(termParamObj, taxArray);

			const checkboxes = filterContainer.querySelectorAll(
				'.itmar_filter_checkbox input[type="checkbox"]',
			);

			Array.from(checkboxes as NodeListOf<HTMLInputElement>).forEach(
				(checkbox) => {
					const checkboxName = checkbox.getAttribute("name"); // slug
					const taxonomy = getTaxonomyFromCheckbox(checkbox, taxArray);
					if (!taxonomy) return;

					const match = termQueryObj.some(
						(item) =>
							item.taxonomy === taxonomy && item.term.slug === checkboxName,
					);
					checkbox.checked = match;
				},
			);

			// store にも入れておく（pickupChange 側でも使える）
			setState(pickupId, {
				termParamObj, // URL由来
				termQueryObj, // 表示/crumbs向け
				page: 0,
			});
		}

		// ③ 変更イベント：チェック変更 → store 更新（termParamObj は無効化）
		const checkboxes = filterContainer.querySelectorAll(
			'.itmar_filter_checkbox input[type="checkbox"]',
		);

		Array.from(checkboxes as NodeListOf<HTMLInputElement>).forEach(
			(checkbox) => {
				checkbox.addEventListener("change", () => {
					const termQueryObj = buildTermQueryObj(filterContainer, taxArray);

					setState(pickupId, {
						termQueryObj,
						termParamObj: null, // ★ユーザー操作でURL由来を解除
						page: 0, // ★1ページ目に戻す
					});
				});
			},
		);
	}
}

//キーワード入力によるフィルタ実行関数
function initKeywordSearch(filterRoot, pickupId) {
	// ルート内から検索ボタンを拾う（document.querySelector ではなく filterRoot.querySelector 推奨）
	const searchButton = filterRoot.querySelector(
		".itmar_filter_searchbutton button",
	);

	if (!searchButton) return;

	const findInputElement = (btnEl) => {
		const buttonBlock = btnEl.closest(".wp-block-itmar-design-button");

		if (!buttonBlock?.parentElement) return null;

		const siblings = [...buttonBlock.parentElement.children].filter(
			(el) => el !== buttonBlock,
		);

		for (const sibling of siblings) {
			const searchBox = sibling.matches(".itmar_filter_searchbox")
				? sibling
				: sibling.querySelector(".itmar_filter_searchbox");

			const input = searchBox?.querySelector('input[type="text"]');
			if (input) return input;
		}

		return null;
	};

	const applyKeyword = () => {
		const inputElement = findInputElement(searchButton);

		if (!inputElement) return;

		const value = inputElement.value || "";

		setState(pickupId, {
			searchKeyWord: value,
			page: 0, // 検索は1ページ目に戻す
			termParamObj: null, // URL由来termsを解除（ユーザー操作優先）
		});
	};

	searchButton.addEventListener("click", (e) => {
		e.preventDefault();
		applyKeyword();
	});

	// 任意：Enterでも発火させたい場合（検索boxを拾える場合だけ）
	const input = findInputElement(searchButton);
	if (input) {
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				applyKeyword();
			}
		});
	}
}

//期間入力によるフィルタ実行関数

function initPeriodFilter(filterRoot, pickupId) {
	const dateContainer = filterRoot.querySelector(
		".itmar_filter_month, .itmar_filter_year, .itmar_filter_day",
	);
	if (!dateContainer) return;

	const name = dateContainer.getAttribute("data-input_name");
	if (!name) return;

	const getCheckedRadio = () =>
		dateContainer.querySelector(`input[type="radio"][name="${name}"]:checked`);

	// ✅ periodDisp を DOM から生成（あなたの元コードの移植）
	const buildPeriodDispFromDom = () => {
		const checkedRadio = getCheckedRadio();
		if (!checkedRadio) return "";

		// カレンダー(day)は select がある
		const select = dateContainer.querySelector(".itmar_block_select select");
		if (select) {
			const selectedValue = select.options[select.selectedIndex]?.value || "";
			const day = String(checkedRadio.value).padStart(2, "0");
			return selectedValue ? `${selectedValue}/${day}` : `/${day}`;
		}

		// month/year は radio.value が periodDisp
		return checkedRadio.value || "";
	};

	const applyPeriodFromDom = () => {
		const periodDisp = buildPeriodDispFromDom();
		const periodQueryObj = periodDisp ? { ...getPeriodQuery(periodDisp) } : {};

		setState(pickupId, {
			periodDisp,
			periodQueryObj,
			page: 0,
			termParamObj: null,
		});
	};

	//dateContainer 1箇所に change を付ける
	dateContainer.addEventListener("change", (e) => {
		const t = e.target;

		// 月select or 日radio or 年/月radio のどれが変わってもここに来る
		if (
			t.matches(".itmar_block_select select") ||
			t.matches(`input[type="radio"][name="${name}"]`)
		) {
			applyPeriodFromDom();
		}
	});
}

function resetFilterUiAndStore(filterRoot, pickupId) {
	// ✅ UIをクリア
	// checkbox（あなたのDOMに合わせたセレクタ）
	filterRoot
		.querySelectorAll('.itmar_filter_checkbox input[type="checkbox"]')
		.forEach((cb) => {
			cb.checked = false;
		});

	// keyword（検索ボックス系を一括クリア）
	filterRoot
		.querySelectorAll('.itmar_filter_searchbox input[type="text"]')
		.forEach((inp) => {
			inp.value = "";
		});

	// period（radioを全部OFF）
	filterRoot
		.querySelectorAll(
			'.itmar_filter_month input[type="radio"], .itmar_filter_year input[type="radio"], .itmar_filter_day input[type="radio"]',
		)
		.forEach((r) => {
			r.checked = false;
			r.defaultChecked = false;
		});

	// dayカレンダーのselectは「月が変わるだけ」ならフィルタにならないので触らなくてOK
	// （checkedRadioが無い限り periodDisp は "" になります）

	// ✅ storeをフィルタ無しにリセット
	setState(pickupId, {
		page: 0,
		searchKeyWord: "",
		periodDisp: "",
		periodQueryObj: {},
		termParamObj: null,
		termQueryObj: [],
	});
}

document.addEventListener("DOMContentLoaded", () => {
	document
		.querySelectorAll(".wp-block-itmar-post-filter")
		.forEach((filterRoot) => {
			const pickupId = filterRoot.dataset.selected_id;
			if (!pickupId) return;

			ensureCtx(pickupId);

			// ✅ リロード時は必ず UI + store をクリア
			if (window.__itmar_force_reset_filters__) {
				resetFilterUiAndStore(filterRoot, pickupId);
			}

			// タームcheckbox初期化
			initTermCheckboxes(filterRoot, pickupId);

			// キーワード初期化
			initKeywordSearch(filterRoot, pickupId);

			// 期間による初期化
			initPeriodFilter(filterRoot, pickupId);
		});
});
