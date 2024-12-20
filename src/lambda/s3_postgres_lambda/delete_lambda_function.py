# lambda/s3_postgres_lambda/delete_lambda_function.py
import json
import os
import urllib.parse
import psycopg2
import time

def delete_from_postgres(db_name, user, password, host, port, table_name, filename):
    start_time = time.time()
    connection = None
    try:
        # Connect to the PostgreSQL database
        connection = psycopg2.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port,
        )
        cursor = connection.cursor()
        
        delete_query = f"DELETE FROM {table_name} WHERE filename = %s"
        print(f"Executing query: {delete_query} with filename: {filename}")
        
        cursor.execute(delete_query, (filename,))
        
        connection.commit()
        
        print(f"{cursor.rowcount} record(s) deleted.")
    
    except (Exception, psycopg2.DatabaseError) as error:
        print("Error while deleting records from Postgres: %s", error)
    
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

    end_time = time.time()
    elapsed_time = end_time - start_time
    print(f"Process took {elapsed_time:.2f} seconds.")

def lambda_handler(event, context):
    db_name = os.environ['POSTGRES_DB_NAME']
    user = os.environ['POSTGRES_USER']
    password = os.environ['POSTGRES_PASSWORD']
    host = os.environ['POSTGRES_HOST']
    port = os.environ['POSTGRES_PORT']
    table_name = os.environ['POSTGRES_TABLE_NAME']

    for record in event['Records']:
        s3_bucket = record['s3']['bucket']['name']
        s3_key = record['s3']['object']['key']

        filename = os.path.basename(s3_key)

        try:
            decoded_filename = urllib.parse.unquote(filename)
            decoded_filename_with_spaces = decoded_filename.replace('+', ' ').replace('%20', ' ')
            delete_from_postgres(db_name, user, password, host, port, table_name, decoded_filename_with_spaces)
            print(f"Deleted File: {decoded_filename_with_spaces} from Bucket: {s3_bucket}")
        except Exception as e:
            print(f"Error deleting from Postgres: {e}")

    return {
        'statusCode': 200,
        'body': json.dumps('Deleted files from PostgreSQL.')
    }