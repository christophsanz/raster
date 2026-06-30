// Pure virtualization window math shared by Raster.svelte. Kept framework-free
// so it can be reasoned about (and tested) in isolation.

export type VirtualWindow = {
	/** First row index to render (inclusive). */
	startIndex: number;
	/** Last row index to render (inclusive); `-1` when there is nothing to render. */
	endIndex: number;
	/** Scroll height to reserve before the first rendered row. */
	topPad: number;
	/** Scroll height to reserve after the last rendered row. */
	bottomPad: number;
	/** Total scroll height of all rows. */
	totalSize: number;
};

const EMPTY: VirtualWindow = {
	startIndex: 0,
	endIndex: -1,
	topPad: 0,
	bottomPad: 0,
	totalSize: 0
};

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Build a cumulative pixel-offset table for variable-height rows. `offsets[i]`
 * is the top edge of row `i`; the array has `sizes.length + 1` entries, so
 * `offsets[count]` is the total scroll height. Build this once per data change
 * and reuse it across scroll ticks (the window lookup is a binary search).
 */
export function buildOffsets(sizes: number[]): number[] {
	const offsets = new Array<number>(sizes.length + 1);
	offsets[0] = 0;
	for (let i = 0; i < sizes.length; i += 1) {
		offsets[i + 1] = offsets[i] + Math.max(sizes[i], 1);
	}
	return offsets;
}

/**
 * Uniform row-height window. O(1) — no offset table needed.
 *
 * `viewportSpan` is the visible body height (viewport minus the sticky header).
 * Body rows sit directly under the header in the same scroll container, so
 * `scrollTop` maps straight onto row offsets.
 */
export function uniformWindow(opts: {
	count: number;
	rowHeight: number;
	scrollTop: number;
	viewportSpan: number;
	overscan: number;
}): VirtualWindow {
	const { count, scrollTop, viewportSpan, overscan } = opts;
	const rowHeight = Math.max(opts.rowHeight, 1);
	if (count <= 0) return EMPTY;

	// First row whose bottom edge is past the viewport top; last row whose top
	// edge is before the viewport bottom.
	const firstVisible = Math.floor(scrollTop / rowHeight);
	const lastVisible = Math.ceil((scrollTop + viewportSpan) / rowHeight) - 1;

	const startIndex = clamp(firstVisible - overscan, 0, count - 1);
	const endIndex = clamp(lastVisible + overscan, startIndex, count - 1);

	return {
		startIndex,
		endIndex,
		topPad: startIndex * rowHeight,
		bottomPad: (count - 1 - endIndex) * rowHeight,
		totalSize: count * rowHeight
	};
}

/**
 * Variable row-height window. Binary-searches a prebuilt {@link buildOffsets}
 * table, so each scroll tick is O(log n).
 */
export function variableWindow(opts: {
	offsets: number[];
	scrollTop: number;
	viewportSpan: number;
	overscan: number;
}): VirtualWindow {
	const { offsets, scrollTop, viewportSpan, overscan } = opts;
	const count = offsets.length - 1;
	if (count <= 0) return EMPTY;
	const totalSize = offsets[count];

	// Smallest index whose bottom edge (offsets[i + 1]) is past the viewport top.
	let lo = 0;
	let hi = count - 1;
	let firstVisible = count - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >>> 1;
		if (offsets[mid + 1] > scrollTop) {
			firstVisible = mid;
			hi = mid - 1;
		} else {
			lo = mid + 1;
		}
	}

	// Largest index whose top edge (offsets[i]) is before the viewport bottom.
	const viewportBottom = scrollTop + viewportSpan;
	lo = 0;
	hi = count - 1;
	let lastVisible = 0;
	while (lo <= hi) {
		const mid = (lo + hi) >>> 1;
		if (offsets[mid] < viewportBottom) {
			lastVisible = mid;
			lo = mid + 1;
		} else {
			hi = mid - 1;
		}
	}

	const startIndex = clamp(firstVisible - overscan, 0, count - 1);
	const endIndex = clamp(lastVisible + overscan, startIndex, count - 1);

	return {
		startIndex,
		endIndex,
		topPad: offsets[startIndex],
		bottomPad: totalSize - offsets[endIndex + 1],
		totalSize
	};
}
