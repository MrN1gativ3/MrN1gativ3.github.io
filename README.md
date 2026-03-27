# Minimal Hugo Blog

This site is a custom Hugo blog with a clean, minimal layout and a simple Markdown workflow.

## Run locally

Install Hugo Extended, then start the local server:

```powershell
hugo server
```

Build the production site:

```powershell
hugo
```

## Deploy on GitHub Pages

This site is configured for GitHub Pages with a workflow at `.github/workflows/hugo.yaml`.

Push to the `main` branch of `mrn1gativ3.github.io`, then in GitHub set:

- `Settings -> Pages -> Source` to `GitHub Actions`

The workflow will build the Hugo site and publish it to:

```text
https://mrn1gativ3.github.io/
```

## Add a new post

Use a page bundle so each post keeps its Markdown and images together:

```text
content/
  posts/
    my-new-post/
      index.md
      cover.jpg
      screenshot.png
```

You can create a draft manually, or once Hugo is installed:

```powershell
hugo new posts/my-new-post/index.md
```

Starter front matter:

```yaml
---
title: "My New Post"
date: 2026-03-27T09:00:00+05:30
draft: false
description: "Short line used in metadata and previews."
intro: "Opening description shown below the title on the post page."
tags: ["notes", "code"]
image: "cover.jpg"
showtoc: true
hideSummary: true
---
```

## Images and code

Use the `image` field for the hero image at the top of the post.

Inline images can live in the same post folder:

```md
![Diagram](screenshot.png)
```

Use fenced code blocks and Hugo will render them with syntax highlighting:

````md
```js
export function hello(name) {
  return `hello ${name}`;
}
```
````

## Animated post cards

You can insert animated technical cards directly inside any Markdown post with the `animcard` shortcode.

Malware analysis:

```md
{{< animcard type="malware" title="Packed Loader" note="Sandbox trace, staged unpacking, and beacon flow." >}}
```

Exploitation:

```md
{{< animcard type="exploitation" title="Heap Overflow Path" note="Chunk corruption and target pointer takeover." >}}
```

Reversing:

```md
{{< animcard type="reversing" title="Dispatcher Recovery" note="Disassembly stepping, registers, and xref hints." >}}
```

Kernel:

```md
{{< animcard type="kernel" title="Syscall Walk" note="Privilege transition and kernel object traversal." >}}
```

You can also use a card as the main hero for a post by adding front matter like this:

```yaml
animcard: "reversing"
animcardtitle: "Dispatcher Recovery"
animcardnote: "Disassembly stepping, registers, and xref hints."
```

When `animcard` is present, the single post page will render that animation above the article instead of the static hero image.

## Files to customize

- `hugo.toml` for site name, social links, and description
- `assets/css/site.css` for the look and feel
- `layouts/index.html` for the homepage layout
- `layouts/_default/single.html` for blog post pages
