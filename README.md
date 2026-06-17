# svelte-raster

A lightweight, resizable data-grid (raster) component for **Svelte 5**.

- Column-based rendering with per-column snippets for header, cell and footer.
- Drag-to-resize columns.
- Nested value access via `accessorKeys`.
- A matching loading skeleton (`RasterSkeleton`).
- Fully typed, generic over your row type.

## Install

```bash
npm install svelte-raster
# or
bun add svelte-raster
```

`svelte` (^5) is a peer dependency.

## Usage

```svelte
<script lang="ts">
	import { Raster, type ColumnDef } from 'svelte-raster';

	type Person = { id: number; name: string; age: number };

	const rows: Person[] = [
		{ id: 1, name: 'Ada', age: 36 },
		{ id: 2, name: 'Linus', age: 54 }
	];

	const columns: ColumnDef<Person>[] = [
		{ header: 'Name', accessorKeys: ['name'], width: 200 },
		{ header: 'Age', accessorKeys: ['age'], width: 100 }
	];
</script>

<Raster {rows} {columns} idKey="id" minRowHeight={40} />
```

### Props

| Prop           | Type                                                      | Default | Description                                  |
| -------------- | -------------------------------------------------------- | ------- | -------------------------------------------- |
| `rows`         | `T[]`                                                     | —       | The data rows to render.                     |
| `columns`      | `ColumnDef<T>[]`                                          | —       | Column definitions.                          |
| `idKey`        | `keyof T`                                                 | —       | Key used to uniquely identify each row.      |
| `minRowHeight` | `number`                                                  | —       | Minimum height (px) of body cells.           |
| `header`       | `Snippet<[{ header: string; column: ColumnDef<T> }]>`    | —       | Custom header renderer for all columns.      |
| `hasFooter`    | `boolean`                                                 | `false` | Render a footer row.                         |
| `onRowClick`   | `(row: T, event: MouseEvent \| KeyboardEvent) => void`   | —       | Called when a body row is clicked or activated via keyboard. |

### Row clicks

Pass `onRowClick` to react to row activation. The callback receives the full row object (including its `idKey` value) and the originating event. When set, rows become keyboard-focusable (`Enter` / `Space` also trigger it) and show a pointer cursor.

```svelte
<Raster {rows} {columns} idKey="id" onRowClick={(row) => console.log('clicked', row.id)} />
```

### Per-column snippets

A `ColumnDef<T>` can define `headerSnippet`, `cellSnippet` and `footerSnippet` to fully control rendering. Each snippet receives `{ row, column, value }`, where `value.cur` is a getter/setter bound to the (possibly nested) `accessorKeys` path.

### Imperative methods

Grab a component reference with `bind:this` to call methods on the grid.

| Method                       | Returns   | Description                                                            |
| ---------------------------- | --------- | -------------------------------------------------------------------- |
| `scrollToRow(id, options?)`  | `boolean` | Scroll the row whose `idKey` value equals `id` into view. Returns `true` if found. |

`options` is a standard [`ScrollIntoViewOptions`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) object and defaults to `{ block: 'nearest' }`.

```svelte
<script lang="ts">
	import { Raster } from 'svelte-raster';

	let raster: Raster<Person>;
</script>

<Raster bind:this={raster} {rows} {columns} idKey="id" />

<button onclick={() => raster.scrollToRow(2, { behavior: 'smooth' })}>
	Jump to Linus
</button>
```

> Rows are matched against the rendered DOM, so the id must belong to a row currently in `rows`.

### Loading skeleton

```svelte
<script>
	import { RasterSkeleton } from 'svelte-raster';
</script>

{#if loading}
	<RasterSkeleton />
{:else}
	<Raster {rows} {columns} idKey="id" />
{/if}
```

## Theming

The component is unstyled beyond layout and reads a few CSS custom properties from the surrounding context. Define these on a parent element (or `:root`) to theme it:

| Variable                      | Used by            | Purpose                          |
| ----------------------------- | ------------------ | -------------------------------- |
| `--radius`                    | both               | Border radius.                   |
| `--e-border-color-muted`      | skeleton           | Row separator color.             |
| `--e-text-color`              | skeleton           | Body text color.                 |
| `--e-panel-background-color`  | skeleton           | Sticky header background.        |
| `--e-panel-padding`           | skeleton           | Cell padding.                    |
| `--e-table-row-height`        | skeleton           | Row height (falls back to 50px). |

## License

MIT
