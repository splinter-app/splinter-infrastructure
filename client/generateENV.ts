import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import inquirer from 'inquirer';

async function awsRegion() {
  const awsRegion = await inquirer.prompt([
    {
      type: 'list',
      name: 'region',
      message: 'Choose your AWS Region:',
      choices: ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1', 'sa-east-1'],
    },
  ]);

  return awsRegion.region;
}

// Ensure compatibility with ES module syntax in TypeScript
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the name of the CloudFormation stack
const stackName = 'S3PineconeCDKStack';

// Type for CloudFormation outputs
interface CloudFormationOutput {
  OutputKey?: string;
  OutputValue?: string;
}

// Fetch CDK outputs and return them as a key-value pair object
async function getCdkOutputs(cdk: CloudFormationClient): Promise<Record<string, string>> {
  try {
    const data = await cdk.send(new DescribeStacksCommand({ StackName: stackName }));
    const outputs: CloudFormationOutput[] | undefined = data.Stacks?.[0].Outputs;

    if (!outputs) {
      throw new Error('No outputs found for the specified stack');
    }

    return outputs.reduce<Record<string, string>>((acc, output) => {
      if (output.OutputKey && output.OutputValue) {
        acc[output.OutputKey] = output.OutputValue;
      }
      return acc;
    }, {});
  } catch (err) {
    console.error('Error fetching CDK outputs:', err);
    throw err;
  }
}

// Create a .env file using the fetched CDK outputs
async function createEnvFile(): Promise<void> {
  const region = await awsRegion();

  // Initialize the CloudFormation client
  const cdk = new CloudFormationClient({ region: region });

  const outputs = await getCdkOutputs(cdk);

  const websocketUrl = outputs['WebSocketURL'];
  const apiGatewayUrl = outputs['SandboxApiUrl'];

  if (!websocketUrl || !apiGatewayUrl) {
    throw new Error('Missing required environment variables from CDK outputs');
  }

  const envContent = `
VITE_WEBHOOK_URL=${websocketUrl}
VITE_APIGATEWAY_URL=${apiGatewayUrl}
`;

  const envFilePath = join(__dirname, '.env');
  fs.writeFileSync(envFilePath, envContent);

  console.log(`.env file created successfully at ${envFilePath}`);
}

// Execute the main function and handle errors
createEnvFile().catch(console.error);
