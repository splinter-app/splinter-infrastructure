import json
import boto3
import os
from decimal import Decimal
from pinecone import Pinecone

batch_client = boto3.client('batch')
dynamodb = boto3.resource('dynamodb')

source_destination_embedding = os.environ['SOURCE_DESTINATION_EMBEDDING']

connection_table = dynamodb.Table(os.environ['CONNECTION_TABLE_NAME'])
client_data_table = dynamodb.Table(os.environ['CLIENT_DATA_TABLE_NAME'])

JOB_QUEUE = os.environ['JOB_QUEUE'].split('/')[1]

pc = Pinecone(os.environ['PINECONE_API_KEY'])
index = pc.Index(os.environ['PINECONE_INDEX_NAME'])

WEBSOCKET_API_URL = os.environ['WEBSOCKET_API_URL']

http_endpoint_url = WEBSOCKET_API_URL.replace("wss://", "https://")
apigateway_management_api = boto3.client('apigatewaymanagementapi', endpoint_url=http_endpoint_url)

def lambda_handler(event, context):
    print("Received initial check request.")
    connection_id = get_connection_id_from_dynamodb()
    print(f"Connection ID: {connection_id}")

    if not connection_id:
        print("No connection ID found for the client.")
        return {
            'statusCode': 404,
            'body': 'Connection ID not found'
        }

    client_id = get_client_id_from_dynamodb()

    total_vectors = get_vector_count_from_pinecone()
    total_documents = get_document_count_from_pinecone()
    vectors_written = get_ingestion_count_data(client_id, 'vectorsWritten')
    documents_ingested = get_ingestion_count_data(client_id, 'documentsIngested')
    logs = get_all_logs()
    job_status_counts = get_job_status_counts()

    response_message = {
        "type": "initialCheckResponse",
        "sourceDestinationEmbedding": source_destination_embedding,
        "totalVectors": total_vectors,
        "totalDocuments": total_documents,
        "vectorsWritten": vectors_written,
        "documentsIngested": documents_ingested,
        "jobStatusCounts": job_status_counts,
        "logs": logs,
    }

    try:
        apigateway_management_api.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(response_message)
        )
        print(f"Sent initial check response to connection {connection_id}")
    except apigateway_management_api.exceptions.GoneException:
        print(f"Connection {connection_id} is no longer valid.")
    
    return {
        'statusCode': 200,
        'body': json.dumps('Initial check request processed successfully')
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

def get_all_logs():
    try:
        response = client_data_table.scan(
            FilterExpression='dataType = :dataType',
            ExpressionAttributeValues={':dataType': 'logs'},
        )
        
        logs = response.get('Items', [])
        formatted_logs = []

        print("Unformatted logs data from DynamoDB:", logs)

        for log in logs:
            log_data = log.get('logData', [])
            for entry in log_data:
                message = entry.get('message', '')
                timestamp_str = entry.get('timestamp', None)

                if not message:
                    continue

                if timestamp_str:
                    timestamp = int(timestamp_str)
                else:
                    timestamp = None

                formatted_logs.append({
                    'message': message,
                    'timestamp': timestamp
                })
        
        formatted_logs = sorted(formatted_logs, key=lambda log: log['timestamp'] if log['timestamp'] is not None else 0, reverse=True)

        return formatted_logs
    
    except Exception as e:
        print(f"Error fetching logs: {str(e)}")
        return []

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
    
def get_vector_count_from_pinecone():
    try:
        stats = index.describe_index_stats()
        vector_count = stats.get('total_vector_count', 0)
        return vector_count
    
    except Exception as e:
        print(f"Error fetching vector count from Pinecone: {str(e)}")
        return 0

def get_document_count_from_pinecone():
    try:
        stats = index.describe_index_stats()
        namespaces = stats.get('namespaces', {})
        return len(namespaces)
    
    except Exception as e:
        print(f"Error fetching namespace count from Pinecone: {str(e)}")
        return 0

def get_ingestion_count_data(client_id, count_type):
    try:
        response = client_data_table.get_item(
            Key={
                'clientId': client_id,
                'timestamp': 0
            }
        )

        if 'Item' in response:
            count_value = response['Item'].get(count_type, 0)
            if isinstance(count_value, Decimal):
                return int(count_value)
            return count_value
        else:
            return 0
        
    except Exception as e:
        print(f"Error retrieving ingestion count data: {str(e)}")
        return 0