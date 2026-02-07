"""
Price Optimization Model
Recommends optimal pricing to maximize revenue while maintaining demand
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PriceOptimizer:
    """Machine learning model for price optimization"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.is_fitted = False
        
        # Initialize gradient boosting model
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42
        )
    
    def train(self, X, y):
        """Train the price optimization model"""
        logger.info("Training price optimizer...")
        
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
        
        logger.info(f"Price optimizer trained. Test RMSE: {metrics['test_rmse']:.2f}, R²: {metrics['test_r2']:.3f}")
        
        return metrics
    
    def predict_optimal_price(self, item_features: dict, cost: float = None, 
                             target_margin: float = 0.3):
        """
        Predict optimal price for a menu item
        
        Args:
            item_features: Dictionary with item statistics
            cost: Item cost (for margin calculation)
            target_margin: Target profit margin (0.3 = 30%)
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before making predictions")
        
        # Prepare feature vector
        feature_order = ['total_quantity', 'avg_quantity', 'std_quantity', 'avg_price',
                        'min_price', 'max_price', 'total_revenue', 'num_locations',
                        'popularity_score', 'price_elasticity']
        
        features = np.array([[item_features.get(f, 0) for f in feature_order]])
        
        # Predict optimal price
        predicted_price = self.predict(features)[0]
        
        # Apply margin constraint if cost is provided
        if cost is not None:
            min_price_with_margin = cost * (1 + target_margin)
            predicted_price = max(predicted_price, min_price_with_margin)
        
        # Round to 2 decimal places
        predicted_price = round(predicted_price, 2)
        
        # Calculate potential revenue and profit
        estimated_demand = item_features.get('avg_quantity', 1)
        estimated_revenue = predicted_price * estimated_demand
        estimated_profit = estimated_revenue - (cost if cost else 0) * estimated_demand
        
        return {
            'optimal_price': predicted_price,
            'estimated_demand': round(estimated_demand, 2),
            'estimated_revenue': round(estimated_revenue, 2),
            'estimated_profit': round(estimated_profit, 2) if cost else None,
            'price_elasticity': item_features.get('price_elasticity', 0),
            'popularity_score': item_features.get('popularity_score', 0)
        }
    
    def optimize_menu_prices(self, items_data: list, costs: dict = None, 
                            target_margin: float = 0.3):
        """
        Optimize prices for multiple menu items
        
        Args:
            items_data: List of dictionaries with item features
            costs: Dictionary mapping item_id to cost
            target_margin: Target profit margin
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before making predictions")
        
        recommendations = []
        
        for item in items_data:
            item_id = item.get('menu_item_id')
            cost = costs.get(item_id) if costs else None
            
            recommendation = self.predict_optimal_price(
                item, cost=cost, target_margin=target_margin
            )
            recommendation['menu_item_id'] = item_id
            recommendation['current_price'] = item.get('avg_price', 0)
            recommendation['price_change_pct'] = round(
                ((recommendation['optimal_price'] - recommendation['current_price']) / 
                 recommendation['current_price'] * 100) if recommendation['current_price'] > 0 else 0,
                2
            )
            
            recommendations.append(recommendation)
        
        return recommendations
    
    def simulate_price_changes(self, current_price: float, price_changes: list,
                              demand_elasticity: float = -1.5):
        """
        Simulate the impact of price changes on revenue
        
        Args:
            current_price: Current price of the item
            price_changes: List of price changes to simulate (e.g., [-10, -5, 5, 10])
            demand_elasticity: Price elasticity of demand (negative value)
        """
        results = []
        
        base_demand = 100  # Normalized base demand
        
        for change_pct in price_changes:
            new_price = current_price * (1 + change_pct / 100)
            demand_change = demand_elasticity * (change_pct / 100)
            new_demand = base_demand * (1 + demand_change)
            
            current_revenue = current_price * base_demand
            new_revenue = new_price * new_demand
            revenue_change_pct = ((new_revenue - current_revenue) / current_revenue * 100)
            
            results.append({
                'price_change_pct': change_pct,
                'new_price': round(new_price, 2),
                'demand_change_pct': round(demand_change * 100, 2),
                'new_demand': round(new_demand, 2),
                'current_revenue': round(current_revenue, 2),
                'new_revenue': round(new_revenue, 2),
                'revenue_change_pct': round(revenue_change_pct, 2)
            })
        
        return results
    
    def predict(self, X):
        """Make price predictions"""
        if not self.is_fitted:
            raise ValueError("Model must be trained before making predictions")
        
        # Convert to numpy array if needed
        if isinstance(X, pd.DataFrame):
            X = X.values
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Make predictions
        predictions = self.model.predict(X_scaled)
        
        # Ensure positive prices
        predictions = np.maximum(predictions, 1)
        
        return predictions
    
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
    
    def save(self, path: str):
        """Save the trained model"""
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'is_fitted': self.is_fitted
        }
        
        joblib.dump(model_data, path)
        logger.info(f"Price optimizer saved to {path}")
    
    def load(self, path: str):
        """Load a trained model"""
        model_data = joblib.load(path)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.is_fitted = model_data['is_fitted']
        
        logger.info(f"Price optimizer loaded from {path}")


if __name__ == "__main__":
    # Test the price optimizer
    from data_processor import DataProcessor
    
    logger.info("Testing Price Optimizer...")
    
    # Load and prepare data
    processor = DataProcessor()
    processor.load_data()
    processor.preprocess_order_data()
    
    X, y = processor.prepare_price_features()
    
    if X is not None and len(X) > 0:
        # Train model
        optimizer = PriceOptimizer()
        metrics = optimizer.train(X, y)
        
        print("\nModel Performance:")
        for metric, value in metrics.items():
            print(f"{metric}: {value:.4f}")
        
        # Feature importance
        importance = optimizer.get_feature_importance()
        if importance is not None:
            print("\nFeature Importance:")
            print(importance.head(10))
        
        # Test price optimization
        item_features = {
            'total_quantity': 500,
            'avg_quantity': 10,
            'std_quantity': 3,
            'avg_price': 45.0,
            'min_price': 35.0,
            'max_price': 55.0,
            'total_revenue': 22500,
            'num_locations': 5,
            'popularity_score': 0.75,
            'price_elasticity': -1.2
        }
        
        recommendation = optimizer.predict_optimal_price(
            item_features, cost=25.0, target_margin=0.3
        )
        
        print("\nPrice Optimization Recommendation:")
        for key, value in recommendation.items():
            print(f"  {key}: {value}")
        
        # Test price change simulation
        simulations = optimizer.simulate_price_changes(
            current_price=45.0,
            price_changes=[-20, -10, -5, 5, 10, 20],
            demand_elasticity=-1.2
        )
        
        print("\nPrice Change Simulations:")
        for sim in simulations:
            print(f"  {sim['price_change_pct']:+d}% change: "
                  f"New price: {sim['new_price']}, "
                  f"Revenue change: {sim['revenue_change_pct']:+.1f}%")
        
        # Save model
        output_dir = Path("trained_models")
        output_dir.mkdir(exist_ok=True)
        optimizer.save(output_dir / "price_optimizer.pkl")
    else:
        print("No data available for training")