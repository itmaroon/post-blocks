import { __ } from "@wordpress/i18n";
import { registerBlockType } from "@wordpress/blocks";
import "./style.scss";

/**
 * Internal dependencies
 */
import Edit from "./edit";
import save from "./save";
import metadata from "./block.json";
import { ReactComponent as Crumbs } from "./crumbs.svg";

registerBlockType(metadata.name, {
	description: __(
		"This block displays the selection status of post data in breadcrumb format.",
		"query-blocks",
	),

	icon: <Crumbs />,
	edit: Edit,
	save,
});
