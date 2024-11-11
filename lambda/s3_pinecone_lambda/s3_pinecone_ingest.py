# Start S3 and populate Pinecone

import os
from unstructured_ingest.v2.pipeline.pipeline import Pipeline
from unstructured_ingest.v2.interfaces import ProcessorConfig
from unstructured_ingest.v2.processes.partitioner import PartitionerConfig
from unstructured_ingest.v2.processes.connectors.fsspec.s3 import (S3IndexerConfig, S3DownloaderConfig, S3ConnectionConfig, S3AccessConfig)
from unstructured_ingest.v2.processes.connectors.pinecone import (PineconeConnectionConfig, PineconeAccessConfig, PineconeUploaderConfig, PineconeUploadStagerConfig)
from unstructured_ingest.v2.processes.chunker import ChunkerConfig
from unstructured_ingest.v2.processes.embedder import EmbedderConfig

if __name__ == "__main__":
    namespace = os.getenv("AWS_S3_URL").split("/")[-1]

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
        destination_connection_config=PineconeConnectionConfig(
            access_config=PineconeAccessConfig(
                api_key=os.getenv("PINECONE_API_KEY")
            ),
            index_name=os.getenv("PINECONE_INDEX_NAME")
        ),
        stager_config=PineconeUploadStagerConfig(),
        uploader_config=PineconeUploaderConfig(
            namespace=namespace
        )
    ).run()