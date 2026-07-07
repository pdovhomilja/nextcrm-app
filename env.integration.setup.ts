import { config } from "dotenv";
import { registerIntegrationMocks } from "./tests/integration/helpers/headers";

(process.env as unknown as Record<string, string>).NODE_ENV = "test";

config({ path: ".env.test", override: true });

registerIntegrationMocks();


