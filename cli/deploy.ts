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

// Read and display the logo

function displayWelcome() {
  const logoPath = path.join(__dirname, "logo.txt");
  const logo = fs.readFileSync(logoPath, "utf8");
  console.log(kleur.red().bold(logo));
  console.log(kleur.green("Welcome to the Splinter Deploy CLI!"));
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
    const destination = await askDestinationQuestions(envObject);
    const embedding = await askEmbeddingQuestions(envObject);
    const chunkSettings = await askChunkQuestions(envObject);

    const fullConfig = {
      ...source,
      ...destination,
      ...embedding,
      ...chunkSettings,
    };

    console.log("Deploying with the following options:");
    console.log(fullConfig);

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
        message: "Select the stack you wish to destroy:",
        choices: [
          "S3PineconeCDKStack",
          "S3MongoDBCDKStack",
          "S3PostgresCDKStack",
          "DropboxPineconeCDKStack",
          "DropboxMongoDBCDKStack",
          "DropboxPostgresCDKStack",
          new inquirer.Separator(),
          "Cancel",
        ],
      },
    ]);

    if (stackToDestroy === "Cancel") {
      console.log(kleur.yellow("Operation cancelled. Returning to CLI."));
      return;
    }

    try {
      execSync(
        `npx cdk destroy ${stackToDestroy} --require-approval never --force`,
        { stdio: "inherit" }
      );
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

    const command = `source ../python-dropbox-oauth/venv/bin/activate && python3 ../python-dropbox-oauth/oauth.py`;

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

program.parse(process.argv);

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
