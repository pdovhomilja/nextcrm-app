import { cn } from "@/lib/utils";

export function Loader({ className }: { className?: string }) {
  return (
    <>
      <style>{`
        .nextcrm-loader {
          width: 15px;
          aspect-ratio: 1;
          border-radius: 50%;
          animation: nextcrm-l5 1s infinite linear alternate;
        }
        @keyframes nextcrm-l5 {
          0%  { box-shadow: 20px 0 currentColor, -20px 0 color-mix(in srgb, currentColor 13%, transparent); background: currentColor; }
          33% { box-shadow: 20px 0 currentColor, -20px 0 color-mix(in srgb, currentColor 13%, transparent); background: color-mix(in srgb, currentColor 13%, transparent); }
          66% { box-shadow: 20px 0 color-mix(in srgb, currentColor 13%, transparent), -20px 0 currentColor; background: color-mix(in srgb, currentColor 13%, transparent); }
          100%{ box-shadow: 20px 0 color-mix(in srgb, currentColor 13%, transparent), -20px 0 currentColor; background: currentColor; }
        }
      `}</style>
      <div
        className={cn("nextcrm-loader text-foreground", className)}
        role="status"
        aria-label="Loading"
      />
    </>
  );
}
