import { createElement } from "react";
import { createRoot } from "react-dom/client";

import { createButtonStyleCss } from "../../../../block-collections/src/blocks/design-button/StyleButton";
import { createGroupStyleCss } from "../../../../block-collections/src/blocks/design-group/StyleGroup";
import {
	createTitleInnerScope,
	createTitleStyleCss,
} from "../../../../block-collections/src/blocks/design-title/StyleWapper";

// ★pickupStore のパスはあなたの配置に合わせてください
import {
	ensureCtx,
	setState,
	styleDataApply,
	subscribe,
} from "itmar-block-packages";
import {
	blockSupportStyleToReactStyle,
	buildBlockSupportClasses,
	mergeReactStyles,
	toReactStyle,
} from "../../front-common";

const createTitleFrontendCss = (attributes, rootScope) =>
	createTitleStyleCss(attributes, {
		root: rootScope,
		inner: createTitleInnerScope(rootScope),
	});

styleDataApply(createGroupStyleCss, ".itmar-query-pagination-group", {
	selector: ".itmar-wrap",
	target: "outer",
	classPrefix: "itmar-query-pagination-group-style-",
	observe: true,
});

styleDataApply(createButtonStyleCss, ".itmar-query-pagination-button", {
	target: "self",
	classPrefix: "itmar-query-pagination-button-style-",
	observe: true,
});

styleDataApply(createTitleFrontendCss, ".itmar-query-pagination-title", {
	target: "self",
	classPrefix: "itmar-query-pagination-title-style-",
	observe: true,
});

const roots = new Map<Element, ReturnType<typeof createRoot>>();
const getRoot = (el: Element) => {
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

const DesignGroup = ({ attributes, children = null }) => {
	const { block_style: blockStyle, ...groupAttributes } = attributes;
	const groupStyle = mergeReactStyles(
		blockSupportStyleToReactStyle(groupAttributes),
		toReactStyle(blockStyle),
	);
	const groupClassName = buildBlockSupportClasses(groupAttributes);

	return (
		<div className="itmar-wrap">
			<div
				className={`wp-block-itmar-design-group itmar-query-pagination-group ${groupClassName}`}
				data-attributes={JSON.stringify(groupAttributes)}
				style={groupStyle}
			>
				<div className="group_contents">{children}</div>
			</div>
		</div>
	);
};

const DesignButton = ({ attributes, children = null }: any) => (
	<div
		className="itmar-query-pagination-button"
		data-attributes={JSON.stringify(attributes)}
	>
		{children}
	</div>
);

const AdjacentPostLink = ({ post, attributes }) => {
	if (!post?.link) return null;

	const { block_style: blockStyle, ...titleAttributes } = attributes;
	const titleStyle = mergeReactStyles(
		blockSupportStyleToReactStyle(titleAttributes),
		toReactStyle(blockStyle),
	);
	const titleClassName = buildBlockSupportClasses(titleAttributes);
	const headingType = String(titleAttributes.headingType || "H3").toLowerCase();
	const headingContent = String(titleAttributes.headingContent || "");
	const isBlank = Boolean(titleAttributes.isBlank);

	return (
		<div
			className={`wp-block-itmar-design-title itmar-query-pagination-title ${titleClassName}`}
			data-attributes={JSON.stringify({
				...titleAttributes,
				block_style: blockStyle,
			})}
			data-title_type={titleAttributes.titleType || "plaine"}
			data-user_format={titleAttributes.userFormat || ""}
			data-free_format={titleAttributes.freeStrFormat || "%s"}
			data-decimal={titleAttributes.decimal || 0}
			data-unique_id={titleAttributes.uniqueID || ""}
			style={titleStyle}
		>
			<a
				href={post.link}
				target={isBlank ? "_blank" : undefined}
				rel={isBlank ? "noopener noreferrer" : undefined}
			>
				<div className="itmar-wrap">
					{createElement(headingType, {
						dangerouslySetInnerHTML: { __html: headingContent },
					})}
				</div>
			</a>
		</div>
	);
};

function buildPageList(totalPages, currentPage, dispItems): Array<number | string> {
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

	const pages: Array<number | string> = [0];
	if (start > 1) pages.push("…");
	for (let p = start; p <= end; p++) pages.push(p);
	if (end < N - 2) pages.push("…");
	pages.push(N - 1);
	return pages;
}

document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll<HTMLElement>('[id^="page_"]').forEach((pageRoot) => {
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
		const fwTitleAttr = parseJson(pageRoot.dataset.fw_title_attributes, {});
		const bkTitleAttr = parseJson(pageRoot.dataset.bk_title_attributes, {});

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
					root.render(<DesignGroup attributes={groupAttrAll} />);
					return;
				}

				const pages = buildPageList(totalPages, currentPage, dispItems);

				root.render(
					<DesignGroup attributes={groupAttrAll}>
						{isArrow && (
							<DesignButton attributes={bkAttr}>
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
							</DesignButton>
						)}

						{pages.map((p, idx) => {
							if (p === "…") {
								return (
									<DesignButton key={`d-${idx}`} attributes={dummyAttr}>
										<button type="button" disabled>
											<div>…</div>
										</button>
									</DesignButton>
								);
							}

							const pageNumber = Number(p);
							const isCurrent = pageNumber === currentPage;
							return (
								<DesignButton key={`p-${p}`} attributes={numAttr}>
									<button
										type="button"
										onClick={() => setState(pickupId, { page: pageNumber })}
										disabled={isCurrent}
									>
										<div>{pageNumber + 1}</div>
									</button>
								</DesignButton>
							);
						})}

						{isArrow && (
							<DesignButton attributes={fwAttr}>
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
							</DesignButton>
						)}
					</DesignGroup>,
				);
			}

			// ---- 個別投稿の前後ナビゲーション ----
			if (pageType === "backFoward") {
				const rawPosts = Array.isArray(state.rawPosts) ? state.rawPosts : [];
				const targetIndex = Number.isInteger(state.targetIndex)
					? state.targetIndex
					: parseInt(state.targetIndex || "-1", 10);
				const previousPost = targetIndex > 0 ? rawPosts[targetIndex - 1] : null;
				const nextPost =
					targetIndex >= 0 && targetIndex < rawPosts.length - 1
						? rawPosts[targetIndex + 1]
						: null;

				root.render(
					<DesignGroup attributes={groupAttrAll}>
						{previousPost && (
							<AdjacentPostLink
								post={previousPost}
								attributes={bkTitleAttr}
							/>
						)}
						{nextPost && (
							<AdjacentPostLink
								post={nextPost}
								attributes={fwTitleAttr}
							/>
						)}
					</DesignGroup>,
				);
			}
		});
	});
});
