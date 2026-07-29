import { __ } from "@wordpress/i18n";
import { registerBlockType } from "@wordpress/blocks";
import "./style.scss";

/**
 * Internal dependencies
 */
import Edit from "./edit";
import save from "./save";
import metadata from "./block.json";
import { ReactComponent as Pickup } from "./pickup.svg";

registerBlockType(metadata.name, {
	icon: <Pickup />,
	attributes: {
		...metadata.attributes,
		emptyMessageAttributes: {
			type: "object",
			default: {
				headingContent: __("There were no relevant articles.", "query-blocks"),
			},
		},
		emptyGroupAttributes: {
			type: "object",
			default: {
				default_val: {
					direction: "horizen",
					reverse: false,
					wrap: false,
					inner_align: "flex-start",
					outer_align: "center",
					outer_vertical: "center",
					width_val: "full",
					max_width: "full",
					free_width: "400px",
					max_free_width: "100%",
					height_val: "fit",
					free_height: "300px",
					posValue: {
						vertBase: "top",
						horBase: "left",
						vertValue: "3em",
						horValue: "3em",
						isVertCenter: false,
						isHorCenter: false,
					},
					margin: {
						top: "0px",
						left: "0px",
						bottom: "0px",
						right: "0px",
					},
					padding: {
						top: "0px",
						left: "0px",
						bottom: "0px",
						right: "0px",
					},
					padding_content: {
						top: "0px",
						left: "0px",
						bottom: "0px",
						right: "0px",
					},
					grid_info: {
						gridElms: [],
						rowNum: 2,
						colNum: 2,
						rowGap: "5px",
						colGap: "5px",
						rowUnit: [],
						colUnit: [],
					},
				},
				mobile_val: {
					direction: "vertical",
					reverse: false,
					wrap: false,
					inner_align: "flex-start",
					outer_align: "center",
					outer_vertical: "center",
					width_val: "full",
					max_width: "100%",
					free_width: "200px",
					max_free_width: "100%",
					height_val: "fit",
					free_height: "300px",
					posValue: {
						vertBase: "top",
						horBase: "left",
						vertValue: "2em",
						horValue: "1em",
						isVertCenter: false,
						isHorCenter: false,
					},
					margin: {
						top: "0px",
						left: "0px",
						bottom: "0px",
						right: "0px",
					},
					padding: {
						top: "0px",
						left: "0px",
						bottom: "0px",
						right: "0px",
					},
					padding_content: {
						top: "20px",
						left: "10px",
						bottom: "20px",
						right: "10px",
					},
					grid_info: {
						gridElms: [],
						rowNum: 2,
						colNum: 2,
						rowGap: "5px",
						colGap: "5px",
					},
				},
			},
		},
	},
	description: __(
		"This block picks up and displays articles that you want to draw attention to.",
		"query-blocks",
	),

	edit: Edit,
	save,
});
