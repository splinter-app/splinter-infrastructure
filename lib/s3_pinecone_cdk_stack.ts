import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3_notifications from "aws-cdk-lib/aws-s3-notifications";
import * as batch from "aws-cdk-lib/aws-batch";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as custom_resources from "aws-cdk-lib/custom-resources";

import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dotenv from "dotenv";
import { Construct } from "constructs";

dotenv.config();

const COMPUTE_ENV_MAX_VCPU = 16;
const CONTAINER_VCPU = "2";
const CONTAINER_MEMORY = "4096";

export class S3_Pinecone_CDK_Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Defining log groups for Rag Sandbox API Gateway
    const logGroup = new logs.LogGroup(this, "ApiGatewayAccessLogs");

    // Define the S3 bucket (or reference an existing one)
    const bucket = s3.Bucket.fromBucketName(
      this,
      "MyExistingBucket",
      process.env.S3_BUCKET_NAME!
    );

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
        image: "public.ecr.aws/q1n8b2k4/hcamacho/unstructured-demo:latest",
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

    // Create a role for the Lambda functions
    const lambdaExecutionRole = new iam.Role(this, "LambdaExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    lambdaExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    // Define the Lambda function for adding
    const addLambda = new lambda.Function(this, "AddLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda/s3_pinecone_lambda"),
      handler: "add_lambda_function.lambda_handler",
      environment: {
        JOB_QUEUE: jobQueue.ref,
        JOB_DEFINITION: jobDefinition.ref,
        MY_AWS_ACCESS_KEY_ID: process.env.MY_AWS_ACCESS_KEY_ID!,
        MY_AWS_SECRET_ACCESS_KEY: process.env.MY_AWS_SECRET_ACCESS_KEY!,
        EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER!,
        EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME!,
        EMBEDDING_PROVIDER_API_KEY:
          process.env.EMBEDDING_PROVIDER_API_KEY || "",
        PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME!,
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
        S3_NOTIFICATION_PREFIX: process.env.S3_NOTIFICATION_PREFIX || "",
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions for the add Lambda to submit jobs to AWS Batch
    addLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["batch:SubmitJob"],
        resources: [jobQueue.ref, jobDefinition.ref],
      })
    );

    // Grant necessary permissions to access S3
    bucket.grantRead(addLambda);

    // Add permissions for S3 to invoke addLambda
    addLambda.addPermission("S3InvokeAddLambda", {
      principal: new iam.ServicePrincipal("s3.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: bucket.bucketArn,
    });

    // Define the Lambda function for handling S3 object deletion
    const deleteLambda = new lambda.Function(this, "DeleteLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "delete_lambda_function.lambda_handler",
      code: lambda.Code.fromAsset("lambda/s3_pinecone_lambda"),
      environment: {
        PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME!,
      },
      timeout: cdk.Duration.seconds(30),
    });

    deleteLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["batch:SubmitJob"],
        resources: [jobQueue.ref],
      })
    );

    const requestsLayer = new lambda.LayerVersion(this, "RequestsLayer", {
      code: lambda.Code.fromAsset(
        "lambda/prompt_lambda/lambda_layer/openai_pinecone_layer.zip"
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_10],
    });

    // Define the Lambda function for handling OpenAI requests
    const promptLambda = new lambda.Function(this, "PromptLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_10,
      code: lambda.Code.fromAsset("lambda/prompt_lambda"),
      handler: "prompt_handler.lambda_handler",
      layers: [requestsLayer],
      environment: {
        OPENAI_API_KEY: process.env.EMBEDDING_PROVIDER_API_KEY!,
        PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME!,
        EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME!,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant API Gateway permissions to invoke the Lambda function
    promptLambda.addPermission("APIGatewayInvokeLambda", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // Grant necessary permissions to access S3 for the delete Lambda
    bucket.grantRead(deleteLambda);

    // Add permissions for S3 to invoke deleteLambda
    deleteLambda.addPermission("S3InvokeDeleteLambda", {
      principal: new iam.ServicePrincipal("s3.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: bucket.bucketArn,
    });

    // Check if the environment variable for prefix is defined
    if (process.env.S3_NOTIFICATION_PREFIX) {
      const notificationOptions: s3.NotificationKeyFilter = {
        prefix: process.env.S3_NOTIFICATION_PREFIX,
      };

      // Add event notifications with the prefix
      bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3_notifications.LambdaDestination(addLambda),
        notificationOptions
      );

      bucket.addEventNotification(
        s3.EventType.OBJECT_REMOVED,
        new s3_notifications.LambdaDestination(deleteLambda),
        notificationOptions
      );
    } else {
      // Add event notifications without any additional options
      bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3_notifications.LambdaDestination(addLambda)
      );

      bucket.addEventNotification(
        s3.EventType.OBJECT_REMOVED,
        new s3_notifications.LambdaDestination(deleteLambda)
      );
    }

    // API Gateway to expose the RAG Sandobx Lambda function
    const api = new apigateway.RestApi(this, "SandboxApi", {
      restApiName: "Sandbox Service",
      description:
        "API Gateway with POST endpoint for embedding and querying OpenAI.",
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // or specify an array of allowed origins
        allowMethods: apigateway.Cors.ALL_METHODS, // or specify methods like ['GET', 'POST']
      },
    });

    // Define the /sandbox resource and POST method
    const sandbox = api.root.addResource("sandbox");
    const promptResource = sandbox.addResource("prompt");

    // Integrate the prompt Lambda with the POST method on the /sandbox/prompt route
    promptResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(promptLambda, {
        requestTemplates: {
          "application/json": `{
            "statusCode": 200
        }`,
        },
      })
    );

    // Output the API endpoint URL
    new cdk.CfnOutput(this, "SandboxApiUrl", {
      value: api.url,
      exportName: "SandboxApiUrl",
    });

    // Create a custom resource to invoke the Lambda function after deployment
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: addLambda, // Pass your existing Lambda function here
    });

    // Trigger the Lambda for initial S3 bucket processing
    const customResource = new cdk.CustomResource(
      this,
      "InvokeLambdaAfterDeploy",
      {
        serviceToken: provider.serviceToken,
      }
    );

    customResource.node.addDependency(bucket);
  }
}
