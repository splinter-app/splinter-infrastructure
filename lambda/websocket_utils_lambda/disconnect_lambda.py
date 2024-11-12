import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['CONNECTION_TABLE_NAME'])

def lambda_handler(event, context):
    connection_id = event['requestContext']['connectionId']
    
    table.delete_item(
        Key={
            'connectionId': connection_id
        }
    )
    return {
        'statusCode': 200,
        'body': 'Disconnected'
    }
