"""
Menu Item Recommender
Provides item recommendations and identifies cross-selling opportunities
"""

import numpy as np
import pandas as pd
from collections import defaultdict
from itertools import combinations
import joblib
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MenuRecommender:
    """Recommends menu items based on co-occurrence and popularity"""
    
    def __init__(self):
        self.item_cooccurrence = None
        self.item_popularity = None
        self.item_features = None
        self.is_fitted = False
    
    def train(self, transactions):
        """
        Train the recommender using transaction data
        
        Args:
            transactions: List of lists, where each inner list contains menu_item_ids in a transaction
        """
        logger.info("Training menu recommender...")
        
        # Calculate item co-occurrence matrix
        self.item_cooccurrence = defaultdict(lambda: defaultdict(int))
        item_counts = defaultdict(int)
        
        for transaction in transactions:
            # Count items
            for item in transaction:
                item_counts[item] += 1
            
            # Count co-occurrences
            for item1, item2 in combinations(transaction, 2):
                self.item_cooccurrence[item1][item2] += 1
                self.item_cooccurrence[item2][item1] += 1
        
        # Calculate popularity scores
        total_transactions = len(transactions)
        self.item_popularity = {
            item: count / total_transactions 
            for item, count in item_counts.items()
        }
        
        self.is_fitted = True
        logger.info(f"Recommender trained on {total_transactions} transactions, "
                   f"{len(self.item_popularity)} unique items")
        
        return {
            'num_transactions': total_transactions,
            'num_items': len(self.item_popularity),
            'avg_items_per_transaction': sum(len(t) for t in transactions) / total_transactions
        }
    
    def recommend_related_items(self, menu_item_id: int, top_k: int = 5,
                                 min_support: int = 5):
        """
        Get items frequently bought together with the given item
        
        Args:
            menu_item_id: The menu item to get recommendations for
            top_k: Number of recommendations to return
            min_support: Minimum co-occurrence count to consider
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before making recommendations")
        
        if menu_item_id not in self.item_cooccurrence:
            return []
        
        # Get co-occurrence counts
        related_items = self.item_cooccurrence[menu_item_id]
        
        # Filter by minimum support
        related_items = {k: v for k, v in related_items.items() if v >= min_support}
        
        # Sort by co-occurrence count
        sorted_items = sorted(related_items.items(), key=lambda x: x[1], reverse=True)
        
        # Calculate scores (co-occurrence + popularity)
        recommendations = []
        for item_id, cooccurrence_count in sorted_items[:top_k]:
            score = cooccurrence_count + self.item_popularity.get(item_id, 0) * 100
            recommendations.append({
                'menu_item_id': item_id,
                'cooccurrence_count': cooccurrence_count,
                'popularity_score': self.item_popularity.get(item_id, 0),
                'recommendation_score': round(score, 3)
            })
        
        return recommendations
    
    def get_frequent_bundles(self, min_support: float = 0.01, max_bundle_size: int = 3):
        """
        Find frequently occurring item bundles (association rules)
        
        Args:
            min_support: Minimum support threshold (as fraction of transactions)
            max_bundle_size: Maximum number of items in a bundle
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before finding bundles")
        
        bundles = []
        
        # For simplicity, we'll focus on pairs and triples
        # In production, use the Apriori algorithm for larger itemsets
        
        # Get pairs with high support
        item_support = {
            (i1, i2): count
            for i1, cooccurrence in self.item_cooccurrence.items()
            for i2, count in cooccurrence.items()
            if i1 < i2  # Avoid duplicates
        }
        
        total_cooccurrences = sum(item_support.values())
        min_count = min_support * total_cooccurrences
        
        # Filter by minimum support
        item_support = {k: v for k, v in item_support.items() if v >= min_count}
        
        # Sort by support
        sorted_bundles = sorted(item_support.items(), key=lambda x: x[1], reverse=True)
        
        for bundle, support in sorted_bundles:
            bundles.append({
                'items': list(bundle),
                'support': round(support / total_cooccurrences, 4),
                'count': support
            })
        
        return bundles[:20]  # Return top 20 bundles
    
    def get_cross_sell_opportunities(self, menu_item_id: int, top_k: int = 5):
        """
        Identify cross-sell opportunities for a given item
        (items that can be upsold or suggested as add-ons)
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before finding cross-sell opportunities")
        
        related = self.recommend_related_items(menu_item_id, top_k=top_k * 2, min_support=3)
        
        opportunities = []
        for i, rec in enumerate(related[:top_k]):
            # Calculate cross-sell potential
            potential_score = (
                rec['cooccurrence_count'] * 0.6 +
                rec['popularity_score'] * 1000 * 0.4
            )
            
            opportunities.append({
                **rec,
                'cross_sell_potential': round(potential_score, 3),
                'recommendation_type': 'upsell' if i < 2 else 'add-on'
            })
        
        return opportunities
    
    def get_item_statistics(self, menu_item_id: int):
        """Get statistics for a specific menu item"""
        if not self.is_fitted:
            raise ValueError("Model must be trained before getting statistics")
        
        if menu_item_id not in self.item_popularity:
            return None
        
        # Get related items
        related = self.recommend_related_items(menu_item_id, top_k=10, min_support=1)
        
        return {
            'menu_item_id': menu_item_id,
            'popularity_score': self.item_popularity[menu_item_id],
            'num_related_items': len(related),
            'top_related_items': related[:5],
            'is_popular': self.item_popularity[menu_item_id] > 0.1
        }
    
    def recommend_items_for_order(self, current_order: list, top_k: int = 5):
        """
        Recommend additional items for a current order based on what's already in it
        
        Args:
            current_order: List of menu_item_ids already in the order
            top_k: Number of recommendations
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before making recommendations")
        
        if not current_order:
            # Return most popular items
            sorted_items = sorted(self.item_popularity.items(), 
                                  key=lambda x: x[1], reverse=True)
            return [
                {'menu_item_id': item_id, 'score': score, 'reason': 'popular'}
                for item_id, score in sorted_items[:top_k]
            ]
        
        # Aggregate recommendations from all items in current order
        recommendation_scores = defaultdict(float)
        
        for item_id in current_order:
            related = self.recommend_related_items(item_id, top_k=top_k * 2, min_support=2)
            for rec in related:
                # Don't recommend items already in the order
                if rec['menu_item_id'] not in current_order:
                    recommendation_scores[rec['menu_item_id']] += rec['recommendation_score']
        
        # Sort and return top recommendations
        sorted_recommendations = sorted(recommendation_scores.items(), 
                                       key=lambda x: x[1], reverse=True)
        
        return [
            {'menu_item_id': item_id, 'score': round(score, 3), 'reason': 'frequently_bought_together'}
            for item_id, score in sorted_recommendations[:top_k]
        ]
    
    def get_menu_insights(self):
        """Get overall insights about the menu"""
        if not self.is_fitted:
            raise ValueError("Model must be trained before getting insights")
        
        # Sort items by popularity
        sorted_items = sorted(self.item_popularity.items(), 
                              key=lambda x: x[1], reverse=True)
        
        # Calculate statistics
        popularity_scores = list(self.item_popularity.values())
        
        return {
            'total_unique_items': len(self.item_popularity),
            'top_popular_items': [
                {'menu_item_id': item_id, 'popularity_score': score}
                for item_id, score in sorted_items[:10]
            ],
            'avg_popularity': np.mean(popularity_scores),
            'median_popularity': np.median(popularity_scores),
            'std_popularity': np.std(popularity_scores)
        }
    
    def save(self, path: str):
        """Save the trained recommender"""
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")
        
        model_data = {
            'item_cooccurrence': dict(self.item_cooccurrence),
            'item_popularity': self.item_popularity,
            'is_fitted': self.is_fitted
        }
        
        joblib.dump(model_data, path)
        logger.info(f"Recommender saved to {path}")
    
    def load(self, path: str):
        """Load a trained recommender"""
        model_data = joblib.load(path)
        
        self.item_cooccurrence = defaultdict(lambda: defaultdict(int), model_data['item_cooccurrence'])
        self.item_popularity = model_data['item_popularity']
        self.is_fitted = model_data['is_fitted']
        
        logger.info(f"Recommender loaded from {path}")


if __name__ == "__main__":
    # Test the recommender
    from data_processor import DataProcessor
    
    logger.info("Testing Menu Recommender...")
    
    # Load and prepare data
    processor = DataProcessor()
    processor.load_data()
    processor.preprocess_order_data()
    
    transactions = processor.create_transaction_matrix()
    
    if transactions is not None and len(transactions) > 0:
        # Train recommender
        recommender = MenuRecommender()
        metrics = recommender.train(transactions)
        
        print("\nTraining Metrics:")
        for metric, value in metrics.items():
            print(f"{metric}: {value}")
        
        # Get menu insights
        insights = recommender.get_menu_insights()
        print("\nMenu Insights:")
        print(f"Total unique items: {insights['total_unique_items']}")
        print(f"Average popularity: {insights['avg_popularity']:.4f}")
        print("\nTop 5 Popular Items:")
        for item in insights['top_popular_items'][:5]:
            print(f"  Item {item['menu_item_id']}: {item['popularity_score']:.4f}")
        
        # Get frequent bundles
        bundles = recommender.get_frequent_bundles(min_support=0.02)
        print("\nTop 5 Frequent Bundles:")
        for bundle in bundles[:5]:
            print(f"  Items {bundle['items']}: support={bundle['support']:.4f}, count={bundle['count']}")
        
        # Test item recommendations
        if len(insights['top_popular_items']) > 0:
            test_item = insights['top_popular_items'][0]['menu_item_id']
            related = recommender.recommend_related_items(test_item, top_k=5)
            print(f"\nRelated items for item {test_item}:")
            for rec in related:
                print(f"  Item {rec['menu_item_id']}: score={rec['recommendation_score']:.3f}, "
                      f"co-occurrence={rec['cooccurrence_count']}")
        
        # Test order recommendations
        test_order = [test_item]
        recommendations = recommender.recommend_items_for_order(test_order, top_k=5)
        print(f"\nRecommendations for order {test_order}:")
        for rec in recommendations:
            print(f"  Item {rec['menu_item_id']}: score={rec['score']:.3f}, reason={rec['reason']}")
        
        # Save model
        output_dir = Path("trained_models")
        output_dir.mkdir(exist_ok=True)
        recommender.save(output_dir / "menu_recommender.pkl")
    else:
        print("No transaction data available for training")