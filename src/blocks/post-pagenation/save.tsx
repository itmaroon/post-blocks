import { useBlockProps } from "@wordpress/block-editor";

export default function save({ attributes }) {
	const {
		selectedBlockId,
		pageType,
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

	return (
		<div {...useBlockProps.save()}>
			<div
				id={`page_${selectedBlockId}`}
				data-page_type={pageType}
				data-disp_items={dispOfItems}
				data-is_arrow={isArrowButton}
				data-group_attributes={JSON.stringify(groupBlockAttributes)}
				data-num_attributes={JSON.stringify(numBlockAttributes)}
				data-dummy_attributes={JSON.stringify(dummyBlockAttributes)}
				data-forward_attributes={JSON.stringify(forwardBlockAttributes)}
				data-back_attributes={JSON.stringify(backBlockAttributes)}
				data-fw_title_attributes={JSON.stringify(forwardTitleAttributes)}
				data-bk_title_attributes={JSON.stringify(backTitleAttributes)}
			/>
		</div>
	);
}
