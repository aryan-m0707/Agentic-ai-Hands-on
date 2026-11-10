
import "dotenv/config";
import { ChatGroq } from "@langchain/groq";

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-20b",
  temperature: 0.7,
});

try {
  const stream = await model.stream("What is Agentic AI?");

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
  ;

  console.log(response.content);
} catch (error) {
  console.error("Error:", error.message);
}
