"""
Demand Forecasting Model
Predicts future demand for menu items based on historical data
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DemandForecaster:
    """Machine learning model for forecasting menu item demand"""
    
    def __init__(self, model_type='random_forest'):
        self.model_type = model_type
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.is_fitted = False
        
        # Initialize model based on type
        if model_type == 'random_forest':
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=15,
                min_samples_split=10,
                min_samples_leaf=5,
                random_state=42,
                n_jobs=-1
            )
        elif model_type == 'gradient_boosting':
            self.model = GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")
    
    def train(self, X, y):
        """Train the demand forecasting model"""
        logger.info(f"Training demand forecaster ({self.model_type})...")
        
        # Convert to numpy arrays if needed
        if isinstance(X, pd.DataFrame):
            self.feature_names = X.columns.tolist()
            X = X.values
        if isinstance(y, pd.Series):
            y = y.values
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        # Train model
        self.model.fit(X_train, y_train)
        self.is_fitted = True
        
        # Evaluate
        train_pred = self.model.predict(X_train)
        test_pred = self.model.predict(X_test)
        
        metrics = {
            'train_rmse': np.sqrt(mean_squared_error(y_train, train_pred)),
            'test_rmse': np.sqrt(mean_squared_error(y_test, test_pred)),
            'train_mae': mean_absolute_error(y_train, train_pred),
            'test_mae': mean_absolute_error(y_test, test_pred),
            'train_r2': r2_score(y_train, train_pred),
            'test_r2': r2_score(y_test, test_pred)
        }
        
        logger.info(f"Model trained. Test RMSE: {metrics['test_rmse']:.2f}, R²: {metrics['test_r2']:.3f}")
        
        return metrics
    
    def predict(self, X):
        """Make demand predictions"""
        if not self.is_fitted:
            raise ValueError("Model must be trained before making predictions")
        
        # Convert to numpy array if needed
        if isinstance(X, pd.DataFrame):
            X = X.values
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Make predictions
        predictions = self.model.predict(X_scaled)
        
        # Ensure non-negative predictions
        predictions = np.maximum(predictions, 0)
        
        return predictions
    
    def predict_with_intervals(self, X, confidence=0.95):
        """Make predictions with confidence intervals (using tree-based variance)"""
        predictions = self.predict(X)
        
        if self.model_type == 'random_forest':
            # Use individual tree predictions for uncertainty estimation
            tree_predictions = np.array([tree.predict(self.scaler.transform(X)) 
                                        for tree in self.model.estimators_])
            
            # Calculate standard deviation
            std_dev = np.std(tree_predictions, axis=0)
            
            # Calculate confidence intervals
            z_score = 1.96  # For 95% confidence
            lower_bound = np.maximum(predictions - z_score * std_dev, 0)
            upper_bound = predictions + z_score * std_dev
        else:
            # For gradient boosting, use a simpler approach
            lower_bound = predictions * 0.9
            upper_bound = predictions * 1.1
        
        return {
            'predictions': predictions,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound
        }
    
    def get_feature_importance(self):
        """Get feature importance scores"""
        if not self.is_fitted:
            raise ValueError("Model must be trained before getting feature importance")
        
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            
            if self.feature_names:
                importance_df = pd.DataFrame({
                    'feature': self.feature_names,
                    'importance': importances
                }).sort_values('importance', ascending=False)
                return importance_df
            else:
                return importances
        else:
            return None
    
    def forecast_demand(self, menu_item_id: int, days_ahead: int = 7, hour: int = None, 
                        day_of_week: int = None, price: float = None):
        """Forecast demand for a specific menu item"""
        if not self.is_fitted:
            raise ValueError("Model must be trained before forecasting")
        
        # Create feature matrix for forecast
        forecasts = []
        
        for day in range(days_ahead):
            # Default to current time if not specified
            if hour is None:
                hour = 12  # Noon
            if day_of_week is None:
                day_of_week = 0  # Monday
            
            # Create feature vector
            features = np.array([[
                hour,
                day_of_week,
                15,  # day_of_month (mid-month default)
                6,   # month (June default)
                1 if day_of_week >= 5 else 0,  # is_weekend
                1 if 11 <= hour <= 14 else 0,  # is_lunch
                1 if 17 <= hour <= 21 else 0,  # is_dinner
                menu_item_id,
                price if price is not None else 50  # default price
            ]])
            
            prediction = self.predict(features)[0]
            forecasts.append({
                'day': day + 1,
                'hour': hour,
                'day_of_week': day_of_week,
                'predicted_demand': round(prediction, 2)
            })
        
        return forecasts
    
    def cross_validate(self, X, y, cv=5):
        """Perform cross-validation"""
        if isinstance(X, pd.DataFrame):
            X = X.values
        if isinstance(y, pd.Series):
            y = y.values
        
        X_scaled = self.scaler.fit_transform(X)
        
        scores = cross_val_score(
            self.model, X_scaled, y, cv=cv, 
            scoring='neg_root_mean_squared_error'
        )
        
        return {
            'mean_rmse': -scores.mean(),
            'std_rmse': scores.std(),
            'scores': -scores
        }
    
    def save(self, path: str):
        """Save the trained model"""
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'model_type': self.model_type,
            'feature_names': self.feature_names,
            'is_fitted': self.is_fitted
        }
        
        joblib.dump(model_data, path)
        logger.info(f"Model saved to {path}")
    
    def load(self, path: str):
        """Load a trained model"""
        model_data = joblib.load(path)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.model_type = model_data['model_type']
        self.feature_names = model_data['feature_names']
        self.is_fitted = model_data['is_fitted']
        
        logger.info(f"Model loaded from {path}")


if __name__ == "__main__":
    # Test the demand forecaster
    from data_processor import DataProcessor
    
    logger.info("Testing Demand Forecaster...")
    
    # Load and prepare data
    processor = DataProcessor()
    processor.load_data()
    processor.preprocess_order_data()
    
    X, y = processor.prepare_demand_features()
    
    if X is not None and len(X) > 0:
        # Train model
        forecaster = DemandForecaster(model_type='random_forest')
        metrics = forecaster.train(X, y)
        
        print("\nModel Performance:")
        for metric, value in metrics.items():
            print(f"{metric}: {value:.4f}")
        
        # Feature importance
        importance = forecaster.get_feature_importance()
        if importance is not None:
            print("\nFeature Importance:")
            print(importance.head(10))
        
        # Test prediction
        test_features = X.iloc[:5]
        predictions = forecaster.predict(test_features)
        print("\nSample Predictions:")
        for i, pred in enumerate(predictions):
            print(f"  Sample {i+1}: {pred:.2f} (actual: {y.iloc[i]:.2f})")
        
        # Save model
        output_dir = Path("trained_models")
        output_dir.mkdir(exist_ok=True)
        forecaster.save(output_dir / "demand_forecaster.pkl")
    else:
        print("No data available for training")