from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import joblib
from tensorflow.keras.models import load_model
import os
from typing import List

app = FastAPI(title="Medico AI Demand Service")

# Load model and scaler
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "lstm_model.h5")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.save")

load_error = None
try:
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        raise FileNotFoundError(f"Files not found: {MODEL_PATH}, {SCALER_PATH}")
    
    model = load_model(MODEL_PATH, compile=False)
    scaler = joblib.load(SCALER_PATH)
    print("Model and Scaler loaded successfully.")
except Exception as e:
    load_error = str(e)
    print(f"Error loading model: {load_error}")
    model = None
    scaler = None

class PredictionRequest(BaseModel):
    sequence: List[float]

@app.get("/")
def read_root():
    return {
        "status": "Medico AI Service is running",
        "model_loaded": model is not None,
        "error": load_error
    }

@app.post("/predict")
def predict(request: PredictionRequest):
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail=f"Model not loaded: {load_error}")
    
    try:
        # User requested 30 day sequence
        LOOK_BACK = 30
        
        sequence = np.array(request.sequence).reshape(-1, 1)
        
        if len(sequence) < LOOK_BACK:
            # If less than 30, pad with mean or similar (though frontend should send 30)
            padding = np.full((LOOK_BACK - len(sequence), 1), np.mean(sequence))
            sequence = np.vstack([padding, sequence])
        elif len(sequence) > LOOK_BACK:
            sequence = sequence[-LOOK_BACK:]

        # Scale input
        seq_scaled = scaler.transform(sequence)

        # Reshape for LSTM (1, LOOK_BACK, 1)
        seq_input = seq_scaled.reshape(1, LOOK_BACK, 1)

        # Predict
        pred_scaled = model.predict(seq_input, verbose=0)
        
        # Inverse scale
        pred = scaler.inverse_transform(pred_scaled)

        return {
            "prediction": int(max(0, round(pred[0][0]))),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
