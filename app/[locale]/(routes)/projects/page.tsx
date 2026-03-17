import React, { Suspense } from "react";
import Container from "../components/ui/Container";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Session } from "next-auth";

import ProjectsView from "./_components/ProjectsView";
import SuspenseLoading from "@/components/loadings/suspense";
import { getTranslations } from "next-intl/server";

export const maxDuration = 300;

const ProjectsPage = async () => {
  const session: Session | null = await getServerSession(authOptions);
  const t = await getTranslations("ProjectsPage");

  if (!session) return redirect("/sign-in");

  return (
    <Container
      title={t("title")}
      description={t("description")}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <ProjectsView />
      </Suspense>
    </Container>
  );
};

export default ProjectsPage;
