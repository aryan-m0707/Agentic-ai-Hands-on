
import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-20b",
  temperature: 0.7,
});

const rl = readline.createInterface({ input, output });

try {
  while (true) {
    const question = await rl.question("\nYou: ");

    if (question.toLowerCase() === "exit") break;

    const stream = await model.stream(question);

    process.stdout.write("AI: ");

    for await (const chunk of stream) {
      process.stdout.write(chunk.content);
    }

    console.log();
  }
} catch (error) {
  console.error("Error:", error.message);

  
} finally {
  rl.close();
}
