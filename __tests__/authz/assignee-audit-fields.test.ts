// Assignee and audit fields in server actions. A server action takes whatever
// the client posts, so:
// - an assignee field (assigned_to, user, assigned_user, ownerId) written from
//   client input must be checked with assertAssignableUser(<same value>) in the
//   same function (an active user; partners only themselves);
// - an audit field (createdBy, updatedBy, created_by, updated_by) must never be
//   written from client input; it comes from the session.
// The scan parses every "use server" file under actions/ and app/ and looks at
// the explicit keys of Prisma create/createMany/update/updateMany/upsert data.
// A hit that is safe for another reason must be listed in REVIEWED with that
// reason. Behaviour is tested in __tests__/authz/task-board-writes.test.ts and
// action-input-fields.test.ts.
//
// Not covered: assignee fields that arrive inside a spread of parsed input
// (`data: { ...parsed.data }`); those actions check them by name before the
// write (see action-input-fields.test.ts).
import fs from "fs";
import path from "path";
import ts from "typescript";

const REVIEWED: Record<string, string> = {};

const ROOT = path.join(__dirname, "../..");
const WRITE_METHODS = new Set(["create", "createMany", "update", "updateMany", "upsert"]);
const DATA_KEYS = new Set(["data", "create", "update"]);
const ASSIGNEE = new Set(["assigned_to", "user", "assigned_user", "ownerId"]);
const AUDIT = new Set(["createdBy", "updatedBy", "created_by", "updated_by"]);

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : files(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

function bindingNames(name: ts.BindingName, out: string[]) {
  if (ts.isIdentifier(name)) out.push(name.text);
  else for (const el of name.elements) if (!ts.isOmittedExpression(el)) bindingNames(el.name, out);
}

type Fn = { name: string; node: ts.FunctionLikeDeclaration };

function topLevelFunctions(sf: ts.SourceFile): Fn[] {
  const out: Fn[] = [];
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.body) out.push({ name: stmt.name?.text ?? "default", node: stmt });
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || !d.initializer) continue;
        if (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) {
          out.push({ name: d.name.text, node: d.initializer });
        }
      }
    }
  }
  return out;
}

function unwrap(e: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression(e)) {
    e = e.expression;
  }
  return e;
}

// From client input: a parameter, a property of one, or a local taken from one.
function fromInput(e: ts.Expression, tainted: Set<string>): boolean {
  e = unwrap(e);
  while (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) e = unwrap(e.expression);
  return ts.isIdentifier(e) && tainted.has(e.text);
}

function taintedNames(fn: ts.FunctionLikeDeclaration): Set<string> {
  const tainted = new Set<string>();
  for (const p of fn.parameters) {
    const names: string[] = [];
    bindingNames(p.name, names);
    names.forEach((n) => tainted.add(n));
  }
  const decls: ts.VariableDeclaration[] = [];
  const collect = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && n.initializer) decls.push(n);
    ts.forEachChild(n, collect);
  };
  if (fn.body) collect(fn.body);
  for (let changed = true; changed; ) {
    changed = false;
    for (const d of decls) {
      if (!fromInput(d.initializer!, tainted)) continue;
      const names: string[] = [];
      bindingNames(d.name, names);
      for (const n of names) if (!tainted.has(n)) { tainted.add(n); changed = true; }
    }
  }
  return tainted;
}

function scanSource(file: string, src: string): string[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const first = sf.statements[0];
  if (!(first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === "use server")) {
    return [];
  }
  const hits = new Set<string>();
  for (const f of topLevelFunctions(sf)) {
    const tainted = taintedNames(f.node);
    // values passed to assertAssignableUser anywhere in the function
    const checked = new Set<string>();
    const findChecks = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "assertAssignableUser" && n.arguments[1]) {
        checked.add(unwrap(n.arguments[1]).getText(sf));
      }
      ts.forEachChild(n, findChecks);
    };
    if (f.node.body) findChecks(f.node.body);

    const checkData = (obj: ts.ObjectLiteralExpression) => {
      for (const prop of obj.properties) {
        if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) continue;
        if (!ts.isIdentifier(prop.name)) continue;
        const key = prop.name.text;
        const value = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
        if (!fromInput(value, tainted)) continue;
        if (AUDIT.has(key)) hits.add(`${file}#${f.name}: ${key}`);
        if (ASSIGNEE.has(key) && !checked.has(unwrap(value).getText(sf))) hits.add(`${file}#${f.name}: ${key}`);
      }
    };
    const visit = (n: ts.Node) => {
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        WRITE_METHODS.has(n.expression.name.text) &&
        n.arguments[0] &&
        ts.isObjectLiteralExpression(n.arguments[0])
      ) {
        for (const prop of n.arguments[0].properties) {
          if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name) || !DATA_KEYS.has(prop.name.text)) continue;
          const value = unwrap(prop.initializer);
          if (ts.isObjectLiteralExpression(value)) checkData(value);
        }
      }
      ts.forEachChild(n, visit);
    };
    if (f.node.body) visit(f.node.body);
  }
  return Array.from(hits);
}

function scan(): string[] {
  const out: string[] = [];
  for (const dir of ["actions", "app"]) {
    for (const file of files(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).split(path.sep).join("/");
      out.push(...scanSource(rel, fs.readFileSync(file, "utf8")));
    }
  }
  return out.sort();
}

describe("the scan", () => {
  const hit = (body: string) => scanSource("x.ts", `"use server";\n${body}`);

  it.each([
    ["an unchecked assignee", `export async function f(data: { user: string }) { const { user } = data; await prismadb.t.create({ data: { user } }); }`, ["x.ts#f: user"]],
    ["an assignee checked under another name", `export async function f(input: { assigned_to: string; x: string }) { await assertAssignableUser(me, input.x); await prismadb.t.update({ where: { id: "1" }, data: { assigned_to: input.assigned_to } }); }`, ["x.ts#f: assigned_to"]],
    ["an audit field from input", `export const f = async (data: { user: string }) => { await assertAssignableUser(me, data.user); await prismadb.t.create({ data: { user: data.user, createdBy: data.user } }); };`, ["x.ts#f: createdBy"]],
  ])("flags %s", (_label, body, expected) => {
    expect(hit(body)).toEqual(expected);
  });

  it.each([
    ["a checked assignee", `export async function f(data: { user: string }) { let { user } = data; if (user !== me.id) await assertAssignableUser(me, user); await prismadb.t.create({ data: { user, createdBy: me.id } }); }`],
    ["server-set fields", `export async function f(id: string) { const s = await getSession(); await prismadb.t.update({ where: { id }, data: { user: s.user.id, updatedBy: s.user.id } }); }`],
  ])("passes %s", (_label, body) => {
    expect(hit(body)).toEqual([]);
  });
});

const hits = scan();

it("assignees written from input are checked and audit fields come from the session, or are reviewed", () => {
  expect(hits.filter((k) => !Object.hasOwn(REVIEWED, k))).toEqual([]);
});

it("the inventory has no entries for actions the scan no longer flags", () => {
  expect(Object.keys(REVIEWED).filter((k) => !hits.includes(k))).toEqual([]);
});
