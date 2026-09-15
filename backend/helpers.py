from langchain_text_splitters import MarkdownHeaderTextSplitter
from pathlib import Path
import re
from langchain_chroma import Chroma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
import os
from typing import Any
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

DOCS_DIR = Path("./docs")

headers_to_split = [("#", "document_title"), ("##", "section")]

text_splitter = MarkdownHeaderTextSplitter(headers_to_split, strip_headers=True)

def extract_document_metadata(text: str):

    metadata: dict[str, str] = {}
    
    patterns = {
        "document_title": r"\*\*Document title:\*\*\s*(.+)",
        "version": r"\*\*Version:\*\*\s*(.+)",
        "applies_to": r"\*\*Applies to:\*\*\s*(.+)",
        "owner": r"\*\*Owner:\*\*\s*(.+)",
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, text)
        metadata[key] = match.group(1).strip() if match else "Unknown"

    return metadata

def chunk_documents(folder_path: Path):
    files = list(folder_path.glob("*.md"))
    all_chunks = []

    for file_path in files:
        source = file_path.name
        text = file_path.read_text(encoding="utf-8")
        chunks = text_splitter.split_text(text)
        metadata = extract_document_metadata(chunks[0].page_content)
        for chunk in chunks[1:]:
            # if not chunk.metadata.get("section", None):
            title = chunk.metadata.get("document_title", file_path.stem)
            section = chunk.metadata.get("section", "Not specified")
            content = f"""
Document Title: {title}
Applies to: {metadata.get("applies_to", "Not specified")}
Section: {section}
Content: {chunk.page_content}
""".replace("###", "").replace("**", "").strip()
            chunk.metadata = {**chunk.metadata, **metadata, "source": source}
            chunk.page_content = process_chunk(content)
            all_chunks.append(chunk)
    return all_chunks


def chunk_document(file_path:Path):
    all_chunks = []
    text = file_path.read_text(encoding="utf-8")
    chunks = text_splitter.split_text(text)
    metadata = extract_document_metadata(chunks[0].page_content)
    source = file_path.name
    for chunk in chunks[1:]:
        title = chunk.metadata.get("document_title", file_path.stem)
        section = chunk.metadata.get("section", "Not specified")
        content = f"""
Document Title: {title}
Applies to: {metadata.get("applies_to", "Not specified")}
Section: {section}
Content: {chunk.page_content}
""".replace("###", "").replace("**", "").strip()
        chunk.metadata = {**chunk.metadata, **metadata, "source": source}
        chunk.page_content = process_chunk(content)
        all_chunks.append(chunk)
    return all_chunks

def is_separator(line:str):
    stripped = line.strip()
    if not stripped:
        return False
    cleaned = re.sub(r'[\|\-\:\s]', "", stripped)
    return len(cleaned) == 0 and '|' in stripped and '-' in stripped

def format_table(text:str):
    lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
    headers = [col.strip() for col in lines[0].strip('|').split('|')]
    parsed_rows = []
    for line in lines[2:]:
        values = [col.strip() for col in line.strip('|').split('|')]
        sentence = ", ".join([f'"{h}": "{v}"' for h, v in zip(headers, values)])
        parsed_rows.append(f" {{{sentence}}}")
    output = "\n".join([parsed_row for parsed_row in parsed_rows])
    return output

def process_chunk(chunk_text:str):
    lines = chunk_text.strip().split("\n")
    new_chunk_lines = []
    in_table = False
    table_lines = []
    for i, line in enumerate(lines):
        if not in_table:
            if '|' in line and i+1<len(lines) and is_separator(lines[i+1]):
                in_table = True
                table_lines.append(line)
            else:
                new_chunk_lines.append(line)
        else:
            if line.count("|")>1:
                table_lines.append(line)
            else:
                formatted_table = format_table("\n".join(table_lines))
                new_chunk_lines.append(formatted_table)
                table_lines = []
                in_table = False
                new_chunk_lines.append(line)
    if in_table:
        formatted_table = format_table("\n".join(table_lines))
        new_chunk_lines.append(formatted_table)
    return '\n'.join(new_chunk_lines)


embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-base-en-v1.5",
    model_kwargs={'device': 'cuda'},
    encode_kwargs={'normalize_embeddings': True}
)

vector_store = Chroma(
    collection_name="company_policies",
    embedding_function=embedding_model,
    persist_directory="./chroma_db"
)


def main():
    chunks = chunk_documents(DOCS_DIR)
    vector_store.add_documents(chunks)
# from transformers import AutoTokenizer

# def count_bge_tokens(text: str, model_id: str = "BAAI/bge-base-en-v1.5") -> int:
#     # Load the tokenizer from Hugging Face
#     tokenizer = AutoTokenizer.from_pretrained(model_id)
    
#     # Encode the text to token IDs and return the count
#     tokens = tokenizer.encode(text, add_special_tokens=True)
#     return len(tokens)

# # Example text chunk
# for chunk in chunks:
#     l = count_bge_tokens(chunk.page_content)
#     print("size=", l)


def add_document(filename:str, content:str):
    file_path = DOCS_DIR / filename
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    chunks = chunk_document(file_path)
    vector_store.add_documents(chunks)
    return len(chunks)

def remove_document(filename: str) -> bool:

    file_path = DOCS_DIR / filename
    if file_path.exists():
        try:
            file_path.unlink(missing_ok=True)
        except Exception as e:
            print(f"Error removing file {filename}: {e}")

    try:
        vector_store._collection.delete(where={"source": filename})
    except Exception as e:
        print(f"Error deleting Chroma entries for {filename}: {e}")
    return True

def list_stored_documents() -> list[dict[str, Any]]:
    docs = []
    if not DOCS_DIR.exists():
        return docs

    col_data = {}
    try:
        col_res = vector_store._collection.get(include=["metadatas"])
        if col_res and "metadatas" in col_res:
            if col_res["metadatas"] is not None:
                for meta in col_res["metadatas"]:
                    if meta and "source" in meta:
                        src = meta["source"]
                        col_data[src] = col_data.get(src, 0) + 1
    except Exception as e:
        print(f"Error fetching collection metadatas: {e}")

    for file_path in DOCS_DIR.glob("*"):
        if file_path.is_file():
            stat = file_path.stat()
            chunk_count = col_data.get(file_path.name, 0)

            title = file_path.stem.replace("-", " ").replace("_", " ").title()
            try:
                content_sample = file_path.read_text(encoding="utf-8")[:300]
                meta = extract_document_metadata(content_sample)
                if meta.get("document_title") and meta["document_title"] != "Unknown":
                    title = meta["document_title"]
            except Exception:
                pass

            docs.append({
                "id": file_path.name,
                "name": file_path.name,
                "title": title,
                "size_bytes": stat.st_size,
                "chunks_count": chunk_count,
                "modified_at": int(stat.st_mtime * 1000)
            })

    docs.sort(key=lambda d: d["modified_at"], reverse=True)
    return docs