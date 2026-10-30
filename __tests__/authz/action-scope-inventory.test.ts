// Every exported server action that takes a record id and writes to the
// database must check the caller's scope on that record (Sentinel N1). The
// scan below finds such actions that never call a lib/authz helper other than
// requireAuthenticated (directly or through a helper in the same file). Each
// one it finds must be listed in REVIEWED with the reason it is safe; a new
// action fails here until someone has looked at it. Behaviour is tested in
// __tests__/authz/action-write-scope.test.ts and the other *-scope tests.
import fs from "fs";
import path from "path";
import ts from "typescript";

const REVIEWED: Record<string, string> = {
  "actions/crm/accounts/create-account.ts#createAccount": "creates a new row owned by the caller; ids are FK fields of the new row",
  "actions/crm/accounts/restore-account.ts#restoreAccount": "admin only (session.user.role check)",
  "actions/crm/contacts/restore-contact.ts#restoreContact": "admin only (session.user.role check)",
  "actions/crm/contracts/restore-contract/index.ts#restoreContract": "admin only (session.user.role check)",
  "actions/crm/leads/restore-lead.ts#restoreLead": "admin only (session.user.role check)",
  "actions/crm/opportunities/restore-opportunity.ts#restoreOpportunity": "admin only (session.user.role check)",
  "actions/emails/accounts.ts#deleteEmailAccount": "findFirst where { id, userId } before the write",
  "actions/emails/accounts.ts#setEmailAccountActive": "findFirst where { id, userId } before the write",
  "actions/emails/messages.ts#deleteEmail": "findFirst where { id, userId } before the write",
  "actions/emails/messages.ts#getEmail": "findFirst where { id, userId }; writes only the caller's own email",
  "actions/emails/messages.ts#sendEmail": "accountId: findFirst where { id, userId }",
  "actions/reports/config.ts#deleteConfig": "loadAndAuthorize (owner, manager or admin)",
  "actions/reports/config.ts#toggleShare": "loadAndAuthorize (owner, manager or admin)",
  "actions/reports/schedule.ts#deleteSchedule": "loadAndAuthorizeSchedule (owner, manager or admin)",
  "actions/reports/schedule.ts#updateSchedule": "loadAndAuthorizeSchedule (owner, manager or admin)",
  "actions/user/set-language.ts#setLanguage": "userId must be the caller unless admin",
  "actions/user/update-profile.ts#updateProfile": "userId must be the caller unless admin",
};

const ROOT = path.join(__dirname, "../..");
const ID_NAME = /^(id|\w+Id|\w+_id)s?$/;
const WRITE = /\bprismadb\.\w+\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\b|\$executeRaw|\$transaction/;
const NOT_SCOPE = new Set(["requireAuthenticated", "AuthenticationError", "AuthorizationError"]);

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : files(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

type Fn = { name: string; exported: boolean; node: ts.FunctionLikeDeclaration };

function topLevelFunctions(sf: ts.SourceFile): Fn[] {
  const out: Fn[] = [];
  const isExported = (n: ts.Node) => (ts.getCombinedModifierFlags(n as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.body) {
      out.push({ name: stmt.name?.text ?? "default", exported: isExported(stmt), node: stmt });
    }
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || !d.initializer) continue;
        let init: ts.Node = d.initializer;
        // createSafeAction(schema, handler): the handler is the action body
        if (ts.isCallExpression(init)) {
          const fnArg = init.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a));
          if (fnArg) init = fnArg;
        }
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          out.push({ name: d.name.text, exported: isExported(stmt), node: init });
        }
      }
    }
  }
  return out;
}

function takesId(fn: ts.FunctionLikeDeclaration, sf: ts.SourceFile): boolean {
  const names: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n)) names.push(n.text);
    ts.forEachChild(n, visit);
  };
  fn.parameters.forEach(visit);
  // ids read from the input object: data.id, const { taskId } = data, formData.get("id")
  const params = new Set(fn.parameters.flatMap((p) => (ts.isIdentifier(p.name) ? [p.name.text] : [])));
  const body = fn.body?.getText(sf) ?? "";
  for (const p of Array.from(params)) {
    for (const m of Array.from(body.matchAll(new RegExp(`\\b${p}\\.(\\w+)`, "g")))) names.push(m[1]);
    for (const m of Array.from(body.matchAll(new RegExp(`\\{([^}]*)\\}\\s*=\\s*${p}\\b`, "g")))) {
      names.push(...m[1].split(/[\s,:]+/));
    }
    for (const m of Array.from(body.matchAll(new RegExp(`\\b${p}\\.get\\(["'](\\w+)["']\\)`, "g")))) names.push(m[1]);
  }
  return names.some((n) => ID_NAME.test(n));
}

function scan() {
  const idWriters: string[] = [];
  const flagged: string[] = [];
  for (const file of files(path.join(ROOT, "actions"))) {
    const src = fs.readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
    const first = sf.statements[0];
    if (!(first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === "use server")) continue;

    const authz = new Set<string>();
    for (const stmt of sf.statements) {
      if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
      if (!stmt.moduleSpecifier.text.startsWith("@/lib/authz")) continue;
      const bindings = stmt.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) if (!NOT_SCOPE.has(el.name.text)) authz.add(el.name.text);
      }
    }

    const fns = topLevelFunctions(sf);
    const bodyOf = new Map(fns.map((f) => [f.name, f.node.body?.getText(sf) ?? ""]));
    const calls = (body: string, names: Iterable<string>) =>
      Array.from(names).some((n) => new RegExp(`\\b${n}\\s*\\(`).test(body));
    // a local helper that calls a scope helper (or another such helper) counts
    const scoped = new Set<string>();
    for (let changed = true; changed; ) {
      changed = false;
      for (const f of fns) {
        if (scoped.has(f.name)) continue;
        if (calls(bodyOf.get(f.name)!, authz) || calls(bodyOf.get(f.name)!, scoped)) {
          scoped.add(f.name);
          changed = true;
        }
      }
    }
    const writes = new Set(fns.filter((f) => WRITE.test(bodyOf.get(f.name)!)).map((f) => f.name));
    for (let changed = true; changed; ) {
      changed = false;
      for (const f of fns) {
        if (!writes.has(f.name) && calls(bodyOf.get(f.name)!, writes)) {
          writes.add(f.name);
          changed = true;
        }
      }
    }

    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    for (const f of fns) {
      if (!f.exported || !writes.has(f.name) || !takesId(f.node, sf)) continue;
      idWriters.push(`${rel}#${f.name}`);
      if (!scoped.has(f.name)) flagged.push(`${rel}#${f.name}`);
    }
  }
  return { idWriters, flagged: flagged.sort() };
}

const { idWriters, flagged } = scan();

it("finds the actions it is meant to police", () => {
  // the three Sentinel N1 actions: one plain id, one id + flag, ids in an object
  expect(idWriters).toEqual(expect.arrayContaining([
    "actions/crm/opportunities/approval.ts#requestApproval",
    "actions/crm/accounts/case-study.ts#setCaseStudyCandidate",
    "actions/projects/assign-document-to-task.ts#disconnectDocumentFromTask",
  ]));
});

it("every server action that takes an id and writes calls a lib/authz scope helper, or is reviewed", () => {
  expect(flagged.filter((k) => !Object.hasOwn(REVIEWED, k))).toEqual([]);
});

it("the inventory has no entries for actions the scan no longer flags", () => {
  expect(Object.keys(REVIEWED).filter((k) => !flagged.includes(k))).toEqual([]);
});
