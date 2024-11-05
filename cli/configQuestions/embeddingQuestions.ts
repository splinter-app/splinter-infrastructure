import inquirer from "inquirer";
import { envType } from "./envType";

export async function askEmbeddingQuestions(envObject: envType) {
  const embedding = await inquirer.prompt([
    {
      type: "list",
      name: "embeddingProvider",
      message: "Select an embedding provider:",
      choices: ["Huggingface", "OpenAI", "VoyageAI", "Bedrock"],
    },
  ]);

  if (embedding.embeddingProvider === "Huggingface") {
    const { embeddingModelName } = await inquirer.prompt([
      {
        type: "list",
        name: "embeddingModelName",
        message: "Select Huggingface embedding model:",
        choices: [
          "BAAI/bge-base-en-v1.5",
          "BAAI/bge-small-en-v1.5",
          "BAAI/bge-large-en-v1.5",
        ],
      },
    ]);
    Object.assign(envObject, {
      embedding_model_name: embeddingModelName,
    });
    Object.assign(embedding, { embeddingModelName: embeddingModelName });
  }

  if (embedding.embeddingProvider === "OpenAI") {
    const { embeddingModelName } = await inquirer.prompt([
      {
        type: "list",
        name: "embeddingModelName",
        message: "Select OpenAI embedding model:",
        choices: [
          "text-embedding-3-small",
          "text-embedding-3-large",
          "text-embedding-ada-002",
        ],
      },
    ]);
    const { openaiAPIKey } = await inquirer.prompt([
      {
        type: "input",
        name: "openaiAPIKey",
        message: "Enter your OpenAI API Key:",
        validate: (input) => input.trim() !== "" || "API Key cannot be empty.",
      },
    ]);
    Object.assign(envObject, {
      embedding_model_name: embeddingModelName,
      embedding_provider_api_key: openaiAPIKey,
    });
    Object.assign(embedding, { embeddingModelName: embeddingModelName });
  }

  return embedding;
}