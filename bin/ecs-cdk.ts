#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { S3_Pinecone_CDK_Stack } from "../lib/s3_pinecone_cdk_stack";
import { S3_MongoDB_CDK_Stack } from "../lib/s3_mongodb_cdk_stack";
import { S3_Postgres_CDK_Stack } from "../lib/s3_postgres_cdk_stack";
import { Dropbox_Pinecone_CDK_Stack } from "../lib/dropbox_pinecone_cdk_stack";
import { Dropbox_MongoDB_CDK_Stack } from "../lib/dropbox_mongodb_cdk_stack";
import { Dropbox_Postgres_CDK_Stack } from "../lib/dropbox_postgres_cdk_stack";

const app = new cdk.App();

// Retrieve the stack to deploy from the environment variable
const stackToDeploy = process.env.STACK_TO_DEPLOY;

if (!stackToDeploy) {
  console.error("No stack specified in STACK_TO_DEPLOY environment variable.");
  process.exit(1);
}

// Deploy only the specified stack
switch (stackToDeploy) {
  case "S3PineconeCDKStack":
    new S3_Pinecone_CDK_Stack(app, "S3PineconeCDKStack", {});
    break;
  case "S3MongoDBCDKStack":
    new S3_MongoDB_CDK_Stack(app, "S3MongoDBCDKStack", {});
    break;
  case "S3PostgresCDKStack":
    new S3_Postgres_CDK_Stack(app, "S3PostgresCDKStack", {});
    break;
  case "DropboxPineconeCDKStack":
    new Dropbox_Pinecone_CDK_Stack(app, "DropboxPineconeCDKStack", {});
    break;
  case "DropboxMongoDBCDKStack":
    new Dropbox_MongoDB_CDK_Stack(app, "DropboxMongoDBCDKStack", {});
    break;

  case "DropboxPostgresCDKStack":
    new Dropbox_Postgres_CDK_Stack(app, "DropboxPostgresCDKStack", {});
    break;

  default:
    console.error(`Unknown stack specified: ${stackToDeploy}`);
    process.exit(1);
}

console.log(`Successfully initiated deployment for stack: ${stackToDeploy}`);
