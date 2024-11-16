import boto3
import os
import json
import time

batch_client = boto3.client('batch')
dynamodb = boto3.resource('dynamodb')

connection_table = dynamodb.Table(os.environ['CONNECTION_TABLE_NAME'])
client_data_table = dynamodb.Table(os.environ['CLIENT_DATA_TABLE_NAME'])

WEBSOCKET_API_URL = os.environ['WEBSOCKET_API_URL']
JOB_QUEUE = os.environ['JOB_QUEUE'].split('/')[1]

http_endpoint_url = WEBSOCKET_API_URL.replace("wss://", "https://")
apigateway_management_api = boto3.client('apigatewaymanagementapi', endpoint_url=http_endpoint_url)

def lambda_handler(event, context):
    connection_id = get_connection_id_from_dynamodb()

    if not connection_id:
        print("No connection ID found for the client.")
        return {
            'statusCode': 404,
            'body': 'Connection ID not found'
        }

    job_status_counts = get_job_status_counts()

    try:
        message = {
            'jobStatusCounts': job_status_counts
        }

        apigateway_management_api.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message)
        )
    except apigateway_management_api.exceptions.GoneException:
        print(f"Connection {connection_id} is no longer valid.")

    return {
        'statusCode': 200,
        'body': 'Job status counts sent to WebSocket'
    }

def get_client_id_from_dynamodb():
    response = connection_table.scan()
    if response.get('Items'):
        most_recent_entry = max(response['Items'], key=lambda x: x['timestamp'])
        return most_recent_entry['clientId']
    return None

def get_connection_id_from_dynamodb():
    response = connection_table.scan()
    if response.get('Items'):
        most_recent_entry = max(response['Items'], key=lambda x: x['timestamp'])
        return most_recent_entry['connectionId']
    return None

def get_job_status_counts():
    statuses = ['SUBMITTED', 'STARTING', 'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED']
    job_counts = {status: 0 for status in statuses}
    
    try:
        next_token = None
        for status in statuses:
            job_counts[status] = 0
            
            while True:
                params = {
                    'jobStatus': status,
                    'jobQueue': JOB_QUEUE,
                    'maxResults': 100
                }
                
                if next_token:
                    params['nextToken'] = next_token
                
                response = batch_client.list_jobs(**params)
                
                job_counts[status] += len(response.get('jobSummaryList', []))
                
                next_token = response.get('nextToken')
                if not next_token:
                    break

        return job_counts

    except Exception as e:
        print(f"Error fetching job statuses: {str(e)}")
        return {status: 0 for status in statuses}
