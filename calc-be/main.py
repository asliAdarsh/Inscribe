from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from apps.calculator.route import router as calculator_router
from constants import SERVER_URL, PORT, ENV
from apps.calculator.utils import analyze_image, chat_with_ai

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get('/')
async def root():
    return {"message": "Server is running"}

app.include_router(calculator_router, prefix="/calculate", tags=["calculate"])

# Correct FastAPI endpoint for chat
@app.post('/chat')
async def chat(request: Request):
    data = await request.json()
    user_message = data.get('message', '')
    
    if not user_message:
        return {"response": "Please provide a message."}
    
    # Process the message with the AI
    ai_response = chat_with_ai(user_message)
    
    return {"response": ai_response}


if __name__ == "__main__":
    uvicorn.run("main:app", host=SERVER_URL, port=int(PORT), reload=(ENV == "dev"))