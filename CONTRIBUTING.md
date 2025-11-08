# Contributing to NextCRM

Thank you for your interest in contributing to NextCRM! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Getting Help](#getting-help)

---

## Code of Conduct

This project adheres to a Code of Conduct to ensure a welcoming and inclusive community. By participating, you agree to:

- Be respectful and constructive in all interactions
- Welcome diverse perspectives and ideas
- Focus on what's best for the community
- Show empathy and understanding
- Report inappropriate behavior to maintainers

---

## Getting Started

### Prerequisites
- Node.js 18+ (recommend 20+)
- pnpm (or npm/yarn)
- Git
- MongoDB Atlas account (for database)
- GitHub account

### Fork & Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/nextcrm-app.git
cd nextcrm-app

# Add upstream remote to stay in sync
git remote add upstream https://github.com/DrivenIdeaLab/nextcrm-app.git
```

---

## Development Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Configuration
```bash
# Copy example env file
cp .env.example .env.local

# Edit with your configuration
# Minimum required:
# - DATABASE_URL (MongoDB Atlas)
# - NEXTAUTH_URL and NEXTAUTH_SECRET
# - Optional: OPENAI_API_KEY, RESEND_API_KEY
```

### 3. Database Setup
```bash
# Generate Prisma client
pnpm exec prisma generate

# Push schema to database
pnpm exec prisma db push

# Seed initial data (optional)
pnpm exec prisma db seed
```

### 4. Start Development Server
```bash
pnpm run dev
```

Visit `http://localhost:3000` in your browser.

---

## Making Changes

### Create a Feature Branch
```bash
# Update main branch
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Convention
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates
- `chore/` - Maintenance tasks

Examples:
- `feature/add-invoice-export`
- `fix/contact-search-bug`
- `docs/update-api-reference`

### Development Workflow

1. **Create your feature branch** (see above)
2. **Make your changes** following [Coding Standards](#coding-standards)
3. **Test your changes** (see [Testing](#testing))
4. **Keep your branch updated** with upstream
5. **Commit with clear messages** (see [Commit Guidelines](#commit-guidelines))
6. **Submit a Pull Request** (see [Pull Request Process](#pull-request-process))

---

## Commit Guidelines

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat:` - A new feature
- `fix:` - A bug fix
- `refactor:` - Code refactoring without feature change
- `perf:` - Performance improvement
- `docs:` - Documentation update
- `test:` - Test addition or update
- `chore:` - Maintenance, dependencies, build process
- `style:` - Code style changes (formatting, semicolons, etc.)

### Scope
Optional scope showing what part of the application is affected:
- `crm` - CRM module
- `projects` - Projects module
- `invoice` - Invoice module
- `documents` - Documents module
- `auth` - Authentication
- `api` - API routes
- `ui` - UI components
- `db` - Database/Prisma

### Subject
- Use imperative, present tense: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Keep to 50 characters or less

### Body
- Optional but recommended for non-trivial changes
- Explain what and why, not how
- Wrap at 72 characters
- Separate from subject with blank line

### Footer
Optional, use for:
- Breaking changes: `BREAKING CHANGE: description`
- Issue references: `Closes #123`, `Fixes #456`

### Examples

**Simple commit:**
```
feat(crm): add contact duplicate detection
```

**Detailed commit:**
```
fix(projects): resolve task notification delay

Task notifications were delayed by 30 seconds due to
inefficient database query. Optimized with proper
indexing on the tasks collection.

Closes #789
```

**Breaking change:**
```
refactor(api): remove legacy REST endpoints

BREAKING CHANGE: REST API endpoints in /api/v1 are
removed in favor of Server Actions. Use the new
Server Action interfaces instead.

See MIGRATION_GUIDE.md for details.
```

---

## Pull Request Process

### Before Creating a PR

1. **Update your branch:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Test your changes:**
   ```bash
   pnpm run lint
   pnpm run build
   npm run test  # If applicable
   ```

3. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

### Creating the PR

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select `main` as base and your feature branch as compare
4. Fill out the PR template with:
   - Clear title: `feat(scope): description`
   - Description of changes
   - Screenshots (if UI changes)
   - Testing instructions
   - Checklist completion

### PR Template
```markdown
## Description
Brief description of what this PR does.

## Related Issues
Closes #123

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes:
1. Step 1
2. Step 2

## Screenshots (if applicable)
Include before/after screenshots.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed my own code
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### PR Review Process

- A maintainer will review your PR
- They may request changes
- Respond to comments and push updates
- Once approved, your PR will be merged

---

## Coding Standards

### TypeScript
- Use TypeScript for all code
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Export types from separate `.ts` files when useful

```typescript
// Good
interface User {
  id: string
  email: string
  name: string
}

function getUser(id: string): Promise<User> {
  // implementation
}

// Avoid
function getUser(id: any): any {
  // implementation
}
```

### React Components

#### Use Functional Components
```typescript
// Good
export function ContactCard({ contact }: { contact: Contact }) {
  return <div>{contact.name}</div>
}

// Avoid class components
```

#### Props Interface
```typescript
interface ContactCardProps {
  contact: Contact
  onSelect?: (contact: Contact) => void
  isLoading?: boolean
}

export function ContactCard({
  contact,
  onSelect,
  isLoading,
}: ContactCardProps) {
  // implementation
}
```

#### Use shadcn/ui Components
```typescript
// Good - use existing shadcn/ui components
import { Button } from '@/components/ui/button'

export function MyComponent() {
  return <Button onClick={handleClick}>Click me</Button>
}

// Avoid creating custom button components
```

### Server Actions

#### Use 'use server' Directive
```typescript
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CreateContactSchema } from '@/types/contact'

export async function createContact(data: unknown) {
  // Validate input
  const validated = CreateContactSchema.parse(data)

  // Check auth
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Perform operation
  const contact = await prisma.crm_Contacts.create({
    data: {
      ...validated,
      createdBy: session.user.id,
    }
  })

  return contact
}
```

#### Input Validation with Zod
```typescript
import { z } from 'zod'

const CreateContactSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  accountId: z.string(),
})

type CreateContactInput = z.infer<typeof CreateContactSchema>
```

### File Organization
```typescript
// Group imports
import * as React from 'react'
import { type ReactNode } from 'react'

import { ExternalLibrary } from 'external-package'
import { UtilityFunction } from '@/lib/utils'
import { CustomComponent } from '@/components/custom'

// Components first, then hooks, then utilities, then exports
```

### Naming Conventions
- **Files:** `kebab-case` (e.g., `contact-card.tsx`)
- **Components:** `PascalCase` (e.g., `ContactCard`)
- **Hooks:** `camelCase` starting with `use` (e.g., `useContacts`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)
- **Functions:** `camelCase` (e.g., `getContactById`)
- **Variables:** `camelCase` (e.g., `isLoading`)

### Code Style
- 2-space indentation
- No trailing commas (except in multiline)
- Semicolons required
- Single quotes for strings (in TypeScript)
- Use `const`, prefer immutability
- Avoid deeply nested ternaries

---

## Testing

### Manual Testing Checklist
- [ ] Tested in development environment
- [ ] Tested on mobile/tablet if UI changes
- [ ] Tested dark mode if applicable
- [ ] Tested with different user roles
- [ ] Verified database changes with Prisma Studio

### Running Tests
```bash
# Type checking
pnpm exec tsc --noEmit

# Linting
pnpm run lint

# Build verification
pnpm run build

# E2E tests (if available)
npx cypress run
```

### Writing Tests
For Cypress E2E tests, add tests in `cypress/` directory:
```typescript
describe('Contact Creation', () => {
  it('should create a new contact', () => {
    cy.visit('/contacts')
    cy.contains('button', 'New Contact').click()
    cy.get('input[name="email"]').type('test@example.com')
    cy.contains('button', 'Create').click()
    cy.contains('Contact created successfully').should('be.visible')
  })
})
```

---

## Documentation

### Update Documentation When:
- Adding new features
- Changing API
- Modifying database schema
- Adding new environment variables
- Changing deployment process

### Documentation Files
- `README.md` - Getting started, overview
- `ARCHITECTURE.md` - Technical design
- `API.md` - API reference (if needed)
- `CONTRIBUTING.md` - This file
- `SCHEMA.md` - Database schema (if needed)
- Code comments - Complex logic explanation

### Code Comments
```typescript
// Good: Explains WHY, not WHAT
// MongoDB aggregation pipeline doesn't support MongoDB date functions
// in certain contexts, so we filter in-memory after fetch
const contacts = await prisma.crm_Contacts.findMany()
const recentContacts = contacts.filter(c =>
  isAfter(c.createdAt, thirtyDaysAgo)
)

// Avoid: Explains WHAT the code does
// Filter contacts created in the last 30 days
const recentContacts = contacts.filter(c =>
  isAfter(c.createdAt, thirtyDaysAgo)
)
```

---

## Getting Help

### Questions or Need Clarification?
- Open a [GitHub Discussion](https://github.com/DrivenIdeaLab/nextcrm-app/discussions)
- Check existing issues and PRs
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details

### Common Issues

**Database connection fails:**
- Verify DATABASE_URL is correct
- Check MongoDB Atlas IP whitelist includes your IP
- Ensure credentials have proper permissions

**Build fails:**
```bash
# Clean and rebuild
rm -rf .next node_modules
pnpm install
pnpm run build
```

**Type errors:**
```bash
# Regenerate Prisma client
pnpm exec prisma generate
```

---

## Recognition

Contributors will be recognized in:
- Repository contributors list
- Release notes (for significant contributions)
- Project README (for major features)

---

## License

By contributing to NextCRM, you agree that your contributions will be licensed under the MIT License.

---

## Summary

Thank you for contributing to NextCRM! Here's a quick checklist:

- [ ] Read Code of Conduct
- [ ] Set up development environment
- [ ] Create feature branch from `main`
- [ ] Follow Commit Guidelines
- [ ] Follow Coding Standards
- [ ] Test your changes
- [ ] Update documentation
- [ ] Submit Pull Request with clear description
- [ ] Respond to review feedback

Happy coding! 🚀

---

For more details, see:
- [README.md](README.md) - Project overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
- [GitHub Issues](https://github.com/DrivenIdeaLab/nextcrm-app/issues) - Report bugs
- [GitHub Discussions](https://github.com/DrivenIdeaLab/nextcrm-app/discussions) - Ask questions
