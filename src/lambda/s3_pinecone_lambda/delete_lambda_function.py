# lambda/s3_pinecone_lambda/delete_lambda_function.py
import json
import os
import urllib.parse
import boto3
import time
from pinecone import Pinecone

logs_client = boto3.client('logs')
log_group_name = os.environ['CENTRAL_LOG_GROUP_NAME']
log_stream_name = 'deleteLambda-log-stream'

try:
    logs_client.create_log_stream(
        logGroupName=log_group_name,
        logStreamName=log_stream_name
    )
except logs_client.exceptions.ResourceAlreadyExistsException:
    pass

def log_to_cloudwatch(message):
    timestamp = int(round(time.time() * 1000))

    logs_client.put_log_events(
        logGroupName=log_group_name,
        logStreamName=log_stream_name,
        logEvents=[
            {
                'timestamp': timestamp,
                'message': message
            }
        ]
    )

def delete_from_pinecone(filename, api_key, index_name):
    # Initialize Pinecone and connect to the index
    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)

    # Start timing the operation
    start_time = time.time()

    # Delete all vectors in the specified namespace
    index.delete(delete_all=True, namespace=filename)

    print(f"Deleted all vectors in the namespace '{filename}'.")

    # End timing and calculate duration
    end_time = time.time()
    duration = end_time - start_time
    print(f"Total delete process took {duration:.2f} seconds.")

def lambda_handler(event, context):
    # Retrieve the API key and index name from environment variables
    api_key = os.environ['PINECONE_API_KEY']
    index_name = os.environ['PINECONE_INDEX_NAME']

    for record in event['Records']:
        s3_bucket = record['s3']['bucket']['name']
        s3_key = record['s3']['object']['key']

        filename = os.path.basename(s3_key)
        message = f"Deleting File: {filename} from Bucket: {s3_bucket}"
        print(message)
        log_to_cloudwatch(message)

        try:
            decoded_filename = urllib.parse.unquote(filename)
            decoded_filename_with_spaces = decoded_filename.replace('+', ' ').replace('%20', ' ')
            delete_from_pinecone(decoded_filename_with_spaces, api_key, index_name)
            print(f"Deleted File: {decoded_filename_with_spaces} from Bucket: {s3_bucket}")
        except Exception as e:
            message = f"Error deleting from Pinecone: {e}"
            print(message)
            log_to_cloudwatch(message)

    return {
        'statusCode': 200,
        'body': json.dumps('Processed deleted files and updated Pinecone index.')
    }