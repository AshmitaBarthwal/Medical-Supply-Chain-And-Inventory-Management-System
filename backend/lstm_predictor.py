import sys
import json
import pandas as pd
import numpy as np
import os

# Suppress TensorFlow logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from sklearn.preprocessing import MinMaxScaler
except ImportError as e:
    print(json.dumps({"success": False, "error": f"Missing dependencies: {str(e)}"}))
    sys.exit(1)

def predict_medicine(name, history_list):
    try:
        if len(history_list) < 1:
            return None

        # Prepare DataFrame
        df = pd.DataFrame(history_list)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # Aggregate by month
        df.set_index('date', inplace=True)
        monthly_df = df.resample('ME').sum()
        
        last_date = monthly_df.index[-1]
        last_qty = float(monthly_df['quantity'].iloc[-1])
        avg_qty = float(monthly_df['quantity'].mean())

        # Simple Trend-based prediction for fast listing
        # (Avg + Last) / 2 as a baseline for next month
        next_month_pred = (avg_qty + last_qty) / 2
        
        return {
            "name": name,
            "thisMonth": {
                "label": last_date.strftime('%B %Y'),
                "value": round(last_qty, 2)
            },
            "nextMonth": {
                "label": (last_date + pd.DateOffset(months=1)).strftime('%B %Y'),
                "value": round(next_month_pred, 2)
            },
            "history": [
                {"date": d.strftime('%Y-%m'), "quantity": float(q)} 
                for d, q in zip(monthly_df.index, monthly_df['quantity'])
            ]
        }
    except Exception as e:
        return {"name": name, "error": str(e)}

def main():
    try:
        # Read from stdin
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input data provided"}))
            return

        data = json.loads(input_data)
        medicines = data.get('medicines', []) # Format: [{"name": "P1", "history": [...]}, ...]
        
        if not medicines:
            # Fallback to single medicine 'history' format if needed for backward compatibility
            single_history = data.get('history', [])
            if single_history:
                res = predict_medicine("Selected Medicine", single_history)
                if res:
                    print(json.dumps({"success": True, "results": [res]}))
                else:
                    print(json.dumps({"success": False, "error": "No data"}))
                return
            
            print(json.dumps({"success": False, "error": "No medicine data provided"}))
            return

        results = []
        for med in medicines:
            pred = predict_medicine(med['name'], med['history'])
            if pred:
                results.append(pred)

        print(json.dumps({
            "success": True,
            "results": results
        }))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
