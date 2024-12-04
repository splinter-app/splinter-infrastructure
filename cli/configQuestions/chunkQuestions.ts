import inquirer from "inquirer";
import { envType } from "./envType";

export async function askChunkQuestions(envObject: envType) {
  const chunkSettings = await inquirer.prompt([
    {
      type: "list",
      name: "chunkStrategy",
      message: "Choose your chunking strategy:",
      choices: ["Basic", "By Title", "By Page", "By Similarity"],
    },
    {
      type: "list",
      name: "chunkSize",
      message: "Choose your chunk size:",
      choices: ["500", "1000", "1500", "2000"],
    },
  ]);

  const chunkingStrategy = {
    Basic: "basic",
    "By Title": "by_title",
    "By Page": "by_page",
    "By Similarity": "by_similarity",
  };

  const chunkingMaxChars = {
    "500": 500,
    "1000": 1000,
    "1500": 1500,
    "2000": 2000,
  };

  Object.assign(envObject, {
    chunking_strategy:
      chunkingStrategy[
        chunkSettings.chunkStrategy as keyof typeof chunkingStrategy
      ],
    chunking_max_characters:
      chunkingMaxChars[
        chunkSettings.chunkSize as keyof typeof chunkingMaxChars
      ],
  });

  return chunkSettings;
}
