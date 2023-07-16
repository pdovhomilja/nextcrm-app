import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../pages/api/auth/[...nextauth]";
import Imap from "imap";
import { simpleParser } from "mailparser";
import FormData from "form-data";
import AWS from "aws-sdk";
import prisma from "../../../../lib/prismadb";

export default async function handler(req, res) {
  try {
    //Rossum integration
    const rossumURL = process.env.ROSSUM_API_URL;
    const queueId = process.env.ROSSUM_QUEUE_ID;
    const queueUploadUrl = `${rossumURL}/queues/${queueId}/upload`;
    const username = process.env.ROSSUM_USER;
    const password = process.env.ROSSUM_PASS;

    const IMAP_CONFIG = {
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: process.env.IMAP_PORT,
      tls: true,
    };

    const DO_SPACES_ACCESS_KEY = process.env.DO_ACCESS_KEY_ID;
    const DO_SPACES_SECRET_KEY = process.env.DO_ACCESS_KEY_SECRET;
    const DO_SPACES_ENDPOINT = process.env.DO_ENDPOINT;
    const DO_SPACES_BUCKET_NAME = process.env.DO_BUCKET;

    // Set DigitalOcean Spaces credentials
    const spaces = new AWS.S3({
      accessKeyId: DO_SPACES_ACCESS_KEY,
      secretAccessKey: DO_SPACES_SECRET_KEY,
      endpoint: DO_SPACES_ENDPOINT,
      signatureVersion: "v4",
    });

    const imap = new Imap(IMAP_CONFIG);

    function openInbox(cb) {
      imap.openBox("INBOX", false, cb);
    }

    function uploadToSpaces(fileName, data, callback) {
      const params = {
        Bucket: DO_SPACES_BUCKET_NAME,
        Key: fileName,
        Body: data,
        ACL: "public-read",
      };
      spaces.upload(params, callback);
    }

    imap.once("ready", () => {
      openInbox((err, box) => {
        if (err) console.log(err);
        imap.search(["UNSEEN"], (err, results) => {
          if (err) throw err;

          if (results.length === 0) {
            console.log("No unseen messages found.");
            imap.end();
            return;
          }

          const f = imap.fetch(results, { bodies: "" });

          f.on("message", (msg, seqno) => {
            let uid;
            msg.on("attributes", (attrs) => {
              uid = attrs.uid;
            });

            msg.on("body", async (stream, info) => {
              const parsed = await simpleParser(stream);
              const attachments = parsed.attachments;
              let attachmentProcessed = false;

              for (const attachment of attachments) {
                const fileName = attachment.filename;
                const content = attachment.content;
                const fileExtension = fileName.split(".").pop().toLowerCase();
                if (
                  ["pdf", "jpg", "jpeg", "tiff", "tif", "png"].includes(
                    fileExtension
                  )
                ) {
                  let form = new FormData();

                  form.append("content", Buffer.from(content), {
                    filename: fileName,
                    contentType: attachment.contentType,
                  });

                  const response = await fetch(queueUploadUrl, {
                    method: "POST",
                    body: form,
                    headers: {
                      Authorization: `Basic ${new Buffer.from(
                        `${username}:${password}`
                      ).toString("base64")}`,
                    },
                  })
                    .then((response) => {
                      console.log(response, "response");
                      if (response.ok) {
                        return response.json();
                      }
                      throw new Error(
                        `${response.status}: ${response.statusText}`
                      );
                    })
                    .then(({ results }) => {
                      const [
                        {
                          document: rossumDocument,
                          annotation: rossumAnnotation,
                        },
                      ] = results;
                      const rossumDocumentId = rossumDocument
                        .split("/")
                        .slice(-1)[0];
                      const rossumAnnotationId = rossumAnnotation
                        .split("/")
                        .slice(-1)[0];
                      return {
                        rossumDocument,
                        rossumAnnotation,
                        rossumDocumentId,
                        rossumAnnotationId,
                      };
                    })
                    .catch((err) => {
                      console.log(
                        "Was not able to upload the document...",
                        err
                      );
                      return {
                        rossumDocumentId: null,
                        rossumAnnotationId: null,
                      };
                    });

                  const url = `https://${process.env.DO_BUCKET}.${process.env.DO_REGION}.digitaloceanspaces.com/${fileName}`;

                  console.log("Invoice create data: ", {
                    invoice_file_url: url,
                    invoice_file_mimeType: attachment.contentType,
                    rossum_document_url: response.rossumDocument,
                    rossum_document_id: response.rossumDocumentId,
                    rossum_annotation_url: response.rossumAnnotation,
                    rossum_annotation_id: response.rossumAnnotationId,
                  });

                  await prisma.Invoices.create({
                    data: {
                      description: "Invoice description",
                      document_type: "invoice",
                      invoice_type: "Taxable document",
                      invoice_file_url: url,
                      invoice_file_mimeType: files.invoice.mimetype,
                      rossum_document_url: rossumDocument,
                      rossum_document_id: rossumDocumentId,
                      rossum_annotation_url: rossumAnnotation,
                      rossum_annotation_id: rossumAnnotationId,
                    },
                  });

                  uploadToSpaces(fileName, content, (err, data) => {
                    if (err) {
                      console.error(
                        `Failed to upload ${fileName} to DigitalOcean Spaces: ${err}`
                      );
                    } else {
                      console.log(
                        `Uploaded ${fileName} to DigitalOcean Spaces: ${data.Location}`
                      );
                    }
                  });

                  attachmentProcessed = true;
                  console.log(attachmentProcessed, "attachmentProcessed");
                  break;
                }
                if (attachmentProcessed) {
                  console.log("marking email as read");
                  //Flag email as read
                  /*  imap.addFlags(seqno, "\\Seen", (err) => {
                    if (err) {
                      console.log(`Error marking email as read: ${err}`);
                    } else {
                      console.log(`Email marked as read: ${seqno}`);
                    }
                  }); */
                  /*     imap.addFlags(uid, "\\Seen", { uid: true }, (err) => {
                    if (err) {
                      console.log(`Error marking email as read: ${err}`);
                    } else {
                      console.log(`Email marked as read: ${seqno}`);
                    }
                  }); */
                  /*    msg.addFlags("\\Seen", (err) => {
                    if (err) {
                      console.log(`Error marking email as read: ${err}`);
                    } else {
                      console.log(`Email marked as read: ${seqno}`);
                    }
                  }); */
                  imap.seq.addFlags(seqno, "Seen", (err) => {
                    if (err) {
                      console.log(`Error marking email as read: ${err}`);
                    } else {
                      console.log(`Email marked as read: ${seqno}`);
                    }
                  });
                }
              }
            });

            msg.on("attributes", (attrs) => {
              const { uid } = attrs;
              imap.addFlags(uid, "Seen", { uid: true }, (err) => {
                if (err) {
                  console.log(`Error marking email as read: ${err}`);
                } else {
                  console.log(`Email marked as read: ${uid}`);
                }
              });
            });
          });

          f.once("end", () => {
            console.log("Done fetching all messages!");
            imap.end();
          });
        });
      });
    });

    imap.once("error", (err) => {
      console.log(err);
    });

    imap.once("end", () => {
      console.log("Connection ended");
    });

    imap.connect();

    return res.status(200).json({ json: "All done!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error });
  }
}
