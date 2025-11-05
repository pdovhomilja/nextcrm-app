import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IsDev } from "@/lib/isDev";
import { ChevronRight } from "lucide-react";

const ComponentsTestPage = () => {
  return (
    <IsDev>
      <div className="container mx-auto p-8">
        <h1 className="mb-8 text-2xl font-bold">Component Test Page</h1>

        <section className="mb-12">
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
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Form Input Components</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="text-input">Text Input</Label>
              <Input id="text-input" type="text" placeholder="Enter text" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-input">Email Input</Label>
              <Input id="email-input" type="email" placeholder="Enter email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-input">Password Input</Label>
              <Input id="password-input" type="password" placeholder="Enter password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number-input">Number Input</Label>
              <Input id="number-input" type="number" placeholder="Enter number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-input">Date Input</Label>
              <Input id="date-input" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tel-input">Tel Input</Label>
              <Input id="tel-input" type="tel" placeholder="Enter phone number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-input">Search Input</Label>
              <Input id="search-input" type="search" placeholder="Search..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disabled-input">Disabled Input</Label>
              <Input id="disabled-input" type="text" placeholder="Disabled" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="readonly-input">Read-only Input</Label>
              <Input id="readonly-input" type="text" value="Read-only value" readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="error-input">Input with Error</Label>
              <Input id="error-input" type="text" className="border-destructive" />
              <p className="text-sm text-destructive">This field is required.</p>
            </div>
          </div>
        </section>
      </div>
    </IsDev>
  );
};

export default ComponentsTestPage;
