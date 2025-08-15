import React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";

import { auth } from "@/auth";
import { getUserByEmail } from "@/actions/user";
import { getSuggestions } from "@/actions/suggestions/get-suggestions";

const SuggestionsPage = async () => {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("User session or email not found");
  }

  const user = await getUserByEmail(session.user.email);

  if (!user?.id) {
    throw new Error("User not found");
  }

  const suggestions = await getSuggestions();

  return (
    <SidebarInset>
      <SiteHeader title="Suggestions">
        <div className="flex items-center gap-2">{/* Nav buttons */}</div>
      </SiteHeader>
      <div className="flex flex-1 flex-col border-black">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex justify-end">{/* Nav buttons */}</div>
              <div className="px-4 lg:px-6">
                <pre>{JSON.stringify(suggestions, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
};

export default SuggestionsPage;
