import { NextResponse } from "next/server";
import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";

interface Email {
  body?: string;
  subject?: string;
  from?: string;
  date?: Date;
}

export async function GET() {
  const imap = new Imap({
    user: process.env.IMAP_USER!,
    password: process.env.IMAP_PASSWORD!,
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT) || 993,
    tls: true,
  });

  function openInbox(cb: (err: Error, box: any) => void) {
    imap.openBox("INBOX", true, cb);
  }

  return new Promise((resolve, reject) => {
    imap.once("ready", function () {
      openInbox(function (err: Error, box: any) {
        if (err) reject(err);
        const f = imap.seq.fetch("1:3", {
          bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
          struct: true,
        });

        const emails: Email[] = [];

        f.on("message", function (msg: any, seqno: any) {
          const email: Email = {};
          msg.on("body", function (stream: any, info: any) {
            simpleParser(stream, (err: Error, mail: ParsedMail) => {
              if (info.which === "TEXT") {
                email.body = mail.text;
              } else {
                email.subject = mail.subject;
                email.from = mail.from?.text;
                email.date = mail.date;
              }
            });
          });
          msg.once("end", function () {
            emails.push(email);
          });
        });

        f.once("end", function () {
          imap.end();
          resolve(NextResponse.json(emails));
        });
      });
    });

    imap.once("error", function (err: Error) {
      reject(new NextResponse("Initial error", { status: 500 }));
    });

    imap.connect();
  });
}
