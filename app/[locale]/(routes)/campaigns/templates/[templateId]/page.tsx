import { getTemplate } from "@/actions/campaigns/templates/get-template";
import { getCanvaConnectionState } from "@/actions/canva/designs";
import TemplateEditorForm from "../new/components/TemplateEditorForm";

type Props = {
  params: Promise<{ templateId: string }>;
};

export default async function EditTemplatePage({ params }: Props) {
  const { templateId } = await params;
  const [template, canva] = await Promise.all([
    getTemplate(templateId),
    getCanvaConnectionState().catch(() => ({ connected: false })),
  ]);

  if (!template) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p className="text-muted-foreground">Template not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Template</h1>
        <p className="text-muted-foreground">
          Update your campaign email template
        </p>
      </div>
      <TemplateEditorForm
        canvaConnected={canva.connected}
        templateId={template.id}
        initialData={{
          name: template.name,
          description: template.description,
          subject_default: template.subject_default,
          content_html: template.content_html,
          content_json: template.content_json as object | null,
        }}
      />
    </div>
  );
}
