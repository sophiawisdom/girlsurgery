import json
import requests
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor
import time
from collections import deque
from threading import Lock

class RateLimiter:
    def __init__(self, calls_per_second):
        self.rate = calls_per_second
        self.timestamps = deque()
        self.lock = Lock()
    
    def wait(self):
        with self.lock:
            now = time.time()
            
            # Remove timestamps older than 1 second
            while self.timestamps and self.timestamps[0] < now - 1:
                self.timestamps.popleft()
            
            # If we've made too many calls in the last second, wait
            if len(self.timestamps) >= self.rate:
                sleep_time = self.timestamps[0] - (now - 1)
                if sleep_time > 0:
                    time.sleep(sleep_time)
            
            # Add current timestamp
            self.timestamps.append(now)

class WoWRecipeScraper:
    def __init__(self, api_key, rate_limit=60):
        self.headers = {"Authorization": f"Bearer {api_key}"}
        self.rate_limiter = RateLimiter(rate_limit)
        self.base_url = "https://us.api.blizzard.com/data/wow"
    
    def make_request(self, url):
        self.rate_limiter.wait()
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def process_recipe(self, recipe_id):
        try:
            recipe = self.make_request(f"{self.base_url}/recipe/{recipe_id}?namespace=static-us&locale=en_US")
            
            if 'crafted_item' not in recipe and "alliance_crafted_item" not in recipe:
                return None
                
            crafted_item = recipe["alliance_crafted_item"] if "alliance_crafted_item" in recipe else recipe['crafted_item']
            crafted_quantity = recipe['crafted_quantity']['value']
            reagents = [(reagent['reagent']['id'], reagent['quantity']) for reagent in recipe['reagents']]
            
            return {
                "crafted": crafted_item,
                "quantity": crafted_quantity,
                "reagents": reagents
            }
        except Exception as e:
            print(f"Error processing recipe {recipe_id}: {str(e)}")
            return None
    
    def process_skill_tier(self, profession_id, skill_tier):
        skill_tier_id = skill_tier['id']
        try:
            skill_tier_data = self.make_request(
                f"{self.base_url}/profession/{profession_id}/skill-tier/{skill_tier_id}?namespace=static-us&locale=en_US"
            )
            if "categories" not in skill_tier_data:
                print(f"skill tier {skill_tier_id} for {profession_id} doesn't have categories: {skill_tier_data.keys()=}")
                return []
            print(f"{skill_tier_data.keys()=}")
            return [(cat['recipes'], skill_tier_id) for cat in skill_tier_data['categories']]
        except:
            print(f"Error processing skill tier {skill_tier_id} for {profession_id}")
            raise

    def scrape_recipes(self):
        # Get all profession IDs
        professions_data = self.make_request(f"{self.base_url}/profession/index?namespace=static-us&locale=en_US")
        profession_ids = [202, 164, 333, 186, 197, 773, 185, 165, 171, 755]
        
        with open("all_recipes.jsonl", 'w', encoding='utf-8') as output_file:
            with ThreadPoolExecutor(max_workers=10) as executor:
                for profession_id in tqdm(profession_ids, desc="Professions"):
                    # Get profession details
                    profession_data = self.make_request(
                        f"{self.base_url}/profession/{profession_id}?namespace=static-us&locale=en_US"
                    )
                    
                    # Process skill tiers
                    skill_tier_futures = [
                        executor.submit(self.process_skill_tier, profession_id, skill_tier)
                        for skill_tier in profession_data['skill_tiers']
                    ]
                    
                    # Collect all recipe IDs
                    recipe_ids = []
                    for future in skill_tier_futures:
                        for recipes, _ in future.result():
                            recipe_ids.extend(recipe['id'] for recipe in recipes)
                    
                    # Process recipes in parallel
                    recipe_futures = [
                        executor.submit(self.process_recipe, recipe_id)
                        for recipe_id in recipe_ids
                    ]
                    
                    # Write results as they complete
                    for future in tqdm(recipe_futures, desc="Recipes", leave=False):
                        result = future.result()
                        if result:
                            output_file.write(json.dumps(result) + "\n")
                            output_file.flush()

def main():
    api_key = "USHG6AUOIpcxAZjFR7jHDvQFrTeBZ7u6dz"
    scraper = WoWRecipeScraper(api_key, rate_limit=60)
    scraper.scrape_recipes()

if __name__ == "__main__":
    main()