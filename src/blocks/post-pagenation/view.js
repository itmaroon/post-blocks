import { createRoot } from "react-dom/client";

// ★ここはあなたの既存 import に合わせてください
import { StyleComp as StyleGroup } from "../../../../block-collections/src/blocks/design-group/StyleGroup";
import { StyleComp as StyleButton } from "../../../../block-collections/src/blocks/design-button/StyleButton";

// ★pickupStore のパスはあなたの配置に合わせてください
import { ensureCtx, subscribe, setState } from "itmar-block-packages";

const roots = new Map();
const getRoot = (el) => {
	if (!roots.has(el)) roots.set(el, createRoot(el));
	return roots.get(el);
};

const parseJson = (s, fallback = {}) => {
	try {
		return s ? JSON.parse(s) : fallback;
	} catch {
		return fallback;
	}
};

function buildPageList(totalPages, currentPage, dispItems) {
	const N = totalPages;
	if (N <= 1) return [];

	const max = Math.max(3, parseInt(dispItems || 3, 10));
	if (N <= max) return [...Array(N)].map((_, i) => i);

	const middleCount = max - 2;
	let start = currentPage - Math.floor((middleCount - 1) / 2);
	let end = start + middleCount - 1;

	if (start < 1) {
		start = 1;
		end = start + middleCount - 1;
	}
	if (end > N - 2) {
		end = N - 2;
		start = end - middleCount + 1;
	}

	const pages = [0];
	if (start > 1) pages.push("…");
	for (let p = start; p <= end; p++) pages.push(p);
	if (end < N - 2) pages.push("…");
	pages.push(N - 1);
	return pages;
}

document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll('[id^="page_"]').forEach((pageRoot) => {
		const pickupId = pageRoot.id.replace(/^page_/, "");
		const root = getRoot(pageRoot);

		// save.js と一致する data 属性
		const pageType = pageRoot.dataset.page_type || "pagenation";
		const dispItems = parseInt(pageRoot.dataset.disp_items || "3", 10);
		const isArrow = String(pageRoot.dataset.is_arrow) === "true";

		const groupAttrAll = parseJson(pageRoot.dataset.group_attributes, {});
		const numAttr = parseJson(pageRoot.dataset.num_attributes, {});
		const dummyAttr = parseJson(pageRoot.dataset.dummy_attributes, {});
		const fwAttr = parseJson(pageRoot.dataset.forward_attributes, {});
		const bkAttr = parseJson(pageRoot.dataset.back_attributes, {});

		const { block_style: group_style, ...groupAttrs } = groupAttrAll;

		// ★ここで ctx を必ず生成しておく
		ensureCtx(pickupId);

		subscribe(pickupId, (ctx) => {
			const state = ctx.state || {};
			const dataset = ctx.dataset || {};
			// pickup 側から total が入るまでは描画できないのでガード
			const total = parseInt(state.total || 0, 10);
			const currentPage = parseInt(state.page || 0, 10);
			const numberOfItems = parseInt(dataset.number_of_items || "0", 10);

			// ---- 通常ページネーション ----
			if (pageType === "pagenation") {
				const totalPages =
					numberOfItems > 0 ? Math.ceil(total / numberOfItems) : 0;

				if (totalPages <= 1) {
					root.render(
						<StyleGroup attributes={groupAttrs}>
							<div
								className="wp-block-itmar-design-group"
								style={group_style || null}
							>
								<div className="group_contents" />
							</div>
						</StyleGroup>,
					);
					return;
				}

				const pages = buildPageList(totalPages, currentPage, dispItems);

				root.render(
					<StyleGroup attributes={groupAttrs}>
						<div
							className="wp-block-itmar-design-group"
							style={group_style || null}
						>
							<div className="group_contents">
								{isArrow && (
									<StyleButton attributes={bkAttr}>
										<button
											type="button"
											onClick={() =>
												currentPage > 0 &&
												setState(pickupId, { page: currentPage - 1 })
											}
											disabled={currentPage <= 0}
										>
											<div />
										</button>
									</StyleButton>
								)}

								{pages.map((p, idx) => {
									if (p === "…") {
										return (
											<StyleButton key={`d-${idx}`} attributes={dummyAttr}>
												<button type="button" disabled>
													<div>…</div>
												</button>
											</StyleButton>
										);
									}

									const isCurrent = p === currentPage;
									return (
										<StyleButton key={`p-${p}`} attributes={numAttr}>
											<button
												type="button"
												onClick={() => setState(pickupId, { page: p })}
												disabled={isCurrent}
											>
												<div>{p + 1}</div>
											</button>
										</StyleButton>
									);
								})}

								{isArrow && (
									<StyleButton attributes={fwAttr}>
										<button
											type="button"
											onClick={() =>
												currentPage < totalPages - 1 &&
												setState(pickupId, { page: currentPage + 1 })
											}
											disabled={currentPage >= totalPages - 1}
										>
											<div />
										</button>
									</StyleButton>
								)}
							</div>
						</div>
					</StyleGroup>,
				);
			}

			// backFoward は次ステップ（state.rawPosts/targetIndex を入れてから）で実装が安全
		});
	});
});
