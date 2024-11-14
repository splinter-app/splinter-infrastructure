import * as cdk from 'aws-cdk-lib';
import * as assertions from 'aws-cdk-lib/assertions';
import { Template } from 'aws-cdk-lib/assertions';
import { S3_Pinecone_CDK_Stack } from '../lib/s3_pinecone_cdk_stack';

const createTemplate = () => {
  const app = new cdk.App();
  const stack = new S3_Pinecone_CDK_Stack(app, 'TestStack');
  return Template.fromStack(stack);
};

const assertLambdaEnvironment = (template: Template, handler: string, expectedEnvVars: Record<string, any>) => {
  const envCapture = new assertions.Capture();
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: envCapture,
    Handler: handler,
  });

  expect(envCapture.asObject()).toMatchObject({
    Variables: expectedEnvVars,
  });
};

describe('S3_Pinecone_CDK_Stack Tests', () => {
  let template: Template;

  beforeEach(() => {
    template = createTemplate();
  });

  // Test 1: Check S3 Bucket Reference
  test('S3 Bucket reference is used correctly', () => {
    template.hasResource('AWS::Lambda::Function', {
      Properties: {
        Environment: {
          Variables: {
            S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
          },
        },
      },
    });
  });

  // Test 2: WebSocket API and Lambda Integration
  test('WebSocket API is created with Lambda integration', () => {
    const routes = [
      { routeKey: '$connect', lambdaSuffix: 'Connect' },
      { routeKey: '$disconnect', lambdaSuffix: 'Disconnect' },
      { routeKey: 'initialCheck', lambdaSuffix: 'InitialCheck' },
    ];
  
    routes.forEach(({ routeKey, lambdaSuffix }) => {
      const routeName = `WebSocketAPI${lambdaSuffix}Route`;
      const lambdaIntegrationName = `${routeName}${lambdaSuffix}LambdaIntegration`;
  
      const targetCapture = new assertions.Capture();
  
      template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        RouteKey: routeKey,
        Target: targetCapture,
      });
  
      expect(targetCapture.asObject()).toMatchObject({
        "Fn::Join": [
          "", 
          [
            "integrations/",
            {
              "Ref": expect.stringMatching(new RegExp(`^${lambdaIntegrationName}`, 'i'))
            }
          ]
        ]
      });
    });
  });  

  // Test 3: DynamoDB Table for Connections
  test('DynamoDB Table Created for Connections', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'connectionId', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'connectionId', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'N' },
      ],
    });
  });

  // Test 4: DynamoDB Table for Client Data
  test('DynamoDB Table Created for Client Data', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'clientId', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'clientId', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'N' },
      ],
    });
  });

  // Lambda Function Tests
  describe('Lambda Function Tests', () => {
    const lambdaFunctions = [
      { handler: 'connect_lambda.lambda_handler', envVars: { CONNECTION_TABLE_NAME: { Ref: expect.any(String) } } },
      { handler: 'disconnect_lambda.lambda_handler', envVars: { CONNECTION_TABLE_NAME: { Ref: expect.any(String) } } },
      { handler: 'initial_check_lambda.lambda_handler', envVars: { CONNECTION_TABLE_NAME: { Ref: expect.any(String) } } },
      { handler: 'vector_count_pinecone_lambda.lambda_handler', envVars: { CONNECTION_TABLE_NAME: { Ref: expect.any(String) }, CLIENT_DATA_TABLE_NAME: { Ref: expect.any(String) } } },
      { handler: 'new_status_lambda.lambda_handler', envVars: { CONNECTION_TABLE_NAME: { Ref: expect.any(String) }, CENTRAL_LOG_GROUP_NAME: { Ref: expect.any(String) }, CLIENT_DATA_TABLE_NAME: { Ref: expect.any(String) } } },
      { handler: 'add_lambda_function.lambda_handler', envVars: { CENTRAL_LOG_GROUP_NAME: { Ref: expect.any(String) }, JOB_QUEUE: { Ref: expect.any(String) }, JOB_DEFINITION: { Ref: expect.any(String) } } },
      { handler: 'delete_lambda_function.lambda_handler', envVars: { CENTRAL_LOG_GROUP_NAME: { Ref: expect.any(String) } } },
    ];

    lambdaFunctions.forEach(({ handler, envVars }) => {
      test(`${handler} is created with correct handler and environment variables`, () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
          Handler: handler,
        });
        assertLambdaEnvironment(template, handler, envVars);
      });
    });
  });

  // Test 5: Log Group Created
  test('Central LogGroup Created', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 731,
    });
    template.hasResource('AWS::Logs::LogGroup', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });

  // Test 6: Log Subscription Filter
  test('Log Subscription Filter is created with correct filter pattern and destination', () => {
    const subscriptionFilters = template.findResources('AWS::Logs::SubscriptionFilter');
    expect(Object.keys(subscriptionFilters).length).toBe(1);

    const subscriptionFilter = subscriptionFilters[Object.keys(subscriptionFilters)[0]];
    const expectedPattern = "\\?\"ingest process finished in\" \\?\"Deleting vectors from database\" \\?\"Deleting File:\" \\?\"calling PartitionStep\" \\?\"calling ChunkStep\" \\?\"calling EmbedStep\" \\?\"writing a total of\" \\?\"MainProcess ERROR\" \\?\"Exception raised\"";

    expect(subscriptionFilter.Properties.FilterPattern).toMatch(new RegExp(expectedPattern));

    expect(subscriptionFilter.Properties.DestinationArn).toEqual({
      'Fn::GetAtt': [
        expect.stringMatching(/^VectorCountLambda/),
        'Arn',
      ]
    });

    expect(subscriptionFilter.Properties.LogGroupName).toEqual({
      Ref: expect.stringMatching(/^CentralLogGroup/),
    });
  });

  // Test 7: EventBridge Rule Pattern
  test('EventBridge Rule has the correct eventPattern', () => {
    const eventBridgeRule = template.findResources('AWS::Events::Rule');
    expect(Object.keys(eventBridgeRule).length).toBe(1);

    const rule = eventBridgeRule[Object.keys(eventBridgeRule)[0]];
    expect(rule.Properties.EventPattern).toEqual({
      source: ['aws.batch'],
      'detail-type': ['Batch Job State Change'],
      detail: {
        status: ['SUBMITTED', 'STARTING', 'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'],
      },
    });
  });

  // Test 8: AWS Batch
  test('AWS Batch Job Definition is created', () => {
    template.hasResourceProperties('AWS::Batch::JobDefinition', {
      Type: 'container',
      ContainerProperties: {
        Image: 'public.ecr.aws/q1n8b2k4/hcamacho/unstructured-demo:latest',
        LogConfiguration: {
          LogDriver: 'awslogs',
          Options: {
            'awslogs-stream-prefix': 'batch-logs',
            'awslogs-create-group': 'true',
          },
        },
        RuntimePlatform: {
          CpuArchitecture: 'ARM64',
          OperatingSystemFamily: 'LINUX',
        },
      },
      PlatformCapabilities: ['FARGATE'],
    });
  });
  test('Batch Compute Environment is created', () => {
    template.hasResourceProperties('AWS::Batch::ComputeEnvironment', {
      Type: 'MANAGED',
      ComputeResources: {
        Type: 'FARGATE',
      },
    });
  });
  test('Batch Job Queue is created', () => {
    template.hasResourceProperties('AWS::Batch::JobQueue', {
      Priority: 1,
      ComputeEnvironmentOrder: [
        {
          Order: 1,
        },
      ],
    });
  });  
});