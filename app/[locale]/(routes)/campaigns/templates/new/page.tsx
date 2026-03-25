import TemplateEditorForm from "./components/TemplateEditorForm";

export default function NewTemplatePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">New Template</h1>
        <p className="text-muted-foreground">
          Create a campaign email template
        </p>
      </div>
      <TemplateEditorForm />
    </div>
  );
}
