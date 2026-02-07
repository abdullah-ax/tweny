# ML Models for Menu Optimization

This directory contains machine learning models designed to provide intelligent recommendations for the Tweny platform's menu optimization agent.

## Overview

The ML models provide data-driven insights for:
- **Demand Forecasting**: Predict future demand for menu items
- **Price Optimization**: Recommend optimal pricing strategies
- **Menu Item Recommendations**: Suggest popular item combinations and new additions
- **Sales Prediction**: Forecast sales for different time periods

## Model Architecture

### 1. Demand Forecasting Model
- **Purpose**: Predict demand for menu items based on historical order data
- **Features**: Time of day, day of week, seasonality, price, category
- **Algorithm**: Random Forest Regressor
- **Output**: Predicted quantity for each menu item

### 2. Price Optimization Model
- **Purpose**: Recommend optimal pricing to maximize revenue while maintaining demand
- **Features**: Historical price, demand elasticity, competitor pricing, costs
- **Algorithm**: Gradient Boosting Regressor
- **Output**: Recommended price point

### 3. Menu Item Recommender
- **Purpose**: Suggest menu item combinations and identify cross-selling opportunities
- **Features**: Item co-occurrence, category, price point, time patterns
- **Algorithm**: Collaborative Filtering + Association Rules
- **Output**: Related items, bundles, upsell opportunities

### 4. Sales Prediction Model
- **Purpose**: Forecast overall sales for planning and inventory
- **Features**: Seasonal patterns, day of week, events, historical trends
- **Algorithm**: Time Series (ARIMA/Prophet) with ensemble methods
- **Output**: Predicted sales volume and revenue

## Setup

### Prerequisites

```bash
pip install -r requirements.txt
```

### Training the Models

```bash
python train_models.py
```

This will:
1. Load and preprocess data from `../data/` directory
2. Train all models
3. Save trained models to `trained_models/` directory
4. Generate performance metrics

## API Integration

The models are served through Next.js API routes:
- `/api/models/demand-forecast` - Demand predictions
- `/api/models/price-optimize` - Price recommendations
- `/api/models/recommend` - Menu item recommendations
- `/api/models/sales-predict` - Sales forecasts

## Model Files

- `data_processor.py` - Data loading and preprocessing utilities
- `demand_forecaster.py` - Demand forecasting model implementation
- `price_optimizer.py` - Price optimization model implementation
- `recommender.py` - Menu item recommendation system
- `sales_predictor.py` - Sales forecasting model
- `train_models.py` - Main training script
- `model_utils.py` - Shared utilities and helper functions
- `requirements.txt` - Python dependencies

## Data Requirements

The models require the following data files:
- `fct_order_items.csv` - Historical order data
- `dim_menu_items.csv` - Menu item metadata
- `dim_items.csv` - Inventory items and costs
- `fct_payments.csv` - Payment and revenue data

## Performance Metrics

Models are evaluated using:
- **Regression Models**: RMSE, MAE, R²
- **Recommender**: Precision@K, Recall@K, NDCG
- **Classification**: Accuracy, F1-score, AUC

## Model Updates

Models should be retrained:
- Weekly with new transaction data
- When new menu items are added
- After significant pricing changes
- Seasonal adjustments (quarterly)

## Agent Integration

The React agent (`src/lib/agents/menu-optimizer-agent.ts`) calls these models to provide:
- Data-backed menu optimization recommendations
- Pricing strategy suggestions
- Demand-based inventory recommendations
- Sales and revenue forecasts