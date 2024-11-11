import inquirer from "inquirer";
import { envType } from "./envType";
import kleur = require("kleur");
import { spawn } from "child_process";
import * as fs from "node:fs";

function displayDropboxInstructions() {
  const dropboxInstructions = `In order to use Dropbox as a source connector in Splinter, ensure you have:

    1. A Dropbox account. Sign up here: https://www.dropbox.com/home

    2. A target folder in Dropbox to serve as the source or destination for data.

    3. A Dropbox app linked to your account: https://www.dropbox.com/developers/apps
        - Visit the App Console tab on Dropbox’s Getting Started page for guidance.

    4. Necessary permissions for your Dropbox app:
        - In the Permissions tab, enable ${kleur.red(
          "files.content.read"
        )} and ${kleur.red(
    "files.content.write"
  )}. Learn more here: https://developers.dropbox.com/oauth-guide.
        - In the Settings tab, set your App folder name to match the target folder name in Dropbox.
        - Make note of the remote URL to the target folder, in the format: ${kleur.red(
          "'dropbox://path/to/folder/in/account'"
        )}.
        - If the folder is in the root of Dropbox, use the URL format: ${kleur.red(
          "'dropbox:// '"
        )} ${kleur.red("(with a required space)")}.

    5. Please take note of the Dropbox App Key and App Secret, available in your app’s Settings tab.

    6. If you do not have a Dropbox Refresh Token, please select 'No' to the following question and follow the instructions. Otherwise select 'Yes' to continue the deployment process.
  `;

  console.log(
    kleur.yellow(
      "IMPORTANT!: After deployment, add '/webhook' to the URL provided. Use this URL as the Webhook URI in your Dropbox app’s settings. This will enable direct communication between Dropbox and your Splinter pipeline."
    )
  );
  console.log(kleur.green(dropboxInstructions));
}

export async function askSourceQuestions(envObject: envType) {
  const source = await inquirer.prompt([
    {
      type: "list",
      name: "sourceConnector",
      message: "Choose your source connector:",
      choices: ["S3", "Dropbox"],
    },
  ]);

  if (source.sourceConnector === "S3") {
    const { myAWSAccessKeyId, myAWSSecretAccessKey } = await inquirer.prompt([
      {
        type: "input",
        name: "myAWSAccessKeyId",
        message: "Enter AWS Access Key ID:",
        validate: (input) =>
          input.trim() !== "" || "Access key cannot be empty.",
      },
      {
        type: "input",
        name: "myAWSSecretAccessKey",
        message: "Enter AWS Secret Access Key:",
        validate: (input) =>
          input.trim() !== "" || "Secret access key cannot be empty.",
      },
    ]);

    Object.assign(envObject, {
      my_aws_access_key_id: myAWSAccessKeyId,
      my_aws_secret_access_key: myAWSSecretAccessKey,
    });
    const { s3BucketName } = await inquirer.prompt([
      {
        type: "input",
        name: "s3BucketName",
        message: "Enter the name of the S3 bucket:",
        validate: (input) =>
          input.trim() !== "" || "S3 bucket name cannot be empty.",
      },
    ]);
    Object.assign(envObject, { s3_bucket_name: s3BucketName });

    const { s3NotificationPrefix } = await inquirer.prompt([
      {
        type: "input",
        name: "s3NotificationPrefix",
        message: "Enter the name of the S3 bucket folder (optional):",
      },
    ]);

    const prefix = s3NotificationPrefix.trim()
      ? `${s3NotificationPrefix.trim()}/`
      : "";
    Object.assign(envObject, { s3_notification_prefix: prefix });
  } else if (source.sourceConnector === "Dropbox") {
    displayDropboxInstructions();

    const { hasRefreshToken } = await inquirer.prompt([
      {
        type: "confirm",
        name: "hasRefreshToken",
        message: "Do you already have a Dropbox refresh token?",
      },
    ]);

    if (!hasRefreshToken) {
      console.log(
        kleur.yellow(
          "Please generate a new Dropbox refresh token by running 'npm run splinter dropbox-oauth'"
        )
      );
      process.exit(0);
    } else {
      const {
        dropboxAppKey,
        dropboxAppSecret,
        dropboxRemoteUrl,
        refreshToken,
      } = await inquirer.prompt([
        {
          type: "input",
          name: "dropboxAppKey",
          message: "Enter your Dropbox App Key:",
          validate: (input) =>
            input.trim() !== "" || "Dropbox App Key cannot be empty.",
        },
        {
          type: "input",
          name: "dropboxAppSecret",
          message: "Enter your Dropbox App Secret:",
          validate: (input) =>
            input.trim() !== "" || "Dropbox App Secret cannot be empty.",
        },
        {
          type: "input",
          name: "dropboxRemoteUrl",
          message:
            "Enter the remote url to your Dropbox folder (e.g., 'dropbox://path/to/folder/in/account'):",
          validate: (input) =>
            input.trim() !== "" || "Dropbox remote url cannot be empty.",
        },
        {
          type: "input",
          name: "refreshToken",
          message: "Enter your Dropbox refresh token:",
          validate: (input) =>
            input.trim() !== "" || "Refresh token cannot be empty.",
        },
      ]);

      Object.assign(envObject, {
        dropbox_app_key: dropboxAppKey,
        dropbox_app_secret: dropboxAppSecret,
        dropbox_remote_url: dropboxRemoteUrl,
        dropbox_refresh_token: refreshToken,
      });
    }
  }

  return source;
}
