# lambda/s3_pinecone_lambda/pinecone_utils.py

import time
from pinecone import Pinecone

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