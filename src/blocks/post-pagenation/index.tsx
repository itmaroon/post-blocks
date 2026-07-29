import { __ } from "@wordpress/i18n";
import { registerBlockType } from "@wordpress/blocks";
import "./style.scss";

/**
 * Internal dependencies
 */
import Edit from "./edit";
import save from "./save";
import metadata from "./block.json";
import { ReactComponent as Pagenation } from "./pagenation.svg";

registerBlockType(metadata.name, {
	description: __(
		"This block displays pagination. It works in conjunction with the Post Block to switch pages.",
		"query-blocks",
	),

	icon: <Pagenation />,
	edit: Edit,
	save,
});
