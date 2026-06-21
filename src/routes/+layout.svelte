<script lang="ts">
	import './layout.css';
	import SiteLayout from '../components/site/SiteLayout.svelte';

	const { children } = $props();
</script>

<SiteLayout>
	{@render children()}
</SiteLayout>
