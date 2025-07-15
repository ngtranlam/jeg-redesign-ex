from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.image_processing import ExtractImage
from PIL import Image
import io
import base64
import os
import requests
import json
import time
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

# Hàm upload ảnh lên ImgBB
async def upload_image_to_imgbb(image_base64: str, api_key: str):
    try:
        # Bỏ phần header 'data:image/png;base64,' nếu có
        if ',' in image_base64:
            base64_data = image_base64.split(',')[1]
        else:
            base64_data = image_base64
        
        # Kiểm tra base64 có hợp lệ không
        import base64
        try:
            base64.b64decode(base64_data)
        except Exception as e:
            raise Exception(f"Invalid base64 string: {str(e)}")
        
        data = {
            'image': base64_data
        }
        
        response = requests.post(f'https://api.imgbb.com/1/upload?key={api_key}', data=data)
        result = response.json()
        
        if result.get('success'):
            return result['data']['url']
        else:
            error_msg = result.get('error', {}).get('message', 'Lỗi không xác định')
            raise Exception(f"Upload ảnh thất bại: {error_msg}")
    except Exception as e:
        raise Exception(f"ImgBB upload error: {str(e)}")

# Hàm lấy danh sách mockup từ DynamicMockups
async def fetch_mockup_templates(api_key: str):
    headers = {
        'x-api-key': api_key,
        'Accept': 'application/json'
    }
    
    response = requests.get('https://app.dynamicmockups.com/api/v1/mockups', headers=headers)
    if response.status_code != 200:
        raise Exception('Không lấy được danh sách mockup')
    
    return response.json()

# Hàm render mockup với DynamicMockups API
async def render_mockup(mockup_uuid: str, smart_object_uuid: str, image_url: str, api_key: str, smart_object_info: dict = None):
    body = {
        'mockup_uuid': mockup_uuid,
        'export_label': f'MOCKUP_{int(time.time() * 1000)}',
        'export_options': {
            'image_format': 'jpg',
            'image_size': 1500,
            'mode': 'download'
        },
        'smart_objects': [
            {
                'uuid': smart_object_uuid,
                'asset': {
                    'url': image_url,
                    'fit': 'contain'
                }
            }
        ]
    }
    
    # Thêm print_area_preset_uuid nếu có
    if smart_object_info and smart_object_info.get('print_area_presets') and len(smart_object_info['print_area_presets']) > 0:
        body['smart_objects'][0]['print_area_preset_uuid'] = smart_object_info['print_area_presets'][0]['uuid']
    
    headers = {
        'x-api-key': api_key,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    
    response = requests.post('https://app.dynamicmockups.com/api/v1/renders', headers=headers, json=body)
    result = response.json()
    
    if result.get('success') and result.get('data') and result['data'].get('export_path'):
        return result['data']['export_path']
    else:
        raise Exception(result.get('message', 'Không tạo được mockup'))

@app.post("/extract-design")
async def extract_design(
    file: UploadFile = File(...),
    model: str = Form("gpt-4.1"),
    size: int = Form(1024),
    prompt: str = Form(""),
    mode: str = Form("canny")
):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return JSONResponse(content={"success": False, "error": "OpenAI API key is not configured."}, status_code=500)
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

@app.get("/mockup-templates")
async def get_mockup_templates():
    """Lấy danh sách template mockup"""
    try:
        dynamic_mockups_api_key = os.environ.get("DYNAMIC_MOCKUPS_API_KEY")
        if not dynamic_mockups_api_key:
            return JSONResponse(content={"success": False, "error": "Dynamic Mockups API key is required."}, status_code=400)
        
        templates = await fetch_mockup_templates(dynamic_mockups_api_key)
        return JSONResponse(content={"success": True, "data": templates})
    except Exception as e:
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)

@app.post("/create-mockup")
async def create_mockup(
    design_image: str = Form(...),  # Base64 string của ảnh design
    mockup_uuid: str = Form(...),
    smart_object_uuid: str = Form(...),
    smart_object_info: str = Form("{}")  # JSON string của smart object info
):
    """Tạo mockup từ design image"""
    try:
        print(f"Creating mockup - mockup_uuid: {mockup_uuid}")
        print(f"Smart object UUID: {smart_object_uuid}")
        print(f"Design image length: {len(design_image) if design_image else 0}")
        
        # Lấy API keys từ environment variables
        imgbb_api_key = os.environ.get("IMGBB_API_KEY")
        dynamic_mockups_api_key = os.environ.get("DYNAMIC_MOCKUPS_API_KEY")
        
        if not imgbb_api_key or not dynamic_mockups_api_key:
            return JSONResponse(content={"success": False, "error": "API keys are required."}, status_code=400)
        
        # Parse smart object info
        smart_object_data = json.loads(smart_object_info) if smart_object_info != "{}" else {}
        print(f"Smart object data: {smart_object_data}")
        
        # Upload ảnh lên ImgBB
        print("Uploading image to ImgBB...")
        image_url = await upload_image_to_imgbb(design_image, imgbb_api_key)
        print(f"Image uploaded successfully: {image_url}")
        
        # Tạo mockup
        print("Creating mockup with Dynamic Mockups...")
        mockup_url = await render_mockup(mockup_uuid, smart_object_uuid, image_url, dynamic_mockups_api_key, smart_object_data)
        print(f"Mockup created successfully: {mockup_url}")
        
        return JSONResponse(content={"success": True, "mockup_url": mockup_url})
    except Exception as e:
        print(f"Error creating mockup: {str(e)}")
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500) 