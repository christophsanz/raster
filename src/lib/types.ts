import type { Snippet } from 'svelte';

export type ColumnDef<T> = {
	/**
	 * Stable identity for this column, used as the `{#each}` key when rendering
	 * columns. Set this when your `columns` array is derived/recreated on the
	 * outside (e.g. a `$derived`) so Svelte keys columns by `id` instead of by
	 * object reference — otherwise every recompute produces fresh column objects
	 * and Svelte tears down and rebuilds the column DOM (losing focus, resize
	 * state, etc.). Falls back to the object reference when omitted.
	 */
	id?: string;
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
	/**
	 * Extra props spread onto this column's header `<div class="raster-cell">`.
	 * Header cells aren't bound to a row value, so this receives the same static
	 * args as `headerSnippet` ({@link StaticSnippetArgs} — `value` is always `{}`).
	 * Merged with the grid's own header-cell props via {@link mergeProps}, so
	 * `class`/`style` combine (not clobber), `on*` handlers chain, and Svelte
	 * attachments pass straight through — the header-cell counterpart to
	 * `cellProps`. Handy for styling a header, wiring a sort/menu handler, or
	 * making a column flex-grow in the header and body in lockstep.
	 */
	headerProps?: (args: StaticSnippetArgs<T>) => Record<string | symbol, unknown>;
	/**
	 * Extra props spread onto this column's footer `<div class="raster-cell">`.
	 * Like {@link headerProps}, it receives the same static args as `footerSnippet`
	 * ({@link StaticSnippetArgs} — `value` is always `{}`) and is merged with the
	 * grid's own footer-cell props via {@link mergeProps} — the footer-cell
	 * counterpart to `cellProps`.
	 */
	footerProps?: (args: StaticSnippetArgs<T>) => Record<string | symbol, unknown>;
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
