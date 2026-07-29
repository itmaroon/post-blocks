import { __ } from "@wordpress/i18n";
import "./editor.scss";

import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from "@wordpress/block-editor";
import {
	PanelBody,
	PanelRow,
	ToggleControl,
	SelectControl,
	RangeControl,
	RadioControl,
} from "@wordpress/components";

import { useEffect, useState, useCallback } from "@wordpress/element";
import { useSelect, useDispatch } from "@wordpress/data";
import { createBlock } from "@wordpress/blocks";

import {
	useIsIframeMobile,
	useBlockAttributeChanges,
} from "itmar-block-packages";

//スペースのリセットバリュー
const padding_resetValues = {
	top: "10px",
	left: "10px",
	right: "10px",
	bottom: "10px",
};

//ボーダーのリセットバリュー
const border_resetValues = {
	top: "0px",
	left: "0px",
	right: "0px",
	bottom: "0px",
};

const units = [
	{ value: "px", label: "px" },
	{ value: "em", label: "em" },
	{ value: "rem", label: "rem" },
];

//ネストしたブロックを平坦化
const flattenBlocks = (blocks) => {
	return blocks.reduce((acc, block) => {
		acc.push(block);
		if (block.innerBlocks && block.innerBlocks.length > 0) {
			acc.push(...flattenBlocks(block.innerBlocks));
		}
		return acc;
	}, []);
};

export default function Edit({ attributes, setAttributes, clientId }) {
	const {
		pageType,
		selectedBlockId,
		//currentPage,
		dispOfItems,
		isArrowButton,
		groupBlockAttributes,
		numBlockAttributes,
		dummyBlockAttributes,
		forwardBlockAttributes,
		backBlockAttributes,
		forwardTitleAttributes,
		backTitleAttributes,
	} = attributes;

	// dispatch関数を取得
	const { replaceInnerBlocks } = useDispatch("core/block-editor");

	//インナーブロックのひな型を用意
	const TEMPLATE = [];
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: ["itmar/design-group", "itmar/design-button"],
		template: TEMPLATE,
		templateLock: false,
	});

	//エディタ内ブロックの取得
	const { targetBlocks, innerBlocks } = useSelect(
		(select) => ({
			targetBlocks: select("core/block-editor").getBlocks(),
			innerBlocks: select("core/block-editor").getBlocks(clientId),
		}),
		[selectedBlockId],
	);

	//エディタ内のブロックが変化したときpickupを更新
	const [pickupPosts, setPickupPosts] = useState([]);

	useEffect(() => {
		//エディタ内ブロックを平坦化
		const allFlattenedBlocks = flattenBlocks(targetBlocks);
		//エディタ内ブロックからitmar/post-pickupを探索
		setPickupPosts(
			allFlattenedBlocks.filter(
				(block) =>
					block.name === "itmar/pickup-posts" ||
					block.name === "itmar/product-block",
			),
		);
	}, [targetBlocks]);

	//表示数と投稿数を取得したらインナーブロックにdesign-buttonを詰め込む
	useEffect(() => {
		//トータルのページ数を8にカレントページを3に固定
		const totalPages = dispOfItems + 2;
		const currentPage = Math.floor(totalPages / 2) + 1;

		//ブロックの配列
		const innerBlocksArray = [];
		//表示タイプがページネーション
		if (pageType === "pagenation") {
			//デフォルトの共通ボタン形状
			const commonDefStyle = {
				default_pos: {
					width: "3em",
					height: "3em",
					margin_value: {
						top: "10px",
						left: "10px",
						bottom: "10px",
						right: "10px",
					},
					padding_value: {
						top: "10px",
						left: "10px",
						bottom: "10px",
						right: "10px",
					},
				},
				mobile_pos: {
					width: "2em",
					height: "2em",
					margin_value: {
						top: "10px",
						left: "0",
						bottom: "10px",
						right: "0",
					},
					padding_value: {
						top: "10px",
						left: "10px",
						bottom: "10px",
						right: "10px",
					},
				},
				radius_value: {
					value: "50%",
				},
			};

			// ここから本命ロジック：両端に数字、その内側にダミー＋数字群＋ダミー
			const addNumberButton = (page) => {
				const setNumAttributes = {
					className: "itmar_design_number_btn",
					align: "center",
					...commonDefStyle,
					disableButtonColor: "var(--wp--preset--color--placeholder)",
					...numBlockAttributes, // ユーザー設定を優先
					labelContent: String(page),
					disabled: page === currentPage,
				};
				innerBlocksArray.push(
					createBlock("itmar/design-button", setNumAttributes),
				);
			};

			const addDummyButton = () => {
				const setDummyAttributes = {
					className: "itmar_design_dummy_btn",
					labelContent: "...",
					align: "center",
					...commonDefStyle,
					disableButtonColor: "var(--wp--preset--color--background)",
					...dummyBlockAttributes, // ユーザー設定を優先
					disabled: true,
				};
				innerBlocksArray.push(
					createBlock("itmar/design-button", setDummyAttributes),
				);
			};

			// 中央の「数字ボタン」を何個置けるか？
			// 先頭(数字) + 2番目(ダミー) + 中央の数字たち + 最後から2番目(ダミー) + 最後(数字)
			// → 中央 = dispOfItems - 4 個
			const middlePagesCount = dispOfItems - 2;

			// currentPage をなるべく中央に寄せた連番を計算
			let startPage = currentPage - Math.floor(middlePagesCount / 2);
			let endPage = startPage + middlePagesCount - 1;

			// 先頭側に寄りすぎた場合補正（2〜 totalPages-1 の範囲に収める）
			if (startPage < 2) {
				startPage = 2;
				endPage = startPage + middlePagesCount - 1;
			}
			// 末尾側に寄りすぎた場合補正
			if (endPage > totalPages - 1) {
				endPage = totalPages - 1;
				startPage = endPage - middlePagesCount + 1;
				if (startPage < 2) startPage = 2;
			}

			// ① 最初のボタン（必ず番号）
			addNumberButton(1);

			// ② 最初の次のボタン（ダミー）
			addDummyButton();

			// ③ 中央の数字ボタンたち
			for (let page = startPage; page <= endPage; page++) {
				addNumberButton(page);
			}

			// ④ 最後の前のボタン（ダミー）
			addDummyButton();

			// ⑤ 最後のボタン（必ず番号）
			addNumberButton(totalPages);

			//矢印用ボタンを挿入
			if (isArrowButton) {
				const setPrevAttributes = {
					className: "itmar_design_prev_btn",
					displayType: "pseudo",
					pseudoInfo: { element: "Arrow", option: "right" },
					...commonDefStyle,
					...forwardBlockAttributes, //ユーザー設定が最優先
				};
				const forwardButton = createBlock(
					"itmar/design-button",
					setPrevAttributes,
				);
				const setBackAttributes = {
					className: "itmar_design_back_btn",
					displayType: "pseudo",
					pseudoInfo: { element: "Arrow", option: "left" },
					...commonDefStyle,
					...backBlockAttributes, //ユーザー設定が最優先
				};
				const backButton = createBlock(
					"itmar/design-button",
					setBackAttributes,
				);

				innerBlocksArray.push(forwardButton);
				innerBlocksArray.unshift(backButton);
			}
		} else if (pageType === "backFoward") {
			const commonDefStyle = {
				headingType: "H3",
			};
			const setPrevAttributes = {
				className: "itmar_design_prev_title",
				headingContent: __("Back", "query-blocks"),
				linkKind: "free",
				...commonDefStyle,
				...forwardTitleAttributes, //ユーザー設定が最優先
			};
			const forwardButton = createBlock(
				"itmar/design-title",
				setPrevAttributes,
			);
			const setBackAttributes = {
				className: "itmar_design_back_title",
				headingContent: __("Forward", "query-blocks"),
				linkKind: "free",
				...commonDefStyle,
				...backTitleAttributes, //ユーザー設定が最優先
			};

			const backButton = createBlock("itmar/design-title", setBackAttributes);

			innerBlocksArray.push(forwardButton);
			innerBlocksArray.unshift(backButton);
		}
		//Design Groupに入れてレンダリング
		//const groupBlockAttr = innerBlocks[0] ? innerBlocks[0].attributes : {};
		const pagenationBlock = createBlock(
			"itmar/design-group",
			groupBlockAttributes, //既にグループがある場合はその属性を引き継ぐ
			innerBlocksArray,
		);
		//インナーブロックを配置
		const newInnerBlocks = [pagenationBlock];
		replaceInnerBlocks(clientId, newInnerBlocks, false);
	}, [pageType, dispOfItems, isArrowButton]);

	//他のブロックに属性の変更を適用
	useBlockAttributeChanges(
		clientId,
		"itmar/design-button",
		"itmar_design_number_btn",
		true,
		{ labelContent: "", disabled: false },
	);
	useBlockAttributeChanges(
		clientId,
		"itmar/design-button",
		"itmar_design_dummy_btn",
		true,
		{ labelContent: "", disabled: false },
	);

	useEffect(() => {
		if (innerBlocks[0] && innerBlocks[0].innerBlocks.length > 0) {
			//グループブロックの属性を記録

			setAttributes({ groupBlockAttributes: innerBlocks[0].attributes });
			//ボタン属性を記録
			innerBlocks[0].innerBlocks.forEach((block, index) => {
				//ブロックの属性を記録
				const buttonBlockAttributes = block.attributes.className.includes(
					"itmar_design_number_btn",
				)
					? { numBlockAttributes: block.attributes }
					: block.attributes.className.includes("itmar_design_dummy_btn")
					? { dummyBlockAttributes: block.attributes }
					: block.attributes.className.includes("itmar_design_prev_btn")
					? { forwardBlockAttributes: block.attributes }
					: block.attributes.className.includes("itmar_design_back_btn")
					? { backBlockAttributes: block.attributes }
					: block.attributes.className.includes("itmar_design_prev_title")
					? { forwardTitleAttributes: block.attributes }
					: block.attributes.className.includes("itmar_design_back_title")
					? { backTitleAttributes: block.attributes }
					: {};

				setAttributes(buttonBlockAttributes);
			});
		}
	}, [innerBlocks[0], innerBlocks[0]?.innerBlocks]);

	return (
		<>
			<InspectorControls group="settings">
				<div className="itmar_title_type">
					<SelectControl
						label={__("Select Pickup Posts Block", "query-blocks")}
						value={selectedBlockId}
						options={[
							{ label: __("Select a block", "query-blocks"), value: "" },
							...pickupPosts.map((block) => ({
								label: block.attributes.pickupId,
								value: block.attributes.pickupId,
							})),
						]}
						onChange={(changeOption) => {
							setAttributes({ selectedBlockId: changeOption });
						}}
					/>
				</div>

				<PanelBody
					title={__("Block Display Settings", "query-blocks")}
					initialOpen={true}
					className="form_setteing_ctrl"
				>
					<div className="itmar_select_row">
						<RadioControl
							label={__("Display Type", "query-blocks")}
							selected={pageType}
							options={[
								{ label: __("Page Num", "query-blocks"), value: "pagenation" },
								{
									label: __("Back Foward", "query-blocks"),
									value: "backFoward",
								},
							]}
							onChange={(changeOption) =>
								setAttributes({ pageType: changeOption })
							}
						/>
					</div>
					{pageType === "pagenation" && (
						<>
							<ToggleControl
								label={__("Is Arrow Button", "query-blocks")}
								checked={isArrowButton}
								onChange={(newVal) => {
									setAttributes({ isArrowButton: newVal });
								}}
							/>
							<RangeControl
								value={dispOfItems}
								label={__("Page Button Number", "query-blocks")}
								max={30}
								min={3}
								onChange={(val) => setAttributes({ dispOfItems: val })}
							/>
						</>
					)}
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<div {...innerBlocksProps}></div>
			</div>
		</>
	);
}
