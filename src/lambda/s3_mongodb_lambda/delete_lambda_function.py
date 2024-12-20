# lambda/s3_mongodb_lambda/delete_lambda_function.py
import json
import os
import urllib.parse
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import time

load_dotenv()

def delete_from_mongodb(filename, uri, database_name, collection_name):
    try:
        # Connect to MongoDB
        client = MongoClient(uri)
        db = client[database_name]
        collection = db[collection_name]

        start_time = time.time()

        # Delete documents with the specified filename in their metadata
        result = collection.delete_many({"metadata.filename": filename})

        end_time = time.time()
        elapsed_time = end_time - start_time

        # Output the result
        print(f"Deleted {result.deleted_count} document(s) with filename '{filename}'.")
        print(f"Time taken: {elapsed_time:.2f} seconds.")
        
    except Exception as e:
        print(f"Error deleting from MongoDB: {e}")

def lambda_handler(event, context):
    uri = os.environ['MONGODB_URI']
    database_name = os.environ['MONGODB_DATABASE']
    collection_name = os.environ['MONGODB_COLLECTION']
    
    for record in event['Records']:
        s3_bucket = record['s3']['bucket']['name']
        s3_key = record['s3']['object']['key']

        filename = os.path.basename(s3_key)

        try:
            decoded_filename = urllib.parse.unquote(filename)
            decoded_filename_with_spaces = decoded_filename.replace('+', ' ').replace('%20', ' ')
            delete_from_mongodb(decoded_filename_with_spaces, uri, database_name, collection_name)
            print(f"Deleted File: {decoded_filename_with_spaces} from Bucket: {s3_bucket}")
        except Exception as e:
            print(f"Error deleting from MongoDB: {e}")

    return {
        'statusCode': 200,
        'body': json.dumps("Deleted files from MongoDB.")
    }