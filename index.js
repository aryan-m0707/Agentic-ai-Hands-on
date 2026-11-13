
import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import readline from "node:readline/promises";
import fs from "node:fs/promises";
import {
  HumanMessage,
  AIMessage,
  SystemMessage
} from "@langchain/core/messages";

// 1. Initialize Groq model
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-20b",
  temperature: 0.7,
});

// 2. System Prompt
const SYSTEM_PROMPT = `
You are Siya, a friendly and helpful AI assistant.

Rules:
- Explain things in simple language.
- Be friendly and conversational.
- Give practical examples when useful.
- If you don't know something, admit it.
- Keep answers concise unless more detail is needed.
`;

// 3. JSON storage location
const dataFile = new URL("./conversations.json", import.meta.url);

// 4. Default conversation data
let data = {
  activeConversationId: null,
  nextId: 1,
  conversations: {}
};

// 5. Load conversations from JSON
async function loadData() {
  try {
    const file = await fs.readFile(dataFile, "utf8");
    data = JSON.parse(file);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (!data.conversations || typeof data.conversations !== "object") {
    throw new Error("Invalid conversations.json structure.");
  }

  if (!Number.isInteger(data.nextId) || data.nextId < 1) {
    data.nextId = 1;
  }

  if (!Object.keys(data.conversations).length) {
    createConversation();
  }

  if (!data.conversations[data.activeConversationId]) {
    data.activeConversationId = Object.keys(data.conversations)[0];
  }

  await saveData();
}

// 6. Save conversations to JSON
async function saveData() {
  await fs.writeFile(
    dataFile,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

// 7. Create a new conversation
function createConversation() {
  const id = String(data.nextId++);

  data.conversations[id] = {
    title: `Chat ${id}`,
    messages: []
  };

  data.activeConversationId = id;

  return id;
}

// 8. Get active conversation
function getActiveConversation() {
  return data.conversations[data.activeConversationId];
}

// 9. Terminal commands
async function handleCommand(input) {
  const [command, ...args] = input.trim().split(/\s+/);

  switch (command.toLowerCase()) {

    case "/new": {
      const id = createConversation();
      await saveData();
      console.log(`Created new conversation: Chat ${id}`);
      return true;
    }

    case "/list": {
      console.log("\nYour conversations:");

      for (const [id, chat] of Object.entries(data.conversations)) {
        const active = id === data.activeConversationId ? " (active)" : "";
        console.log(`${id}. ${chat.title}${active}`);
      }

      return true;
    }

    case "/switch": {
      const id = args[0];

      if (!data.conversations[id]) {
        console.log("Conversation not found.");
        return true;
      }

      data.activeConversationId = id;
      await saveData();

      console.log(`Switched to ${data.conversations[id].title}`);
      return true;
    }

    case "/rename": {
      const id = args[0];
      const title = args.slice(1).join(" ");

      if (!data.conversations[id] || !title) {
        console.log("Usage: /rename ID New Title");
        return true;
      }

      data.conversations[id].title = title;
      await saveData();

      console.log("Conversation renamed.");
      return true;
    }

    case "/delete": {
      const id = args[0];

      if (!data.conversations[id]) {
        console.log("Conversation not found.");
        return true;
      }

      delete data.conversations[id];

      if (id === data.activeConversationId) {
        const remaining = Object.keys(data.conversations);

        if (remaining.length) {
          data.activeConversationId = remaining[0];
        } else {
          createConversation();
        }
      }

      await saveData();
      console.log("Conversation deleted.");
      return true;
    }

    case "/help": {
      console.log(`
Available commands:

/new                  Create a conversation
/list                 List conversations
/switch ID            Switch conversation
/rename ID New Title  Rename conversation
/delete ID            Delete conversation
/help                 Show commands
/exit                 Exit application
      `);
      return true;
    }

    default:
      return false;
  }
}

// 10. Main chat function
async function chat() {
  await loadData();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("Welcome to Siya AI!");
  console.log("Type /help to see available commands.");

  try {
    while (true) {
      const conversation = getActiveConversation();

      const input = await rl.question(
        `\n[${conversation.title}] You: `
      );

      if (!input.trim()) continue;

      if (input.trim().toLowerCase() === "/exit") {
        console.log("Goodbye!");
        break;
      }

      if (input.trim().startsWith("/")) {
        await handleCommand(input);
        continue;
      }

      // Save user message
      conversation.messages.push({
        role: "user",
        content: input
      });

      try {
        // Prepare messages for LangChain
        const messages = [
          new SystemMessage(SYSTEM_PROMPT),
          ...conversation.messages.map(message =>
            message.role === "user"
              ? new HumanMessage(message.content)
              : new AIMessage(message.content)
          )
        ];

        // Stream AI response
        const stream = await model.stream(messages);

        let answer = "";

        process.stdout.write("AI: ");

        for await (const chunk of stream) {
          const content = chunk.content;

          const text =
            typeof content === "string"
              ? content
              : Array.isArray(content)
                ? content.map(part =>
                    typeof part === "string" ? part : part.text ?? ""
                  ).join("")
                : "";

          answer += text;
          process.stdout.write(text);
        }

        console.log();

        // Save AI response
        conversation.messages.push({
          role: "assistant",
          content: answer
        });

        await saveData();

      } catch (error) {
        conversation.messages.pop();
        await saveData();
        console.error("\nError:", error.message);
      }
    }
  } finally {
    rl.close();
  }
}

// 11. Start application
chat().catch(error => {
  console.error("Application error:", error.message);
  process.exitCode = 1;
});
