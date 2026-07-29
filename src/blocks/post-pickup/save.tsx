import { useBlockProps, InnerBlocks } from "@wordpress/block-editor";

export default function save({ attributes }) {
	const {
		pickupId,
		pickupType,
		pickupQuery,
		numberOfItems,
		searchFields,
		selectedSlug,
		selectedRest,
		taxRelateType,
		choiceFields,
		dispTaxonomies,
		blockMap,
	} = attributes;

	return (
		<div
			{...useBlockProps.save()}
			data-pickup_id={pickupId}
			data-pickup_type={pickupType}
			data-pickup_query={pickupQuery}
			data-number_of_items={numberOfItems}
			data-selected_slug={selectedSlug}
			data-selected_rest={selectedRest}
			data-search_fields={JSON.stringify(searchFields)}
			data-disp_taxonomies={JSON.stringify(dispTaxonomies)}
			data-tax_relate_type={taxRelateType}
			data-choice_fields={JSON.stringify(choiceFields)}
			data-block_map={JSON.stringify(blockMap)}
		>
			<div className="template_unit unit_hide">
				<InnerBlocks.Content />
			</div>
		</div>
	);
}
