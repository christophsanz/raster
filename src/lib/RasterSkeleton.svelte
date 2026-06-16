<script lang="ts">
	import { fade } from 'svelte/transition';

	let columns = [
		{ id: 'column1', width: 150 },
		{ id: 'column2', width: 200 },
		{ id: 'column3', width: 250 },
		{ id: 'column4', width: 300 },
		{ id: 'column5', width: 350 },
		{ id: 'column6', width: 400 },
		{ id: 'column7', width: 450 }
	];
</script>

<!-- default snippets -->
{#snippet skeletonCell()}
	<div class="skeleton-cell"></div>
{/snippet}

<div class="datagrid-wrapper" in:fade>
	<div class="datagrid">
		<div class="datagrid-row datagrid-header">
			{#each columns as column (column)}
				<div class="datagrid-cell" style={`width: ${column.width}px`}>
					{@render skeletonCell()}
				</div>
			{/each}
		</div>
		<div class="datagrid-body">
			{#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as _row, index (index)}
				<div class="datagrid-row">
					{#each columns as column (column)}
						<div class="datagrid-cell" style={`width: ${column.width}px; height: ${50}px`}>
							{@render skeletonCell()}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.skeleton-cell {
		border-radius: var(--radius);
		margin: 10px;
		width: 100%;
		height: 20px;
		display: flex;
		justify-content: center;
		align-self: center;
		align-items: center;
		animation: skeleton-loading 1.5s infinite linear;
	}
	@keyframes skeleton-loading {
		0% {
			background-color: #5f5f5f75;
		}
		50% {
			background-color: #b6b6b67a;
		}
		100% {
			background-color: #5f5f5f75;
		}
	}

	.datagrid-wrapper {
		position: relative;
		display: flex;
		flex-direction: row;
		border-collapse: collapse;
		text-align: left;
		width: 100%;

		height: 100%;
		table-layout: fixed;

		overflow: hidden;
		border-top-left-radius: var(--radius);
		border-top-right-radius: var(--radius);
	}

	.datagrid {
		height: 100%;
	}

	.datagrid-body .datagrid-row {
		border-bottom: 1px solid var(--e-border-color-muted);
		font-weight: 400;
		color: var(--e-text-color);
		block-size: var(--e-table-row-height, 50px);
	}

	.datagrid-header {
		position: sticky;
		top: 0;
		background-color: var(--e-panel-background-color);
	}

	.datagrid-cell {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
		position: relative;
		display: flex;
		align-items: center;
		padding: var(--e-panel-padding);
	}

	.datagrid-header > .datagrid-cell {
		position: relative;
	}

	.datagrid-row {
		display: flex;
		align-items: center;
	}
</style>
