import {
	getPeriodQuery,
	registerPickup,
	subscribe,
	setState,
} from "itmar-block-packages";
import { pickupChange } from "../../front-common";

// 「同じ state で二重に pickupChange しない」ためのガード
const lastRunKey = new Map();

function parseUrlToInitialState() {
	if (window.__itmar_force_reset_filters__) {
		return {
			page: 0,
			searchKeyWord: "",
			periodDisp: "",
			periodQueryObj: {},
			termParamObj: null,
			termQueryObj: [],
		};
	}
	const params = new URLSearchParams(window.location.search);

	// 現状の実装は URL が二重エンコードされやすいので decodeURIComponent を残す
	const keyWordRaw = params.get("keyWord");
	const periodRaw = params.get("period");
	const termsRaw = params.get("terms");

	const searchKeyWord = keyWordRaw ? decodeURIComponent(keyWordRaw) : "";
	const periodDisp = periodRaw ? decodeURIComponent(periodRaw) : "";
	const periodQueryObj = periodDisp ? { ...getPeriodQuery(periodDisp) } : {};

	let termParamObj = null;
	if (termsRaw) {
		try {
			termParamObj = JSON.parse(decodeURIComponent(termsRaw));
		} catch (e) {
			console.warn("Invalid terms param:", e);
			termParamObj = null;
		}
	}

	return {
		// pickupChange に渡す想定のキー名に寄せる
		searchKeyWord,
		periodDisp,
		periodQueryObj,
		termParamObj,

		// checkbox 側（Filter 書き換え時に使う）
		termQueryObj: [],
		page: 0,
	};
}

function prepareSwiperHideWrapper(pickupEl: HTMLElement) {
	// 既存コードの「swiper-slide を hide-wrapper で包む処理」をそのまま関数化
	const parentElement = pickupEl.parentElement;
	if (!parentElement) return;

	const swiperSlides = Array.from(parentElement.children).filter(
		(child) => child !== pickupEl && child.classList.contains("swiper-slide"),
	) as Element[];

	swiperSlides.forEach((slide) => {
		const wrapper = document.createElement("div");
		wrapper.className = "hide-wrapper";

		while (slide.firstChild) {
			wrapper.appendChild(slide.firstChild);
		}
		slide.appendChild(wrapper);
	});
}

document.addEventListener("DOMContentLoaded", () => {
	const initial = parseUrlToInitialState();

	const pickups = document.querySelectorAll<HTMLElement>(
		".wp-block-itmar-pickup-posts",
	);
	pickups.forEach((pickupEl) => {
		const ctx = registerPickup(pickupEl);
		if (!ctx) return;

		const fillFlg =
			pickupEl.parentElement?.classList.contains("swiper-wrapper");

		// swiper のときだけ、初回に隠しラップ
		if (fillFlg) prepareSwiperHideWrapper(pickupEl);

		// ✅ 初期 state を store に投入
		setState(ctx.id, initial);

		// ✅ state 変更を購読して pickupChange を実行
		subscribe(ctx.id, (ctxNow) => {
			const s = ctxNow.state;

			// pickupChange に渡す queryState
			const queryState = {
				termQueryObj: s.termQueryObj ?? [],
				termParamObj: s.termParamObj ?? null,
				periodDisp: s.periodDisp ?? "",
				periodQueryObj: s.periodQueryObj ?? {},
				searchKeyWord: s.searchKeyWord ?? "",
			};

			// 「必要な state が変わった時だけ」再実行（posts/total 更新では再実行しない）
			const runKey = JSON.stringify({
				page: s.page ?? 0,
				searchKeyWord: queryState.searchKeyWord,
				periodDisp: queryState.periodDisp,
				termParamObj: queryState.termParamObj,
				termQueryObj: queryState.termQueryObj,
			});

			if (lastRunKey.get(ctxNow.id) === runKey) return;
			lastRunKey.set(ctxNow.id, runKey);

			const p = pickupChange(pickupEl, !!fillFlg, s.page ?? 0, queryState);

			if (p && typeof p.then === "function") {
				p.then((res) => {
					if (!res) return;

					setState(ctxNow.id, {
						total: res.total ?? 0,
						posts: res.posts ?? [],
						rawPosts: res.rawPosts ?? null, // ★追加
						targetIndex:
							typeof res.targetIndex === "number" ? res.targetIndex : -1, // ★追加
					});
				});
			}
		});
	});
});
