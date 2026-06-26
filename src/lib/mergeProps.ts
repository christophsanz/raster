/**
 * Merge multiple prop objects into one, resolving the collisions that occur
 * when a caller-supplied `rowProps`/`cellProps` lands on an element the grid
 * already configures:
 *
 * - `on*` event handlers are **chained** (called in argument order); if an
 *   earlier handler calls `event.preventDefault()`, the rest of the chain is
 *   skipped — so a caller's `onclick` and the grid's own click handler both fire.
 * - `class` values are concatenated (clsx-style: strings, arrays and
 *   `{ name: truthy }` objects all work), so internal classes are never lost.
 * - `style` values are concatenated.
 * - Everything else is last-defined-wins (ignoring `undefined`).
 * - Symbol keys (this is how Svelte passes attachments) are preserved, so
 *   `{ [createAttachmentKey()]: attachment }` flows straight through.
 *
 * Later arguments take precedence, mirroring the semantics of a plain spread.
 */
export type MergeableProps = Record<string | symbol, unknown>;

const isEventHandler = (key: string | symbol): key is string =>
	typeof key === 'string' && key.length > 2 && key[0] === 'o' && key[1] === 'n';

// The return type intentionally omits the `symbol` index signature: attachments
// (symbol-keyed) are still copied at runtime, but declaring them here would make
// the result incompatible with Svelte's element-props type when spread.
export function mergeProps(...sources: (MergeableProps | undefined | null)[]): Record<string, unknown> {
	const result: MergeableProps = {};
	const handlers: Record<string, Array<(event: Event) => void>> = {};

	for (const source of sources) {
		if (!source) continue;
		for (const key of Reflect.ownKeys(source)) {
			const value = source[key as keyof typeof source];
			if (isEventHandler(key) && typeof value === 'function') {
				(handlers[key] ??= []).push(value as (event: Event) => void);
			} else if (value !== undefined) {
				result[key] = value;
			}
		}
	}

	for (const key in handlers) {
		const chain = handlers[key];
		result[key] = (event: Event) => {
			for (const fn of chain) {
				if (event?.defaultPrevented) break;
				fn(event);
			}
		};
	}

	const classes = sources.map((s) => s?.class).filter((c) => c != null);
	if (classes.length) result.class = clsx(classes);

	const styles = sources.map((s) => s?.style).filter((s) => s != null);
	if (styles.length) result.style = styles.map(toStyleString).filter(Boolean).join('; ');

	return result as Record<string, unknown>;
}

function clsx(value: unknown): string {
	if (typeof value === 'string' || typeof value === 'number') return String(value);
	if (Array.isArray(value)) return value.map(clsx).filter(Boolean).join(' ');
	if (typeof value === 'object' && value !== null) {
		return Object.keys(value)
			.filter((key) => (value as Record<string, unknown>)[key])
			.join(' ');
	}
	return '';
}

function toStyleString(style: unknown): string {
	if (typeof style === 'string') return style.trim().replace(/;\s*$/, '');
	if (typeof style === 'object' && style !== null) {
		return Object.entries(style)
			.filter(([, v]) => v != null)
			.map(([k, v]) => `${k}: ${v}`)
			.join('; ');
	}
	return '';
}
