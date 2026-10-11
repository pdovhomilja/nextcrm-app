import { Lock } from "lucide-react";

interface HeadingProps {
  title: string;
  description: string;
  visibility?: string;
}

const Heading = ({ title, description, visibility }: HeadingProps) => {
  return (
    <div className="space-y-1.5">
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
        {visibility === "private" ? <Lock className="h-5 w-5 text-muted-foreground" /> : null}
      </h2>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
};

export default Heading;
