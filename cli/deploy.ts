#!/usr/bin/env node

import { execSync, spawn } from "child_process";
import { Command } from "commander";
import inquirer from "inquirer";
import kleur = require("kleur");
import * as fs from "fs";
import * as path from "path";

import { askSourceQuestions } from "./configQuestions/sourceQuestions";
import { askDestinationQuestions } from "./configQuestions/destinationQuestions";
import { askEmbeddingQuestions } from "./configQuestions/embeddingQuestions";
import { askChunkQuestions } from "./configQuestions/chunkQuestions";
import { envType } from "./configQuestions/envType";
import { askInitialIngestion } from "./configQuestions/initialIngestionQuestions";

import { askComputeContainerQuestions } from "./configQuestions/computeEnvContainerQuestions";

// Read and display the logo

function displayWelcome() {
  const logoPath = path.join(__dirname, "logo.txt");
  const logo = fs.readFileSync(logoPath, "utf8");
  console.log(kleur.red().bold(logo));
  console.log(kleur.green("Welcome to the Splinter Deploy CLI!"));
  console.log(
    kleur
      .yellow()
      .bold(
        "**IMPORTANT**: Before proceeding, please ensure you're logged in to your AWS account."
      )
  );
  console.log(
    kleur.yellow(
      "You can log in through the AWS website or authenticate via the AWS CLI to access your resources."
    )
  );
}

const program = new Command();

program
  .name("deploy-cli")
  .description(
    "CLI tool for deploying AWS CDK stacks with custom configurations."
  )
  .version("1.0.0");

program
  .command("deploy")
  .description("Deploy the CDK stack with specified options.")
  .action(async () => {
    displayWelcome();
    let envObject = {} as envType;
    const source = await askSourceQuestions(envObject);
    const computeEnvContainer = await askComputeContainerQuestions(envObject);
    const destination = await askDestinationQuestions(envObject);
    const embedding = await askEmbeddingQuestions(envObject);

    let chunkSettings = {};
    if (embedding.embeddingProvider !== "OpenAI") {
      chunkSettings = await askChunkQuestions(envObject);
    } else {
      console.log(
        kleur.yellow(
          "OpenAI detected: Chunking strategies will be set automatically. Proceeding with the deployment process..."
        )
      );
    }

    const initialIngestion = await askInitialIngestion(envObject);

    const fullConfig = {
      ...computeEnvContainer,
      ...source,
      ...destination,
      ...embedding,
      ...chunkSettings,
      ...initialIngestion,
    };

    console.log("Deploying with the following options:");
    console.log(fullConfig);

    const sourceDestinationEmbedding = `${source.sourceConnector}|${destination.destinationConnector}|${embedding.embeddingProvider}`;
    Object.assign(envObject, {
      SOURCE_DESTINATION_EMBEDDING: sourceDestinationEmbedding,
    });

    const stackMapping: { [key: string]: string } = {
      "S3:Pinecone": "S3PineconeCDKStack",
      "S3:MongoDB": "S3MongoDBCDKStack",
      "S3:PostgreSQL": "S3PostgresCDKStack",
      "Dropbox:Pinecone": "DropboxPineconeCDKStack",
      "Dropbox:MongoDB": "DropboxMongoDBCDKStack",
      "Dropbox:PostgreSQL": "DropboxPostgresCDKStack",
    };

    const stackKey = `${source.sourceConnector}:${destination.destinationConnector}`;
    const stackToDeploy = stackMapping[stackKey];

    if (!stackToDeploy) {
      console.error("No matching stack found for the selected options.");
      process.exit(1);
    }

    envObject.stack_to_deploy = stackToDeploy;
    writeEnvFile(envObject);

    // Execute the deployment command for the selected stack
    try {
      execSync(`npx cdk deploy ${stackToDeploy} --require-approval never`, {
        stdio: "inherit",
      });
    } catch (error) {
      console.error("Deployment failed:", error);
      process.exit(1);
    }
  });

program
  .command("destroy")
  .description("Destroy the CDK stack.")
  .action(async () => {
    console.log(
      kleur
        .red()
        .bold("WARNING: This action is permanent and cannot be undone!")
    );

    const { stackToDestroy } = await inquirer.prompt([
      {
        type: "list",
        name: "stackToDestroy",
        message: "Would you like to destroy your current Splinter cdk stack?",
        choices: ["Continue", new inquirer.Separator(), "Cancel"],
      },
    ]);

    if (stackToDestroy === "Cancel") {
      console.log(kleur.yellow("Operation cancelled. Returning to CLI."));
      return;
    }

    try {
      execSync(`npx cdk destroy --require-approval never --force`, {
        stdio: "inherit",
      });
    } catch (error) {
      console.error("Destruction failed:", error);
      process.exit(1);
    }
  });

program
  .command("dropbox-oauth")
  .description("Run the Dropbox OAuth flow to generate a refresh token.")
  .action(() => {
    console.log(kleur.green("Starting Dropbox OAuth process..."));

    const command = `source ./src/python-dropbox-oauth/venv/bin/activate && pip install dropbox && python3 ./python-dropbox-oauth/oauth.py`;

    const pythonProcess = spawn(command, {
      stdio: "inherit", // Use "inherit" to allow Python to interact with the terminal directly
      shell: true,
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        console.log(
          kleur.yellow(
            "OAuth process completed successfully. To proceed with deployment, please run 'npm run splinter deploy', select Dropbox as the source, and enter the generated refresh token when prompted."
          )
        );
      } else {
        console.error(kleur.red(`OAuth process exited with code ${code}`));
      }
    });
  });

program
  .command("client:build")
  .description("Build the Splinter UI")
  .action(() => {
    try {
      console.log("Building Splinter UI...");
      execSync(
        "cd client && npm install && clear && npx tsx generateENV.ts && npm run build",
        {
          stdio: "inherit",
        }
      );
    } catch (error) {
      console.error("Error starting Splinter UI", error);
    }
  });

program
  .command("client:run")
  .description("Run the Splinter UI")
  .action(() => {
    try {
      console.log("Starting Splinter UI...");
      execSync("cd client && npm start", {
        stdio: "inherit",
      });
    } catch (error) {
      console.error("Error starting Splinter UI", error);
    }
  });
program
  .command("client")
  .description("Builds and run the Splinter UI")
  .action(() => {
    try {
      console.log("Starting Splinter UI...");
      execSync("npm run splinter client:build && npm run splinter client:run", {
        stdio: "inherit",
      });
    } catch (error) {
      console.error("Error starting Splinter UI", error);
    }
  });

// Helper function to write answers to .env file
function writeEnvFile(envObject: envType) {
  const envFilePath = path.resolve(process.cwd(), ".env");
  const envData = Object.entries(envObject)
    .map(([key, value]) => `${key.toUpperCase()}=${value}`)
    .join("\n");

  fs.writeFileSync(envFilePath, envData);
  console.log(
    kleur.green(".env file created/updated with your configurations.")
  );
}

program.parse(process.argv);
