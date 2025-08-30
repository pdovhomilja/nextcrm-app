"use server";

import Imap from "node-imap";
import { simpleParser } from "mailparser";
import { auth } from "@/auth";
import db from "@/lib/db";
import { decrypt } from "@/lib/security/encryption";

async function getImapConnection(accountId: string): Promise<Imap | null> {
  console.log(`[IMAP] Attempting to connect for account: ${accountId}`);
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const account = await db.userMailAccount.findUnique({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    throw new Error("Mail account not found");
  }

  const imap = new Imap({
    user: account.imapUser,
    password: decrypt(account.encryptedPassword),
    host: account.imapHost,
    port: account.imapPort,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }, // Consider making this configurable
  });

  return new Promise((resolve, reject) => {
    imap.once("ready", () => {
      console.log('[IMAP] Connection successful');
      resolve(imap);
    });
    imap.once("error", (err: Error) => {
      console.error('[IMAP] Connection Error:', err);
      reject(err);
    });
    imap.connect();
  });
}


function processBoxes(boxes: Imap.MailBoxes): string[] {
  const folderNames: string[] = [];

  function recurse(boxes: Imap.MailBoxes, path: string) {
    Object.keys(boxes).forEach(name => {
      console.log(`Folder: ${name}, Attribs: ${boxes[name].attribs}`);
      const currentPath = path ? `${path}/${name}` : name;
      folderNames.push(currentPath);
      if (boxes[name].children) {
        recurse(boxes[name].children, currentPath);
      }
    });
  }

  recurse(boxes, '');
  return folderNames;
}

export async function getMailFolders(accountId: string) {
  console.log(`[MAIL ACTION] getMailFolders called for account: ${accountId}`);
  let imap: Imap | null = null;
  try {
    imap = await getImapConnection(accountId);
    if (!imap) return { error: "Could not connect to IMAP server" };

    const boxes = await new Promise<Imap.MailBoxes>((resolve, reject) => {
      imap!.getBoxes((err, boxes) => {
        if (err) return reject(err);
        console.log('[MAIL ACTION] Raw boxes:', JSON.stringify(boxes, null, 2));
        resolve(boxes);
      });
    });
    const folderNames = processBoxes(boxes);
    
    console.log('[MAIL ACTION] Fetched and processed folder names:', folderNames);
    return { boxes: folderNames };
  } catch (error: any) {
    console.error('[MAIL ACTION] Error in getMailFolders:', error);
    return { error: error.message };
  } finally {
    if (imap) {
      console.log('[IMAP] Closing connection.');
      imap.end();
    }
  }
}


export async function getMailList(
  accountId: string,
  folderName: string,
  page: number = 1
) {
  console.log(`[MAIL ACTION] getMailList called for account: ${accountId}, folder: ${folderName}, page: ${page}`);
  let imap: Imap | null = null;
  const emailsPerPage = 25;

  try {
    imap = await getImapConnection(accountId);
    if (!imap) return { error: "Could not connect to IMAP server" };

    const box = await new Promise<Imap.Box>((resolve, reject) => {
      imap!.openBox(folderName, true, (err, box) => {
        if (err) return reject(err);
        resolve(box);
      });
    });
    const totalMessages = box.messages.total;
    console.log(`[MAIL ACTION] Opened box "${folderName}", total messages: ${totalMessages}`);
    if (totalMessages === 0) {
      imap?.end();
      return { emails: [], total: 0 };
    }

    const start = Math.max(1, totalMessages - emailsPerPage + 1);
    const fetchRange = `${start}:*`;
    console.log(`[MAIL ACTION] Fetching range: ${fetchRange}`);

    const messages = await new Promise<any[]>((resolve, reject) => {
      const f = imap!.fetch(fetchRange, {
        bodies: "HEADER.FIELDS (FROM TO SUBJECT DATE)",
        struct: true,
      });
      const fetchedMessages: any[] = [];
      f.on("message", (msg, seqno) => {
        let buffer = "";
        let uid: string | undefined;
        msg.on("body", (stream) => {
          stream.on("data", (chunk) => {
            buffer += chunk.toString("utf8");
          });
        });
        msg.once("attributes", (attrs) => {
          uid = attrs.uid;
        });
        msg.once("end", () => {
          fetchedMessages.push({ seqno, buffer, uid });
        });
      });
      f.once("error", reject);
      f.once("end", () => {
        console.log(`[MAIL ACTION] Fetched ${fetchedMessages.length} messages.`);
        resolve(fetchedMessages.reverse())
      });
    });

    const emails = await Promise.all(
      messages.map(async ({ buffer, uid }) => {
        const parsed = await simpleParser(buffer);
        return {
          id: parsed.messageId,
          uid,
          subject: parsed.subject,
          from: parsed.from?.text,
          date: parsed.date,
        };
      })
    );
    console.log(`[MAIL ACTION] Parsed ${emails.length} emails.`);

    return { emails, total: totalMessages };
  } catch (error: any) {
    return { error: error.message };
  } finally {
    imap?.end();
  }
}

export async function getMailContent(
  accountId: string,
  folderName: string,
  mailUid: string
) {
  console.log(`[MAIL ACTION] getMailContent called for account: ${accountId}, uid: ${mailUid}`);
  let imap: Imap | null = null;
  try {
    imap = await getImapConnection(accountId);
    if (!imap) return { error: "Could not connect to IMAP server" };

    await new Promise<Imap.Box>((resolve, reject) => {
      imap!.openBox(folderName, true, (err, box) => {
        if (err) return reject(err);
        resolve(box);
      });
    });

    const message = await new Promise<{ headers: any; body: string }>(
      (resolve, reject) => {
        const f = imap!.fetch([mailUid], { bodies: "", struct: true });
        let body = "";
        let headers = {};
        f.on("message", (msg) => {
          msg.on("body", (stream) => {
            stream.on("data", (chunk) => {
              body += chunk.toString("utf8");
            });
          });
          msg.once("attributes", (attrs) => {
            headers = attrs;
          });
        });
        f.once("error", reject);
        f.once("end", () => resolve({ headers, body }));
      }
    );

    const parsed = await simpleParser(message.body);
    console.log(`[MAIL ACTION] Parsed content for email subject: ${parsed.subject}`);

    return {
      id: parsed.messageId,
      subject: parsed.subject,
      from: Array.isArray(parsed.from) ? parsed.from.map(f => f.text).join(', ') : parsed.from?.text,
      to: Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(', ') : parsed.to?.text,
      date: parsed.date,
      html: parsed.html || parsed.textAsHtml,
      text: parsed.text,
    };
  } catch (error: any) {
    return { error: error.message };
  } finally {
    imap?.end();
  }
}
