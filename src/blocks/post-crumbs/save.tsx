import { useBlockProps } from "@wordpress/block-editor";

export default function save({ attributes }) {
	const {
		selectedBlockId,
		postTypeName,
		groupBlockAttributes,
		crumbBlockAttributes,
	} = attributes;

	return (
		<div {...useBlockProps.save()}>
			<div
				id={`crumbs_${selectedBlockId}`}
				data-post_name={postTypeName}
				data-group_attributes={JSON.stringify(groupBlockAttributes)}
				data-crumb_attributes={JSON.stringify(crumbBlockAttributes)}
			/>
		</div>
	);
}
