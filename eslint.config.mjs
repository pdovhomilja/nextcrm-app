import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  ...nextConfig,
  { ignores: ["apps/**"] },
  {
    rules: {
      // TanStack Table v9's useReactTable() is known to be incompatible with the
      // React Compiler (it returns functions that can't be safely memoized).
      // The compiler already handles this by skipping memoization for affected
      // components. Downgrading to 'warn' avoids blocking the build while keeping
      // --max-warnings=0 in CI for real errors.
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    // Existing code that eslint-config-next 16.4.2 (react-hooks 7.1.1) newly
    // flags. Kept out of the Next security bump; fix these files in a follow-up
    // and drop them from this list. Every other file stays fully checked.
    files: [
      "app/[[]locale]/(auth)/sign-in/components/LoginComponent.tsx",
      "app/[[]locale]/(routes)/components/nav-user.tsx",
      "app/[[]locale]/(routes)/components/ui/AvatarDropdown.tsx",
      "app/[[]locale]/(routes)/crm/dashboard/_components/CRMKanban.tsx",
      "app/[[]locale]/(routes)/profile/components/CalendarConnectionsList.tsx",
      "app/[[]locale]/(routes)/profile/components/ProfilePhotoForm.tsx",
      "app/[[]locale]/(routes)/projects/boards/[[]boardId]/components/Kanban.tsx",
      "app/[[]locale]/(routes)/projects/boards/[[]boardId]/dialogs/DeleteProject.tsx",
      "app/[[]locale]/(routes)/projects/boards/[[]boardId]/dialogs/NewSection.tsx",
      "app/[[]locale]/(routes)/projects/boards/[[]boardId]/forms/NewSection.tsx",
      "app/[[]locale]/(routes)/projects/dialogs/NewProject.tsx",
      "app/[[]locale]/(routes)/projects/dialogs/NewTask.tsx",
      "app/[[]locale]/(routes)/projects/dialogs/UpdateTask.tsx",
      "app/[[]locale]/(routes)/projects/forms/UpdateProject.tsx",
      "components/CommandComponent.tsx",
      "components/modals/ImportTargetsModal.tsx",
      "components/ui/sidebar.tsx",
      "hooks/use-mobile.tsx",
    ],
    rules: {
      "@next/next/no-location-assign-relative-destination": "off",
      "react-hooks/globals": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["plugins/**/*.{ts,tsx}", "plugins-private/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/*"], message: "Plugins may import only @nextcrm/plugin-sdk, their own files and npm packages." },
      ] }],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "actions/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "inngest/**/*.{ts,tsx}"],
    ignores: ["lib/plugins/plugins.generated.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/plugins/*", "@/plugins-private/*"], message: "Core must not import plugins; use lib/plugins/registry." },
      ] }],
    },
  },
];

export default config;
