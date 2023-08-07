import fs from "fs";
import { join } from "path";
import { writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get("file") as unknown as File;

  if (!file) {
    return NextResponse.json({ success: false });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  //console.log(buffer, "buffer");

  // With the file data in the buffer, you can do whatever you want with it.
  // For this, we'll just write it to the filesystem in a new location
  //const path = `/tmp/${file.name}`;
  const path = join(process.cwd(), "public", "tmp", file.name);
  await writeFile(path, buffer);
  console.log(`open ${path} to see the uploaded file`);

  //delete file from tmp folder after 5 seconds
  setTimeout(() => {
    fs.unlink(path, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      //file removed
      console.log(path, "deleted");
    });
  }, 5000);

  return NextResponse.json({ success: true });
}
