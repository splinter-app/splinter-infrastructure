import json
import logging
import requests
import time
import boto3
import uuid
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# initialize the Batch client and DynamoDb clients
dynamodb = boto3.client('dynamodb')
batch_client = boto3.client('batch')

with open('dropbox_pinecone_ingest.py', 'r') as script_file:
    app_script = script_file.read()

def get_token_data():
    table_name = os.environ['DYNAMODB_TABLE_NAME']
    response = dynamodb.get_item(
        TableName=table_name,
        Key={'TokenID': {'S': 'dropbox_token'}}
    )
    if 'Item' in response:
        return {
            'access_token': response['Item']['AccessToken']['S'],
            'expiry_time': int(response['Item']['ExpiryTime']['N'])
        }
    else:
        return None

def save_token_data(access_token, expiry_time):
    table_name = os.environ['DYNAMODB_TABLE_NAME']
    dynamodb.put_item(
        TableName=table_name,
        Item={
            'TokenID': {'S': 'dropbox_token'},
            'AccessToken': {'S': access_token},
            'ExpiryTime': {'N': str(expiry_time)}
        }
    )

def list_folder_contents(access_token):
    # List contents of the Dropbox app folder.
    url = "https://api.dropboxapi.com/2/files/list_folder"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    data = json.dumps({"path": ""})  # Use empty string for the app folder

    response = requests.post(url, headers=headers, data=data)
    if response.status_code == 200:
        return response.json().get('entries', [])
    else:
        logger.error("Error listing folder contents: %s", response.text)
        return []

def refresh_access_token():
    response = requests.post(
        'https://api.dropboxapi.com/oauth2/token',
        data={
            'grant_type': 'refresh_token',
            'refresh_token': os.environ['DROPBOX_REFRESH_TOKEN'],
        },
        auth=(os.environ['DROPBOX_APP_KEY'], os.environ['DROPBOX_APP_SECRET'])
    )
    if response.status_code == 200:
        new_token_data = response.json()
        access_token = new_token_data['access_token']
        expires_in = new_token_data['expires_in']  # Duration in seconds
        access_token_expiry = int(time.time()) + expires_in
        save_token_data(access_token, access_token_expiry)
        return access_token, access_token_expiry
    else:
        raise Exception("Failed to refresh access token")

def is_token_valid(expiry_time):
    return time.time() < expiry_time - 300


def add_files(access_token):  
    # Environment variables 
    dropbox_access_token = access_token
    dropbox_remote_url = os.environ['DROPBOX_REMOTE_URL']
    pinecone_api_key = os.environ['PINECONE_API_KEY']
    pinecone_index_name = os.environ['PINECONE_INDEX_NAME']
    embedding_model_name = os.environ['EMBEDDING_MODEL_NAME']
    embedding_provider = os.environ['EMBEDDING_PROVIDER']
    embedding_provider_api_key = os.environ['EMBEDDING_PROVIDER_API_KEY']
    local_file_download_dir = '/tmp/'  # Temporary directory for Lambda file storage

    # Generate a valid job name
    job_name = f"BatchJob_{uuid.uuid4()}"

    # Start Batch job
    response = batch_client.submit_job(
        jobName=job_name,
        jobQueue=os.environ['JOB_QUEUE'],  # Job queue from environment variables
        jobDefinition=os.environ['JOB_DEFINITION'],  # Job definition from environment variables
        containerOverrides={
            'environment': [
                {'name': 'DROPBOX_ACCESS_TOKEN', 'value': dropbox_access_token},
                {'name': 'DROPBOX_REMOTE_URL', 'value': dropbox_remote_url},
                {'name': 'EMBEDDING_MODEL_NAME', 'value': embedding_model_name},
                {'name': 'EMBEDDING_PROVIDER', 'value': embedding_provider},
                {'name': 'EMBEDDING_PROVIDER_API_KEY', 'value': embedding_provider_api_key},
                {'name': 'PINECONE_INDEX_NAME', 'value': pinecone_index_name},
                {'name': 'PINECONE_API_KEY', 'value': pinecone_api_key},
                {'name': 'LOCAL_FILE_DOWNLOAD_DIR', 'value': local_file_download_dir},
                {'name': 'APP_SCRIPT', 'value': app_script},
            ],
        },
    )
    # Response with job information
    return {
        'statusCode': 200,
        'body': json.dumps(f"Started Batch Job: {response['jobId']}")
    }

def handler(event, context):
    logger.info("Received event: %s", json.dumps(event))
    
    # Completing Dropbox webhook challenge
    query_params = event.get("queryStringParameters")
    if query_params and 'challenge' in query_params:
        logger.info("Challenge received: %s", query_params['challenge'])
        return {
            'statusCode': 200,
            'body': query_params['challenge'],
            'headers': {
                'Content-Type': 'application/json'
            }
        }

    # Check if token data exists in DynamoDB
    token_data = get_token_data()
    if not token_data:
        logger.info("No token found, refreshing for the first time...")
        access_token, access_token_expiry = refresh_access_token()
    else:
        access_token = token_data['access_token']
        access_token_expiry = token_data['expiry_time']

        # Check if the token is valid, refresh if necessary
        if not is_token_valid(access_token_expiry):
            logger.info("Access token expired, refreshing...")
            access_token, access_token_expiry = refresh_access_token()


    # Fetch current folder contents
    current_files = list_folder_contents(access_token)
    current_file_names = {file['name'] for file in current_files}

    # Log current files for reference
    logger.info("Current files in the folder: %s", current_file_names)

    # Process delta changes
    body = json.loads(event.get('body', '{}'))
    if 'delta' in body:
        logger.info("Delta changes: %s", json.dumps(body['delta']))
    
    # Only start ingestion process if there are files in the folder
    if current_file_names:
        add_files(access_token)
        logger.info("Ingestion process started.")
    else:
        logger.info("No files in Dropbox folder; ingestion process not started.")

    return {
        'statusCode': 200,
        'body': json.dumps('Success'),
        'headers': {
            'Content-Type': 'application/json'
        }
    }
