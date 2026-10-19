// Values from the code (descriptions, regex patterns, defaults) go into MDX table
// cells. Expected strings were checked by compiling them with @mdx-js/mdx +
// remark-gfm (the docs app pipeline): each renders back to the original text.
import { cell, code } from "@/scripts/docs/mdx";

const INPUT = "a\\b|c{d}<e>";

it("cell escapes backslash, pipe, braces and angle brackets", () => {
  expect(cell(INPUT)).toBe("a\\\\b\\|c\\{d\\}&lt;e&gt;");
});

it("cell keeps an already escaped-looking pipe literal", () => {
  expect(cell("x\\|y")).toBe("x\\\\\\|y");
});

it("code renders plain text as a code span", () => {
  expect(code("crm_list_accounts")).toBe("`crm_list_accounts`");
});

it("code renders text with a backslash, pipe or backtick as a JSX string", () => {
  expect(code(INPUT)).toBe('<code>{"a\\\\b\\u007cc{d}<e>"}</code>');
  expect(code("a`b")).toBe('<code>{"a`b"}</code>');
});
