# lambda/s3_mongodb_lambda/mongodb_utils.py

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