# Project Overview

This is a Next.js project called "taskhq.xmation.ai". It is a powerful, multi-tenant task management application with AI-powered features designed to streamline workflows and enhance productivity. The application provides a comprehensive suite of tools for managing tasks, boards, and projects, all within a collaborative, company-centric environment.

At its core, TaskHQ features a robust task management system with customizable boards, task prioritization, and status tracking. The application is built with a focus on user experience, featuring a modern, responsive interface with a dashboard that provides a clear overview of project metrics and user performance.

TaskHQ's standout feature is its integrated AI assistant, which offers smart suggestions, project insights, and automated task creation. The AI capabilities are powered by the OpenAI API and are deeply integrated into the application to provide a seamless and intelligent user experience.

## Key Features

*   **Multi-Tenant Architecture:** Supports multiple companies and teams, with role-based access control to ensure data privacy and security.
*   **Task Management:** Create, assign, and track tasks with customizable boards, priorities, and statuses.
*   **Interactive Dashboard:** Visualize project data with interactive charts and metrics, providing insights into task distribution, team performance, and project progress.
*   **AI Assistant:** Leverage the power of AI to get smart suggestions, generate project insights, and automate repetitive tasks.
*   **Document Management:** Upload and manage project-related documents, with AI-powered analysis to extract key insights.
*   **Authentication:** Secure authentication with NextAuth.js, supporting Google, GitHub, and email/password providers.

# Project Structure

The project is organized into the following directories:

*   `actions`: Contains all the server-side actions for the application, such as creating, reading, updating, and deleting data.
*   `app`: The main directory for the Next.js application, containing all the pages, layouts, and API routes.
*   `components`: Contains all the reusable React components for the application, including UI components from Shadcn UI.
*   `lib`: Contains all the core logic for the application, including the database client, authentication utilities, and AI-related code.
*   `prisma`: Contains the Prisma schema and migrations for the database.
*   `public`: Contains all the static assets for the application, such as images and fonts.

# Building and Running

To build and run this project, you can use the following commands:

*   **Installation:** `pnpm install`
*   **Development:** `pnpm dev`
*   **Build:** `pnpm build`
*   **Start:** `pnpm start`
*   **Lint:** `pnpm lint`

# Development Conventions

*   **Authentication:** The application uses NextAuth.js for authentication. The configuration is in `auth.ts`.
*   **Database:** The application uses Prisma to manage the database. The schema is defined in `prisma/schema.prisma`.
*   **AI Features:** The application uses the AI SDK for AI features. The AI-related code is in `lib/ai` and the database schema includes models for AI conversations and vector embeddings.
*   **Multi-tenancy:** The application is multi-tenant, with a `Company` and `CompanyMembership` model in the database.
*   **Styling:** The project uses Tailwind CSS for styling. The configuration is in `tailwind.config.js` and the main CSS file is in `app/globals.css`.
*   **Components:** The application uses Shadcn UI components, which are located in `components/ui`.
*   **Code Quality:** The project uses ESLint and Prettier for code quality. The configuration is in `eslint.config.mjs` and `.prettierrc`.

# AI Features

The application leverages the power of AI to provide a range of intelligent features, including:

*   **AI Assistant:** An interactive chatbot that can answer questions, create tasks, and provide project insights.
*   **Smart Suggestions:** The AI assistant can provide smart suggestions for task titles, descriptions, and assignees.
*   **Project Insights:** The AI assistant can analyze project data to provide insights into team performance, task distribution, and project progress.
*   **Document Analysis:** The application can analyze uploaded documents to extract key insights and automatically create tasks based on the document content.

# Database

The application uses a PostgreSQL database managed with Prisma. The database schema is defined in `prisma/schema.prisma` and includes the following models:

*   `User`: Stores user information, including their name, email, and password.
*   `Company`: Stores company information, including the company name and a list of members.
*   `CompanyMembership`: A join table that links users to companies and defines their role.
*   `Task`: Stores task information, including the task title, description, priority, and status.
*   `Board`: Stores board information, including the board name and a list of sections.
*   `BoardSection`: Stores board section information, including the section name and a list of tasks.
*   `AIConversation`: Stores the history of conversations with the AI assistant.
*   `Document`: Stores information about uploaded documents, including the filename, mime type, and extracted text.
*   `TaskEmbedding`, `BoardEmbedding`, `DocumentEmbedding`: Stores vector embeddings for tasks, boards, and documents, which are used for AI-powered features.