"use server";

import axios from "axios";

import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";

import AiProjectReportEmail from "@/emails/AiProjectReport";

export async function getAiReport(session: any, boardId: string) {
  /*
  Resend.com function init - this is a helper function that will be used to send emails
  */
  const resend = await resendHelper();

  const user = await prismadb.users.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!user) return { message: "No user found" };

  const boardData = await prismadb.sections.findMany({
    where: {
      board: boardId,
    },
    include: {
      tasks: {
        select: {
          title: true,
          content: true,
          createdAt: true,
          dueDateAt: true,
        },
      },
    },
  });

  //console.log(JSON.stringify(boardData, null, 2), "boardData");

  let prompt = `As a super skilled project manager, write me a project management summary and then sort sections and tasks details based on the following tasks data in JSON format: ${JSON.stringify(
    boardData,
    null,
    2
  )}.`;

  switch (user.userLanguage) {
    case "en":
      prompt = prompt + `Response must be in English language and MDX format.`;

      break;
    case "cz":
      prompt = prompt + `Odpověď musí být v českém jazyce a ve formátu MDX.`;
      break;
  }

  if (!prompt) return { message: "No prompt found" };

  const getAiResponse = await axios
    .post(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/openai/create-chat-completion`,
      {
        prompt: prompt,
        userId: session.user.id,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    .then((res) => res.data);

  //console.log(getAiResponse, "getAiResponse");
  //console.log(getAiResponse.response.message.content, "getAiResponse");

  //skip if api response is error
  if (getAiResponse.error) {
    console.log("Error from OpenAI API");
  } else {
    try {
      const data = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email!,
        subject: `${process.env.NEXT_PUBLIC_APP_NAME} OpenAI Project manager assistant from: ${process.env.NEXT_PUBLIC_APP_URL}`,
        text: getAiResponse.response.message.content,
        react: AiProjectReportEmail({
          username: session.user.name,
          avatar: session.user.avatar,
          userLanguage: session.user.userLanguage,
          data: getAiResponse.response.message.content,
        }),
      });
      //console.log(data, "Email sent");
    } catch (error) {
      console.log(error, "Error from get-user-ai-tasks");
    }
  }

  return { user: user.email };
}
