# ML Models Setup Guide

This guide will help you set up and train the ML models for the Tweny platform.

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Node.js 18 or higher (for API integration)

## Installation Steps

### 1. Install Python Dependencies

Navigate to the models directory and install required packages:

```bash
cd models
pip install -r requirements.txt
```

This will install:
- NumPy and Pandas for data processing
- Scikit-learn for ML models
- Joblib for model serialization
- And other required packages

### 2. Prepare Your Data

Ensure your data files are in the `../data/` directory with the following structure:

```
data/
├── Menu Engineering Part 1/
│   ├── fct_order_items.csv
│   ├── fct_payments_part1.csv
│   └── fct_app_events.csv
└── Menu Engineering Part 2/
    ├── dim_menu_items.csv
    ├── dim_items.csv
    ├── most_ordered.csv
    └── ... (other dimension tables)
```

### 3. Train the Models

Run the training script:

```bash
python train_models.py
```

This will:
- Load and preprocess your data
- Train all four ML models
- Save trained models to `trained_models/` directory
- Generate performance metrics in `training_results.json`

### 4. Verify Training Results

Check the training output:

```bash
cat trained_models/training_results.json
```

You should see:
- Data summary (number of rows, unique items, etc.)
- Model status for each model (success, skipped, or error)
- Performance metrics (RMSE, MAE, R² scores)

## Using the ML Models

### Through Python API

You can use the trained models directly in Python:

```python
from data_processor import DataProcessor
from demand_forecaster import DemandForecaster

# Load data
processor = DataProcessor()
processor.load_data()
processor.preprocess_order_data()

# Load trained model
forecaster = DemandForecaster()
forecaster.load('trained_models/demand_forecaster.pkl')

# Make predictions
forecasts = forecaster.forecast_demand(
    menu_item_id=123,
    days_ahead=7
)
```

### Through Next.js API Endpoints

The ML models are exposed through Next.js API routes:

#### Demand Forecasting
```bash
curl -X POST http://localhost:3000/api/models/demand-forecast \
  -H "Content-Type: application/json" \
  -d '{"menu_item_id": 123, "days_ahead": 7}'
```

#### Price Optimization
```bash
curl -X POST http://localhost:3000/api/models/price-optimize \
  -H "Content-Type: application/json" \
  -d '{"item_features": {"avg_price": 45, "popularity_score": 0.75}, "cost": 30}'
```

#### Menu Recommendations
```bash
curl -X POST http://localhost:3000/api/models/recommend \
  -H "Content-Type: application/json" \
  -d '{"type": "menu_insights"}'
```

#### Sales Forecasting
```bash
curl -X POST http://localhost:3000/api/models/sales-predict \
  -H "Content-Type: application/json" \
  -d '{"days_ahead": 7, "target": "quantity"}'
```

### Through the React Agent

The ML models are integrated with the menu optimizer agent. Users can ask natural language questions:

- "Forecast demand for item 123 for the next 7 days"
- "Optimize price for item 123 with cost 30"
- "Forecast sales for the next 7 days"
- "Show me popular menu items"
- "What items are frequently bought together?"

## Model Architecture

### 1. Demand Forecaster
- **Algorithm**: Random Forest Regressor
- **Features**: Time of day, day of week, price, item ID
- **Output**: Predicted quantity for menu items
- **Use Case**: Inventory planning and staffing

### 2. Price Optimizer
- **Algorithm**: Gradient Boosting Regressor
- **Features**: Historical price, popularity, elasticity, revenue
- **Output**: Optimal price point
- **Use Case**: Revenue maximization while maintaining demand

### 3. Menu Recommender
- **Algorithm**: Collaborative Filtering + Association Rules
- **Features**: Item co-occurrence, popularity scores
- **Output**: Related items, bundles, upsell opportunities
- **Use Case**: Cross-selling and menu optimization

### 4. Sales Predictor
- **Algorithm**: Ensemble (Random Forest + Linear Regression)
- **Features**: Temporal patterns, lag features, rolling averages
- **Output**: Predicted sales volume and revenue
- **Use Case**: Revenue forecasting and business planning

## Performance Metrics

### Regression Models (Demand, Price, Sales)
- **RMSE** (Root Mean Squared Error): Lower is better
- **MAE** (Mean Absolute Error): Lower is better
- **R²** (R-squared): Higher is better (max 1.0)

### Recommender System
- **Support**: How frequently items appear together
- **Popularity Score**: Normalized popularity metric
- **Recommendation Score**: Combined metric for ranking

## Troubleshooting

### Issue: "Insufficient data" error
**Solution**: Ensure you have at least 30 days of historical data for sales prediction, and sufficient transaction records for other models.

### Issue: Model training fails
**Solution**: Check that all required CSV files exist in the data directory and are properly formatted.

### Issue: Python module not found
**Solution**: Make sure you've installed all dependencies with `pip install -r requirements.txt`

### Issue: API endpoints return errors
**Solution**: 
1. Ensure the Next.js development server is running (`npm run dev`)
2. Check that trained models exist in `models/trained_models/`
3. Verify Python is installed and accessible

## Retraining Models

Models should be retrained periodically with new data:

```bash
# Weekly: Update with recent transaction data
python train_models.py

# After menu changes: Retrain with new items
python train_models.py

# Seasonal adjustments: Retrain quarterly
python train_models.py
```

## Advanced Configuration

### Custom Model Parameters

Edit the model files to adjust hyperparameters:

**Demand Forecaster** (`demand_forecaster.py`):
```python
self.model = RandomForestRegressor(
    n_estimators=100,  # Increase for better accuracy
    max_depth=15,      # Adjust based on data complexity
    random_state=42
)
```

**Price Optimizer** (`price_optimizer.py`):
```python
self.model = GradientBoostingRegressor(
    n_estimators=100,
    learning_rate=0.1,  # Lower for more conservative updates
    max_depth=5
)
```

## Production Deployment

### Option 1: Python Microservice
Deploy models as a separate Python service using FastAPI:

```python
from fastapi import FastAPI
from demand_forecaster import DemandForecaster

app = FastAPI()
forecaster = DemandForecaster()
forecaster.load('trained_models/demand_forecaster.pkl')

@app.post("/predict")
async def predict(menu_item_id: int, days_ahead: int):
    return forecaster.forecast_demand(menu_item_id, days_ahead)
```

### Option 2: Next.js Serverless Functions
Use Vercel or Netlify to deploy API endpoints serverlessly.

### Option 3: Docker Container
Containerize the ML models:

```dockerfile
FROM python:3.9-slim
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "train_models.py"]
```

## Support

For issues or questions:
1. Check the logs in the terminal output
2. Review `training_results.json` for model performance
3. Verify data integrity and format
4. Check this guide for common issues

## Next Steps

1. ✅ Train models on your data
2. ✅ Test predictions with sample data
3. ✅ Integrate with the React agent
4. ✅ Deploy to production
5. ✅ Set up periodic retraining
6. ✅ Monitor model performance over time