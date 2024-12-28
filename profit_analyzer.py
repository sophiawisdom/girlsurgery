import json
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict, deque
import time
from threading import Lock
from tqdm import tqdm

def format_money(copper):
    """Convert copper to gold/silver/copper string"""
    copper = int(copper)
    gold = copper // 10000
    silver = (copper % 10000) // 100
    copper = copper % 100
    return f"{gold}g {silver}s {copper}c"

def calculate_market_price(auctions):
    """Calculate the 10th lowest price point from a list of auctions"""
    if not auctions:
        return None
    
    # For commodities, we need to account for quantity
    price_quantity_pairs = []
    
    for auction in auctions:
        price = auction.get('unit_price', auction.get('buyout', None))
        if price is None:
            continue
        
        quantity = auction['quantity']
        price_quantity_pairs.append((price, quantity))
    
    if not price_quantity_pairs:
        return None
        
    # Sort by price
    price_quantity_pairs.sort(key=lambda x: x[0])
    
    # Find the 10th lowest price point
    accumulated_quantity = 0
    target_quantity = 10
    
    for price, quantity in price_quantity_pairs:
        accumulated_quantity += quantity
        if accumulated_quantity >= target_quantity:
            return price
            
    # If we don't have 10 items total, return None
    return None

class RateLimiter:
    def __init__(self, calls_per_second):
        self.rate = calls_per_second
        self.timestamps = deque()
        self.lock = Lock()
    
    def wait(self):
        with self.lock:
            now = time.time()
            while self.timestamps and self.timestamps[0] < now - 1:
                self.timestamps.popleft()
            
            if len(self.timestamps) >= self.rate:
                sleep_time = self.timestamps[0] - (now - 1)
                if sleep_time > 0:
                    time.sleep(sleep_time)
            
            self.timestamps.append(now)

class ProfitAnalyzer:
    def __init__(self, api_key, rate_limit=60):
        self.headers = {"Authorization": f"Bearer {api_key}"}
        self.rate_limiter = RateLimiter(rate_limit)
        self.item_cache = {}
        self.cache_lock = Lock()
        self.print_lock = Lock()
        self.errors = set()

    def get_sale_price(self, item_id):
        with self.cache_lock:
            if item_id in self.item_cache:
                return self.item_cache[item_id]
            if item_id in self.errors:
                return 0
            
        self.rate_limiter.wait()
        try:
            r = requests.get(
                f"https://us.api.blizzard.com/data/wow/item/{item_id}?namespace=static-us&locale=en_US",
                headers=self.headers
            )
            r.raise_for_status()
            price = r.json()['preview_item']['sell_price']['value']
            
            with self.cache_lock:
                self.item_cache[item_id] = price
            return price
        except requests.exceptions.HTTPError:
            with self.cache_lock:
                self.errors.add(item_id)
            return 0
        except Exception:
            return 0

    def analyze_recipe(self, recipe, auction_prices):
        try:
            crafted_id = recipe['crafted']['id']
            vendor_price = self.get_sale_price(crafted_id) * recipe['quantity']
            
            if vendor_price == 0:
                return

            total_reagent_cost = 0
            all_prices_available = True
            reagent_details = []

            for reagent_id, quantity in recipe['reagents']:
                reagent_id_str = str(reagent_id)
                if reagent_id_str in auction_prices:
                    price = auction_prices[reagent_id_str]
                    cost = price * quantity
                    total_reagent_cost += cost
                    reagent_details.append((reagent_id, quantity, price))
                else:
                    all_prices_available = False
                    break

            if all_prices_available and total_reagent_cost > 0:
                profit = vendor_price - total_reagent_cost
                if profit > 10_000:
                    with self.print_lock:
                        print(f"\nProfitable Recipe Found!")
                        print(f"Item: {recipe['crafted']['name']} (ID: {crafted_id})")
                        print(f"Quantity: {recipe['quantity']}")
                        print(f"Vendor Price: {format_money(vendor_price)}")
                        print(f"Reagent Cost: {format_money(total_reagent_cost)}")
                        print("Reagents:")
                        for reagent_id, quantity, price in reagent_details:
                            total_reagent_price = price * quantity
                            print(f"  - ID {reagent_id}: {quantity} @ {format_money(price)} each = {format_money(total_reagent_price)}")
                        print(f"Profit: {format_money(profit)}")
                        print(f"Profit Margin: {(profit/total_reagent_cost*100):.1f}%")
                        print("-" * 80)

        except Exception as e:
            print(f"Error analyzing recipe for {recipe['crafted']['name']}: {str(e)}")

def process_recipe_batch(analyzer, recipes, auction_prices, pbar):
    for recipe in recipes:
        analyzer.analyze_recipe(recipe, auction_prices)
        pbar.update(1)

def main():
    print("Loading data files...")
    
    # Load recipes
    with open('all_recipes.jsonl', 'r', encoding='utf-8') as f:
        recipes = [json.loads(line) for line in f]

    # Load and process auction data
    with open('commodity_auctions.json', 'r', encoding='utf-8') as f:
        commodity_auctions = json.load(f)
    
    with open('realm_auctions.json', 'r', encoding='utf-8') as f:
        realm_auctions = json.load(f)

    # Group auctions by item ID
    print("Processing auction data...")
    grouped_auctions = defaultdict(list)
    
    # Process commodity auctions
    for auction in tqdm(commodity_auctions, desc="Processing commodity auctions"):
        item_id = str(auction['item']['id'])
        grouped_auctions[item_id].append(auction)
    
    # Process realm auctions - now handling the realm dictionary structure
    for realm_id, realm_data in tqdm(realm_auctions.items(), desc="Processing realm auctions"):
        for auction in realm_data:
            item_id = str(auction['item']['id'])
            grouped_auctions[item_id].append(auction)

    # Calculate market prices
    print("Calculating market prices...")
    auction_prices = {}
    for item_id, auctions in tqdm(grouped_auctions.items(), desc="Calculating prices"):
        price = calculate_market_price(auctions)
        if price is not None:
            auction_prices[item_id] = price

    print(f"Loaded {len(recipes)} recipes and calculated prices for {len(auction_prices)} items")
    print(f"Processed auctions from {len(realm_auctions.items())} realms")
    print("Starting analysis... Will print profitable recipes as they are found.")
    print("-" * 80)

    api_key = "USHG6AUOIpcxAZjFR7jHDvQFrTeBZ7u6dz"
    analyzer = ProfitAnalyzer(api_key)

    batch_size = 50
    recipe_batches = [recipes[i:i + batch_size] for i in range(0, len(recipes), batch_size)]

    with tqdm(total=len(recipes), desc="Analyzing recipes") as pbar:
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(process_recipe_batch, analyzer, batch, auction_prices, pbar)
                for batch in recipe_batches
            ]
            
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    print(f"Batch processing error: {str(e)}")

    print("\nAnalysis complete!")
    print(f"Successfully cached prices for {len(analyzer.item_cache)} items")
    print(f"Failed to load prices for {len(analyzer.errors)} items")
    print(f"Total items with market prices: {len(auction_prices)}")
    print(f"Total realms processed: {realms_processed}")

if __name__ == "__main__":
    main()