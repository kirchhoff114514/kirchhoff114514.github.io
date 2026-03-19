# Zensical Documentation

Zensical is a modern static site generator designed to simplify building and maintaining project documentation. Built by the creators of Material for MkDocs, it shares the same core design principles and philosophy - batteries included, easy to use, with powerful customization options. Zensical is written in Rust and Python, published as a Python package, and uses TOML for configuration (though it also supports mkdocs.yml files for easier migration).

The tool provides a complete solution for technical documentation with features including automatic navigation generation, instant page loading (SPA-like behavior), code syntax highlighting with annotations, content tabs, admonitions, search functionality, and support for 60+ languages. Zensical supports two theme variants: a modern fresh design (default) and a classic variant that matches Material for MkDocs styling.

## CLI Commands

### Create New Project

Creates a new documentation project with a basic structure including configuration file, docs directory, and GitHub Actions workflow.

```bash
# Create a new project in the current directory
zensical new .

# Create a new project in a specific directory
zensical new my-docs

# Get help for the new command
zensical new --help
```

The generated project structure:

```
.
├─ .github/
├─ docs/
│  ├─ index.md
│  └─ markdown.md
└─ zensical.toml
```

### Preview Documentation

Starts a local development server with live reload for previewing documentation as you write.

```bash
# Start preview server on default port (localhost:8000)
zensical serve

# Open preview in default browser automatically
zensical serve --open

# Use custom address and port
zensical serve --dev-addr localhost:3000

# Use specific config file
zensical serve --config-file ./custom-config.toml

# Get help for serve options
zensical serve --help
```

### Build Static Site

Builds the documentation into a static site ready for deployment.

```bash
# Build the static site (output to 'site' directory by default)
zensical build

# Build with clean cache
zensical build --clean

# Build with specific config file
zensical build --config-file ./zensical.toml

# Get help for build options
zensical build --help
```

## Configuration

### Basic Configuration (zensical.toml)

Minimal configuration to get started with Zensical.

```toml
[project]
site_name = "My Documentation Site"
site_url = "https://example.com"
site_description = "Documentation for my awesome project"
site_author = "John Doe"
copyright = "&copy; 2025 My Company"

# Source and output directories
docs_dir = "docs"
site_dir = "site"

# URL structure (true = /page/, false = /page.html)
use_directory_urls = true

# Development server address
dev_addr = "localhost:8000"
```

### Theme Configuration

Configure theme variant, color scheme, and feature flags.

```toml
[project.theme]
# Theme variant: "modern" (default) or "classic"
variant = "modern"

# Color palette configuration
[project.theme.palette]
scheme = "default"      # "default" (light) or "slate" (dark)
primary = "indigo"      # Primary color
accent = "indigo"       # Accent color for interactive elements

# Enable theme features
[project.theme]
features = [
    "navigation.instant",       # SPA-like navigation
    "navigation.instant.prefetch",  # Prefetch on hover
    "navigation.instant.progress",  # Loading progress indicator
    "navigation.tracking",      # URL anchor tracking
    "navigation.tabs",          # Top-level tabs navigation
    "navigation.tabs.sticky",   # Sticky tabs on scroll
    "navigation.sections",      # Render sections as groups
    "navigation.expand",        # Expand all nav sections
    "navigation.path",          # Breadcrumb navigation
    "navigation.prune",         # Reduce HTML size by 33%+
    "navigation.indexes",       # Section index pages
    "navigation.top",           # Back-to-top button
    "navigation.footer",        # Footer navigation
    "toc.follow",               # Auto-scroll TOC
    "toc.integrate",            # Integrate TOC in nav sidebar
    "content.code.copy",        # Code copy button
    "content.code.select",      # Code line selection
    "content.code.annotate",    # Code annotations
    "content.tabs.link",        # Linked content tabs
    "search.highlight",         # Highlight search terms
]
```

### Color Palette Toggle (Light/Dark Mode)

Enable users to switch between light and dark modes.

```toml
# Light mode
[[project.theme.palette]]
media = "(prefers-color-scheme: light)"
scheme = "default"
primary = "indigo"
accent = "indigo"
toggle.icon = "lucide/sun"
toggle.name = "Switch to dark mode"

# Dark mode
[[project.theme.palette]]
media = "(prefers-color-scheme: dark)"
scheme = "slate"
primary = "indigo"
accent = "orange"
toggle.icon = "lucide/moon"
toggle.name = "Switch to light mode"

# Auto mode (follows system preference)
[[project.theme.palette]]
media = "(prefers-color-scheme)"
toggle.icon = "lucide/sun-moon"
toggle.name = "Switch to light mode"
```

### Navigation Configuration

Define explicit navigation structure.

```toml
[project]
nav = [
    {"Home" = "index.md"},
    {"Getting Started" = [
        "getting-started/index.md",
        "getting-started/installation.md",
        "getting-started/quick-start.md"
    ]},
    {"API Reference" = [
        "api/index.md",
        {"Authentication" = "api/auth.md"},
        {"Endpoints" = "api/endpoints.md"}
    ]},
    {"External Link" = "https://github.com/myproject"}
]
```

### Markdown Extensions Configuration

Enable syntax highlighting, admonitions, and other extensions.

```toml
# Admonitions (call-outs)
[project.markdown_extensions.admonition]
[project.markdown_extensions.pymdownx.details]

# Code syntax highlighting
[project.markdown_extensions.pymdownx.highlight]
anchor_linenums = true
line_spans = "__span"
pygments_lang_class = true

[project.markdown_extensions.pymdownx.inlinehilite]
[project.markdown_extensions.pymdownx.snippets]
[project.markdown_extensions.pymdownx.superfences]

# Content tabs
[project.markdown_extensions.pymdownx.tabbed]
alternate_style = true

# Table of contents
[project.markdown_extensions.toc]
permalink = true
```

### Custom CSS and JavaScript

Add custom stylesheets and scripts.

```toml
[project]
extra_css = ["stylesheets/extra.css"]
extra_javascript = ["javascripts/extra.js"]

# Load JavaScript as module
[[project.extra_javascript]]
path = "javascripts/extra.js"
type = "module"

# Load JavaScript with async
[[project.extra_javascript]]
path = "javascripts/analytics.js"
async = true
```

## Markdown Authoring

### Front Matter

Configure page-specific metadata in YAML front matter.

```markdown
---
title: Custom Page Title
description: SEO description for this page
icon: lucide/book
status: new
template: custom_template.html
hide:
  - navigation
  - toc
  - path
---

# Page Content

Your markdown content here...
```

### Admonitions (Call-outs)

Create highlighted blocks for notes, warnings, tips, etc.

```markdown
!!! note "Optional Title"

    This is a note admonition. Content must be indented by 4 spaces.

!!! warning

    This is a warning without a custom title.

!!! tip "Pro Tip"

    Helpful tip content here.

??? info "Collapsible Block (Closed by Default)"

    This content is hidden until clicked.

???+ example "Collapsible Block (Open by Default)"

    This content is visible but can be collapsed.

!!! note ""

    Admonition without title (empty string removes icon and title).

!!! info inline end "Sidebar Note"

    This renders as an inline block on the right side.
```

Available types: `note`, `abstract`, `info`, `tip`, `success`, `question`, `warning`, `failure`, `danger`, `bug`, `example`, `quote`

### Code Blocks

Syntax-highlighted code with titles, line numbers, and annotations.

````markdown
```python title="hello.py" linenums="1" hl_lines="2 3"
def greet(name):
    message = f"Hello, {name}!"  # (1)!
    return message

print(greet("World"))
```

1.  This is a code annotation! Supports **formatting**, `code`, and more.
````

Inline syntax highlighting:

```markdown
Use the `#!python range()` function to generate sequences.
```

### Content Tabs

Group related content under switchable tabs.

````markdown
=== "Python"

    ```python
    def hello():
        print("Hello, World!")
    ```

=== "JavaScript"

    ```javascript
    function hello() {
        console.log("Hello, World!");
    }
    ```

=== "Go"

    ```go
    func hello() {
        fmt.Println("Hello, World!")
    }
    ```
````

### Tables

Create data tables with standard Markdown syntax.

```markdown
| Method   | Endpoint       | Description            |
|----------|----------------|------------------------|
| GET      | /api/users     | List all users         |
| POST     | /api/users     | Create a new user      |
| GET      | /api/users/:id | Get user by ID         |
| PUT      | /api/users/:id | Update user            |
| DELETE   | /api/users/:id | Delete user            |
```

## Customization

### Custom Color Scheme

Create a named color scheme with CSS variables.

```css
/* docs/stylesheets/extra.css */
[data-md-color-scheme="youtube"] {
    --md-primary-fg-color: #EE0F0F;
    --md-primary-fg-color--light: #ECB7B7;
    --md-primary-fg-color--dark: #90030C;
}

/* Override for all schemes */
:root > * {
    --md-primary-fg-color: #EE0F0F;
}
```

```toml
# zensical.toml
[project]
extra_css = ["stylesheets/extra.css"]

[project.theme.palette]
scheme = "youtube"
```

### Template Overrides

Override theme templates by creating files in the overrides directory.

```toml
# zensical.toml
[project.theme]
custom_dir = "overrides"
```

```html
<!-- overrides/main.html -->
{% extends "base.html" %}

{% block htmltitle %}
  <title>Custom Title - {{ page.title }}</title>
{% endblock %}

{% block extrahead %}
  <meta name="robots" content="noindex, nofollow" />
  {{ super() }}
{% endblock %}

{% block scripts %}
  {{ super() }}
  <script src="custom-analytics.js"></script>
{% endblock %}
```

Available template blocks: `analytics`, `announce`, `config`, `container`, `content`, `extrahead`, `fonts`, `footer`, `header`, `hero`, `htmltitle`, `libs`, `outdated`, `scripts`, `site_meta`, `site_nav`, `styles`, `tabs`

### Content Area Width

Customize the maximum width of the content area.

```css
/* docs/stylesheets/extra.css */
.md-grid {
    max-width: 1440px;
}

/* Or stretch to full width */
.md-grid {
    max-width: initial;
}
```

## Deployment

### GitHub Pages with GitHub Actions

Automated deployment workflow for GitHub Pages.

```yaml
# .github/workflows/docs.yml
name: Documentation
on:
  push:
    branches:
      - master
      - main
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/configure-pages@v5
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with:
          python-version: 3.x
      - run: pip install zensical
      - run: zensical build --clean
      - uses: actions/upload-pages-artifact@v4
        with:
          path: site
      - uses: actions/deploy-pages@v4
        id: deployment
```

### GitLab Pages

Automated deployment for GitLab Pages.

```yaml
# .gitlab-ci.yml
pages:
  stage: deploy
  image: python:latest
  script:
    - pip install zensical
    - zensical build --clean
  pages:
    publish: public
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

Note: Set `site_dir = "public"` in your configuration for GitLab Pages.

## JavaScript Integration

### Document Observable

Subscribe to page load events for instant navigation compatibility.

```javascript
// docs/javascripts/extra.js
document$.subscribe(function() {
    console.log("Page loaded - initialize third-party libraries here");

    // Initialize components after each navigation
    initializeCustomComponents();
});
```

## Summary

Zensical excels at creating professional documentation sites with minimal configuration. Its primary use cases include API documentation, software project documentation, knowledge bases, and technical guides. The tool integrates seamlessly with Git-based workflows, enabling automatic deployments to GitHub Pages or GitLab Pages with simple CI/CD configurations.

The integration patterns follow a straightforward approach: start with `zensical new` to scaffold a project, configure via `zensical.toml` for site metadata and features, write content in Markdown with rich extensions (admonitions, code blocks, tabs), customize appearance through CSS variables and template overrides, and deploy automatically via GitHub Actions or GitLab CI. The transition from MkDocs/Material for MkDocs is simplified through native support for `mkdocs.yml` configuration files, making Zensical an accessible upgrade path for existing documentation projects.
