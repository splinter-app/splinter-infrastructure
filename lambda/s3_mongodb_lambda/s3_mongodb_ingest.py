# Start S3 and populate Mongodb

import os
from unstructured_ingest.v2.pipeline.pipeline import Pipeline
from unstructured_ingest.v2.interfaces import ProcessorConfig
from unstructured_ingest.v2.processes.partitioner import PartitionerConfig
from unstructured_ingest.v2.processes.connectors.fsspec.s3 import (
    S3IndexerConfig,
    S3DownloaderConfig,
    S3ConnectionConfig,
    S3AccessConfig
    )
from unstructured_ingest.v2.processes.connectors.mongodb import (
    MongoDBAccessConfig,
    MongoDBConnectionConfig,
    MongoDBUploadStagerConfig,
    MongoDBUploaderConfig
    )
from unstructured_ingest.v2.processes.chunker import ChunkerConfig
from unstructured_ingest.v2.processes.embedder import EmbedderConfig

if __name__ == "__main__":
    Pipeline.from_configs(
        context=ProcessorConfig(),
        indexer_config=S3IndexerConfig(remote_url=os.getenv("AWS_S3_URL")),
        downloader_config=S3DownloaderConfig(download_dir=os.getenv("LOCAL_FILE_DOWNLOAD_DIR")),
        source_connection_config=S3ConnectionConfig(
            access_config=S3AccessConfig(
                key=os.getenv("MY_AWS_ACCESS_KEY_ID"),
                secret=os.getenv("MY_AWS_SECRET_ACCESS_KEY")
            )
        ),
        partitioner_config=PartitionerConfig(
            partition_by_api=False,
            strategy="auto",
        ),
        chunker_config=ChunkerConfig(
            chunking_strategy=os.getenv("CHUNKING_STRATEGY"),
            chunk_max_characters=os.getenv("CHUNKING_MAX_CHARACTERS")),
        embedder_config=EmbedderConfig(
            embedding_provider=os.getenv("EMBEDDING_PROVIDER"),
            embedding_model_name=os.getenv("EMBEDDING_MODEL_NAME"),
            embedding_api_key=os.getenv("EMBEDDING_PROVIDER_API_KEY"),
        ),
        destination_connection_config=MongoDBConnectionConfig(
            access_config=MongoDBAccessConfig(
                uri=os.getenv("MONGODB_URI")
            ),
            database=os.getenv("MONGODB_DATABASE"),
            collection=os.getenv("MONGODB_COLLECTION")
        ),
        stager_config=MongoDBUploadStagerConfig(),
        uploader_config=MongoDBUploaderConfig()
    ).run()
