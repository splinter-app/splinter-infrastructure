import * as cdk from 'aws-cdk-lib';

export class DeploySociGeneratorStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 URL of the CloudFormation template
    const templateUrl = 'https://aws-quickstart.s3.us-east-1.amazonaws.com/cfn-ecr-aws-soci-index-builder/templates/SociIndexBuilder.yml';

    // Deploy the CloudFormation template
    new cdk.CfnStack(this, 'MyNestedStack', {
      templateUrl: templateUrl,
    })
  }
}
