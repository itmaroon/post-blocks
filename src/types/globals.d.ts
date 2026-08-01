declare module "@wordpress/api-fetch" {
	export default function apiFetch<T = unknown>(options: { path: string; [key: string]: unknown }): Promise<T>;
}

declare module "*.scss" {
	const content: unknown;
	export default content;
}

declare module "*.svg" {
	export const ReactComponent: any;
	const src: string;
	export default src;
}

declare module "react/jsx-runtime" {
	export const jsx: any;
	export const jsxs: any;
	export const Fragment: any;
}

declare namespace JSX {
	interface IntrinsicElements {
		[elementName: string]: any;
	}
}

declare const _: any;

interface Window {
	__itmar_force_reset_filters__?: boolean;
}

interface Element {
	dataset: DOMStringMap;
}

declare module "react-dom/client" {
	export function createRoot(element: Element | DocumentFragment): {
		render(children: unknown): void;
		unmount(): void;
	};
}

declare module "@wordpress/i18n" {
	export function __(text: string, domain?: string): string;
}

declare module "@wordpress/block-editor" {
	export const InnerBlocks: any;
	export const InspectorControls: any;
	export const RichText: any;
	export const useBlockProps: any;
	export const useInnerBlocksProps: any;
}

declare module "@wordpress/components" {
	export const CheckboxControl: any;
	export const Notice: any;
	export const PanelBody: any;
	export const PanelRow: any;
	export const RadioControl: any;
	export const RangeControl: any;
	export const SelectControl: any;
	export const TextControl: any;
	export const ToggleControl: any;
	export const __experimentalNumberControl: any;
}

declare module "@wordpress/element" {
	export const useCallback: any;
	export const useEffect: any;
	export const useMemo: any;
	export const useRef: any;
	export const useState: any;
}

declare module "@wordpress/data" {
	export const useDispatch: any;
	export const useSelect: any;
}

declare module "@wordpress/blocks" {
	export const createBlock: any;
	export const registerBlockType: any;
}

declare module "@wordpress/date" {
	export function format(dateFormat: string, dateValue: unknown, settings?: unknown): string;
	export function getSettings(): unknown;
}

declare module "itmar-block-packages" {
	export const ArchiveSelectControl: any;
	export const FieldChoiceControl: any;
	export const TermChoiceControl: any;
	export const createBlockTree: any;
	export const ensureCtx: any;
	export const getPeriodQuery: any;
	export const getTodayMonth: any;
	export const getTodayYear: any;
	export const registerPickup: any;
	export const restFetchData: any;
	export const restFieldes: any;
	export const restTaxonomies: any;
	export const serializeBlockTree: any;
	export const setState: any;
	export const styleDataApply: any;
	export const subscribe: any;
	export const termToDispObj: any;
	export const useBlockAttributeChanges: any;
	export const useIsIframeMobile: any;
	export const useRebuildChangeField: any;
	export function MasonryControl(
		element: Element,
		images: Array<{ url: string; alt?: string; type?: string; field?: string }>,
		options?: { columns?: number; renderItems?: boolean; [key: string]: unknown },
	): unknown;
	export function slideBlockSwiperInit(element: Element): unknown;
}

declare module "nanoid" {
	export const nanoid: any;
}

declare module "lodash/isEqual" {
	const isEqual: any;
	export default isEqual;
}

declare module "../../../../block-collections/src/blocks/design-group/StyleGroup" {
	export const createGroupStyleCss: any;
}

declare module "../../../../block-collections/src/blocks/design-title/StyleWapper" {
	export const createTitleInnerScope: any;
	export const createTitleStyleCss: any;
}

declare module "../../../../block-collections/src/blocks/design-button/StyleButton" {
	export const createButtonStyleCss: any;
}

declare const itmar_option: {
	home_url: string;
	plugin_url: string;
};

declare const itmar_post_option: {
	slug?: string;
};

declare const mobile_flg: boolean | undefined;

type JQueryCallback = ($: JQueryStatic) => void;

type JQueryStatic = {
	(selector: string): JQueryCollection;
	(element: Element | Document | Window | EventTarget | JQueryCollection): JQueryCollection;
	(callback: JQueryCallback): void;
};

type JQueryCollection = {
	[index: number]: Element;
	length: number;
	clone(withDataAndEvents?: boolean): JQueryCollection;
	find(selector: string): JQueryCollection;
	first(): JQueryCollection;
	each(callback: (this: Element, index: number, element: Element) => void): JQueryCollection;
	css(property: string, value: string): JQueryCollection;
	parent(): JQueryCollection;
	hasClass(className: string): boolean;
	unwrap(): JQueryCollection;
	removeData(name: string): JQueryCollection;
	attr(name: string): string | undefined;
	attr(name: string, value: string): JQueryCollection;
	empty(): JQueryCollection;
	append(content: JQueryCollection | Element): JQueryCollection;
	on(eventName: string, selector: string, handler: (this: Element, event: Event) => void): JQueryCollection;
	data(name: string): unknown;
	closest(selector: string): JQueryCollection;
	children(): JQueryCollection;
	show(): JQueryCollection;
	removeAttr(name: string): JQueryCollection;
};

declare const jQuery: JQueryStatic;
declare const $: JQueryStatic;
