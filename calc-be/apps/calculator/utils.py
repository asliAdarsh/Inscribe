# import torch
# from transformers import pipeline, BitsAndBytesConfig, AutoProcessor, LlavaForConditionalGeneration
# from PIL import Image

# # quantization_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16)
# quantization_config = BitsAndBytesConfig(
#     load_in_4bit=True,
#     bnb_4bit_compute_dtype=torch.float16
# )


# model_id = "llava-hf/llava-1.5-7b-hf"
# processor = AutoProcessor.from_pretrained(model_id)
# model = LlavaForConditionalGeneration.from_pretrained(model_id, quantization_config=quantization_config, device_map="auto")
# # pipe = pipeline("image-to-text", model=model_id, model_kwargs={"quantization_config": quantization_config})

# def analyze_image(image: Image):
#     prompt = "USER: <image>\nAnalyze the equation or expression in this image, and return answer in format: {expr: given equation in LaTeX format, result: calculated answer}"

#     inputs = processor(prompt, images=[image], padding=True, return_tensors="pt").to("cuda")
#     for k, v in inputs.items():
#         print(k,v.shape)

#     output = model.generate(**inputs, max_new_tokens=20)
#     generated_text = processor.batch_decode(output, skip_special_tokens=True)
#     for text in generated_text:
#         print(text.split("ASSISTANT:")[-1])

import google.generativeai as genai
import ast
import json
import re
from PIL import Image
from constants import GEMINI_API_KEY

genai.configure(api_key="AIzaSyBBwiWQ7QpQk1Bd0Y0UA7xbGklu-_mscaM")

def analyze_image(img: Image, dict_of_vars: dict):
    model = genai.GenerativeModel(model_name="gemini-1.5-flash")
    dict_of_vars_str = json.dumps(dict_of_vars, ensure_ascii=False)
    prompt = (
                f"You have been given an image with some mathematical expressions, equations, or graphical problems, and you need to solve them. "
        f"Note: Use the PEMDAS rule for solving mathematical expressions. PEMDAS stands for the Priority Order: Parentheses, Exponents, Multiplication and Division (from left to right), Addition and Subtraction (from left to right). Parentheses have the highest priority, followed by Exponents, then Multiplication and Division, and lastly Addition and Subtraction. "
        f"For example: "
        f"Q. 2 + 3 * 4 "
        f"(3 * 4) => 12, 2 + 12 = 14. "
        f"Q. 2 + 3 + 5 * 4 - 8 / 2 "
        f"5 * 4 => 20, 8 / 2 => 4, 2 + 3 => 5, 5 + 20 => 25, 25 - 4 => 21. "
        f"YOU CAN HAVE FOLLOWING TYPES OF EQUATIONS/EXPRESSIONS IN THIS IMAGE, ALSO WHEN THE IMAGE HAVE MORE THAN ONE EQUATION/EXPRESSION THEN SOLVE ALL OF THEM IN A SEQUENCE STARING FROM THE FIRST AND GIVE ITS ANSWER."
        f"Make sure to give answer with STEPS to solve the EQUATIONS/EXPRESSIONS."
        f"Following are the cases: "
        f"1. Simple mathematical expressions like 2 + 2, 3 * 4, 5 / 6, 7 - 8, etc.: In this case, solve and return the answer in the format of a LIST OF ONE DICT [{{'expr': given expression, 'result': calculated answer, 'steps': 'detailed step-by-step solution WITHOUT ANY NEWLINE CHARACTERS'}}]. "
        f"2. Set of Equations like x^2 + 2x + 1 = 0,  3y + 4x = 0, x^2 + 2x = 42, 5x^2 + 6y + 7 = 12, etc.: In this case, solve for the given variable, and the format should be a COMMA SEPARATED LIST OF DICTS, with dict 1 as {{'expr': 'x', 'result': x = 2, 'assign': True, 'steps': 'detailed step-by-step solution WITHOUT ANY NEWLINE CHARACTERS OR ESCAPE SEQUENCES'}} and dict 2 as {{'expr': 'y', 'result': 5, 'assign': True, 'steps': 'detailed step-by-step solution'}}. This example assumes x was calculated as 2, and y as 5. Include as many dicts as there are variables. Do not add ``` in starting and end of response or ```json in starting of response."
        f"3. Assigning values to variables like x = 4, y = 5, z = 6, etc.: In this case, assign values to variables and return another key in the dict called {{'assign': True}}, keeping the variable as 'expr' and the value as 'result' in the original dictionary. RETURN AS A LIST OF DICTS with 'steps' field showing the assignment. "
        f"4. Solve and find area, surfce area, total surface area, volume,etc of any 2D or 3D shapes like total surface area of a 10cm long and 2cm wide cylinder is 69.11cm^2.: You need to return the answer in the format of a LIST OF ONE DICT [{{'expr': given expression, 'result': calculated answer, 'steps': 'detailed step-by-step solution with formulas used'}}]. "
        f"4. Equaton or expression based on trigonometric problems like sin2x = 2sinxcosx, sin^2x + cos^2x = 1, Tan (90 – x) = Cot x, sin(x+y)=sin(x).cos(y)+cos(x).sin(y).: In this case, solve the equation or expression by using other trigonometric identities and formulas, and the format should be like [{{'expr': given trigonometric expression, 'result': calculated answer, 'steps': 'detailed step-by-step solution with identities used'}}]"
        f"5. Analyzing Graphical Math problems, which are word problems represented in drawing form, such as cars colliding, trigonometric problems, problems on the Pythagorean theorem, adding runs from a cricket wagon wheel,area of 3D and 2D shapes, etc. These will have a drawing representing some scenario and accompanying information with the image. PAY CLOSE ATTENTION TO DIFFERENT COLORS FOR THESE PROBLEMS. You need to return the answer in the format of a LIST OF ONE DICT [{{'expr': given expression, 'result': calculated answer, 'steps': 'detailed step-by-step solution'}}]. "
        f"6. Detecting Abstract Concepts that a drawing might show, such as love, hate, jealousy, patriotism, or a historic reference to war, invention, discovery, quote, etc. RETURN THE ABSTRACT CONCEPT OF THE DRWAING AS THE ANSWER IN THESE CASE. For example, if the drawing shows a heart, the answer should be {{'expr': 'Drawing of a heart', 'result': Symbol of love, 'assign': True, 'steps': 'explanation of why this represents the concept'}}. Make sure to give space between each words that is give space between Drawing and of and similarly for all. "
        f"Analyze the equation or expression in this image and return the answer according to the given rules: "
        f"IMPORTANT: DO NOT USE ANY NEWLINE CHARACTERS OR ESCAPE SEQUENCES IN THE STEPS FIELD. WRITE THE STEPS AS A CONTINUOUS TEXT WITH PERIODS AND COMMAS FOR SEPARATION."
        f"Here is a dictionary of user-assigned variables. If the given expression has any of these variables, use its actual value from this dictionary accordingly: {dict_of_vars_str}. "
        f"DO NOT USE ESCAPE SEQUENCES LIKE \\n\\ OR \\n IN THE STEPS FIELD. USE SIMPLE TEXT WITH PROPER FORMATTING."
        f"PROPERLY QUOTE THE KEYS AND VALUES IN THE DICTIONARY FOR EASIER PARSING WITH Python's ast.literal_eval."
        f"ALWAYS INCLUDE A 'steps' FIELD IN EACH DICTIONARY WITH A DETAILED STEP-BY-STEP SOLUTION."
    )
    response = model.generate_content([prompt, img])
    print(response.text)
    answers = []
    try:
        answers = ast.literal_eval(response.text)
    except Exception as e:
        print(f"Error in parsing response from Gemini API: {e}")
    print('returned answer ', answers)
    
    # Clean up the steps field in each answer
    for answer in answers:
        if 'assign' in answer:
            answer['assign'] = True
        else:
            answer['assign'] = False
            
        # Ensure steps field exists
        if 'steps' not in answer:
            answer['steps'] = "No detailed steps available"

    
    return answers

def chat_with_ai(message: str):
    """
    Process a chat message using Gemini AI and return a response.
    
    Args:
        message (str): The user's chat message
        
    Returns:
        str: The AI's response to the message
    """
    try:
        model = genai.GenerativeModel(model_name="gemini-1.5-flash")
        
        prompt = (
            f"You are a helpful AI assistant named Inscribe AI. You can answer questions on any topic, "
            f"including but not limited to mathematics, science, history, geography, literature, and general knowledge. "
            f"Provide accurate, concise, and helpful responses. "
            f"User message: {message}"
        )
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error in chat with Gemini API: {e}")
        return "I'm sorry, I encountered an error while processing your request."    """
    Process a chat message using Gemini AI and return a response.
    
    Args:
        message (str): The user's chat message
        
    Returns:
        str: The AI's response to the message
    """
    try:
        model = genai.GenerativeModel(model_name="gemini-1.5-flash")
        
        prompt = (
            f"You are an AI math assistant named Inscribe AI. You help users with mathematical problems and calculations. "
            f"Respond to the following message in a helpful, concise manner. If the user asks about mathematical concepts, "
            f"provide clear explanations with examples when appropriate. "
            f"User message: {message}"
        )
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error in chat with Gemini API: {e}")
        return "I'm sorry, I encountered an error while processing your request."