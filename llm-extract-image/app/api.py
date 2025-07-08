from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.image_processing import ExtractImage
from PIL import Image
import io
import base64
import os
from typing import Optional

app = FastAPI()

# Cho phép CORS để extension gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ei = ExtractImage()

@app.post("/extract-design")
async def extract_design(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    model: str = Form("gpt-4.1"),
    size: int = Form(1024),
    prompt: str = Form("")
):
    # Lấy API key từ biến môi trường nếu không truyền từ client
    api_key = api_key or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return JSONResponse(content={"success": False, "error": "API key is required."}, status_code=400)
    # Lưu file tạm
    temp_path = f"storage/temp_{file.filename}"
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)
    # Gọi hàm extract_with_canny
    try:
        image = ei.extract_with_canny(
            file_path=temp_path,
            api_key=api_key,
            model=model,
            size=size,
            prompt=prompt
        )
        if image:
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            os.remove(temp_path)
            return JSONResponse(content={"success": True, "image_base64": img_str})
        else:
            os.remove(temp_path)
            return JSONResponse(content={"success": False, "error": "Không trích xuất được ảnh."}, status_code=500)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500) 