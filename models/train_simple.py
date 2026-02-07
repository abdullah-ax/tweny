"""
Simplified Training Script
Trains ML models with better error handling
"""

import logging
from pathlib import Path
import json
from datetime import datetime
import pandas as pd
import numpy as np

from data_processor import DataProcessor
from demand_forecaster import DemandForecaster
from price_optimizer import PriceOptimizer
from recommender import MenuRecommender
from sales_predictor import SalesPredictor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def train_all_models(data_dir: str = "../data", output_dir: str = "trained_models"):
    """Train all ML models"""
    logger.info("=" * 60)
    logger.info("Starting ML Model Training Pipeline")
    logger.info("=" * 60)
    
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Initialize results dictionary
    results = {
        'training_date': datetime.now().isoformat(),
        'models': {},
        'data_summary': {}
    }
    
    # Step 1: Load and preprocess data
    logger.info("\n[Step 1/6] Loading and preprocessing data...")
    processor = DataProcessor(data_dir=data_dir)
    processor.load_data()
    
    try:
        processor.preprocess_order_data()
        data_summary = processor.get_summary()
        results['data_summary'] = data_summary
        
        logger.info(f"Data loaded successfully:")
        for key, value in data_summary.items():
            logger.info(f"  - {key}: {value}")
    except Exception as e:
        logger.error(f"Error preprocessing data: {e}")
        results['data_summary'] = {'error': str(e)}
    
    # Step 2: Train Demand Forecaster
    logger.info("\n[Step 2/6] Training Demand Forecaster...")
    try:
        X_demand, y_demand = processor.prepare_demand_features()
        
        if X_demand is not None and len(X_demand) > 0:
            demand_forecaster = DemandForecaster(model_type='random_forest')
            demand_metrics = demand_forecaster.train(X_demand, y_demand)
            demand_forecaster.save(output_path / "demand_forecaster.pkl")
            
            results['models']['demand_forecaster'] = {
                'status': 'success',
                'metrics': demand_metrics,
                'model_file': 'demand_forecaster.pkl'
            }
            logger.info("Demand Forecaster trained and saved successfully")
        else:
            results['models']['demand_forecaster'] = {
                'status': 'skipped',
                'reason': 'Insufficient data'
            }
            logger.warning("Demand Forecaster skipped: Insufficient data")
    except Exception as e:
        results['models']['demand_forecaster'] = {
            'status': 'error',
            'error': str(e)
        }
        logger.error(f"Demand Forecaster training failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Step 3: Train Price Optimizer
    logger.info("\n[Step 3/6] Training Price Optimizer...")
    try:
        X_price, y_price = processor.prepare_price_features()
        
        if X_price is not None and len(X_price) > 0:
            price_optimizer = PriceOptimizer()
            price_metrics = price_optimizer.train(X_price, y_price)
            price_optimizer.save(output_path / "price_optimizer.pkl")
            
            results['models']['price_optimizer'] = {
                'status': 'success',
                'metrics': price_metrics,
                'model_file': 'price_optimizer.pkl'
            }
            logger.info("Price Optimizer trained and saved successfully")
        else:
            results['models']['price_optimizer'] = {
                'status': 'skipped',
                'reason': 'Insufficient data'
            }
            logger.warning("Price Optimizer skipped: Insufficient data")
    except Exception as e:
        results['models']['price_optimizer'] = {
            'status': 'error',
            'error': str(e)
        }
        logger.error(f"Price Optimizer training failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Step 4: Train Menu Recommender
    logger.info("\n[Step 4/6] Training Menu Recommender...")
    try:
        transactions = processor.create_transaction_matrix()
        
        if transactions is not None and len(transactions) > 0:
            recommender = MenuRecommender()
            recommender_metrics = recommender.train(transactions)
            recommender.save(output_path / "menu_recommender.pkl")
            
            results['models']['menu_recommender'] = {
                'status': 'success',
                'metrics': recommender_metrics,
                'model_file': 'menu_recommender.pkl'
            }
            logger.info("Menu Recommender trained and saved successfully")
        else:
            results['models']['menu_recommender'] = {
                'status': 'skipped',
                'reason': 'Insufficient data'
            }
            logger.warning("Menu Recommender skipped: Insufficient data")
    except Exception as e:
        results['models']['menu_recommender'] = {
            'status': 'error',
            'error': str(e)
        }
        logger.error(f"Menu Recommender training failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Step 5: Train Sales Predictor
    logger.info("\n[Step 5/6] Training Sales Predictor...")
    try:
        time_series = processor.get_time_series_data()
        
        if time_series is not None and len(time_series) >= 30:
            sales_predictor = SalesPredictor()
            sales_metrics = sales_predictor.train(time_series, target='quantity')
            
            if sales_metrics:
                sales_predictor.save(output_path / "sales_predictor.pkl")
                results['models']['sales_predictor'] = {
                    'status': 'success',
                    'metrics': sales_metrics,
                    'model_file': 'sales_predictor.pkl'
                }
                logger.info("Sales Predictor trained and saved successfully")
            else:
                results['models']['sales_predictor'] = {
                    'status': 'skipped',
                    'reason': 'Insufficient data (need at least 30 days)'
                }
                logger.warning("Sales Predictor skipped: Insufficient data")
        else:
            results['models']['sales_predictor'] = {
                'status': 'skipped',
                'reason': f'Insufficient data (need at least 30 days, got {len(time_series) if time_series else 0})'
            }
            logger.warning("Sales Predictor skipped: Insufficient data")
    except Exception as e:
        results['models']['sales_predictor'] = {
            'status': 'error',
            'error': str(e)
        }
        logger.error(f"Sales Predictor training failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Step 6: Save training results
    logger.info("\n[Step 6/6] Saving training results...")
    results_file = output_path / "training_results.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"Training results saved to {results_file}")
    
    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("Training Pipeline Complete!")
    logger.info("=" * 60)
    
    successful_models = sum(1 for m in results['models'].values() if m['status'] == 'success')
    skipped_models = sum(1 for m in results['models'].values() if m['status'] == 'skipped')
    failed_models = sum(1 for m in results['models'].values() if m['status'] == 'error')
    
    logger.info(f"\nSummary:")
    logger.info(f"  - Successfully trained: {successful_models}")
    logger.info(f"  - Skipped: {skipped_models}")
    logger.info(f"  - Failed: {failed_models}")
    
    logger.info("\nModel Status:")
    for model_name, model_result in results['models'].items():
        status_symbol = "✓" if model_result['status'] == 'success' else "✗" if model_result['status'] == 'error' else "○"
        logger.info(f"  {status_symbol} {model_name}: {model_result['status']}")
        if model_result['status'] == 'error':
            logger.info(f"    Error: {model_result.get('error', 'Unknown')}")
        elif model_result['status'] == 'skipped':
            logger.info(f"    Reason: {model_result.get('reason', 'Unknown')}")
    
    logger.info(f"\nAll trained models saved to: {output_path.absolute()}")
    logger.info("=" * 60)
    
    return results


if __name__ == "__main__":
    import sys
    
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "../data"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "trained_models"
    
    results = train_all_models(data_dir=data_dir, output_dir=output_dir)
    
    successful = sum(1 for m in results['models'].values() if m['status'] == 'success')
    sys.exit(0 if successful > 0 else 1)