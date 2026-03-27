import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: process.env.INNGEST_ID as string,
  name: process.env.INNGEST_APP_NAME as string,
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
