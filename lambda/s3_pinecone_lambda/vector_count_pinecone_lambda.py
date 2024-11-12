import boto3
import os
import json
import base64
import gzip
from io import BytesIO
import re
import time
from decimal import Decimal
from pinecone import Pinecone

logs_client = boto3.client('logs')
dynamodb = boto3.resource('dynamodb')

pc = Pinecone(os.environ['PINECONE_API_KEY'])
index = pc.Index(os.environ['PINECONE_INDEX_NAME'])

connection_table = dynamodb.Table(os.environ['CONNECTION_TABLE_NAME'])
client_data_table = dynamodb.Table(os.environ['CLIENT_DATA_TABLE_NAME'])

WEBSOCKET_API_URL = os.environ['WEBSOCKET_API_URL']
http_endpoint_url = WEBSOCKET_API_URL.replace("wss://", "https://")
apigateway_management_api = boto3.client('apigatewaymanagementapi', endpoint_url=http_endpoint_url)

LOG_PATTERNS = [
    'ingest process finished in',
    'Deleting vectors from database',
    'Deleting File:',
    'calling PartitionStep',
    'calling ChunkStep',
    'calling EmbedStep',
    'writing a total of',
]

def lambda_handler(event, context):
    connection_id = get_connection_id_from_dynamodb()
    client_id = get_client_id_from_dynamodb()

    if not connection_id:
        print("No connection ID found in DynamoDB.")
        return {
            'statusCode': 404,
            'body': 'Connection ID not found'
        }
    
    log_data, total_vectors, total_documents, vectors_written, documents_ingested = process_new_logs(event, client_id)

    store_data_in_dynamodb(client_id, log_data)

    send_to_websocket(connection_id, log_data, total_vectors, total_documents, vectors_written, documents_ingested)

    return {
        'statusCode': 200,
        'body': 'Log data sent to WebSocket and stored in DynamoDB'
    }

def process_new_logs(event, client_id):
    logs = []
    total_vectors = 0
    total_documents = 0

    compressed_data = base64.b64decode(event['awslogs']['data'])
    with gzip.GzipFile(fileobj=BytesIO(compressed_data), mode='rb') as f:
        decompressed_data = f.read().decode('utf-8')

    log_events = json.loads(decompressed_data).get('logEvents', [])
    
    for log_event in log_events:
        message = log_event.get('message')
        timestamp = log_event.get('timestamp')

        print(f"---- LOG MESSAGE is: {message}----")
        
        for pattern in LOG_PATTERNS:
            if pattern in message:
                logs.append({
                    'timestamp': timestamp,
                    'message': message,
                })

                if "writing a total of" in message:
                    match = re.search(r'writing a total of (\d+) elements', message)
                    if match:
                        increment_vector_count(client_id, int(match.group(1)))

                if "ingest process finished" in message:
                    increment_document_count(client_id)

                break

    total_vectors = get_vector_count_from_pinecone()
    total_documents= get_document_count_from_pinecone()
    vectors_written = get_ingestion_count_data(client_id, 'vectorsWritten')
    documents_ingested = get_ingestion_count_data(client_id, 'documentsIngested')

    return logs, total_vectors, total_documents, vectors_written, documents_ingested

def get_vector_count_from_pinecone():
    try:
        print("Waiting 10 seconds to fetch from Pinecone")
        time.sleep(10)

        stats = index.describe_index_stats()
        vector_count = stats.get('total_vector_count', 0)
        return vector_count
    
    except Exception as e:
        print(f"Error fetching vector count from Pinecone: {str(e)}")
        return 0
    
def get_document_count_from_pinecone():
    try:
        print("Waiting 10 seconds to fetch from Pinecone")
        time.sleep(10)
        
        stats = index.describe_index_stats()
        namespaces = stats.get('namespaces', {})
        return len(namespaces)
    
    except Exception as e:
        print(f"Error fetching namespace/document count from Pinecone: {str(e)}")
        return 0
    
def increment_document_count(client_id):
    try:
        response = client_data_table.update_item(
            Key={
                'clientId': client_id,
                'timestamp': 0
            },
            UpdateExpression='SET documentsIngested = if_not_exists(documentsIngested, :start) + :inc',
            ExpressionAttributeValues={
                ':inc': 1,
                ':start': 0,
            },
            ReturnValues="UPDATED_NEW"
        )

        updated_doc_count = response['Attributes']['documentsIngested']
        print(f"Documents ingested count updated to {updated_doc_count}")
        return updated_doc_count
    
    except Exception as e:
        print(f"Error incrementing documentsIngested: {str(e)}")
        return None
    
def increment_vector_count(client_id, vector_count):
    try:
        response = client_data_table.update_item(
            Key={
                'clientId': client_id,
                'timestamp': 0
            },
            UpdateExpression='SET vectorsWritten = if_not_exists(vectorsWritten, :start) + :inc',
            ExpressionAttributeValues={
                ':inc': vector_count,
                ':start': 0,
            },
            ReturnValues="UPDATED_NEW"
        )

        updated_vector_count = response['Attributes']['vectorsWritten']
        print(f"Vectors written count updated to {updated_vector_count}")
        return updated_vector_count
    
    except Exception as e:
        print(f"Error incrementing vectorsWritten: {str(e)}")
        return None

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

def store_data_in_dynamodb(client_id, log_data):
    try:
        dynamodb_item = {
            'clientId': client_id,
            'dataType': 'logs',
            'logData': log_data,
            'timestamp': int(time.time() * 1000)
        }

        response = client_data_table.put_item(Item=dynamodb_item)
        print(f"Data saved to DynamoDB: {response}")
    
    except Exception as e:
        print(f"Error saving data to DynamoDB: {str(e)}")

def send_to_websocket(connection_id, log_data, total_vectors, total_documents, vectors_written, documents_ingested):
    message = {
        'logs': log_data,
        'totalVectors': total_vectors,
        'totalDocuments': total_documents,
        'vectorsWritten': vectors_written,
        'documentsIngested': documents_ingested,
    }

    try:
        apigateway_management_api.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message)
        )
    except apigateway_management_api.exceptions.GoneException:
        print(f"WebSocket connection {connection_id} is no longer valid.")

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
