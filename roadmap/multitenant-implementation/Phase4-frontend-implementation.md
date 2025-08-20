# Phase 4: Frontend Implementation

## 1. Objective

The objective of this phase is to update the user interface to support multi-tenancy. This includes building a company switcher, creating a settings page for company management, and ensuring all data displayed is correctly scoped to the user's active company context.

## 2. Technical Implementation Details

### 2.1. Implement a Global Company Context

**Files to Create/Modify**: `components/providers/company-provider.tsx`, `hooks/use-company.ts`, `app/layout.tsx`

**Goal:** Create a React Context to provide the user's active company information and membership list to all components in the application, avoiding prop drilling.

**Instructions:**

1.  **Create `use-company.ts` Hook (Optional but Recommended):**

    ```typescript
    import { useContext } from "react";
    import { CompanyContext } from "@/components/providers/company-provider";

    export const useCompany = () => {
      const context = useContext(CompanyContext);
      if (!context) {
        throw new Error("useCompany must be used within a CompanyProvider");
      }
      return context;
    };
    ```

2.  **Create `company-provider.tsx`:**

    ```typescript
    'use client';

    import { Session } from 'next-auth';
    import { createContext, ReactNode } from 'react';

    interface CompanyContextType {
      activeCompanyId: string;
      activeCompanyRole: string; // Assuming CompanyRole enum is available as a string
      memberships: Array<{ companyId: string; companyName: string; role: string }>;
    }

    export const CompanyContext = createContext<CompanyContextType | null>(null);

    interface CompanyProviderProps {
      children: ReactNode;
      session: Session | null; // Pass the server-side session
    }

    export function CompanyProvider({ children, session }: CompanyProviderProps) {
      if (!session?.user) {
        // Or render a loading state/null
        return <>{children}</>;
      }

      const value = {
        activeCompanyId: session.user.activeCompanyId,
        activeCompanyRole: session.user.activeCompanyRole,
        memberships: session.user.memberships,
      };

      return (
        <CompanyContext.Provider value={value}>
          {children}
        </CompanyContext.Provider>
      );
    }
    ```

3.  **Update `app/layout.tsx`:** Wrap the application with the new provider.

    ```typescript
    import { auth } from '@/auth';
    import { CompanyProvider } from '@/components/providers/company-provider';

    export default async function RootLayout({ children }: { children: React.ReactNode }) {
      const session = await auth();
      return (
        <html lang="en">
          <body>
            <SessionProvider session={session}>
              <CompanyProvider session={session}>
                {children}
              </CompanyProvider>
            </SessionProvider>
          </body>
        </html>
      );
    }
    ```

### 2.2. Build the Company Switcher Component

**File to Create**: `components/company-switcher.tsx`
**File to Modify**: `components/site-header.tsx`

**Goal:** Create a dropdown menu that displays the user's current company and allows them to switch to other companies they are a member of.

**Instructions:**

1.  **Create `company-switcher.tsx`:**

    ```typescript
    'use client';

    import { useCompany } from '@/hooks/use-company';
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
    import { Button } from '@/components/ui/button';
    import { switchActiveCompany } from '@/actions/company-actions';
    import { useRouter } from 'next/navigation';
    import { useTransition } from 'react';

    export function CompanySwitcher() {
      const { activeCompanyId, memberships } = useCompany();
      const router = useRouter();
      const [isPending, startTransition] = useTransition();

      const activeCompany = memberships.find(m => m.companyId === activeCompanyId);
      const otherCompanies = memberships.filter(m => m.companyId !== activeCompanyId);

      const handleSwitch = (companyId: string) => {
        startTransition(async () => {
          await switchActiveCompany(companyId);
          // Refresh the page to get new server-side props for the new company
          router.refresh();
        });
      };

      if (!activeCompany) return null;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isPending}>
              {activeCompany.companyName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {otherCompanies.map(company => (
              <DropdownMenuItem key={company.companyId} onClick={() => handleSwitch(company.companyId)}>
                {company.companyName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    ```

2.  **Add Switcher to `site-header.tsx`:**

    ```typescript
    import { CompanySwitcher } from '@/components/company-switcher';

    export function SiteHeader() {
      return (
        <header>
          // ... other header content
          <CompanySwitcher />
          // ... other header content
        </header>
      );
    }
    ```

### 2.3. Create Company Settings Page

**File to Create**: `app/(app)/[cid]/settings/company/page.tsx` and associated components (`components/company/member-table.tsx`, etc.).

**Goal:** Build a new page where admins can manage company members and standard members can view the team or leave.

**Instructions:**

1.  **Create the main page component (`page.tsx`):**
    - Fetch the current user's role from the `useCompany` hook.
    - Fetch the list of company members using the `getCompanyMembers` server action.
    - Conditionally render management features (`Invite` button, `Remove` button in table) only if the user's role is `ADMIN` or `OWNER`.

2.  **Create a `MemberDataTable` component:**
    - Use the Shadcn UI `DataTable` component.
    - Display columns for User Name, Email, Role, and an Actions column.
    - The Actions column should contain:
      - A dropdown to change the user's role (visible to Admins/Owners).
      - A "Remove" button (visible to Admins/Owners).

3.  **Implement Invitation UI:**
    - Create a `Dialog` component that contains a form with an email input.
    - On submit, the form should call the `inviteUserToCompany` server action.

4.  **Implement "Leave Company" button:**
    - This button should be visible to all members except perhaps the last `OWNER`.
    - It should trigger a confirmation dialog.
    - On confirmation, it calls the `removeMember` server action with the current user's ID.

### 2.4. Update URL Structure Handling

**Goal:** Ensure all links and navigation within the app correctly use the `activeCompanyId`.

**Instructions:**

- **Update `Link` components:** All `<Link>` components that navigate within the app (e.g., to `/dashboard` or `/tasks`) must be updated to dynamically include the active company ID.

  ```typescript
  import { useCompany } from '@/hooks/use-company';

  function MyComponent() {
    const { activeCompanyId } = useCompany();
    return <Link href={`/app/${activeCompanyId}/dashboard`}>Go to Dashboard</Link>;
  }
  ```

- This is a good opportunity to create a helper function or a custom `<CompanyLink>` component to avoid repetition.

## 4. Definition of Done

- The `CompanyProvider` is implemented and correctly provides company context to the application.
- The `CompanySwitcher` component is visible in the site header, displays the correct active company, and successfully switches context on user interaction.
- The new Company Settings page is created and functional.
  - Admins/Owners can view, invite, and remove members.
  - Members can view the team list and leave the company.
- All internal navigation links are updated to be dynamic and include the active company ID.
- The frontend of the application is fully functional with the new multi-tenancy context.
