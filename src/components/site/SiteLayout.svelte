<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import Button from '../ui/button.svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/demo', label: 'Demo' },
		{ href: '/docs', label: 'Docs' }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<header class="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
		<div class="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
			<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
				<svg
					class="h-7 w-7"
					viewBox="0 0 1024 1024"
					xmlns="http://www.w3.org/2000/svg"
					fill="currentColor"
					aria-hidden="true"
				>
					<rect x="301" y="183" width="121" height="644" rx="28" />
					<rect x="601" y="183" width="122" height="644" rx="28" />
				</svg>
				Halka
			</a>

			<nav class="hidden items-center gap-1 md:flex">
				{#each navItems as item}
					<a
						href={item.href}
						class="rounded-md px-3 py-2 text-sm transition-colors {isActive(item.href, $page.url.pathname)
							? 'bg-accent text-accent-foreground font-medium'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						{item.label}
					</a>
				{/each}
			</nav>

			<div class="flex items-center gap-2">
				<Button
					size="sm"
					variant="outline"
					className="hidden sm:inline-flex"
					onclick={() => window.open('https://github.com/hasinoorit/halka', '_blank')}
				>
					GitHub
				</Button>
			</div>
		</div>

		<nav class="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
			{#each navItems as item}
				<a
					href={item.href}
					class="shrink-0 rounded-md px-3 py-1.5 text-xs {isActive(item.href, $page.url.pathname)
						? 'bg-accent text-accent-foreground font-medium'
						: 'text-muted-foreground'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</header>

	<main class="container mx-auto max-w-6xl px-4 py-8">
		{@render children?.()}
	</main>

	<footer class="border-t border-border py-8 text-center text-sm text-muted-foreground">
		<p>
			<a href="https://github.com/hasinoorit/halka" class="underline hover:text-foreground">MIT</a>
			· Halka Editor
		</p>
	</footer>
</div>
