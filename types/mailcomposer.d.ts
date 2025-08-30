declare module "mailcomposer" {
  interface MailComposerOptions {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
    [key: string]: any;
  }

  interface MailComposer {
    build(callback: (error: Error | null, message: Buffer) => void): void;
  }

  function mailcomposer(options: MailComposerOptions): MailComposer;
  export = mailcomposer;
}
