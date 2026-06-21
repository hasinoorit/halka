import { PLUGINS } from '../../../../lib/site/content';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () =>
	PLUGINS.map((plugin) => ({ slug: plugin.slug }));
