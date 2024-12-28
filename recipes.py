import json
import requests
from tqdm import tqdm

headers = {"Authorization": "Bearer USIFSE1jZ0f7japq7RKHPV7JTWFI612qS5"}

response = requests.get("https://us.api.blizzard.com/data/wow/profession/index?namespace=static-us&locale=en_US", headers=headers)
response.raise_for_status()
profession_ids = [prof['id'] for prof in response.json()['professions']]

all_recipe_out = open("all_recipes.jsonl", 'w', encoding='utf-8')

for profession_id in tqdm(profession_ids, desc="Professions"):
    resp = requests.get(f"https://us.api.blizzard.com/data/wow/profession/{profession_id}?namespace=static-us&locale=en_US", headers=headers)
    resp.raise_for_status()
    profession_skill_tiers = resp.json()['skill_tiers']

    for skill_tier in tqdm(profession_skill_tiers, desc="Skill Tiers", leave=False):
        skill_tier_id = skill_tier['id']
        resp_cat = requests.get(
            f"https://us.api.blizzard.com/data/wow/profession/{profession_id}/skill-tier/{skill_tier_id}?namespace=static-us&locale=en_US",
            headers=headers
        )
        resp_cat.raise_for_status()
        recipe_categories = resp_cat.json()['categories']

        for category in tqdm(recipe_categories, desc="Categories", leave=False):
            # Extract all recipe IDs from this category
            recipes = [recipe['id'] for recipe in category['recipes']]

            for recipe_id in tqdm(recipes, desc="Recipes", leave=False):
                resp_recipe = requests.get(
                    f"https://us.api.blizzard.com/data/wow/recipe/{recipe_id}?namespace=static-us&locale=en_US",
                    headers=headers
                )
                resp_recipe.raise_for_status()
                recipe = resp_recipe.json()
                try:
                    if 'crafted_item' not in recipe and "alliance_crafted_item" not in recipe:
                        continue
                    crafted_item = recipe["alliance_crafted_item"] if "alliance_crafted_item" in recipe else recipe['crafted_item']
                    crafted_quantity = recipe['crafted_quantity']['value']
                    reagents = [(reagent['reagent']['id'], reagent['quantity']) for reagent in recipe['reagents']]

                    all_recipe_out.write(json.dumps({
                        "crafted": crafted_item,
                        "quantity": crafted_quantity,
                        "reagents": reagents
                    }) + "\n")
                except:
                    print(f"{resp_recipe.json()=}")
                    raise

all_recipe_out.close()
