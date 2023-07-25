import { Configuration, OpenAIApi } from "openai";

//OpenAI API config file
const config = new Configuration({
  organization: process.env.OPEN_AI_ORGANIZATION_ID,
  apiKey: process.env.OPEN_AI_API_KEY,
});

const openailib = new OpenAIApi(config);

export default openailib;
