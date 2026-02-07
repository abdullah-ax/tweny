"""
Sales Prediction Model
Forecasts overall sales and revenue for planning and inventory
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from pathlib import Path
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SalesPredictor:
    """Machine learning model for sales forecasting"""
    
    def __init__(self, model_type='ensemble'):
        self.model_type = model_type
        self.models = {}
        self.scalers = {}
        self.feature_names = None
        self.is_fitted = False
    
    def create_features(self, df: pd.DataFrame):
        """Create time-based features for sales prediction"""
        df = df.copy()
        
        # Ensure date is datetime
        if 'date' not in df.columns:
            return None
        
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # Temporal features
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['quarter'] = df['date'].dt.quarter
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['is_month_start'] = (df['day_of_month'] <= 3).astype(int)
        df['is_month_end'] = (df['day_of_month'] >= 28).astype(int)
        
        # Lag features
        for lag in [1, 7, 14, 30]:
            df[f'quantity_lag_{lag}'] = df['quantity'].shift(lag)
            df[f'revenue_lag_{lag}'] = df['revenue'].shift(lag)
        
        # Rolling averages
        for window in [3, 7, 14]:
            df[f'quantity_rolling_{window}'] = df['quantity'].rolling(window=window).mean()
            df[f'revenue_rolling_{window}'] = df['revenue'].rolling(window=window).mean()
        
        # Growth rates
        df['quantity_growth_7d'] = df['quantity'].pct_change(7)
        df['revenue_growth_7d'] = df['revenue'].pct_change(7)
        
        return df
    
    def train(self, df: pd.DataFrame, target='quantity'):
        """
        Train sales prediction model
        
        Args:
            df: DataFrame with 'date', 'quantity', 'revenue' columns
            target: Target variable to predict ('quantity' or 'revenue')
        """
        logger.info(f"Training sales predictor for target: {target}...")
        
        # Create features
        df_featured = self.create_features(df)
        if df_featured is None:
            raise ValueError("Could not create features from data")
        
        # Remove rows with NaN (from lag features)
        df_clean = df_featured.dropna()
        
        if len(df_clean) < 30:
            logger.warning("Insufficient data for training (need at least 30 days)")
            return None
        
        # Define feature columns
        feature_cols = ['day_of_week', 'day_of_month', 'month', 'quarter', 
                       'is_weekend', 'is_month_start', 'is_month_end',
                       'quantity_lag_1', 'quantity_lag_7', 'quantity_lag_14',
                       'revenue_lag_1', 'revenue_lag_7', 'quantity_rolling_7',
                       'revenue_rolling_7', 'quantity_growth_7d', 'revenue_growth_7d']
        
        # Ensure all feature columns exist
        for col in feature_cols:
            if col not in df_clean.columns:
                df_clean[col] = 0
        
        # Prepare X and y
        X = df_clean[feature_cols].copy()
        y = df_clean[target].copy()
        
        self.feature_names = feature_cols
        
        # Train ensemble of models
        models = {
            'random_forest': RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                random_state=42,
                n_jobs=-1
            ),
            'linear_regression': LinearRegression()
        }
        
        # Split data
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        
        # Train and scale each model
        for name, model in models.items():
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            model.fit(X_train_scaled, y_train)
            
            self.models[name] = model
            self.scalers[name] = scaler
        
        self.is_fitted = True
        
        # Evaluate ensemble (average predictions)
        train_pred = self._predict_ensemble(X_train)
        test_pred = self._predict_ensemble(X_test)
        
        metrics = {
            'train_rmse': np.sqrt(mean_squared_error(y_train, train_pred)),
            'test_rmse': np.sqrt(mean_squared_error(y_test, test_pred)),
            'train_mae': mean_absolute_error(y_train, train_pred),
            'test_mae': mean_absolute_error(y_test, test_pred),
            'train_r2': r2_score(y_train, train_pred),
            'test_r2': r2_score(y_test, test_pred),
            'num_samples': len(df_clean)
        }
        
        logger.info(f"Sales predictor trained. Test RMSE: {metrics['test_rmse']:.2f}, R²: {metrics['test_r2']:.3f}")
        
        return metrics
    
    def _predict_ensemble(self, X):
        """Make predictions using ensemble averaging"""
        predictions = []
        for name, model in self.models.items():
            scaler = self.scalers[name]
            X_scaled = scaler.transform(X)
            pred = model.predict(X_scaled)
            predictions.append(pred)
        
        return np.mean(predictions, axis=0)
    
    def forecast(self, days_ahead: int = 7, target='quantity', 
                 last_date: datetime = None, recent_data: pd.DataFrame = None):
        """
        Forecast sales for future days
        
        Args:
            days_ahead: Number of days to forecast
            target: Target variable ('quantity' or 'revenue')
            last_date: Last date in historical data
            recent_data: Recent data for creating features
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before forecasting")
        
        if recent_data is None or len(recent_data) == 0:
            logger.warning("No recent data provided for forecasting")
            return None
        
        # Create feature matrix for future dates
        forecasts = []
        
        # Get the most recent data point
        recent_data = recent_data.sort_values('date')
        last_data = recent_data.iloc[-1:].copy()
        
        for day in range(1, days_ahead + 1):
            # Create future date
            if last_date:
                future_date = last_date + timedelta(days=day)
            else:
                future_date = datetime.now() + timedelta(days=day)
            
            # Create features for future date
            features = self._create_forecast_features(
                future_date, last_data, day
            )
            
            # Make prediction
            prediction = self._predict_ensemble(features)[0]
            
            forecasts.append({
                'date': future_date.strftime('%Y-%m-%d'),
                f'predicted_{target}': round(float(prediction), 2)
            })
        
        return forecasts
    
    def _create_forecast_features(self, future_date, recent_data, days_ahead):
        """Create feature vector for a future date"""
        # Temporal features
        day_of_week = future_date.weekday()
        day_of_month = future_date.day
        month = future_date.month
        quarter = (month - 1) // 3 + 1
        is_weekend = 1 if day_of_week >= 5 else 0
        is_month_start = 1 if day_of_month <= 3 else 0
        is_month_end = 1 if day_of_month >= 28 else 0
        
        # Use recent averages for lag and rolling features
        recent_quantity = recent_data['quantity'].iloc[-1] if 'quantity' in recent_data.columns else 10
        recent_revenue = recent_data['revenue'].iloc[-1] if 'revenue' in recent_data.columns else 100
        
        features = np.array([[
            day_of_week,
            day_of_month,
            month,
            quarter,
            is_weekend,
            is_month_start,
            is_month_end,
            recent_quantity,  # lag_1
            recent_quantity,  # lag_7
            recent_quantity,  # lag_14
            recent_revenue,  # revenue lag_1
            recent_revenue,  # revenue lag_7
            recent_quantity,  # rolling_7
            recent_revenue,  # revenue rolling_7
            0.0,  # growth_7d (assume stable)
            0.0   # revenue growth_7d
        ]])
        
        return features
    
    def predict_with_intervals(self, df: pd.DataFrame, target='quantity'):
        """Make predictions with confidence intervals"""
        if not self.is_fitted:
            raise ValueError("Model must be trained before making predictions")
        
        # Create features
        df_featured = self.create_features(df)
        if df_featured is None:
            return None
        
        # Remove rows with NaN
        df_clean = df_featured.dropna()
        
        feature_cols = self.feature_names
        
        for col in feature_cols:
            if col not in df_clean.columns:
                df_clean[col] = 0
        
        X = df_clean[feature_cols].copy()
        
        # Make ensemble predictions
        predictions = self._predict_ensemble(X)
        
        # Estimate uncertainty using random forest variance
        rf_model = self.models['random_forest']
        rf_scaler = self.scalers['random_forest']
        X_scaled = rf_scaler.transform(X)
        
        tree_predictions = np.array([tree.predict(X_scaled) for tree in rf_model.estimators_])
        std_dev = np.std(tree_predictions, axis=0)
        
        # Calculate confidence intervals
        z_score = 1.96  # For 95% confidence
        lower_bound = np.maximum(predictions - z_score * std_dev, 0)
        upper_bound = predictions + z_score * std_dev
        
        results = pd.DataFrame({
            'date': df_clean['date'],
            f'predicted_{target}': predictions,
            f'lower_bound': lower_bound,
            f'upper_bound': upper_bound
        })
        
        return results
    
    def get_feature_importance(self):
        """Get feature importance from random forest model"""
        if not self.is_fitted or 'random_forest' not in self.models:
            return None
        
        model = self.models['random_forest']
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            
            if self.feature_names:
                importance_df = pd.DataFrame({
                    'feature': self.feature_names,
                    'importance': importances
                }).sort_values('importance', ascending=False)
                return importance_df
            else:
                return importances
        return None
    
    def save(self, path: str):
        """Save the trained model"""
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")
        
        model_data = {
            'models': self.models,
            'scalers': self.scalers,
            'feature_names': self.feature_names,
            'model_type': self.model_type,
            'is_fitted': self.is_fitted
        }
        
        joblib.dump(model_data, path)
        logger.info(f"Sales predictor saved to {path}")
    
    def load(self, path: str):
        """Load a trained model"""
        model_data = joblib.load(path)
        
        self.models = model_data['models']
        self.scalers = model_data['scalers']
        self.feature_names = model_data['feature_names']
        self.model_type = model_data['model_type']
        self.is_fitted = model_data['is_fitted']
        
        logger.info(f"Sales predictor loaded from {path}")


if __name__ == "__main__":
    # Test the sales predictor
    from data_processor import DataProcessor
    
    logger.info("Testing Sales Predictor...")
    
    # Load and prepare data
    processor = DataProcessor()
    processor.load_data()
    processor.preprocess_order_data()
    
    # Get time series data
    time_series = processor.get_time_series()
    
    if time_series is not None and len(time_series) >= 30:
        # Train model
        predictor = SalesPredictor()
        metrics = predictor.train(time_series, target='quantity')
        
        if metrics:
            print("\nModel Performance:")
            for metric, value in metrics.items():
                print(f"{metric}: {value}")
            
            # Feature importance
            importance = predictor.get_feature_importance()
            if importance is not None:
                print("\nFeature Importance:")
                print(importance.head(10))
            
            # Test forecasting
            last_date = time_series['date'].max()
            forecasts = predictor.forecast(
                days_ahead=7,
                target='quantity',
                last_date=last_date,
                recent_data=time_series.tail(30)
            )
            
            if forecasts:
                print("\n7-Day Forecast:")
                for f in forecasts:
                    print(f"  {f['date']}: {f['predicted_quantity']:.0f}")
            
            # Save model
            output_dir = Path("trained_models")
            output_dir.mkdir(exist_ok=True)
            predictor.save(output_dir / "sales_predictor.pkl")
        else:
            print("Could not train model - insufficient data")
    else:
        print("Insufficient data for training (need at least 30 days)")