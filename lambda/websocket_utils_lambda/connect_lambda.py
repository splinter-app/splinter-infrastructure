import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['CONNECTION_TABLE_NAME'])

def lambda_handler(event, context):
    connection_id = event['requestContext']['connectionId']
    
    table.put_item(
        Item={
            'connectionId': connection_id,
            'clientId': 'user',
            'timestamp': int(event['requestContext']['connectedAt'])
        }
    )
    return {
        'statusCode': 200,
        'body': 'Connected'
    }
