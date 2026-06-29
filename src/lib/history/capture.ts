import { invertActions } from './actions.js';
import { computeDiff, diffToActions } from './diff.js';
import { extractEditableText } from './offset-map.js';
import type {
	Action,
	Diff,
	EditableSnapshot,
	HistorySource,
	HistoryStep,
	SelectionOffsets
} from './types.js';

let stepId = 0;

export function nextStepId(): string {
	stepId += 1;
	return `step-${stepId}`;
}

export function captureEditableSnapshot(
	root: HTMLElement,
	selection: SelectionOffsets
): EditableSnapshot {
	return {
		text: extractEditableText(root),
		selection
	};
}

export type CaptureInput = {
	before: EditableSnapshot;
	after: EditableSnapshot;
	beforeHtml: string;
	afterHtml: string;
	actions: Action[];
	selectionBefore: SelectionOffsets;
	selectionAfter: SelectionOffsets;
	source: HistorySource;
	preferActions: boolean;
};

export function buildHistoryStep(input: CaptureInput): HistoryStep | null {
	const { before, after, beforeHtml, afterHtml, actions, preferActions } = input;

	let stepActions: Action[] | undefined;
	let diff: Diff | undefined;
	let inverse: Action[] | undefined;

	if (preferActions && actions.length > 0) {
		stepActions = actions;
		inverse = invertActions(actions);
	} else {
		diff = computeDiff(before, after, beforeHtml, afterHtml);
		if (!diff) {
			if (input.selectionBefore.start !== input.selectionAfter.start ||
				input.selectionBefore.end !== input.selectionAfter.end) {
				return null;
			}
			return null;
		}
		stepActions = diffToActions(diff);
		inverse = invertActions(stepActions);
	}

	if (!stepActions?.length && !diff) {
		return null;
	}

	return {
		id: nextStepId(),
		actions: stepActions,
		diff,
		inverse,
		selectionBefore: input.selectionBefore,
		selectionAfter: input.selectionAfter,
		source: input.source
	};
}

export function squashSteps(steps: HistoryStep[]): HistoryStep | null {
	if (steps.length === 0) return null;
	if (steps.length === 1) return steps[0];

	const first = steps[0];
	const last = steps[steps.length - 1];
	const actions: Action[] = [];
	for (const step of steps) {
		if (step.actions) {
			actions.push(...step.actions);
		} else if (step.diff) {
			actions.push(...diffToActions(step.diff));
		}
	}

	return {
		id: nextStepId(),
		actions,
		inverse: invertActions(actions),
		selectionBefore: first.selectionBefore,
		selectionAfter: last.selectionAfter,
		source: first.source
	};
}
