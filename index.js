
import "dotenv/config";
import { ChatGroq } from "@langchain/groq";

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-20b",
  temperature: 0.7,
});

try {
  const response = await model.invoke(
    "What is Agentic AI? Explain in simple words."
  );

  console.log(response.content);
} catch (error) {
  console.error("Error:", error.message);
}
