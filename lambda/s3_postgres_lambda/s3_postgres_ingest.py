# Start S3 and populate Postgres
import os

from unstructured_ingest.v2.pipeline.pipeline import Pipeline
from unstructured_ingest.v2.interfaces import ProcessorConfig
from unstructured_ingest.v2.processes.connectors.fsspec.s3 import (S3IndexerConfig, S3DownloaderConfig, S3ConnectionConfig, S3AccessConfig)

from unstructured_ingest.v2.processes.connectors.sql.postgres import (
    PostgresConnectionConfig,
    PostgresAccessConfig,
    PostgresUploaderConfig,
    PostgresUploadStagerConfig
)

from unstructured_ingest.v2.processes.partitioner import PartitionerConfig
from unstructured_ingest.v2.processes.chunker import ChunkerConfig
from unstructured_ingest.v2.processes.embedder import EmbedderConfig


if __name__ == "__main__":
    metadata_includes = [
        "id", "element_id", "text", "embeddings", "type", "system", "layout_width",
        "layout_height", "points", "url", "version", "date_created", "date_modified",
        "date_processed", "permissions_data", "record_locator", "category_depth",
        "parent_id", "attached_filename", "filetype", "last_modified", "file_directory",
        "filename", "languages", "page_number", "links", "page_name", "link_urls",
        "link_texts", "sent_from", "sent_to", "subject", "section", "header_footer_type",
        "emphasized_text_contents", "emphasized_text_tags", "text_as_html", "regex_metadata",
        "detection_class_prob"
    ]

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
            chunk_max_characters=os.getenv("CHUNKING_MAX_CHARACTERS"),
            chunk_overlap=20
        ),
        embedder_config=EmbedderConfig(
            embedding_provider=os.getenv("EMBEDDING_PROVIDER"),
            embedding_model_name=os.getenv("EMBEDDING_MODEL_NAME"),
            embedding_api_key=os.getenv("EMBEDDING_PROVIDER_API_KEY"),
        ),
        destination_connection_config=PostgresConnectionConfig(
            access_config=PostgresAccessConfig(password=os.getenv("POSTGRES_PASSWORD")),
            host=os.getenv("POSTGRES_HOST"),
            port=os.getenv("POSTGRES_PORT"),
            username=os.getenv("POSTGRES_USER"),
            database=os.getenv("POSTGRES_DB_NAME")
        ),
        stager_config=PostgresUploadStagerConfig(),
        uploader_config=PostgresUploaderConfig(table_name=os.getenv("POSTGRES_TABLE_NAME"))
    ).run()