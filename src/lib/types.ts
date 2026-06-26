import type { Snippet } from 'svelte';

export type ColumnDef<T> = {
	header: string;
	headerSnippet?: Snippet<[StaticSnippetArgs<T>]>;
	cellSnippet?: Snippet<[SnippetArgs<T>]>;
	footerSnippet?: Snippet<[StaticSnippetArgs<T>]>;
	accessorKeys?: string[];
	width?: number;
	footer?: string;
	resizable?: boolean;
	meta?: Record<string, unknown>;
	sortFn?: (a: T, b: T) => number;
	/**
	 * Extra props spread onto this column's body `<div class="raster-cell">`.
	 * Whatever you return is merged with the grid's own cell props via
	 * {@link mergeProps} — so `class`/`style` are combined (not clobbered),
	 * `on*` handlers are chained, and Svelte attachments
	 * (`{ [createAttachmentKey()]: attachment }`) pass straight through.
	 * Handy for per-cell styling, event handlers, or wiring a drag-and-drop lib.
	 */
	cellProps?: (args: SnippetArgs<T>) => Record<string | symbol, unknown>;
};

export type SnippetArgs<T> = {
	row: T;
	column: ColumnDef<T>;
	value: { cur: unknown };
};

/**
 * Args for header/footer snippets. Unlike cell snippets these are not bound to a
 * row value, so `value` is always an empty object.
 */
export type StaticSnippetArgs<T> = {
	row: T;
	column: ColumnDef<T>;
	value: Record<string, never>;
};

export type HeaderArgs<T> = { header: string; column: ColumnDef<T> };
