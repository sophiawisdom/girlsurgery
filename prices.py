import json
import requests
from concurrent.futures import ThreadPoolExecutor
from tqdm import tqdm

def get_sale_price(item_id, headers):
    try:
        r = requests.get(
            f"https://us.api.blizzard.com/data/wow/item/{item_id}?namespace=static-us&locale=en_US",
            headers=headers
        )
        r.raise_for_status()
        return r.json()['preview_item']['sell_price']['value']
    except:
        return 0

def process_items(items, headers):
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(get_sale_price, item_id, headers): item_id for item_id in items}
        prices = {}
        
        for future in tqdm(futures):
            item_id = futures[future]
            try:
                price = future.result()
                if price > 0:
                    prices[item_id] = price
            except Exception as e:
                print(f"Error processing item {item_id}: {e}")
                
        return prices

def main():
    API_KEY = "USIFSE1jZ0f7japq7RKHPV7JTWFI612qS5"
    headers = {"Authorization": f"Bearer {API_KEY}"}

    # Load commodity auctions
    with open('commodity_auctions.json', 'r') as f:
        commodities = json.load(f)

    # Extract unique item IDs
    item_ids = set(auction['item']['id'] for auction in commodities)
    print(f"Found {len(item_ids)} unique items")

    # Get vendor prices
    prices = process_items(item_ids, headers)

    # Generate Lua table
    lua_output = "addon.vendorPrices = {\n"
    for item_id, price in sorted(prices.items()):
        lua_output += f"    [{item_id}] = {price},\n"
    lua_output += "}\n"

    with open('vendor_prices.lua', 'w') as f:
        f.write(lua_output)

    print(f"Wrote prices for {len(prices)} items to vendor_prices.lua")

if __name__ == "__main__":
    main()