from dotenv import load_dotenv
import os
from unstructured_ingest.v2.pipeline.pipeline import Pipeline
from unstructured_ingest.v2.interfaces import ProcessorConfig
from unstructured_ingest.v2.processes.partitioner import PartitionerConfig
from unstructured_ingest.v2.processes.connectors.fsspec.dropbox import (DropboxIndexerConfig, DropboxDownloaderConfig, DropboxAccessConfig, DropboxConnectionConfig)
from unstructured_ingest.v2.processes.connectors.mongodb import (MongoDBAccessConfig, MongoDBConnectionConfig, MongoDBUploadStagerConfig, MongoDBUploaderConfig)
from unstructured_ingest.v2.processes.chunker import ChunkerConfig
from unstructured_ingest.v2.processes.embedder import EmbedderConfig

load_dotenv()

if __name__ == "__main__":
    Pipeline.from_configs(
        context=ProcessorConfig(),
        indexer_config=DropboxIndexerConfig(remote_url=os.getenv("DROPBOX_REMOTE_URL")),
        downloader_config=DropboxDownloaderConfig(download_dir=os.getenv("LOCAL_FILE_DOWNLOAD_DIR")),
        source_connection_config=DropboxConnectionConfig(
            access_config=DropboxAccessConfig(
                token=os.getenv("DROPBOX_ACCESS_TOKEN")
            )
        ),
        partitioner_config=PartitionerConfig(
            partition_by_api=False,
        ),
        chunker_config=ChunkerConfig(
            chunking_strategy=os.getenv("CHUNKING_STRATEGY"),
            chunk_max_characters=os.getenv("CHUNKING_MAX_CHARACTERS"),
            chunk_overlap=20
        ),

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
        uploader_config=MongoDBUploaderConfig(batch_size=100)
    ).run()