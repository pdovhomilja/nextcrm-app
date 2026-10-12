import Link from 'next/link';

const sections = [
  {
    href: '/docs/users',
    title: 'User guide',
    text: 'Work with accounts, contacts, leads, opportunities, projects, invoices and email in NextCRM.',
  },
  {
    href: '/docs/admins',
    title: 'Admin guide',
    text: 'Install, configure, upgrade and back up a self-hosted NextCRM instance.',
  },
  {
    href: '/docs/developers',
    title: 'Developer guide',
    text: 'Run NextCRM locally, understand the architecture, build plugins and connect AI agents over MCP.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-3 text-3xl font-bold">NextCRM documentation</h1>
      <p className="mb-10 max-w-2xl text-fd-muted-foreground">
        NextCRM is an open-source, AI-first CRM built on Next.js, Prisma and PostgreSQL. Pick the
        guide that fits what you need to do.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-xl border bg-fd-card p-5 transition-colors hover:bg-fd-accent"
          >
            <h2 className="mb-2 font-semibold">{section.title}</h2>
            <p className="text-sm text-fd-muted-foreground">{section.text}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
