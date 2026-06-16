<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { crossfade } from 'svelte/transition';
	import type { ColumnDef, SnippetArgs } from './types';

	type Props = {
		rows: T[];
		columns: ColumnDef<T>[];
		minRowHeight?: number;
		header?: Snippet<[{ header: string; column: ColumnDef<T> }]>;
		idKey: keyof T;
		hasFooter?: boolean;
	};

	let {
		rows,
		columns,
		minRowHeight,
		header: customHeader,
		idKey,
		hasFooter = false
	}: Props = $props();

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

<div class="datagrid-wrapper">
	<div class="datagrid-row datagrid-header">
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
		{#each rows as row (row[idKey])}
			<div class="datagrid-row">
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
		{/each}
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
