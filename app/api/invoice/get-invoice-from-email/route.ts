import { NextResponse } from "next/server";
import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import { Readable } from "stream";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import axios from "axios";

// Configure your IMAP settings
const imapConfig: Imap.Config = {
  user:
    process.env.IMAP_USER ??
    (() => {
      console.error("EMAIL_USER is not defined in environment variables");
      throw new Error("EMAIL_USER is not defined");
    })(),
  password:
    process.env.IMAP_PASSWORD ??
    (() => {
      console.error("EMAIL_PASSWORD is not defined in environment variables");
      throw new Error("EMAIL_PASSWORD is not defined");
    })(),
  host: process.env.IMAP_HOST,
  port: parseInt(process.env.IMAP_PORT ?? "993"),
  tls: true,
};

export async function GET(req: Request) {
  //Check if user is authenticated
  /*   const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ status: 401, body: { error: "Unauthorized" } });
  } */

  //Parse email attachments
  try {
    // Create an instance of Imap
    const imap = new Imap(imapConfig);
    console.log("IMAP instance created");

    // Check email for attachments
    const checkEmail = (): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        imap.once("ready", () => {
          imap.openBox("INBOX", false, (err: Error | null, box: Imap.Box) => {
            if (err) reject(err);
            console.log("Connected to mailbox");
            const fetchOptions: Imap.FetchOptions = {
              bodies: ["HEADER", "TEXT"],
              markSeen: false,
            };

            imap.search(["UNSEEN"], (err: Error | null, results: number[]) => {
              if (err) reject(err);

              // If no new emails are found, end the connection
              if (results.length === 0) {
                console.log("No new emails to fetch");
                imap.end();
                resolve(false);
                return;
              }

              const fetch = imap.fetch(results, fetchOptions);
              console.log("Fetching emails");

              fetch.on(
                "message",
                (msg: Imap.ImapMessage & { attributes: { uid: number } }) => {
                  console.log("New email received");

                  msg.on("body", (stream: NodeJS.ReadableStream) => {
                    console.log("Parsing email");

                    simpleParser(
                      Readable.from(stream),
                      async (err: Error | null, parsed: ParsedMail) => {
                        if (err) reject(err);
                        console.log("Email parsed");
                        //console.log("Parsed email", parsed);

                        const attachments = parsed.attachments;

                        // If no attachments are found in the parsed.attachments array,
                        // check if the email body contains a base64 encoded attachment
                        if (attachments.length === 0 && parsed.text) {
                          const base64Match = parsed.text.match(
                            /Content-Transfer-Encoding: base64\n\n([\s\S]+?)(?=\n--)/i
                          );
                          if (base64Match && base64Match[1]) {
                            const base64Content = base64Match[1].replace(
                              /\s/g,
                              ""
                            );
                            const buffer = Buffer.from(base64Content, "base64");
                            attachments.push({
                              filename: "attachment.pdf",
                              content: buffer,
                              contentType: "application/pdf",
                              contentDisposition: "attachment",
                              headers: new Map(),
                              related: false,
                              type: "attachment",
                              size: buffer.length,
                              headerLines: [], // Add this line
                              checksum: "",
                            });
                          }
                        }

                        console.log("Attachments found");
                        //console.log("Atachments", attachments);

                        for (const attachment of attachments) {
                          //Send the buffer to Rossum API
                          console.log("Attachment found:", attachment);
                          try {
                            const response = await axios.post(
                              //TODO: Update the URL to the correct endpoint
                              "http://localhost:3000/api/upload/cron",
                              {
                                file: attachment,
                              },
                              {
                                headers: {
                                  "Content-Type": "application/json",
                                },
                              }
                            );
                            console.log("Upload API response:", response.data);
                          } catch (error: any) {
                            console.error(
                              "Error sending attachment to Upload API:",
                              error.response?.data || error.message
                            );
                          }
                        }
                        // Log the entire msg object for debugging
                        console.log(
                          "Message object:",
                          JSON.stringify(msg, null, 2)
                        );
                      }
                    );
                  });
                }
              );

              fetch.once("error", (err: Error) => {
                reject(err);
              });

              fetch.once("end", () => {
                console.log("No more emails to fetch");
                imap.end();
                resolve(true);
              });
            });
          });
        });

        imap.once("error", (err: Error) => {
          reject(err);
        });

        imap.connect();
      });
    };

    await checkEmail();

    return NextResponse.json(
      { message: "Email check completed" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
