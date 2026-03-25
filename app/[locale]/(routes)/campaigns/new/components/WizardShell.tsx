"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCampaign } from "@/actions/campaigns/create-campaign";
import { scheduleCampaign } from "@/actions/campaigns/schedule-campaign";
import { sendCampaignNow } from "@/actions/campaigns/send-campaign-now";
import { Step1Details } from "./Step1Details";
import { Step2Template } from "./Step2Template";
import { Step3Audience } from "./Step3Audience";
import { Step4Schedule } from "./Step4Schedule";

type Template = {
  id: string;
  name: string;
  subject_default: string | null;
  content_html: string;
};

type TargetList = {
  id: string;
  name: string;
  _count: { targets: number };
};

type FormData = {
  // Step 1
  name?: string;
  description?: string;
  from_name?: string;
  reply_to?: string;
  // Step 2
  template_id?: string;
  content_html?: string;
  content_json?: object;
  subject?: string;
  // Step 3
  target_list_ids?: string[];
  // Step 4
  send_now?: boolean;
  scheduled_at?: Date;
  followUpSteps?: Array<{
    order: number;
    template_id: string;
    subject: string;
    delay_days: number;
    send_to: "all" | "non_openers";
  }>;
};

export function WizardShell({
  templates,
  targetLists,
}: {
  templates: Template[];
  targetLists: TargetList[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = (data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async (data: Partial<FormData>) => {
    const merged = { ...formData, ...data };
    setIsSubmitting(true);
    try {
      const initialStep = {
        order: 0,
        template_id: merged.template_id!,
        subject: merged.subject!,
        delay_days: 0,
        send_to: "all" as const,
      };
      const allSteps = [initialStep, ...(merged.followUpSteps ?? [])];

      const campaign = await createCampaign({
        name: merged.name!,
        description: merged.description,
        from_name: merged.from_name,
        reply_to: merged.reply_to,
        template_id: merged.template_id,
        target_list_ids: merged.target_list_ids ?? [],
        steps: allSteps,
        scheduled_at: merged.send_now ? undefined : merged.scheduled_at,
      });

      if (merged.send_now) {
        await sendCampaignNow(campaign.id);
      } else if (merged.scheduled_at) {
        await scheduleCampaign(campaign.id, merged.scheduled_at);
      }

      router.push("/campaigns");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = ["Details", "Template", "Audience", "Schedule"];

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex gap-2 items-center">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                step === i + 1
                  ? "bg-primary text-primary-foreground"
                  : step > i + 1
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${
                step === i + 1 ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className="text-muted-foreground mx-1">—</span>
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 1 && (
        <Step1Details initialData={formData} onNext={handleNext} />
      )}
      {step === 2 && (
        <Step2Template
          initialData={formData}
          templates={templates}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {step === 3 && (
        <Step3Audience
          initialData={formData}
          targetLists={targetLists}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {step === 4 && (
        <Step4Schedule
          initialData={formData}
          templates={templates}
          onSubmit={handleSubmit}
          onBack={handleBack}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
