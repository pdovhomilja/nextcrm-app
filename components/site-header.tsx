import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-toggle";
import { CompanySwitcher } from "@/components/company-switcher";

export function SiteHeader({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />

        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex items-center gap-2 w-full justify-between">
          <h1 className="text-base font-medium">{title}</h1>
          <div className="flex items-center gap-2">
            {children}
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
