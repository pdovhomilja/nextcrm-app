# NextCRM

NextCRM is a CRM build on top of the Next.JS 13.4 using TypeScript, great UI library shadcn, Prisma and MongoDB as a database. Uploadthings as a S3 blob for document storage.

## Online Demo

You can try it here [demo.nextcrm.io](https://demo.nextcrm.io), login via google account or create new user and password

## What we used to build it

Next.js - React framework</br>
shadcn - UI</br>
Prisma ORM - together with mongoDB (tested with version 5.0)</br>
useSWR - for client side data fetching</br>
NextAUTH - for user authentication</br>
Rossum - for invoice data parsing with AI</br>
OpenAI API - for automated email notifications</br>
Tremor - for creating charts</br>
Resend.com - together with react.email </br>

![hero](/public/og.png)

## What we plan to build next

1. More AI powered - daily summary of tasks and project (OpenAI integration ) - in test
2. Email campaigns management - integration to MailChimp and Listmonk - in planning
3. Docker version - in planning (There will be complete bundle to run NextCRM on-premise)

## Emails

We use Resend.com + React.email as primary email sender and email templates

[resend.com](https://resend.com) + [react.email](https://react.email)

## Reports

We use Tremor charts as a tool for creating charts in NextCRM

![hero](/public/reports.png)

## Video (YouTube channel with functions showcase)

Channel link - [https://www.youtube.com/channel/UCQneopupgtjG4py68-edA0w](https://www.youtube.com/@NextCRM_IO)
</br>
Invoice module - https://youtu.be/NSMsBMy07Pg

## Documentation

Will be soon at domain: http://docs.nextcrm.io

## Installation

<details><summary><b>Show instructions</b></summary>

1. Install the preset:

   ```sh
   npm install
   ```

2. .env + .env.local - Change .env.example to .env and .env.local.example to .env.local

**.env**

> > - You will need mongodb URI string for Prisma ORM

**.env.local**

> > - NextAUTH - for auth
> > - uploadthings - for storing files
> > - rossum - for invoice data exporting
> > - openAI - for automatic Project management assistant
> > - SMPT and IMAP for emails

3. Init Prisma

   ```sh
    npx prisma generate
    npx prisma db push
   ```

4. Run app on local

   ```sh
   npm run dev
   ```

5. Import initial data from initial-data folder

</details>

## Contact

[www.dovhomilja.cz](https://www.dovhomilja.cz).

## License

Licensed under the [MIT license](https://github.com/pdovhomilja/nextcrm-app/blob/main/LICENSE.md).
