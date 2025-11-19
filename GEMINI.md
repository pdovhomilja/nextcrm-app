# NextCRM Project Overview

This project is NextCRM, a Customer Relationship Management (CRM) application built on Next.js 14. It uses TypeScript, Prisma as the ORM with a MongoDB database, and AWS S3 for document storage. The UI is built with shadcn/ui and Tailwind CSS.

## Key Technologies

*   **Framework:** [Next.js](https://nextjs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **Database:** [MongoDB](https://www.mongodb.com/)
*   **Authentication:** [Auth.js](https://authjs.dev/)
*   **UI:** [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
*   **Data Fetching:** [SWR](https://swr.vercel.app/), [Axios](https://axios-http.com/), [Tanstack/react-query](https://react-query.tanstack.com/)
*   **Email:** [React Email](https://react.email/), [Resend](https://resend.com/)
*   **AI:** [OpenAI API](https://openai.com/blog/openai-api), [Rossum](https://rossum.ai/)
*   **Deployment:** [Vercel](https://vercel.com/)

## Building and Running

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Set up environment variables by copying `.env.example` to `.env` and `.env.local.example` to `.env.local`.
4.  Initialize Prisma:
    ```bash
    pnpm prisma generate
    pnpm prisma db push
    ```
5.  Seed the database:
    ```bash
    pnpm prisma db seed
    ```

### Development

To run the development server:

```bash
pnpm run dev
```

### Building

To create a production build:

```bash
pnpm run build
```

### Testing

To run the tests:

```bash
pnpm test
```

## Development Conventions

*   **Package Manager:** This project uses `pnpm`.
*   **Linting:** Code is linted with ESLint. Run the linter with:
    ```bash
    pnpm run lint
    ```
*   **Testing:** The project uses Jest for testing.
*   **Code Style:** The project uses Prettier for code formatting, which is likely integrated with the development workflow.
