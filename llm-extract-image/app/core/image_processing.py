from PIL import Image
import cv2
from io import BytesIO
import base64
import openai

prompt_extract ="""
You are given a reference image of a T-shirt with a graphic design. Please extract and redraw only the graphic (not the shirt), with the following requirements:
- Perfectly replicate the graphic, including all colors, lines, and shapes exactly as in the original.
- Keep all text exactly the same, preserving the original font style, size, and placement.
- Remove any wrinkles, folds, shadows, or distortions from the shirt fabric.
- The result must have a transparent background (PNG).
- Output resolution: 1024x1024 pixels, high quality, sharp and detailed.
- Do not modify, interpret, or simplify the design in any way. The result must be visually identical to the original.
- If any part of the design is unclear or blocked, reconstruct it as faithfully as possible.

Reference image:
""".strip()

prompt_canny = '''
You are a skilled illustrator. The provided image contains two parts side by side:

- The **left half** is the original full-color image of a T-shirt with a printed graphic.
- The **right half** is a sketch-style version of the same image, created using edge detection (Canny), showing line outlines and contours.

Your task is to extract and accurately recreate **only the graphic design**, excluding the shirt, with the following requirements:

- Use the **sketch portion** to refine the linework and structure.
- Use the **color portion** to retain original color, typography, layout, and graphic fidelity.
- Remove all fabric folds, shadows, wrinkles, or distortions from the T-shirt.
- The final result must be visually sharp, precise, and match the original design exactly.
- Do not modify, simplify, or reinterpret the content in any way.
- The output must have a **transparent background (PNG)**.
- Resolution: **1024x1024px**, high quality, clean vector-like result.

Image (left: original, right: sketch):
'''.strip()

class ExtractImage():
    def __init__(self,):
        pass

    def load_image_from_pil(self, client, image_pil):
        img_bytes = BytesIO()
        image_pil.save(img_bytes, format="PNG")
        img_bytes.seek(0)
        result = client.files.create(
            file=img_bytes,
            purpose="vision",
        )
        return result.id
    
    def load_image_from_file(self, client, file_path):
        with open(file_path, "rb") as file_content:
            result = client.files.create(
                file=file_content,
                purpose="vision",
            )
        return result.id
    
    def canny(self, image_path):
        image = cv2.imread(image_path)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        edges = cv2.Canny(blurred, threshold1=20, threshold2=200)
        inverted_edges = cv2.bitwise_not(edges)
        pil_image = Image.fromarray(inverted_edges)
        return pil_image

    def combine_images(self, image_path, direction="horizontal", padding=20, background=(255, 255, 255, 0)):
        img1 = Image.open(image_path).convert("RGBA")
        img2 = self.canny(image_path)
        img2 = img2.convert("RGBA")
        if direction == "horizontal":
            new_width = img1.width + img2.width + padding
            new_height = max(img1.height, img2.height)
            new_img = Image.new("RGBA", (new_width, new_height), background)
            new_img.paste(img1, (0, 0), mask=img1)
            new_img.paste(img2, (img1.width + padding, 0), mask=img2)
        elif direction == "vertical":
            new_width = max(img1.width, img2.width)
            new_height = img1.height + img2.height + padding
            new_img = Image.new("RGBA", (new_width, new_height), background)
            new_img.paste(img1, (0, 0), mask=img1)
            new_img.paste(img2, (0, img1.height + padding), mask=img2)
        return new_img

    def resize_image(self, image_base64, size):
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_bytes))
        resized_image = image.resize((size, size), Image.LANCZOS)  # LANCZOS cho chất lượng cao
        return resized_image

    def extract(self, file_path, api_key, model="GPT Image 1", size=4500, prompt=""):
        if prompt == "":
            prompt = prompt_extract
        client = openai.OpenAI(api_key=api_key)
        file_id = self.load_image_from_file(client, file_path)
        response = client.responses.create(
            model = model, #"GPT Image 1", #"gpt-4.1",
            input = [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {
                            "type": "input_image",
                            "file_id": file_id,
                        },
                        
                    ],
                }
            ],
            tools = [{
                "type": "image_generation",
                "background": "transparent",
                "quality": "high",
                "size": "1024x1024",
                "moderation": "low",
            }],
        )
        image_generation_calls = [
            output
            for output in response.output
            if output.type == "image_generation_call"
        ]
        image_data = [output.result for output in image_generation_calls]
        if image_data:
            image_base64 = image_data[0]
            image = self.resize_image(image_base64, size)
            return image
        else:
            return None

    def extract_with_canny(self, file_path, api_key, model="GPT Image 1", size=4500, prompt=""):
        if prompt == "":
            prompt = prompt_canny
        # canny
        image_combine = self.combine_images(file_path)
        image_combine.save(file_path, dpi=(300, 300), format="PNG")
        # gen
        client = openai.OpenAI(api_key=api_key)
        file_id = self.load_image_from_file(client, file_path)
        response = client.responses.create(
            model = model, #"GPT Image 1", #"gpt-4.1",
            input = [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {
                            "type": "input_image",
                            "file_id": file_id,
                        },
                        
                    ],
                }
            ],
            tools = [{
                "type": "image_generation",
                "background": "transparent",
                "quality": "high",
                "size": "1024x1024",
                "moderation": "low",
            }],
        )
        image_generation_calls = [
            output
            for output in response.output
            if output.type == "image_generation_call"
        ]
        image_data = [output.result for output in image_generation_calls]
        if image_data:
            image_base64 = image_data[0]
            image = self.resize_image(image_base64, size)
            return image
        else:
            return None
        