import type { Snippet } from 'svelte';

export type ColumnDef<T> = {
	header: string;
	headerSnippet?: Snippet<[SnippetArgs<T>]>;
	cellSnippet?: Snippet<[SnippetArgs<T>]>;
	footerSnippet?: Snippet<[SnippetArgs<T>]>;
	accessorKeys?: string[];
	width?: number;
	footer?: string;
	resizable?: boolean;
	meta?: Record<string, unknown>;
	sortFn?: (a: T, b: T) => number;
};

export type SnippetArgs<T> = {
	row: T;
	column: ColumnDef<T>;
	value: { cur: unknown };
};

export type HeaderArgs<T> = { header: string; column: ColumnDef<T> };
