import { __ } from "@wordpress/i18n";
import { registerBlockType } from "@wordpress/blocks";
import "./style.scss";

/**
 * Internal dependencies
 */
import Edit from "./edit";
import save from "./save";
import metadata from "./block.json";
import { ReactComponent as Filter } from "./filter.svg";
import { getTodayYear, getTodayMonth } from "itmar-block-packages";

registerBlockType(metadata.name, {
	description: __(
		"This block provides users with the ability to set filters such as category and date for the Post Block.",
		"query-blocks",
	),
	attributes: {
		...metadata.attributes,
		dateSpan: {
			type: "object",
			default: {
				startYear: getTodayYear() - 3,
				startMonth: getTodayMonth(),
				endYear: getTodayYear() + 1,
				endMonth: getTodayMonth(),
			},
		},
		searchBoxAttributes: {
			type: "object",
			default: {
				default_pos: {
					margin_input: {
						top: "0",
						left: "0",
						bottom: "0",
						right: "0",
					},
					padding_input: {
						top: "0.5em",
						left: "1em",
						bottom: "0.5em",
						right: "1em",
					},
					labelPos: "center center",
				},
				mobile_pos: {
					margin_input: {
						top: "0",
						left: "0",
						bottom: "0",
						right: "0",
					},
					padding_input: {
						top: "0.5em",
						left: "0em",
						bottom: "0.5em",
						right: "0em",
					},
					labelPos: "center center",
				},
				placeFolder: __("The string you want to search for...", "query-blocks"),
			},
		},
	},
	icon: <Filter />,
	edit: Edit,
	save,
});
