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
				<svg width="32" height="32" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
					<rect x="301" y="183" width="121" height="644" rx="28"/>
					<rect x="601" y="183" width="122" height="644" rx="28"/>
					<g transform="translate(0 1024) scale(.1 -.1)">
					<path d="m8485 5778c-183-115-410-175-702-185l-173-6v44c0 95-45 139-143 139-71 0-110-20-133-68-16-34-17-34-65-29l-49 6v-500-500l51 2c49 3 52 1 64-27 23-54 59-74 136-74 94 0 127 28 136 112 7 73 10 73 233 59 277-17 462-68 639-176 32-19 65-35 72-35 8 0 48 32 89 71 237 224 513 397 769 484 129 43 107 45-411 43-424-3-482-5-478-18 21-70-18-130-85-130-47 0-66 12-151 90-55 51-75 63-139 85-16 5-10 10 31 26 31 12 77 43 115 78 35 32 79 66 97 75 82 42 173-37 132-115-11-19-2-19 477-19 293 0 483 4 478 9-6 5-52 25-103 45-262 101-513 263-725 470-88 86-93 87-162 44z"/>
					<path d="m4210 5175v-575h813c448 0 855 3 905 6l92 7v562 562l-46 7c-26 3-433 6-905 6h-859v-575z"/>
					</g>
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
