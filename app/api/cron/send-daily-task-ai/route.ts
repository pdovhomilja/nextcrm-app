/*
This API endpoint is used to add a new task to a section.
*/
import { prismadb } from "@/lib/prisma";
import sendEmail from "@/lib/sendmail";
import { data } from "autoprefixer";
import axios from "axios";
import dayjs from "dayjs";
import { get } from "http";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const today = dayjs().startOf("day");
    const nextWeek = dayjs().add(7, "day").startOf("day");
    let prompt = "";

    const users = await prismadb.users.findMany({
      where: {
        userStatus: "ACTIVE",
      },
    });

    if (!users) return NextResponse.json({ message: "No users found" });

    for (const user of users) {
      const getTaskPastDue = await prismadb.tasks.findMany({
        where: {
          AND: [
            {
              user: user.id,
            },
            {
              dueDateAt: {
                lte: new Date(),
              },
            },
          ],
        },
      });

      const getTaskPastDueInSevenDays = await prismadb.tasks.findMany({
        where: {
          AND: [
            {
              user: user.id,
            },
            {
              dueDateAt: {
                //lte: dayjs().add(7, "day").toDate(),
                gt: today.toDate(), // Due date is greater than or equal to today
                lt: nextWeek.toDate(), // Due date is less than next week (not including today)
              },
            },
          ],
        },
      });

      //console.log(user.userLanguage, "users.userLanguage");
      switch (user.userLanguage) {
        case "en":
          prompt = `Hi, Iam ${process.env.NEXT_PUBLIC_APP_URL} API Bot.
          \n\n
          There are ${getTaskPastDue.length} tasks past due and ${
            getTaskPastDueInSevenDays.length
          } tasks due in the next 7 days.
          \n\n
          Details today tasks: ${JSON.stringify(getTaskPastDue, null, 2)}
          \n\n
          Details next 7 days tasks: ${JSON.stringify(
            getTaskPastDueInSevenDays,
            null,
            2
          )}
          \n\n
          As a personal assistant, write a message to ${
            user.name
          }  to remind them of their tasks. And also do not forget to send them a some positive vibes.
          \n\n
          `;
          break;
        case "cz":
          prompt = `Jako profesionální asistentka Emma s perfektní znalostí projektového řízení, který má na starosti projekty na adrese${
            process.env.NEXT_PUBLIC_APP_URL
          }, připrave manažerské shrnutí o úkolech včetně jejich detailů a termínů. Vše musí být perfektně česky a výstižně.
          \n\n
          Zde jsou informace k úkolům:
          \n\n
          Informace o projektu: Počet úkolů které jsou k řešení dnes: ${
            getTaskPastDue.length
          }, Počet úkolů, které musí být vyřešeny nejpozději do sedmi dnů: ${
            getTaskPastDueInSevenDays.length
          }.
          \n\n
          Detailní informace v JSON formátu k úkolům, které musí být hotové dnes: ${JSON.stringify(
            getTaskPastDue,
            null,
            2
          )}
          \n\n
          Detailní informace k úkolům, které musí být hotové během následujících sedmi dní: ${JSON.stringify(
            getTaskPastDueInSevenDays,
            null,
            2
          )}
        
          \n\n
          Na konec napiš manažerské shrnutí včetně milého uvítání napiš pro uživatele: ${
            user.name
          } a přidej odkaz ${
            process.env.NEXT_PUBLIC_APP_URL + "/projects/dashboard"
          } jako odkaz na detail k úkolům . Na konci manažerského shrnutí přidej. 1 tip na manažerskou dovednost z oblasti projektového řízení a timemanagementu, 2-3 věty s pozitivním naladěním a podporou, nakonec popřej hezký pracovní den a infomaci, že tato zpráva byla vygenerována pomocí umělé inteligence OpenAi.
          \n\n
          `;
          break;
      }

      if (!prompt) return NextResponse.json({ message: "No prompt found" });

      const getAiResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/openai/create-chat-completion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt,
          }),
        }
      ).then((res) => res.json());

      console.log(getAiResponse.response, "getAiResponse");

      //skip if api response is error
      if (getAiResponse.error) {
        console.log("Error from OpenAI API");
      } else {
        await sendEmail({
          from: process.env.EMAIL_FROM,
          to: user.email!,
          subject: `${process.env.NEXT_PUBLIC_APP_NAME} OpenAI Project manager assistant`,
          text: getAiResponse.response.message.content,
        });
      }
    }

    return NextResponse.json({ message: "Emails sent" });
  } catch (error) {
    console.log("[TASK_CRON_API]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
