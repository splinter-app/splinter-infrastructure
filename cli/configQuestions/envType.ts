export interface envType {
  my_aws_access_key_id: string;
  my_aws_secret_access_key: string;
  s3_bucket_name?: string;
  s3_notification_prefix?: string;

  dropbox_app_key?: string;
  dropbox_app_secret?: string;
  dropbox_remote_url?: string;
  dropbox_access_token?: string;

  pinecone_api_key?: string;
  pinecone_index_name?: string;

  embedding_model_name?: string;
  embedding_provider_api_key?: string;
  chunking_strategy?: "basic" | "by_title" | "by_page" | "by_similarity";
  chunking_max_characters?: string;

  mongodb_uri?: string;
  mongodb_database?: string;
  mongodb_collection?: string;

  postgres_host?: string;
  postgres_port?: string;
  postgres_user?: string;
  postgres_password?: string;
  postgres_db_name?: string;
  postgres_table_name?: string;

  stack_to_deploy?: string;
}
