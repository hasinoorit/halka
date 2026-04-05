import * as RangeHelpers from './range.js';
import * as NodeHelpers from './node.js';
import { isElementNode, isTextNode } from './node.js';

export { RangeHelpers as Range, NodeHelpers as Node, isElementNode, isTextNode };

export default {
	Range: RangeHelpers,
	Node: NodeHelpers,
	isElementNode,
	isTextNode
};
