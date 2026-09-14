from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import dotenv
from chat import generate_sse_stream
from helpers import add_document, remove_document, list_stored_documents

dotenv.load_dotenv()

app = FastAPI(title="HR Assistant RAG API", debug=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# @app.on_event("startup")
# async def startup_event():
#     # Ensure pre-existing documents in docs/ are indexed properly into Chroma DB
#     try:
#         ensure_initial_docs_indexed()
#     except Exception as e:
#         print("Startup index check error:", e)

class MessageRequest(BaseModel):
    message: str

@app.post("/api/send_message")
async def chat_endpoint(request: MessageRequest):
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    return StreamingResponse(
        generate_sse_stream(request.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/documents")
async def get_documents():
    docs = list_stored_documents()
    return {"documents": docs}

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    filename = file.filename

    try:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File encoding not supported. Please upload text or Markdown (.md/.txt) files."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        remove_document(filename)
        chunks_count = add_document(filename, content)
        return {
            "success": True,
            "filename": filename,
            "chunks_count": chunks_count,
            "message": f"Document '{filename}' successfully chunked into {chunks_count} section(s) and stored in Chroma vector DB."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@app.delete("/api/documents/{filename:path}")
async def delete_document(filename: str):
    try:
        success = remove_document(filename)
        if success:
            return {
                "success": True,
                "message": f"Document '{filename}' deleted from server and vector DB."
            }
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)