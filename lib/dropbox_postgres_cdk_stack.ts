// lib/webhook_lambda_cdk-stack.ts

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as batch from "aws-cdk-lib/aws-batch";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as custom_resources from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dotenv from "dotenv";
import * as logs from "aws-cdk-lib/aws-logs";

dotenv.config();

const COMPUTE_ENV_MAX_VCPU = 16;
const CONTAINER_VCPU = "2";
const CONTAINER_MEMORY = "4096";

export class Dropbox_Postgres_CDK_Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the VPC
    const vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: 3,
      natGateways: 1,
    });

    // Create Batch Instance Role
    const batchInstanceRole = new iam.Role(this, "BatchInstanceRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonEC2ContainerServiceforEC2Role"
        ),
      ],
    });

    // Create an Instance Profile for the Batch Instance Role
    const batchInstanceProfile = new iam.CfnInstanceProfile(
      this,
      "BatchInstanceProfile",
      {
        roles: [batchInstanceRole.roleName],
      }
    );

    // Create Batch Service Role
    const batchServiceRole = new iam.Role(this, "BatchServiceRole", {
      assumedBy: new iam.ServicePrincipal("batch.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSBatchServiceRole"
        ),
      ],
    });

    // Define the execution role for Fargate Batch jobs
    const batchExecutionRole = new iam.Role(this, "BatchExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    // Create a Batch Compute Environment with Fargate and ARM64 support
    const computeEnvironment = new batch.CfnComputeEnvironment(
      this,
      "MyBatchComputeEnv",
      {
        type: "MANAGED",
        computeResources: {
          type: "FARGATE",
          maxvCpus: COMPUTE_ENV_MAX_VCPU,
          subnets: vpc.privateSubnets.map((subnet) => subnet.subnetId),
          securityGroupIds: [
            new ec2.SecurityGroup(this, "BatchSecurityGroup", { vpc })
              .securityGroupId,
          ],
        },
        serviceRole: batchServiceRole.roleArn,
      }
    );

    // Create a Batch Job Queue
    const jobQueue = new batch.CfnJobQueue(this, "MyBatchJobQueue", {
      priority: 1,
      computeEnvironmentOrder: [
        {
          order: 1,
          computeEnvironment: computeEnvironment.ref,
        },
      ],
    });

    // Batch Job Definition with ARM64 architecture
    const jobDefinition = new batch.CfnJobDefinition(this, "MyBatchJobDef", {
      type: "container",
      containerProperties: {
        image: "public.ecr.aws/y7z1l4m8/unstructured_ingest_psql_edit2:latest",
        resourceRequirements: [
          { type: "VCPU", value: CONTAINER_VCPU },
          { type: "MEMORY", value: CONTAINER_MEMORY },
        ],
        jobRoleArn: new iam.Role(this, "BatchJobRole", {
          assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
        }).roleArn,
        executionRoleArn: batchExecutionRole.roleArn,
        runtimePlatform: {
          cpuArchitecture: "ARM64",
          operatingSystemFamily: "LINUX",
        },
      },
      platformCapabilities: ["FARGATE"],
    });

    // Setting up DynamoDB
    const tokenTable = new dynamodb.Table(this, "TokenTable", {
      partitionKey: { name: "TokenID", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Setting up LambdaLayer for the Webhook Lambda
    const requestsLayer = new lambda.LayerVersion(this, "RequestsLayer", {
      code: lambda.Code.fromAsset(
        "lambda/dropbox_postgres_lambda/lambda_layer/requests_layer.zip"
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
    });

    // Create a role for the Lambda functions
    const lambdaExecutionRole = new iam.Role(this, "LambdaExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    lambdaExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    // Lambda function to handle webhook requests
    const webhookLambda = new lambda.Function(this, "WebhookHandlerLambda", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda/dropbox_postgres_lambda"),
      handler: "webhook_handler.handler",
      layers: [requestsLayer],
      environment: {
        JOB_QUEUE: jobQueue.ref,
        JOB_DEFINITION: jobDefinition.ref,
        DROPBOX_REFRESH_TOKEN: process.env.DROPBOX_REFRESH_TOKEN!,
        DROPBOX_APP_KEY: process.env.DROPBOX_APP_KEY!,
        DROPBOX_APP_SECRET: process.env.DROPBOX_APP_SECRET!,
        DROPBOX_REMOTE_URL: process.env.DROPBOX_REMOTE_URL!,
        POSTGRES_DB_NAME: process.env.POSTGRES_DB_NAME!,
        POSTGRES_USER: process.env.POSTGRES_USER!,
        POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD!,
        POSTGRES_HOST: process.env.POSTGRES_HOST!,
        POSTGRES_PORT: process.env.POSTGRES_PORT!,
        POSTGRES_TABLE_NAME: process.env.POSTGRES_TABLE_NAME!,
        EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME!,
        EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER!,
        EMBEDDING_PROVIDER_API_KEY:
          process.env.EMBEDDING_PROVIDER_API_KEY || "",
        DYNAMODB_TABLE_NAME: tokenTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions for the add Lambda to submit jobs to AWS Batch
    webhookLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["batch:SubmitJob"],
        resources: [jobQueue.ref, jobDefinition.ref],
      })
    );

    // grant lambda function permission to read and write to the database.
    tokenTable.grantReadWriteData(webhookLambda);

    // Add specific permissions for DynamoDB access
    webhookLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
        ],
        resources: [tokenTable.tableArn],
      })
    );

    // Grant CloudWatch logging permissions to the Lambda function
    webhookLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    // setting up log groups for API Gateway
    const logGroup = new logs.LogGroup(this, "ApiGatewayAccessLogs");

    // API Gateway to expose the Lambda function
    const api = new apigateway.RestApi(this, "WebhookApi", {
      restApiName: "Webhook Service",
      description: "API Gateway with POST endpoint for Dropbox webhook.",
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
    });

    // Create /webhook resource and add POST method
    const webhookResource = api.root.addResource("webhook");
    webhookResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(webhookLambda)
    );
    webhookResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(webhookLambda)
    );

    webhookResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["OPTIONS", "POST", "GET"],
    });

    new apigateway.Deployment(this, "WebhookApiDeployment", {
      api,
    });

    // Create a custom resource to invoke the Lambda function after deployment
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: webhookLambda, // Pass your existing Lambda function here
    });

    // Trigger the Lambda for initial dropbox processing
    const customResource = new cdk.CustomResource(
      this,
      "InvokeLambdaAfterDeploy",
      {
        serviceToken: provider.serviceToken,
      }
    );

    customResource.node.addDependency(api);
  }
}
