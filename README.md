## Overview

This repository contains the automated deployment process for Splinter, an open-source pipeline designed to simplify the processing of unstructured data and its integration into modern knowledge bases.

To learn more about Splinter, visit our [website](https://splinter-app.github.io/) and [case study](https://splinter-app.github.io/case-study/).

## Infrastructure Overview

Splinter deploys the following key components in your AWS account:

<p align="center">
  <img 
    src="./diagrams/architecture-detailed.png"
    alt="splinter_infrastructure"
  >
</p>

## Deployment and Management

Splinter provides a Command-Line Interface (CLI) that simplifies the deployment, configuration, and management of its AWS infrastructure. Powered by the AWS Cloud Development Kit (CDK), it uses infrastructure-as-code to ensure efficient and straightforward pipeline deployment and management.

### Prerequisites

To get started with Splinter, ensure the following are set up:

- An active AWS account
- AWS CDK and CLI should be installed and configured in your environment
- An existing storage solution: either an AWS S3 bucket or Dropbox
- A Database configured in one of the following: Pinecone, MongoDB, or PostgresQL (with the PG Vector extension)
- Node.js and npm installed on your system

### Installation

- Clone the `splinter-app` repo:

  ```
  git clone https://github.com/splinter-app/splinter-infrastructure.git
  ```

- Install the required dependencies

  ```
    npm install
  ```

### Deploying Splinter

To deploy Splinter infrastructure using the CLI app, execute the following command:

```
npm run splinter deploy
```

This command will guide you through the deployment process, which includes:

1. **Selecting a Source Connector**  
   You will be prompted to choose a source connector. The current options are S3 and Dropbox.

2. **Configure Deployment Options for AWS Batch**  
   You will be prompted to select deployment options for AWS Batch compute environments and define vCPU and memory settings for Fargate containers.

   - **AWS Batch Compute Environment**: Scale the number of jobs processed in parallel to increase throughput.
   - **Fargate Containers**: Optimize container performance by allocating additional vCPU and memory resources, enhancing processing speed for the HuggingFace embedding models which rely on the container resources.

3. **Entering API Keys for Source Connector**  
   You will need to provide your API keys and the names of your selected source connectors.

   - For Dropbox, you'll first complete the OAuth authentication process.

4. **Entering API Keys for Destination Connectors**  
   You will need to provide your API keys and the index names of your selected destination connectors.

5. **Automated Deployment**  
   The CLI will handle deploying Splinter's infrastructure to your AWS account.

6. **Progress Indicator**  
   A progress indicator will display the status of the deployment.

7. **Webhook URL for Dropbox**  
   If Dropbox is selected, you'll receive a Webhook URL to configure with your Dropbox app for sending notifications to Splinter.

8. **Accessing the User Interface**  
   Once the pipeline is deployed, you can access the locally deployed user interface. This includes:
   - A real-time observability platform.
   - A RAG Sandbox for validating embeddings.

### Accessing the Locally Deployed UI

To access the locally deployed UI, follow these steps:

1. **Build and Run the UI Application**  
   Run the following command to build the UI application, once the application is built, it will start running automatically:

   ```
     npm run splinter client
   ```

2. **Start the Local Server Manually**  
   Once the UI is built, start the local server manually by running:  
    `   npm run splinter client:run`

This will launch the local server and provide a `localhost` URL to access the UI in your browser.

### UI Overview

The UI is designed to help you monitor and validate your pipeline with ease and efficiency.

The user interface consists of two main sections:

1. **Observability Dashboard**

- Provides real-time updates on the ingestion process at each step.
- Displays metrics such as the current number of vectors in your database and the number of new vectors being added.

2. **RAG Sandbox**

- Enables verification of vector embedding quality.
- Includes a chatbot that uses your database as a knowledge base.
- Allows you to query the chatbot, which will provide responses based on the context of your documents.

### Destroying Splinter Infrastructure

To tear down the Splinter infrastructure, run the following command and follow the instructions:

```
npm run splinter destroy
```

This command will:

This command will perform the following steps:

1. **Resource Destruction**  
   Delete all Splinter-related resources in your AWS account.

2. **Progress Indicator**  
   A progress indicator will display the status of the destruction process.

3. **Confirmation**  
    Once complete, you will receive a confirmation message.

   **⚠ Important:**  
    Destroying the infrastructure will permanently delete all associated resources and data. This action is irreversible, so proceed with caution.
