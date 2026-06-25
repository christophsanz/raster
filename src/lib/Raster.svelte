<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { crossfade } from 'svelte/transition';
	import type { ColumnDef, SnippetArgs } from './types';
	import { buildOffsets, uniformWindow, variableWindow } from './virtual';

	type Props = {
		rows: T[];
		columns: ColumnDef<T>[];
		minRowHeight?: number;
		header?: Snippet<[{ header: string; column: ColumnDef<T> }]>;
		idKey: keyof T;
		hasFooter?: boolean;
		onRowClick?: (row: T, event: MouseEvent | KeyboardEvent) => void;
		/**
		 * Render only the rows visible in the viewport (plus `overscan` above and
		 * below). Keeps the DOM small and scrolling smooth for large datasets.
		 */
		virtual?: boolean;
		/**
		 * Row height (px) used while virtualizing. Pass a number for a uniform
		 * layout (fast path), or a function `(row, index) => number` for variable
		 * heights — the grid builds a cumulative-offset table and binary-searches
		 * it. Falls back to `minRowHeight`, then `DEFAULT_ROW_HEIGHT`. Ignored when
		 * `virtual` is off.
		 */
		rowHeight?: number | ((row: T, index: number) => number);
		/** Extra rows rendered above and below the viewport while virtualizing. */
		overscan?: number;
		/**
		 * Height of the scroll container. A number is treated as `px`; a string is
		 * used verbatim (e.g. `'60vh'`). When omitted, the grid keeps its default
		 * `height: 100%` and fills whatever bounded-height parent contains it.
		 */
		containerHeight?: number | string;
	};

	let {
		rows,
		columns,
		minRowHeight,
		header: customHeader,
		idKey,
		hasFooter = false,
		onRowClick,
		virtual = false,
		rowHeight,
		overscan = 6,
		containerHeight
	}: Props = $props();

	let wrapper: HTMLElement;

	const DEFAULT_ROW_HEIGHT = 40;

	// --- virtualization state ---------------------------------------------
	let headerEl: HTMLElement | undefined = $state();
	let scrollTop = $state(0);
	let viewportHeight = $state(0);
	let headerHeight = $state(0);

	const cssHeight = $derived(
		containerHeight === undefined
			? undefined
			: typeof containerHeight === 'number'
				? `${containerHeight}px`
				: containerHeight
	);

	// Uniform row height when `rowHeight` is a number (or unset); the variable
	// path below takes over when it is a function.
	const uniformRowHeight = $derived(
		typeof rowHeight === 'number' ? rowHeight : (minRowHeight ?? DEFAULT_ROW_HEIGHT)
	);

	// Cumulative offsets for variable heights, rebuilt only when the row data or
	// the size function changes — not on every scroll tick.
	const offsets = $derived.by(() => {
		if (!virtual || typeof rowHeight !== 'function') return null;
		const sizeFn = rowHeight;
		return buildOffsets(rows.map((row, index) => sizeFn(row, index)));
	});

	// Pixel height of a single row, used both for layout and the row's style.
	function heightAt(index: number): number {
		return offsets ? offsets[index + 1] - offsets[index] : uniformRowHeight;
	}

	// The visible window: which rows to render, plus the spacer padding that
	// reserves the scroll height of the off-screen rows.
	const win = $derived.by(() => {
		const viewportSpan = Math.max(0, viewportHeight - headerHeight);
		if (!virtual) {
			return { startIndex: 0, endIndex: rows.length - 1, topPad: 0, bottomPad: 0 };
		}
		return offsets
			? variableWindow({ offsets, scrollTop, viewportSpan, overscan })
			: uniformWindow({ count: rows.length, rowHeight: uniformRowHeight, scrollTop, viewportSpan, overscan });
	});

	const topPad = $derived(win.topPad);
	const bottomPad = $derived(win.bottomPad);

	// Slot-based keying: the key is the row's POSITION inside the visible window
	// (slot 0 = topmost rendered row), not its data index. As the user scrolls,
	// the window shifts but the slot keys stay 0..N-1, so Svelte recycles the
	// existing row nodes and just updates their data + height instead of
	// unmounting the top row and mounting a fresh one at the bottom every tick.
	const virtualItems = $derived.by(() => {
		const items: { row: T; key: string; height: number }[] = [];
		for (let index = win.startIndex; index <= win.endIndex; index += 1) {
			items.push({ row: rows[index], key: `slot_${index - win.startIndex}`, height: heightAt(index) });
		}
		return items;
	});

	// Keep viewport height in sync with the scroll container's size.
	$effect(() => {
		if (!virtual || !wrapper) return;
		const observer = new ResizeObserver(() => {
			viewportHeight = wrapper.clientHeight;
		});
		observer.observe(wrapper);
		viewportHeight = wrapper.clientHeight;
		return () => observer.disconnect();
	});

	// Track the sticky header's height so the visible window accounts for the
	// space it occludes at the top of the scroll container.
	$effect(() => {
		if (!virtual || !headerEl) return;
		const observer = new ResizeObserver(() => {
			headerHeight = headerEl!.offsetHeight;
		});
		observer.observe(headerEl);
		headerHeight = headerEl.offsetHeight;
		return () => observer.disconnect();
	});

	/**
	 * Scroll the row with the given id (matched against `row[idKey]`) into view.
	 * Call via a component reference, e.g. `raster.scrollToRow(id)`.
	 */
	export function scrollToRow(id: T[keyof T], options: ScrollIntoViewOptions = { block: 'nearest' }) {
		const row = wrapper?.querySelector(`[data-row-id="${CSS.escape(String(id))}"]`);
		if (row) {
			row.scrollIntoView(options);
			return true;
		}
		// In virtual mode the target row may not be in the DOM; compute its
		// position from the fixed row height and scroll the container directly.
		if (virtual && wrapper) {
			const index = rows.findIndex((r) => r[idKey] === id);
			if (index === -1) return false;
			wrapper.scrollTo({
				top: offsets ? offsets[index] : index * uniformRowHeight,
				behavior: options.behavior ?? 'auto'
			});
			return true;
		}
		return false;
	}

	const DEFAULT_WIDTH = 150;
	const resizeHandle = (column: ColumnDef<T>) => {
		return (node: HTMLElement) => {
			let startX: number;
			let startWidth: number;

			const onMouseMove = (event: MouseEvent) => {
				const deltaX = event.pageX - startX;
				column.width = startWidth + deltaX;
				// clamp the width to a minimum value
				if (column.width < 50) {
					column.width = 50;
				}
			};
			const onMouseUp = () => {
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
			};

			node.addEventListener('mousedown', (event) => {
				startX = event.pageX;
				startWidth = column.width ?? DEFAULT_WIDTH;
				document.addEventListener('mousemove', onMouseMove);
				document.addEventListener('mouseup', onMouseUp);
				//prevent text selection while resizing
				event.preventDefault();
				event.stopPropagation();
			});
		};
	};

	export const [send, receive] = crossfade({
		duration: (d) => Math.sqrt(d * 250),

		fallback(node, _params) {
			const style = getComputedStyle(node);
			const height = +style.height.slice(0, -2); // remove px and convert to number

			return {
				duration: 250,
				easing: quintOut,
				css: (t) => `

				height: ${height * t}px;
				opacity: ${t};
			`
			};
		}
	});

	const getRowValue = (row: T, accessorKeys: PropertyKey[] = []): unknown => {
		return accessorKeys.reduce<unknown>((currentVal, key) => {
			if (currentVal && typeof currentVal === 'object' && key in currentVal) {
				return (currentVal as Record<PropertyKey, unknown>)[key];
			}
			return undefined;
		}, row);
	};

	const setRowValue = (row: T, accessorKeys: PropertyKey[] = [], value: unknown): void => {
		if (accessorKeys.length === 0) return;

		let currentObj: Record<PropertyKey, unknown> = row as Record<PropertyKey, unknown>;

		const pathKeys = accessorKeys.slice(0, -1);
		const finalKey = accessorKeys.at(-1)!;

		pathKeys.forEach((key) => {
			if (!(key in currentObj)) {
				currentObj[key] = {};
			}
			currentObj = currentObj[key] as Record<PropertyKey, unknown>;
		});

		currentObj[finalKey] = value;
	};
</script>

<!-- default snippets -->
{#snippet header(header: string)}
	{header}
{/snippet}

{#snippet defaultCell({ value }: SnippetArgs<T>)}
	{value.cur}
{/snippet}

{#snippet bodyRow(row: T, height?: number)}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class={['datagrid-row', { clickable: onRowClick }]}
		data-row-id={row[idKey]}
		role={onRowClick ? 'button' : undefined}
		tabindex={onRowClick ? 0 : undefined}
		style={height !== undefined ? `height: ${height}px` : undefined}
		onclick={onRowClick ? (event) => onRowClick(row, event) : undefined}
		onkeydown={onRowClick
			? (event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						onRowClick(row, event);
					}
				}
			: undefined}
	>
		{#each columns as column (column)}
			<div
				class="datagrid-cell"
				style={`width: ${column.width ?? DEFAULT_WIDTH}px; min-height: ${minRowHeight}px`}
			>
				{#if column.cellSnippet}
					{@render column.cellSnippet?.({
						row,
						column,
						value: {
							get cur() {
								return getRowValue(row, column.accessorKeys);
							},
							set cur(val) {
								setRowValue(row, column.accessorKeys, val);
							}
						}
					})}
				{:else}
					{@render defaultCell({
						row,
						column,
						value: {
							get cur() {
								return getRowValue(row, column.accessorKeys);
							},
							set cur(val) {
								setRowValue(row, column.accessorKeys, val);
							}
						}
					})}
				{/if}
			</div>
		{/each}
	</div>
{/snippet}

<div
	class="datagrid-wrapper"
	bind:this={wrapper}
	style={cssHeight ? `height: ${cssHeight}` : undefined}
	onscroll={() => (scrollTop = wrapper.scrollTop)}
>
	<div class="datagrid-row datagrid-header" bind:this={headerEl}>
		{#each columns as column (column)}
			<div class="datagrid-cell" style={`width: ${column.width ?? DEFAULT_WIDTH}px`}>
				{#if column.headerSnippet}
					{@render column.headerSnippet?.({
						row: rows[0],
						column,
						value: {}
					})}
				{:else if customHeader}
					{@render customHeader({
						header: column.header,
						column
					})}
				{:else if header}
					{@render header(column.header)}
				{/if}

				<div class="resize-handle" {@attach resizeHandle(column)}></div>
			</div>
		{/each}
	</div>
	<div class="datagrid-body">
		{#if virtual}
			{#if topPad > 0}
				<div class="datagrid-spacer" style={`height: ${topPad}px`}></div>
			{/if}
			{#each virtualItems as item (item.key)}
				{@render bodyRow(item.row, item.height)}
			{/each}
			{#if bottomPad > 0}
				<div class="datagrid-spacer" style={`height: ${bottomPad}px`}></div>
			{/if}
		{:else}
			{#each rows as row (row[idKey])}
				{@render bodyRow(row)}
			{/each}
		{/if}
	</div>
	{#if hasFooter}
		<div class="datagrid-footer-wrapper">
			<div class="datagrid-row datagrid-footer">
				{#each columns as column (column)}
					<div
						class="datagrid-cell"
						style={`width: ${column.width ?? DEFAULT_WIDTH}px;min-height: ${minRowHeight}px`}
					>
						{#if column.footerSnippet}
							{@render column.footerSnippet?.({
								row: rows[0],
								column,
								value: {}
							})}
						{:else if column.footer}
							{column.footer}
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.resize-handle {
		position: absolute;
		right: 0;
		top: 0;
		width: 5px;
		height: 100%;
		cursor: ew-resize;
		z-index: 100;
	}
	.datagrid-wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
		border-collapse: collapse;
		text-align: left;
		width: 100%;
		table-layout: fixed;
		overflow: auto;
		height: 100%;
		border-radius: var(--radius);
		/* Virtualization adjusts the spacer heights above the viewport on every
		   scroll tick. Browser scroll anchoring would try to compensate for that
		   resize and fight the virtualizer, causing janky / lurching scroll, so
		   opt the scroll container's subtree out of it. */
		overflow-anchor: none;
	}

	.datagrid-header {
		position: sticky;
		z-index: 1;
		top: 0;
	}

	.datagrid-cell {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
		position: relative;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.datagrid-cell:last-child {
		flex-grow: 1;
	}

	.datagrid-header > .datagrid-cell {
		position: relative;
	}

	.datagrid-row {
		display: flex;
		width: max-content;
		min-width: 100%;
	}

	/* Virtualization spacers reserve the scroll height of off-screen rows. */
	.datagrid-spacer {
		flex-shrink: 0;
	}

	.datagrid-row.clickable {
		cursor: pointer;
	}

	.datagrid-footer {
		opacity: 0.5;
		.datagrid-cell:last-child :global(button) {
			display: none;
		}
		&:focus-within,
		&:hover {
			opacity: 1;
			.datagrid-cell:last-child :global(button) {
				display: flex;
			}
		}
	}
</style>
