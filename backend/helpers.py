from langchain_text_splitters import MarkdownHeaderTextSplitter
from pathlib import Path
import re
from langchain_chroma import Chroma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
import os
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

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
        text = file_path.read_text(encoding="utf-8")
        chunks = text_splitter.split_text(text)
        # match = re.search(r"Applies to:\*\*?\s*(.*?)\s*(?=\*\*?\w+:|$)", chunks[0].page_content, re.IGNORECASE)
        # applies_to = match.group(1).strip() if match else None
        metadata = extract_document_metadata(chunks[0].page_content)
        for chunk in chunks[1:]:
            # if not chunk.metadata.get("section", None):
            title = chunk.metadata.get("document_title", file_path.stem)
            section = chunk.metadata.get("section", "Not specified")
            content = f"""
Document Title: {title}

Section: {section}

Content: {chunk.page_content}

Applies to: {metadata.get("applies_to", "Not specified")}
""".replace("###", "").replace("**", "").strip()
            chunk.metadata = {**chunk.metadata, **metadata}
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

path = Path("./docs")
chunks = chunk_documents(path)

vector_store.add_documents(chunks)