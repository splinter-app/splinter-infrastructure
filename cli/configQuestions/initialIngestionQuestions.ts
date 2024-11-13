import inquirer from "inquirer";
import { envType } from "./envType";

export async function askInitialIngestion(envObject: envType) {
  const initialIngestion = await inquirer.prompt([
    {
      type: "list",
      name: "initialIngestion",
      message:
        "Would you like to automatically ingest existing documents from your source connector into your vector database upon deployment?",
      choices: ["Yes", "No"],
    },
  ]);

  const dict = {
    Yes: "true",
    No: "false",
  };

  Object.assign(envObject, {
    initial_ingestion:
      dict[initialIngestion.initialIngestion as keyof typeof dict],
  });

  return initialIngestion;
}
