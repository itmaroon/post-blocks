import { useBlockProps, InnerBlocks } from "@wordpress/block-editor";

export default function save({ attributes }) {
	const { selectedBlockId } = attributes;
	return (
		<div {...useBlockProps.save()} data-selected_id={selectedBlockId}>
			<InnerBlocks.Content />
		</div>
	);
}
