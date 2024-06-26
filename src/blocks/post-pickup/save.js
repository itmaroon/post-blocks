import { useBlockProps, InnerBlocks } from "@wordpress/block-editor";

export default function save({ attributes }) {
	const { numberOfItems, selectedRest, taxRelateType, choiceTerms, blockMap } =
		attributes;
	return (
		<div
			{...useBlockProps.save()}
			data-number_of_items={numberOfItems}
			data-selected_rest={selectedRest}
			data-tax_relate_type={taxRelateType}
			data-choice_terms={JSON.stringify(choiceTerms)}
			data-block_map={JSON.stringify(blockMap)}
		>
			<div className="post_unit unit_hide">
				<InnerBlocks.Content />
			</div>
		</div>
	);
}
