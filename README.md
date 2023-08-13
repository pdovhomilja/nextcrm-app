# NextCRM

NextCRM is a CRM build on top of the Next.JS 13.4 using TypeScript, great UI library shadcn, Prisma and MongoDB as a database. Uploadthings as a S3 blob for document storage.

## Online Demo

You can try it here [demo.nextcrm.io](https://demo.nextcrm.io), with credentials: demo@nextcrm.io / demo12345

or login via google account

**but there is a pending state for new user which must by allowed by demo@nextcrm.io user which has admin rights**

## What we use to build it

Next.js - React framework
shadcn - UI
Prisma ORM - together with mongoDB (tested with version 5.0)
useSWR - for client side data fetching
NextAUTH - for user authentication

## Warning

If you create new user in demo instance there is a PENDING state, you must log in as a demo@nextcrm.io and active new user in admin section!

![hero](/public/og.png)

## Video
https://youtu.be/NSMsBMy07Pg





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

</details>

## Contact

[www.dovhomilja.cz](https://www.dovhomilja.cz).

## License

Licensed under the [MIT license](https://github.com/pdovhomilja/nextcrm-app/blob/main/LICENSE.md).
