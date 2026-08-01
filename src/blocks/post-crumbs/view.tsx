import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { format, getSettings } from "@wordpress/date";

import {
	restTaxonomies,
	termToDispObj,
	ensureCtx,
	subscribe,
	styleDataApply,
} from "itmar-block-packages";
import {
	blockSupportStyleToReactStyle,
	buildBlockSupportClasses,
	mergeReactStyles,
	toReactStyle,
} from "../../front-common";
import { createGroupStyleCss } from "../../../../block-collections/src/blocks/design-group/StyleGroup";
import {
	createTitleInnerScope,
	createTitleStyleCss,
} from "../../../../block-collections/src/blocks/design-title/StyleWapper";

const createTitleFrontendCss = (attributes, rootScope) =>
	createTitleStyleCss(attributes, {
		root: rootScope,
		inner: createTitleInnerScope(rootScope),
	});

styleDataApply(createGroupStyleCss, ".itmar-query-crumbs-group", {
	selector: ".itmar-wrap",
	target: "outer",
	classPrefix: "itmar-query-crumbs-group-style-",
	observe: true,
});

styleDataApply(createTitleFrontendCss, ".itmar-query-crumbs-title", {
	target: "self",
	classPrefix: "itmar-query-crumbs-title-style-",
	observe: true,
});

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

// front-common の paramToObject と同等（termParamObj を termQueryObj に変換）
function paramToObject(prm, taxArray) {
	return Object.entries(prm)
		.filter(([key]) => key !== "tax_relation")
		.flatMap(([key, value]) => {
			const values =
				typeof value === "string" ? value.split(",").map(Number) : [value];
			return values.flatMap((val) =>
				taxArray.flatMap((item) =>
					item.terms
						.filter((term) => term.id === val)
						.map((term) => ({
							taxonomy: item.value,
							term: { id: term.id, slug: term.slug, name: term.name },
						})),
				),
			);
		});
}

function renderRichText(richText, titleType, dateFormat, headingType) {
	const disp =
		titleType === "date"
			? format(dateFormat, richText, getSettings())
			: richText;
	const HeadingTag = String(headingType || "h4").toLowerCase();

	return createElement(HeadingTag, null, disp);
}

document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll('[id^="crumbs_"]').forEach((crumbsRoot) => {
		const pickupId = crumbsRoot.id.replace(/^crumbs_/, "");
		ensureCtx(pickupId);

		const root = getRoot(crumbsRoot);

		// save.js に合わせて data を読む
		const groupAll = parseJson(crumbsRoot.dataset.group_attributes, {});
		const crumbAll = parseJson(crumbsRoot.dataset.crumb_attributes, {});

		const { block_style: group_style, ...groupAttr } = groupAll;
		const { block_style: title_style, ...crumbAttr } = crumbAll;
		const groupStyle = mergeReactStyles(
			blockSupportStyleToReactStyle(groupAttr),
			toReactStyle(group_style),
		);
		const groupClassName = buildBlockSupportClasses(groupAttr);
		const titleStyle = mergeReactStyles(
			blockSupportStyleToReactStyle(crumbAttr),
			toReactStyle(title_style),
		);
		const titleClassName = buildBlockSupportClasses(crumbAttr);

		const { titleType, dateFormat, headingType } = crumbAll;

		// タクソノミー情報キャッシュ（termParamObj がある時だけ必要）
		let taxArray = null;
		let taxPromise = null;
		let latestCtx = null;

		const tryRender = () => {
			if (!latestCtx) return;

			const ctx = latestCtx;
			const state = ctx.state || {};
			const dataset = ctx.dataset || {};

			// stateキーは移行途中でも動くようにフォールバック
			const keyword = state.searchKeyWord ?? state.keyword ?? "";
			const periodDisp = state.periodDisp ?? state.period ?? "";
			const termParamObj = state.termParamObj ?? state.terms ?? null;
			const termQueryObjFromState = state.termQueryObj ?? [];

			const pickupType = dataset.pickup_type; // "single" / "multi"
			const taxRelateType = dataset.tax_relate_type || "AND";
			const posts = state.posts || [];

			// termQueryObj を確定（state優先 / なければ URL param から復元）
			let termQueryObj = Array.isArray(termQueryObjFromState)
				? termQueryObjFromState
				: [];

			if (termQueryObj.length === 0 && termParamObj) {
				// termParamObj から復元するには taxArray が必要
				if (!taxArray) {
					const pickupSlug = dataset.selected_slug; // post-pickup 由来
					if (pickupSlug && !taxPromise) {
						taxPromise = restTaxonomies(pickupSlug).then((response) => {
							taxArray = response.map((res) => ({
								value: res.slug,
								label: res.name,
								terms: res.terms,
							}));
							tryRender(); // tax取得後に再描画
						});
					}
					// taxArrayが無い間はいったん term 表示なしで描画する（落ちないのが大事）
				} else {
					termQueryObj = paramToObject(termParamObj, taxArray);
				}
			}

			// 表示配列を組む
			const crumbArray = [];
			crumbArray.push(crumbsRoot.dataset.post_name || "");

			if (keyword) crumbArray.push(`"${keyword}"`);
			if (periodDisp) crumbArray.push(periodDisp);

			if (termQueryObj.length > 0) {
				const dispObj = termToDispObj(termQueryObj, " || ");
				const dispString = Object.values(dispObj).join(` ${taxRelateType} `);
				crumbArray.push(dispString);
			}

			if (pickupType === "single" && posts[0]?.title?.rendered) {
				crumbArray.push(posts[0].title.rendered);
			}

			root.render(
				<div className="itmar-wrap">
					<div
						className={`wp-block-itmar-design-group itmar-query-crumbs-group ${groupClassName}`}
						data-attributes={JSON.stringify(groupAttr)}
						style={groupStyle}
					>
						<div className="group_contents">
							{crumbArray
								.filter((v) => typeof v === "string" && v.trim() !== "")
								.map((crumb, i) => (
									<div
										key={i}
										className={`wp-block-itmar-design-title itmar-query-crumbs-title ${titleClassName}`}
										data-attributes={JSON.stringify({
											...crumbAttr,
											block_style: title_style,
										})}
										data-title_type={titleType}
										data-user_format={dateFormat}
										style={titleStyle}
									>
										<div className="itmar-wrap">
											{renderRichText(
												crumb,
												titleType,
												dateFormat,
												headingType,
											)}
										</div>
									</div>
								))}
						</div>
					</div>
				</div>,
			);
		};

		subscribe(pickupId, (ctx) => {
			latestCtx = ctx;
			tryRender();
		});
	});
});
