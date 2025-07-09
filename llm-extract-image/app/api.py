from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.image_processing import ExtractImage
from PIL import Image
import io
import base64
import os
import httpx
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

# Dynamic Mockups API configuration
DYNAMIC_MOCKUPS_API_KEY = os.environ.get("DYNAMIC_MOCKUPS_API_KEY", "")
DYNAMIC_MOCKUPS_BASE_URL = "https://app.dynamicmockups.com/api/v1"

@app.post("/extract-design")
async def extract_design(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    model: str = Form("gpt-4.1"),
    size: int = Form(1024),
    prompt: str = Form(""),
    mode: str = Form("canny")
):
    api_key = api_key or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return JSONResponse(content={"success": False, "error": "API key is required."}, status_code=400)
    temp_path = f"storage/temp_{file.filename}"
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)
    try:
        if mode == "normal":
            image = ei.extract(
                file_path=temp_path,
                api_key=api_key,
                model=model,
                size=size,
                prompt=prompt
            )
        else:
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

@app.get("/dynamic-mockups/collections")
async def get_collections():
    """Lấy danh sách collections từ Dynamic Mockups"""
    if not DYNAMIC_MOCKUPS_API_KEY:
        return JSONResponse(content={"success": False, "error": "Dynamic Mockups API key not configured"}, status_code=400)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{DYNAMIC_MOCKUPS_BASE_URL}/collections",
                headers={
                    "Accept": "application/json",
                    "x-api-key": DYNAMIC_MOCKUPS_API_KEY
                }
            )
            if response.status_code == 200:
                data = response.json()
                return JSONResponse(content={"success": True, "collections": data.get("data", [])})
            else:
                return JSONResponse(content={"success": False, "error": f"API error: {response.status_code}"}, status_code=response.status_code)
    except Exception as e:
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)

@app.get("/dynamic-mockups/mockups")
async def get_mockups(
    collection_uuid: Optional[str] = None, 
    name: Optional[str] = None,
    gender: Optional[str] = None,
    product: Optional[str] = None,
    view: Optional[str] = None,
    color: Optional[str] = None
):
    """Lấy danh sách mockups từ Dynamic Mockups với filter"""
    if not DYNAMIC_MOCKUPS_API_KEY:
        return JSONResponse(content={"success": False, "error": "Dynamic Mockups API key not configured"}, status_code=400)
    
    try:
        params = {}
        if collection_uuid:
            params["collection_uuid"] = collection_uuid
        if name:
            params["name"] = name
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{DYNAMIC_MOCKUPS_BASE_URL}/mockups",
                headers={
                    "Accept": "application/json",
                    "x-api-key": DYNAMIC_MOCKUPS_API_KEY
                },
                params=params
            )
            if response.status_code == 200:
                data = response.json()
                mockups = data.get("data", [])
                
                # Lọc mockups theo filter
                filtered_mockups = []
                for mockup in mockups:
                    mockup_name = mockup.get("name", "").lower()
                    
                    # Filter theo gender
                    if gender and gender != "":
                        if gender == "men" and "women" in mockup_name:
                            continue
                        if gender == "women" and "men" in mockup_name:
                            continue
                    
                    # Filter theo product
                    if product and product != "":
                        if product == "tshirt" and "tshirt" not in mockup_name and "tee" not in mockup_name:
                            continue
                        if product == "hoodie" and "hoodie" not in mockup_name:
                            continue
                        if product == "mug" and "mug" not in mockup_name and "cup" not in mockup_name:
                            continue
                        if product == "poster" and "poster" not in mockup_name:
                            continue
                    
                    # Filter theo view
                    if view and view != "":
                        if view == "front" and "back" in mockup_name:
                            continue
                        if view == "back" and "front" in mockup_name:
                            continue
                        if view == "side" and "side" not in mockup_name:
                            continue
                    
                    # Filter theo color
                    if color and color != "":
                        if color == "white" and "black" in mockup_name:
                            continue
                        if color == "black" and "white" in mockup_name:
                            continue
                        if color == "gray" and "gray" not in mockup_name and "grey" not in mockup_name:
                            continue
                        if color == "blue" and "blue" not in mockup_name:
                            continue
                        if color == "red" and "red" not in mockup_name:
                            continue
                    
                    filtered_mockups.append(mockup)
                
                return JSONResponse(content={"success": True, "mockups": filtered_mockups})
            else:
                return JSONResponse(content={"success": False, "error": f"API error: {response.status_code}"}, status_code=response.status_code)
    except Exception as e:
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)

@app.post("/dynamic-mockups/create-mockup")
async def create_mockup(
    design_image: UploadFile = File(...),
    mockup_uuid: str = Form(...),
    smart_object_uuid: str = Form(...),
    print_area_preset_uuid: Optional[str] = Form(None)
):
    """Tạo mockup từ design đã trích xuất"""
    if not DYNAMIC_MOCKUPS_API_KEY:
        return JSONResponse(content={"success": False, "error": "Dynamic Mockups API key not configured"}, status_code=400)
    
    try:
        # Lưu design image tạm thời
        temp_path = f"storage/design_{design_image.filename}"
        with open(temp_path, "wb") as f:
            content = await design_image.read()
            f.write(content)
        
        # Upload design image lên cloud storage (cần implement)
        # Tạm thời dùng base64 để test
        with open(temp_path, "rb") as f:
            design_base64 = base64.b64encode(f.read()).decode()
        
        # Gọi Dynamic Mockups Render API
        async with httpx.AsyncClient() as client:
            payload = {
                "mockup_uuid": mockup_uuid,
                "smart_objects": [
                    {
                        "uuid": smart_object_uuid,
                        "image": f"data:image/png;base64,{design_base64}"
                    }
                ]
            }
            
            if print_area_preset_uuid:
                payload["smart_objects"][0]["print_area_preset_uuid"] = print_area_preset_uuid
            
            response = await client.post(
                f"{DYNAMIC_MOCKUPS_BASE_URL}/render",
                headers={
                    "Accept": "application/json",
                    "x-api-key": DYNAMIC_MOCKUPS_API_KEY,
                    "Content-Type": "application/json"
                },
                json=payload
            )
            
            # Xóa file tạm
            os.remove(temp_path)
            
            if response.status_code == 200:
                data = response.json()
                return JSONResponse(content={"success": True, "mockup_url": data.get("data", {}).get("url")})
            else:
                return JSONResponse(content={"success": False, "error": f"Render API error: {response.status_code}"}, status_code=response.status_code)
                
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500) 