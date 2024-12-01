import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as path from 'path';
import * as ecrDeploy from 'cdk-ecr-deployment'
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';



export class EcrWithImageStack extends cdk.Stack {
  public readonly imageUri: string;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an ECR repository
    const repository = new ecr.Repository(this, 'SplinterRepo', {
      repositoryName: 'splinter-container',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });


    const image = new DockerImageAsset(this, 'CDKDockerImage', {
      directory: path.join(__dirname, 'test-dockerfile'),
    });
    
    // Copy from cdk docker image asset to another ECR.
    const ecrDeployment = new ecrDeploy.ECRDeployment(this, 'DeployDockerImage', {
      src: new ecrDeploy.DockerImageName(image.imageUri),
      dest: new ecrDeploy.DockerImageName(repository.repositoryUri),
    });

    // Ensure repository is created and image is uploaded before deploying image
    ecrDeployment.node.addDependency(repository);
    ecrDeployment.node.addDependency(image);

    this.imageUri = `${repository.repositoryUri}:latest`;
    
  }
}
