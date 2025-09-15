# HTML Style Guide

## Structure Rules

- Use 2 spaces for indentation
- Place nested elements on new lines with proper indentation
- Content between tags should be on its own line when multi-line

## Attribute Formatting

- Place each HTML attribute on its own line
- Align attributes vertically
- Keep the closing `>` on the same line as the last attribute

## Example HTML Structure

```html
<div className="container">
  <header
    className="flex flex-col space-y-2
                 md:flex-row md:space-y-0 md:space-x-4"
  >
    <h1 className="text-primary dark:text-primary-300">Page Title</h1>
    <nav
      className="flex flex-col space-y-2
                md:flex-row md:space-y-0 md:space-x-4"
    >
      <a href="/" className="btn-ghost"> Home </a>
      <a href="/about" className="btn-ghost"> About </a>
    </nav>
  </header>
</div>
```
