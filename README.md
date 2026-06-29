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
| `rowProps`     | `(row: T, index: number) => Record<string \| symbol, unknown>` | — | Extra props merged onto each body row element. See [Custom row & cell props](#custom-row--cell-props-drag--drop). |
| `virtual`      | `boolean`                                                | `false` | Render only the rows in (and near) the viewport. See below.  |
| `rowHeight`    | `number \| ((row: T, index: number) => number)`         | `minRowHeight ?? 40` | Row height (px) used while virtualizing — a number, or a function for variable heights. |
| `overscan`     | `number`                                                 | `6`     | Extra rows rendered above/below the viewport while virtualizing. |
| `containerHeight` | `number \| string`                                    | —       | Height of the scroll container (number → px). Omit to keep `height: 100%`. |

### Row clicks

Pass `onRowClick` to react to row activation. The callback receives the full row object (including its `idKey` value) and the originating event. When set, rows become keyboard-focusable (`Enter` / `Space` also trigger it) and show a pointer cursor.

```svelte
<Raster {rows} {columns} idKey="id" onRowClick={(row) => console.log('clicked', row.id)} />
```

### Virtualization

For large datasets, set `virtual` to render only the rows in view (plus `overscan`
rows above and below). Off-screen rows are replaced by spacer elements that
preserve the scroll height, so the scrollbar behaves exactly as if every row were
mounted.

```svelte
<Raster {rows} {columns} idKey="id" virtual rowHeight={40} containerHeight={600} />
```

The scroll container needs a bounded height. Pass `containerHeight` (a number is
treated as px, a string is used verbatim, e.g. `'60vh'`), or omit it and give the
grid's parent a height — the wrapper defaults to `height: 100%`.

Rendered rows are keyed by their **slot** in the visible window rather than by
`idKey`, so Svelte recycles the same row nodes as you scroll instead of
unmounting and remounting on every tick.

`scrollToRow` keeps working in virtual mode — if the target row isn't currently
mounted, the grid scrolls to its computed offset instead.

#### Variable row heights

Pass a function to `rowHeight` to give each row its own height. The grid builds a
cumulative-offset table (rebuilt only when `rows` or the function changes) and
binary-searches it on each scroll, so it stays O(log n) per frame even for very
large datasets.

```svelte
<Raster
	{rows}
	{columns}
	idKey="id"
	virtual
	containerHeight="70vh"
	rowHeight={(row) => (row.expanded ? 120 : 40)}
/>
```

> The function should return the same height the row actually renders at — it
> drives both layout and scroll positioning. It is not a measurement/estimate
> that gets corrected after render.

### Per-column snippets

A `ColumnDef<T>` can define `headerSnippet`, `cellSnippet` and `footerSnippet` to fully control rendering. Each snippet receives `{ row, column, value }`, where `value.cur` is a getter/setter bound to the (possibly nested) `accessorKeys` path.

### Custom row & cell props (drag & drop)

Instead of a fixed set of drag/style props, the grid exposes two escape hatches that
let you put **anything** onto the underlying elements:

- `rowProps(row, index)` — props for each body row `<div>`.
- a column's `cellProps({ row, column, value })` — props for that column's body cell `<div>`.
- a column's `headerProps({ row, column, value })` — props for that column's header cell `<div>`.
- a column's `footerProps({ row, column, value })` — props for that column's footer cell `<div>`.

`headerProps` and `footerProps` are the header/footer-cell counterparts to `cellProps`.
Header and footer cells aren't bound to a row value, so they receive the same static
args as `headerSnippet` / `footerSnippet` (`value` is always `{}`). A common use is
keeping a filling column aligned by making it `flex-grow` in the header **and** body
in lockstep:

```ts
const columns: ColumnDef<Person>[] = [
	{
		header: 'Name',
		accessorKeys: ['name'],
		headerProps: () => ({ style: 'flex-grow: 1' }),
		cellProps: () => ({ style: 'flex-grow: 1' })
	}
];
```

Whatever you return is combined with the grid's own props via the exported
[`mergeProps`](#mergeprops) helper, so you never clobber the grid's behavior:

- `class` is concatenated (string, array or `{ name: truthy }` object).
- `style` is concatenated.
- `on*` handlers are **chained** — your `onclick` runs alongside `onRowClick`,
  and a handler calling `event.preventDefault()` stops the rest of the chain.
- everything else is last-wins (your value overrides the grid's).
- **Svelte attachments pass straight through.** An attachment is just a prop
  whose key is a `Symbol` (via `createAttachmentKey()`), so returning one wires
  the attachment onto the row/cell node — the recommended way to integrate a
  drag-and-drop library.

```svelte
<script lang="ts">
	import { Raster, type ColumnDef } from 'svelte-raster';
	import { createAttachmentKey } from 'svelte/attachments';

	let draggingId = $state<number | null>(null);

	// any DnD library that wants the DOM node works here (SortableJS,
	// pragmatic-drag-and-drop, svelte-dnd-action, …). Native HTML5 shown below.
	const columns: ColumnDef<Person>[] = [
		{
			header: 'Name',
			accessorKeys: ['name'],
			// per-cell props: right-align the age column, add a click handler, etc.
			cellProps: ({ row }) => ({ class: { highlight: row.id === draggingId } })
		}
	];
</script>

<Raster
	{rows}
	{columns}
	idKey="id"
	rowProps={(row, index) => ({
		draggable: true,
		class: { dragging: row.id === draggingId },
		ondragstart: (e: DragEvent) => {
			draggingId = row.id;
			e.dataTransfer?.setData('text/plain', String(index));
		},
		ondragend: () => (draggingId = null),
		// hand the row node to a DnD library via an attachment:
		[createAttachmentKey()]: (node: HTMLElement) => {
			// e.g. registerSortable(node, index); return () => unregister(node);
		}
	})}
/>
```

> In `virtual` mode the row nodes are **recycled** as you scroll (keyed by slot,
> not by `idKey`), so the same DOM element is reused for different rows. Native
> drag attributes and the chained handlers cope fine, but some stateful DnD
> libraries assume stable nodes — test before relying on it with virtualization on.

#### `mergeProps`

The same helper is exported for use inside your own snippets, when you need to
merge caller-provided props with your own onto an element:

```ts
import { mergeProps } from 'svelte-raster';

const props = mergeProps(
	{ class: 'base', onclick: () => console.log('first') },
	{ class: 'extra', onclick: () => console.log('second') }
);
// → { class: 'base extra', onclick: <both, in order> }
```

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
