---
title: "A Markdown Workflow That Stays Out of the Way"
date: 2026-03-25T11:30:00+05:30
draft: true
description: "Notes on keeping writing, code, and images inside a single post bundle."
intro: "A practical pattern for writing technical blog posts without fighting your tooling."
tags: ["malware-analysis", "process-injection", "reversing"]
image: "cover.svg"
showtoc: true
hideSummary: true
---

## Keep each post self-contained

When a post has its own folder, it becomes easy to move around, review, and publish. You are not hunting for missing screenshots or wondering where a diagram was stored.

## Write with headings

Use clear section headings and the post page will automatically render an index on the side. That makes longer posts easier to skim.

## Add code without friction

```python
def format_title(title: str) -> str:
    return title.strip().title()
```

## Mix text and assets

Inline screenshots, diagrams, and snippets can all live next to the Markdown file. That makes this setup good for tutorials and small engineering write-ups.

## A tiny publishing checklist

1. Write the Markdown.
2. Add the hero image.
3. Add tags.
4. Build and publish.
