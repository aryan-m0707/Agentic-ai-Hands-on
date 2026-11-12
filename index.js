
import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import readline from "node:readline/promises";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// 1. Initialize the AI model
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-20b",
  temperature: 0.7,
});

// 2. Create conversation memory
const history = [];

// 3. Create terminal input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 4. Start the conversation
async function chat() {
  console.log("AI Chat Started! Type /exit to quit.");

  while (true) {
    const question = await rl.question("\nYou: ");

    if (question.trim().toLowerCase() === "/exit") {
      console.log("Goodbye!");
      break;
    }

    if (!question.trim()) {
      continue;
    }

    // Save user's message
    history.push(new HumanMessage(question));

    try {
      // Send conversation history to AI
      const stream = await model.stream(history);

      let answer = "";

      process.stdout.write("AI: ");

      // Display response as it arrives
      for await (const chunk of stream) {
        const text =
          typeof chunk.content === "string"
            ? chunk.content
            : "";

        answer += text;
        process.stdout.write(text);
      }

      // Save AI's response
      history.push(new AIMessage(answer));

      console.log();

    } catch (error) {
      console.error("\nError:", error.message);

      // Remove failed user message
      history.pop();
    }
  }

  rl.close();
}

// 5. Run the chat
chat();
