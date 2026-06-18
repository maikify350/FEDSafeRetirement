-- Enable pgvector extension
create extension if not exists vector;

-- RAG documents table
create table if not exists rag_documents (
  id          bigserial primary key,
  source      text        not null,          -- filename or URL
  chunk_index integer     not null,          -- order within the source
  content     text        not null,          -- raw text chunk
  embedding   vector(1536),                  -- OpenAI text-embedding-3-small
  metadata    jsonb       default '{}',
  created_at  timestamptz default now()
);

-- Index for fast similarity search
create index if not exists rag_documents_embedding_idx
  on rag_documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Similarity search function (returns top-k chunks)
create or replace function match_rag_documents (
  query_embedding vector(1536),
  match_count     int     default 5,
  match_threshold float   default 0.5
)
returns table (
  id          bigint,
  source      text,
  content     text,
  metadata    jsonb,
  similarity  float
)
language sql stable
as $$
  select
    id,
    source,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from rag_documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
