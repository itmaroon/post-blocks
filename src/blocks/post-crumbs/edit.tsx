import { __ } from "@wordpress/i18n";
import "./editor.scss";

import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from "@wordpress/block-editor";
import { PanelBody, SelectControl } from "@wordpress/components";

import { useEffect, useState } from "@wordpress/element";
import { useSelect, useDispatch } from "@wordpress/data";
import { createBlock } from "@wordpress/blocks";

import {
	useBlockAttributeChanges,
	restFetchData,
	termToDispObj,
} from "itmar-block-packages";

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
	const { selectedBlockId, groupBlockAttributes, crumbBlockAttributes } =
		attributes;
	// ブロック操作関数を取得
	const { replaceInnerBlocks } = useDispatch("core/block-editor");

	//インナーブロックのひな型を用意
	const TEMPLATE = [];
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: ["itmar/design-group", "itmar/design-title"],
		template: TEMPLATE,
		templateLock: false,
	});

	//エディタ内ブロックの取得
	const { targetBlocks, innerBlocks } = useSelect(
		(select) => ({
			targetBlocks: select("core/block-editor").getBlocks(),
			innerBlocks: select("core/block-editor").getBlocks(clientId),
		}),
		[clientId],
	);

	//ブロックの作成関数
	const blockArrayAdd = (headingContent) => {
		//Design Titleの属性
		const newBlockAttributes = {
			...crumbBlockAttributes,
			className: crumbBlockAttributes.className
				? crumbBlockAttributes.className
				: "itmar_design_crumbs is-style-sub_copy",
			headingContent: headingContent,
		};

		const crumbBlock = createBlock("itmar/design-title", newBlockAttributes);

		return crumbBlock;
	};

	//エディタ内のブロックが変化したときpickupを更新
	const [pickupPosts, setPickupPosts] = useState([]);
	const [pickup, setPickup] = useState(null);
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

		//pickupブロックの取得
		setPickup(
			allFlattenedBlocks.find(
				(block) => block.attributes.pickupId === selectedBlockId,
			),
		);
	}, [targetBlocks]);

	//他のブロックに属性の変更を適用
	useBlockAttributeChanges(
		clientId,
		"itmar/design-title",
		"itmar_design_crumbs",
		{ headingContent: "" },
	);

	useEffect(() => {
		if (innerBlocks[0] && innerBlocks[0].innerBlocks.length > 0) {
			//グループブロックの属性を記録
			setAttributes({ groupBlockAttributes: innerBlocks[0].attributes });
			//タイトル属性を記録
			const crumbBlock = innerBlocks[0].innerBlocks.find((block) =>
				block.attributes.className.includes("itmar_design_crumbs"),
			);
			setAttributes({ crumbBlockAttributes: crumbBlock.attributes });
		}
	}, [innerBlocks[0], innerBlocks[0]?.innerBlocks]);

	//フィルター情報を取得したらインナーブロックにdesign-titleを詰め込む
	useEffect(() => {
		if (pickup) {
			const {
				pickupType,
				selectedSlug,
				searchWord,
				choicePeriod,
				choiceTerms,
				categoryArray,
				taxRelateType,
			} = pickup.attributes;

			//投稿タイプの名前取得のためのエンドポイント
			const endPath = `/wp/v2/types/${selectedSlug}`;
			//インナーブロックの配列
			const crumbArray = [];

			if (selectedSlug) {
				restFetchData(endPath).then((data) => {
					//ポストタイプ名
					crumbArray.push(blockArrayAdd(data.name));
					setAttributes({ postTypeName: data.name }); //表示するポスト名を格納
					//検索ワード
					if (searchWord) {
						crumbArray.push(blockArrayAdd(`"${searchWord}"`));
					}
					//期間
					if (choicePeriod) {
						crumbArray.push(blockArrayAdd(choicePeriod));
					}
					//ターム
					if (choiceTerms.length > 0) {
						const dispObj = termToDispObj(choiceTerms, " || ");
						const dispString = Object.values(dispObj).join(
							` ${taxRelateType} `,
						);
						crumbArray.push(blockArrayAdd(dispString));
					}
					//タイトル
					if (pickupType === "single") {
						crumbArray.push(
							//blockArrayAdd(pickup.attributes.posts[0]?.title.rendered),
							blockArrayAdd("[title]"),
						);
					}
					//Design Groupに入れてレンダリング
					const crumbBlock = createBlock(
						"itmar/design-group",
						groupBlockAttributes, //既にグループがある場合はその属性を引き継ぐ
						crumbArray,
					);
					//インナーブロックの入れ替え
					replaceInnerBlocks(clientId, [crumbBlock], false);
				});
			} else {
				const disp_name = __("Product", "query-blocks");

				crumbArray.push(blockArrayAdd(disp_name));
				setAttributes({ postTypeName: disp_name });
				//Design Groupに入れてレンダリング
				const crumbBlock = createBlock(
					"itmar/design-group",
					groupBlockAttributes, //既にグループがある場合はその属性を引き継ぐ
					crumbArray,
				);
				//インナーブロックの入れ替え
				replaceInnerBlocks(clientId, [crumbBlock], false);
			}
			//検索ワード
		}
	}, [pickup?.attributes]); //ターゲットのpickup-blockが更新された

	return (
		<>
			<InspectorControls group="settings">
				<PanelBody
					title={__("Linked Post Block", "query-blocks")}
					initialOpen={true}
					className="form_setteing_ctrl"
				>
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
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<div {...innerBlocksProps}></div>
			</div>
		</>
	);
}
