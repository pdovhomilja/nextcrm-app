# Contributing to NextCRM

First off, thank you for considering contributing to NextCRM! It's people like you that make NextCRM a great tool for the community.

This document provides guidelines and instructions for contributing to the NextCRM project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Pull Requests](#pull-requests)
- [Development Guidelines](#development-guidelines)
  - [Code Style](#code-style)
  - [Testing](#testing)
  - [Database Changes](#database-changes)
  - [Internationalization](#internationalization)
- [Areas to Contribute](#areas-to-contribute)
- [Getting Help](#getting-help)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Accept responsibility and apologize when mistakes are made

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** ≥22.12.0
- **pnpm** ≥9.0.0 (package manager)
- **PostgreSQL** 17+ (database)
- **Git** (version control)

### Development Setup

1. **Fork the repository**
   
   Click the "Fork" button on the [GitHub repository](https://github.com/pdovhomilja/nextcrm-app) to create your own copy.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/nextcrm-app.git
   cd nextcrm-app
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Set up environment variables**

   ```bash
   cp .env.example .env
   cp .env.local.example .env.local
   ```

   Edit both files with your configuration:
   - `.env`: Set your PostgreSQL connection string (`DATABASE_URL`)
   - `.env.local`: Configure authentication, file uploads, and other services

5. **Initialize the database**

   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

6. **Seed the database with initial data**

   ```bash
   pnpm prisma db seed
   ```

7. **Start the development server**

   ```bash
   pnpm dev
   ```

   Visit `http://localhost:3000` to see the application.

## How to Contribute

### Reporting Bugs

If you find a bug, please [open an issue](https://github.com/pdovhomilja/nextcrm-app/issues) with the following information:

- Clear, descriptive title
- Steps to reproduce the bug
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Your environment (Node version, OS, browser)

### Suggesting Features

We welcome feature suggestions! When suggesting a feature:

- Explain the use case and problem you're trying to solve
- Describe the solution you'd like to see
- Consider alternative solutions you've thought about
- Add any relevant context or screenshots

### Pull Requests

1. **Create a branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Write clear, concise code
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed

3. **Test your changes**

   ```bash
    pnpm lint
    # run Playwright tests
    pnpm test:e2e
   ```

4. **Commit your changes**

   Use clear, descriptive commit messages:
   
   ```bash
   git commit -m "feat: add user profile settings page"
   # or
   git commit -m "fix: resolve login redirect issue"
   ```

5. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Provide a clear description of your changes
   - Reference any related issues
   - Wait for review and address feedback

## Development Guidelines

### Code Style

- **TypeScript**: We use strict TypeScript mode. Avoid `any` types (this is an active cleanup effort!)
- **ESLint**: Run `pnpm lint` before committing
- **Components**: Follow shadcn/ui patterns and use existing components from `@/components/ui`
- **Styling**: Use Tailwind CSS utility classes
- **Imports**: Use TypeScript path aliases (`@/*` for project root, `@/ui/*` for UI components)

### Testing

- We use **Playwright** for E2E testing
- Run tests with: `pnpm test:e2e` (headless) or `pnpm test:e2e:ui` (interactive UI)
- Run specific browser: `pnpm test:e2e --project=chromium`
- Debug tests: `pnpm test:e2e:debug`
- Add tests for new features when possible
- Ensure existing tests pass before submitting PRs

Test files are located in `/tests/e2e/` directory. Authentication state is managed in `/tests/auth.setup.ts`.

### Database Changes

When modifying the database schema:

1. Edit `prisma/schema.prisma`
2. Run `pnpm prisma db push` to apply changes
3. Run `pnpm prisma generate` to update the client
4. If needed, create a seed script in `prisma/seeds/`
5. Test your changes thoroughly

### Internationalization

NextCRM supports multiple languages (English, Czech, German, Ukrainian):

- Use `next-intl` for translations
- Add new translation keys to `/locales/{lang}.json`
- Use the `useTranslations()` hook in components
- Test in multiple languages if possible

### Project Structure

Familiarize yourself with the project layout:

```
/app           - Next.js App Router
  /[locale]    - Internationalized routes
    /(auth)    - Authentication pages
    /(routes)  - Protected application routes
      /crm     - CRM module
      /projects- Project management
      /invoice - Invoicing
      ...
/actions       - Server actions
/components    - React components
  /ui          - shadcn/ui components
/lib           - Utility libraries
/prisma        - Database schema
/types         - TypeScript types
```

## Areas to Contribute

Based on our [roadmap](https://github.com/pdovhomilja/nextcrm-app#roadmap), here are priority areas:

### 🎯 High Priority

- **Testing expansion**: Add Jest unit tests and expand Playwright E2E coverage
- **TypeScript cleanup**: Replace `any` types with proper TypeScript types
- **Bug fixes**: Check open issues for bugs that need fixing

### 📋 New Features

- **Email campaigns**: MailChimp and Listmonk integration
- **AI-powered features**: Extend OpenAI integration for task summaries
- **New modules**: Suggest and build new CRM functionality

### 🎨 Improvements

- **UI/UX enhancements**: Improve user experience
- **Performance**: Optimize loading times and bundle size
- **Documentation**: Improve code comments and README sections

### 🌍 Localization

- Add new language translations
- Improve existing translations

## Getting Help

- **Discord**: Join our community at [https://discord.gg/dHyxhTEzUb](https://discord.gg/dHyxhTEzUb)
- **GitHub Discussions**: Use for questions and general discussion
- **Issues**: For bug reports and feature requests
- **Twitter**: [@nextcrmapp](https://twitter.com/nextcrmapp)

## Recognition

Contributors will be recognized in our README and release notes. Thank you for helping make NextCRM better!

---

By contributing to NextCRM, you agree that your contributions will be licensed under the [MIT License](LICENSE.md).
