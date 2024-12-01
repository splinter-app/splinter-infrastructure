#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { S3_Pinecone_CDK_Stack } from "../lib/s3_pinecone_cdk_stack";
import { S3_MongoDB_CDK_Stack } from "../lib/s3_mongodb_cdk_stack";
import { S3_Postgres_CDK_Stack } from "../lib/s3_postgres_cdk_stack";
import { Dropbox_Pinecone_CDK_Stack } from "../lib/dropbox_pinecone_cdk_stack";
import { Dropbox_MongoDB_CDK_Stack } from "../lib/dropbox_mongodb_cdk_stack";
import { Dropbox_Postgres_CDK_Stack } from "../lib/dropbox_postgres_cdk_stack";
import { DeploySociGeneratorStack } from "../lib/soci_generator_cdk_stack";
import { EcrWithImageStack } from "../lib/ecr_with_image_cdk_stack";

const app = new cdk.App();

// Deploy Soci Generator stack
const deployTemplateFromS3Stack = new DeploySociGeneratorStack(app, "SociGenerator", {});

const ecrWithImageStack = new EcrWithImageStack(app, "ECRWithImageStack", {});

ecrWithImageStack.addDependency(deployTemplateFromS3Stack);

// Retrieve the stack to deploy from the environment variable
const stackToDeploy = process.env.STACK_TO_DEPLOY;

if (!stackToDeploy) {
  console.error("No stack specified in STACK_TO_DEPLOY environment variable.");
  process.exit(1);
}

let deployedStack;

switch (stackToDeploy) {
  case "S3PineconeCDKStack":
    deployedStack = new S3_Pinecone_CDK_Stack(app, "S3PineconeCDKStack", {imageUri: ecrWithImageStack.imageUri});
    break;
  case "S3MongoDBCDKStack":
    deployedStack = new S3_MongoDB_CDK_Stack(app, "S3MongoDBCDKStack", {});
    break;
  case "S3PostgresCDKStack":
    deployedStack = new S3_Postgres_CDK_Stack(app, "S3PostgresCDKStack", {});
    break;
  case "DropboxPineconeCDKStack":
    deployedStack = new Dropbox_Pinecone_CDK_Stack(app, "DropboxPineconeCDKStack", {});
    break;
  case "DropboxMongoDBCDKStack":
    deployedStack = new Dropbox_MongoDB_CDK_Stack(app, "DropboxMongoDBCDKStack", {});
    break;
  case "DropboxPostgresCDKStack":
    deployedStack = new Dropbox_Postgres_CDK_Stack(app, "DropboxPostgresCDKStack", {});
    break;
  default:
    console.error(`Unknown stack specified: ${stackToDeploy}`);
    process.exit(1);
}

// Add dependency to ensure deployedStack only deploys after ecrWithImageStack
if (deployedStack) {
  deployedStack.addDependency(ecrWithImageStack);
}

console.log(`Successfully initiated deployment for stack: ${stackToDeploy}`);
