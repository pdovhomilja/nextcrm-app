import fs from "fs";
export default async function getNextVersion() {
  try {
    // Read the package.json file synchronously
    const data = fs.readFileSync("package.json", "utf8");

    try {
      const packageJson = JSON.parse(data);
      const version = packageJson.dependencies["next"]; // Replace 'dependencies' with 'devDependencies' if Next.js is a dev dependency

      //console.log("Actual Next.js version:", version);
      return version;
    } catch (error) {
      console.error("Error parsing package.json:", error);
      return "0";
    }
  } catch (error) {
    console.error("Error reading package.json:", error);
  }
}
