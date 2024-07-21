import React, { Suspense } from "react";
import Container from "../components/ui/Container";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Session } from "next-auth";

import ProjectsView from "./_components/ProjectsView";
import SuspenseLoading from "@/components/loadings/suspense";

export const maxDuration = 60;

const ProjectsPage = async () => {
  const session: Session | null = await getServerSession(authOptions);

  if (!session) return redirect("/sign-in");

  return (
    <Container
      title="Projects"
      description={"Overview - projects"}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <ProjectsView />
      </Suspense>
    </Container>
  );
};

export default ProjectsPage;
