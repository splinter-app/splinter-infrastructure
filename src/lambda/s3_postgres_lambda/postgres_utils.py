# lambda/s3_postgres_lambda/postgres_utils.py

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
