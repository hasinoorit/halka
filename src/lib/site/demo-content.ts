export const DEMO_CONTENT = `
<h1>Halka Editor Demo</h1>
<p>
	This is a <strong>modern</strong> rich text editor built with Svelte and TypeScript.
	Try <span style="color: #e11d48; font-size: 18px"><strong><em>Find &amp; Replace</em></strong></span>
	(Cmd/Ctrl+F) to search for <strong>editor</strong> — the word appears several times in this demo.
</p>

<h2>Formatting</h2>
<p>
	Use the toolbar for <strong>bold</strong>, <em>italic</em>, <u>underline</u>, and
	<s>strikethrough</s>. Try the clear-formatting button to remove semantic tags, or the eraser
	to remove inline styles.
</p>

<blockquote>"Simplicity is the ultimate sophistication." — Leonardo da Vinci</blockquote>

<h3>Lists</h3>
<ul>
	<li>Unordered item one</li>
	<li>Unordered item two
		<ul>
			<li>Nested item (Tab to indent)</li>
		</ul>
	</li>
</ul>
<ol>
	<li>Ordered step one</li>
	<li>Ordered step two</li>
</ol>

<h3>Links &amp; media</h3>
<p>
	<a href="https://github.com/hasinoorit/halka">View on GitHub</a> —
	insert images from the toolbar.
</p>

<h3>Table</h3>
<table>
	<thead>
		<tr>
			<th>Feature</th>
			<th>Plugin</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>History</td>
			<td>historyPlugin</td>
		</tr>
		<tr>
			<td>Find &amp; Replace</td>
			<td>findReplacePlugin</td>
		</tr>
	</tbody>
</table>

<h3>Code block</h3>
<pre><code>const editor = new HalkaEditor(root, { plugins: [historyPlugin] });</code></pre>

<p>Type markdown shortcuts: <code># </code> for headings, <code>&gt; </code> for quotes, <code>- </code> for lists.</p>

<p>The editor plugin system keeps the core small<sup data-footnote-id="demo-fn-1"></sup>. Try editing this content!</p>
<div data-footnotes>
	<div data-footnote-id="demo-fn-1" data-footnote-number="1">
		<p>Footnotes are managed from the toolbar. Citations auto-number when inserted.</p>
	</div>
</div>
`.trim();
