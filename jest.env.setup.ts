import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });
