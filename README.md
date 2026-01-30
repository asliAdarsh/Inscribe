# Inscribe

Inscribe is a digital canvas for handwritten notes and math. The project pairs a React + Vite frontend with a FastAPI backend that uses Google Gemini to analyze handwritten equations and answer chat prompts.

## Features
- Multi-canvas workspace with pen, eraser, text, and shape tools
- Math expression recognition from drawn content
- Step-by-step calculation results and history
- Built-in chat assistant for questions
- Export canvases to PDF

## Project Structure
```
calc-fe/   # Frontend (React, Vite, TypeScript)
calc-be/   # Backend (FastAPI)
```

## Getting Started

### Backend (FastAPI)
```bash
cd calc-be
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file or set an environment variable for the Gemini API key:
```bash
export GEMINI_API_KEY=your_api_key_here
```

Run the API server:
```bash
python main.py
```

The backend listens on `http://localhost:8900` by default. Update `calc-be/constants.py` if you need a different host or port.

### Frontend (React + Vite)
```bash
cd calc-fe
npm install
npm run dev
```

Vite will print the local dev URL (typically `http://localhost:5173`).

## API Endpoints
- `POST /calculate` — analyze a canvas image and return calculated results
- `POST /chat` — chat with the Inscribe AI assistant

## Frontend Scripts
```bash
npm run dev      # start the dev server
npm run build    # production build
npm run lint     # eslint
npm run preview  # preview production build
```
