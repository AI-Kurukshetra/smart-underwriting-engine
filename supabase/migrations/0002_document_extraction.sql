-- UP
alter table if exists application_documents
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists extracted_text text,
  add column if not exists extraction_summary text,
  add column if not exists extraction_payload jsonb not null default '{}'::jsonb,
  add column if not exists extraction_error text;

-- DOWN
-- alter table if exists application_documents drop column if exists extraction_error;
-- alter table if exists application_documents drop column if exists extraction_payload;
-- alter table if exists application_documents drop column if exists extraction_summary;
-- alter table if exists application_documents drop column if exists extracted_text;
-- alter table if exists application_documents drop column if exists mime_type;
-- alter table if exists application_documents drop column if exists original_filename;
