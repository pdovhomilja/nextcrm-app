import { Button } from "@/components/ui/button";
import { IsDev } from "@/lib/isDev";
import { ChevronRight } from "lucide-react";

const ComponentsTestPage = () => {
  return (
    <IsDev>
      <div className="container mx-auto p-8">
        <h1 className="mb-8 text-2xl font-bold">Component Test Page</h1>

        <h2 className="mb-4 text-xl font-semibold">Button Variants</h2>
        <div className="mb-8 flex flex-wrap gap-4">
          <Button variant="default">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>

        <h2 className="mb-4 text-xl font-semibold">Button States</h2>
        <div className="mb-8 flex flex-wrap gap-4">
          <Button disabled>Disabled</Button>
          <Button>
            <ChevronRight className="mr-2 h-4 w-4 animate-spin" />
            Loading
          </Button>
        </div>

        <h2 className="mb-4 text-xl font-semibold">Button Sizes</h2>
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="mb-4 text-xl font-semibold">Button With Icon</h2>
        <div className="flex flex-wrap gap-4">
          <Button>
            <ChevronRight className="mr-2 h-4 w-4" />
            Icon Left
          </Button>
          <Button>
            Icon Right
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </IsDev>
  );
};

export default ComponentsTestPage;
