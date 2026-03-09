import numpy as np
import pandas as pd
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.callbacks import EarlyStopping
import joblib
import os

def train_and_save_model():
    # Generate some synthetic daily demand data for training (2 years)
    dates = pd.date_range(start='2024-01-01', periods=730, freq='D')
    # Synthetic pattern: 100 + linear trend + sine wave (seasonal) + noise
    data = 100 + (np.arange(730) * 0.1) + (20 * np.sin(np.arange(730) * 2 * np.pi / 30)) + np.random.normal(0, 5, 730)
    
    df = pd.DataFrame({'date': dates, 'quantity': data})
    values = df['quantity'].values.reshape(-1, 1)
    
    # Scale data
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(values)
    
    # Create sequences (LOOK_BACK = 30)
    look_back = 30
    X, y = [], []
    for i in range(len(scaled_data) - look_back):
        X.append(scaled_data[i:i+look_back])
        y.append(scaled_data[i+look_back])
    X, y = np.array(X), np.array(y)
    
    # Build model (User's Architecture)
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(look_back, 1)),
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mse')
    
    # Early Stopping (User's logic)
    es = EarlyStopping(monitor='loss', patience=5, restore_best_weights=True)
    
    print("Training model...")
    model.fit(X, y, epochs=60, batch_size=16, callbacks=[es], verbose=1)
    
    # Save artifacts
    output_dir = os.path.join(os.path.dirname(__file__), '../ai_service')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    model_path = os.path.join(output_dir, 'lstm_model.h5')
    scaler_path = os.path.join(output_dir, 'scaler.save')
    
    model.save(model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"Model saved to {model_path}")
    print(f"Scaler saved to {scaler_path}")

if __name__ == "__main__":
    train_and_save_model()
