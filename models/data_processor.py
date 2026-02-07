"""
Data Processor Module
Handles loading, cleaning, and preprocessing of data for ML models
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataProcessor:
    """Process and prepare data for ML model training and inference"""
    
    def __init__(self, data_dir: str = "../data"):
        self.data_dir = Path(data_dir)
        self.order_items = None
        self.menu_items = None
        self.payments = None
        self.items = None
        self.most_ordered = None
        
    def load_data(self):
        """Load all necessary CSV files"""
        logger.info("Loading data files...")
        
        # Load Part 1 data
        try:
            self.order_items = pd.read_csv(
                self.data_dir / "Menu Engineering Part 1" / "fct_order_items.csv",
                low_memory=False
            )
            logger.info(f"Loaded fct_order_items.csv: {len(self.order_items)} rows")
        except Exception as e:
            logger.warning(f"Could not load fct_order_items.csv: {e}")
        
        try:
            payments_path1 = self.data_dir / "Menu Engineering Part 1" / "fct_payments_part1.csv"
            if payments_path1.exists():
                self.payments = pd.read_csv(payments_path1, low_memory=False)
                logger.info(f"Loaded fct_payments_part1.csv: {len(self.payments)} rows")
        except Exception as e:
            logger.warning(f"Could not load fct_payments_part1.csv: {e}")
        
        # Load Part 2 data
        try:
            self.menu_items = pd.read_csv(
                self.data_dir / "Menu Engineering Part 2" / "dim_menu_items.csv",
                low_memory=False
            )
            logger.info(f"Loaded dim_menu_items.csv: {len(self.menu_items)} rows")
        except Exception as e:
            logger.warning(f"Could not load dim_menu_items.csv: {e}")
        
        try:
            self.items = pd.read_csv(
                self.data_dir / "Menu Engineering Part 2" / "dim_items.csv",
                low_memory=False
            )
            logger.info(f"Loaded dim_items.csv: {len(self.items)} rows")
        except Exception as e:
            logger.warning(f"Could not load dim_items.csv: {e}")
        
        try:
            self.most_ordered = pd.read_csv(
                self.data_dir / "Menu Engineering Part 2" / "most_ordered.csv",
                low_memory=False
            )
            logger.info(f"Loaded most_ordered.csv: {len(self.most_ordered)} rows")
        except Exception as e:
            logger.warning(f"Could not load most_ordered.csv: {e}")
        
        return self
    
    def preprocess_order_data(self):
        """Preprocess order data for ML models"""
        if self.order_items is None:
            logger.warning("No order data available")
            return None
            
        logger.info("Preprocessing order data...")
        
        # Map item_id to menu_item_id for consistency
        if 'item_id' in self.order_items.columns and 'menu_item_id' not in self.order_items.columns:
            self.order_items['menu_item_id'] = self.order_items['item_id']
            logger.info("Mapped item_id to menu_item_id")
        
        # Convert timestamps - try different formats
        if 'created' in self.order_items.columns:
            # Try parsing as datetime string first
            try:
                self.order_items['datetime'] = pd.to_datetime(self.order_items['created'], errors='coerce')
                # If that fails, try as Unix timestamp
                if self.order_items['datetime'].isna().all():
                    self.order_items['datetime'] = pd.to_datetime(
                        pd.to_numeric(self.order_items['created'], errors='coerce'), 
                        unit='s', 
                        errors='coerce'
                    )
            except:
                logger.warning("Could not parse created column as datetime")
        
        # Create temporal features if datetime exists
        if 'datetime' in self.order_items.columns:
            self.order_items['hour'] = self.order_items['datetime'].dt.hour
            self.order_items['day_of_week'] = self.order_items['datetime'].dt.dayofweek
            self.order_items['day_of_month'] = self.order_items['datetime'].dt.day
            self.order_items['month'] = self.order_items['datetime'].dt.month
            self.order_items['is_weekend'] = (self.order_items['day_of_week'] >= 5).astype(int)
            self.order_items['is_lunch'] = ((self.order_items['hour'] >= 11) & (self.order_items['hour'] <= 14)).astype(int)
            self.order_items['is_dinner'] = ((self.order_items['hour'] >= 17) & (self.order_items['hour'] <= 21)).astype(int)
        else:
            # Create dummy temporal features if datetime is missing
            for col in ['hour', 'day_of_week', 'day_of_month', 'month', 'is_weekend', 'is_lunch', 'is_dinner']:
                self.order_items[col] = 0
        
        # Clean numeric columns
        numeric_cols = ['quantity', 'price', 'cost', 'total_amount']
        for col in numeric_cols:
            if col in self.order_items.columns:
                self.order_items[col] = pd.to_numeric(self.order_items[col], errors='coerce')
                self.order_items[col].fillna(0, inplace=True)
        
        # Calculate total revenue per item
        if 'quantity' in self.order_items.columns and 'price' in self.order_items.columns:
            self.order_items['total_revenue'] = self.order_items['quantity'] * self.order_items['price']
        
        # Ensure menu_item_id exists and is numeric
        if 'menu_item_id' not in self.order_items.columns:
            self.order_items['menu_item_id'] = -1
        else:
            self.order_items['menu_item_id'] = pd.to_numeric(self.order_items['menu_item_id'], errors='coerce').fillna(-1)
        
        # Handle missing values
        self.order_items.fillna({
            'title': 'Unknown',
            'place_id': -1
        }, inplace=True)
        
        logger.info(f"Preprocessed order data: {len(self.order_items)} rows")
        logger.info(f"Unique menu items: {self.order_items['menu_item_id'].nunique()}")
        return self.order_items
    
    def aggregate_daily_sales(self):
        """Aggregate sales data by day and menu item"""
        if self.order_items is None:
            self.preprocess_order_data()
            
        if 'datetime' not in self.order_items.columns:
            logger.warning("Cannot aggregate: no datetime column")
            return None
            
        logger.info("Aggregating daily sales...")
        
        daily_sales = self.order_items.groupby([
            self.order_items['datetime'].dt.date,
            'menu_item_id',
            'place_id'
        ]).agg({
            'quantity': 'sum',
            'total_revenue': 'sum',
            'price': 'mean',
            'cost': 'mean'
        }).reset_index()
        
        daily_sales.columns = ['date', 'menu_item_id', 'place_id', 'quantity', 'revenue', 'avg_price', 'avg_cost']
        daily_sales['date'] = pd.to_datetime(daily_sales['date'])
        
        logger.info(f"Daily sales aggregated: {len(daily_sales)} rows")
        return daily_sales
    
    def create_item_features(self):
        """Create item-level features for recommendation and pricing"""
        if self.order_items is None:
            self.preprocess_order_data()
            
        logger.info("Creating item features...")
        
        item_stats = self.order_items.groupby('menu_item_id').agg({
            'quantity': ['sum', 'mean', 'std'],
            'price': ['mean', 'min', 'max'],
            'total_revenue': 'sum',
            'place_id': 'nunique'
        }).reset_index()
        
        item_stats.columns = ['menu_item_id', 'total_quantity', 'avg_quantity', 'std_quantity',
                            'avg_price', 'min_price', 'max_price', 'total_revenue', 'num_locations']
        
        # Calculate price elasticity approximation
        if 'avg_quantity' in item_stats.columns and 'avg_price' in item_stats.columns:
            item_stats['price_elasticity'] = (item_stats['std_quantity'] / (item_stats['avg_quantity'] + 1e-6)) / \
                                           ((item_stats['max_price'] - item_stats['min_price']) / (item_stats['avg_price'] + 1e-6) + 1)
            item_stats['price_elasticity'].fillna(-1.0, inplace=True)
            item_stats['price_elasticity'] = item_stats['price_elasticity'].clip(lower=-5, upper=-0.1)
        
        # Add popularity score
        max_qty = item_stats['total_quantity'].max()
        min_qty = item_stats['total_quantity'].min()
        if max_qty > min_qty:
            item_stats['popularity_score'] = (item_stats['total_quantity'] - min_qty) / (max_qty - min_qty)
        else:
            item_stats['popularity_score'] = 0.5
        
        logger.info(f"Item features created: {len(item_stats)} items")
        return item_stats
    
    def create_transaction_matrix(self):
        """Create transaction matrix for association rule mining"""
        if self.order_items is None:
            self.preprocess_order_data()
            
        logger.info("Creating transaction matrix...")
        
        # Group orders by transaction ID if available
        if 'order_id' in self.order_items.columns:
            transactions = self.order_items.groupby('order_id')['menu_item_id'].apply(list).values
        elif 'place_id' in self.order_items.columns and 'datetime' in self.order_items.columns:
            # Create synthetic transactions based on time windows
            self.order_items['hour_window'] = self.order_items['datetime'].dt.floor('H')
            transactions = self.order_items.groupby(['place_id', 'hour_window'])['menu_item_id'].apply(list).values
        else:
            transactions = self.order_items.groupby('place_id')['menu_item_id'].apply(list).values
        
        logger.info(f"Transaction matrix created: {len(transactions)} transactions")
        return transactions
    
    def get_time_series_data(self, menu_item_id: int = None):
        """Get time series data for forecasting"""
        daily_sales = self.aggregate_daily_sales()
        
        if daily_sales is None:
            return None
            
        if menu_item_id is not None:
            daily_sales = daily_sales[daily_sales['menu_item_id'] == menu_item_id]
        
        # Aggregate across all locations if no specific item
        if menu_item_id is None:
            time_series = daily_sales.groupby('date').agg({
                'quantity': 'sum',
                'revenue': 'sum'
            }).reset_index()
        else:
            time_series = daily_sales.groupby(['date', 'place_id']).agg({
                'quantity': 'sum',
                'revenue': 'sum'
            }).reset_index()
            time_series = time_series.groupby('date').agg({
                'quantity': 'sum',
                'revenue': 'sum'
            }).reset_index()
        
        # Sort by date
        time_series = time_series.sort_values('date')
        
        if len(time_series) == 0:
            logger.warning("No time series data available")
            return None
        
        # Fill missing dates
        date_range = pd.date_range(start=time_series['date'].min(), 
                                   end=time_series['date'].max(), 
                                   freq='D')
        time_series = time_series.set_index('date').reindex(date_range).fillna(0).reset_index()
        time_series.columns = ['date', 'quantity', 'revenue']
        
        logger.info(f"Time series data: {len(time_series)} days")
        return time_series
    
    def prepare_demand_features(self):
        """Prepare features for demand forecasting"""
        if self.order_items is None:
            self.preprocess_order_data()
            
        logger.info("Preparing demand features...")
        
        # Create feature matrix
        feature_cols = ['hour', 'day_of_week', 'day_of_month', 'month', 'is_weekend', 'is_lunch', 'is_dinner']
        target_col = 'quantity'
        
        # Ensure all feature columns exist
        for col in feature_cols:
            if col not in self.order_items.columns:
                self.order_items[col] = 0
        
        # Create X, y
        X = self.order_items[feature_cols].copy()
        y = self.order_items[target_col].copy()
        
        # Add item-specific features if available
        if 'menu_item_id' in self.order_items.columns:
            X['menu_item_id'] = self.order_items['menu_item_id']
        
        if 'price' in self.order_items.columns:
            X['price'] = self.order_items['price']
        
        logger.info(f"Demand features prepared: X={X.shape}, y={y.shape}")
        return X, y
    
    def prepare_price_features(self):
        """Prepare features for price optimization"""
        item_features = self.create_item_features()
        
        if item_features is None:
            return None
            
        logger.info("Preparing price features...")
        
        feature_cols = ['total_quantity', 'avg_quantity', 'std_quantity', 'avg_price', 'min_price', 
                       'max_price', 'total_revenue', 'num_locations', 'popularity_score', 'price_elasticity']
        
        for col in feature_cols:
            if col not in item_features.columns:
                item_features[col] = 0
        
        X = item_features[feature_cols].copy()
        y = item_features['avg_price'].copy()
        
        logger.info(f"Price features prepared: X={X.shape}, y={y.shape}")
        return X, y
    
    def get_summary(self):
        """Get summary statistics of loaded data"""
        summary = {
            'order_items': len(self.order_items) if self.order_items is not None else 0,
            'menu_items': len(self.menu_items) if self.menu_items is not None else 0,
            'payments': len(self.payments) if self.payments is not None else 0,
            'items': len(self.items) if self.items is not None else 0,
            'most_ordered': len(self.most_ordered) if self.most_ordered is not None else 0,
        }
        
        if self.order_items is not None and 'menu_item_id' in self.order_items.columns:
            summary['unique_menu_items'] = self.order_items['menu_item_id'].nunique()
            summary['unique_places'] = self.order_items['place_id'].nunique() if 'place_id' in self.order_items.columns else 0
        
        return summary


if __name__ == "__main__":
    # Test data processor
    processor = DataProcessor()
    processor.load_data()
    processor.preprocess_order_data()
    
    summary = processor.get_summary()
    print("\nData Summary:")
    for key, value in summary.items():
        print(f"{key}: {value}")