"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

type Props = {
  content: string;
  onChange: (html: string, plainText: string) => void;
  variant?: "email" | "chat";
  /** Chat: Enter sends, Shift+Enter new line */
  onEnterSubmit?: () => void;
};

export function EmailComposeEditor({
  content,
  onChange,
  variant = "email",
  onEnterSubmit,
}: Props) {
  const isChat = variant === "chat";
  const submitRef = useRef(onEnterSubmit);
  submitRef.current = onEnterSubmit;

  const editor = useEditor({
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false })],
    content: content || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (isChat && event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          submitRef.current?.();
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor: ed }) {
      const html = ed.getHTML();
      const plain = ed.getText();
      onChange(html, plain);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content && content !== current && !editor.isFocused) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div
      className={
        isChat
          ? "overflow-hidden bg-transparent"
          : "overflow-hidden rounded-lg border border-border/70 bg-background"
      }
    >
      <div
        className={
          isChat
            ? "flex flex-wrap gap-0.5 px-2 py-1.5"
            : "flex flex-wrap gap-0.5 border-b border-border/50 bg-muted/30 p-1.5"
        }
      >
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent
        editor={editor}
        className={
          isChat
            ? "prose prose-sm max-w-none px-3 py-2 focus:outline-none [&_.ProseMirror]:max-h-[140px] [&_.ProseMirror]:min-h-[72px] [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:outline-none"
            : "prose prose-sm max-w-none min-h-[180px] px-3 py-2 focus:outline-none [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none"
        }
      />
      {isChat && (
        <p className="px-3 pb-1 text-[10px] text-muted-foreground">Enter to send · Shift+Enter for new line</p>
      )}
    </div>
  );
}
