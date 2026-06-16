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

### Per-column snippets

A `ColumnDef<T>` can define `headerSnippet`, `cellSnippet` and `footerSnippet` to fully control rendering. Each snippet receives `{ row, column, value }`, where `value.cur` is a getter/setter bound to the (possibly nested) `accessorKeys` path.

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
