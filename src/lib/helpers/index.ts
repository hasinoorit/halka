import * as RangeHelpers from './range.js';
import * as NodeHelpers from './node.js';
import * as BlockHelpers from './block.js';
import { isElementNode, isTextNode } from './node.js';

export { RangeHelpers as Range, NodeHelpers as Node, BlockHelpers as Block, isElementNode, isTextNode };

export default {
	Range: RangeHelpers,
	Node: NodeHelpers,
	isElementNode,
	isTextNode
};
