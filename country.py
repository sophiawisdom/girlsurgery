import requests
import json
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

def get_player_links(url):
    """
    Fetch the Spotrac page at `url`, parse it with BeautifulSoup,
    and return all player link URLs found within #table td>a.link.
    """
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch {url}: status {response.status_code}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    # Find the container with id="table"
    table_div = soup.select_one("#table")
    if not table_div:
        print(f"Could not find an element with id='table' on {url}")
        return []

    link_elements = table_div.select("td > a.link")
    # Return each <a>'s href attribute
    return [a.get("href") for a in link_elements if a.get("href")]

def find_country(soup):
    """
    Locate <strong> with text 'Country:' and return the text
    of the next sibling <span> if present.
    """
    country_strong = soup.find("strong", text=lambda x: x and "Country:" in x)
    if country_strong:
        country_span = country_strong.find_next_sibling("span")
        if country_span:
            return country_span.get_text(strip=True)
    return None

def process_team(team):
    """
    1) Construct that team's 2025 overview URL.
    2) Fetch & parse all player links.
    3) For each player link, fetch the page, parse salary, country, name.
    4) Return a list of [pay, country, name] for that team.
    """
    base_url = "https://www.spotrac.com/mlb/{team}/overview/_/year/2025/sort/cap_total2"
    url = base_url.format(team=team)
    print(f"Fetching page for: {team} -> {url}")

    # Gather all player links
    links = get_player_links(url)
    print(f"{team=}, found {len(links)} player links")

    team_data = []
    for link in links:
        r = requests.get(link)
        soup = BeautifulSoup(r.text, "html.parser")
        
        # Safely handle the salary extraction
        paragraphs = soup.select("#main div > div > p")
        if len(paragraphs) < 2:
            pay = 0
        else:
            pay_str = paragraphs[1].text.strip("$").replace(",", "")
            pay = int(pay_str) if pay_str.isdigit() else 0
        
        country = find_country(soup)

        # The name logic depends on the page structure; adjust as needed
        text_white_divs = soup.select("#main div.text-white")
        if text_white_divs:
            # Might want to check children or do a more robust approach
            name_children = list(text_white_divs[0].children)
            if len(name_children) > 2:
                name = name_children[2].text.strip()
            else:
                name = "Unknown"
        else:
            name = "Unknown"
        
        team_data.append([pay, country, name])
        print(f"team={team} -> pay={pay} country={country} name={name}")
    
    return team_data

def open_team_pages_requests():
    """
    Use ThreadPoolExecutor to fetch all teams in parallel,
    gather all [pay, country, name] tuples, and write them to out.json.
    """
    teams = [
        'arizona-diamondbacks', 'athletics', 'atlanta-braves',
        'baltimore-orioles', 'boston-red-sox', 'chicago-cubs',
        'chicago-white-sox', 'cincinnati-reds', 'cleveland-guardians',
        'colorado-rockies', 'detroit-tigers', 'houston-astros',
        'kansas-city-royals', 'los-angeles-angels', 'los-angeles-dodgers',
        'miami-marlins', 'milwaukee-brewers', 'minnesota-twins',
        'new-york-mets', 'new-york-yankees', 'philadelphia-phillies',
        'pittsburgh-pirates', 'san-diego-padres', 'san-francisco-giants',
        'seattle-mariners', 'st-louis-cardinals', 'tampa-bay-rays',
        'texas-rangers', 'toronto-blue-jays', 'washington-nationals'
    ]

    # Run the team processing in parallel.
    all_data = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        # `executor.map()` returns results in the same order as teams
        results = list(executor.map(process_team, teams))
    
    # Combine results from all teams
    for team_result in results:
        all_data.extend(team_result)
    
    # Dump to JSON
    with open("out.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    open_team_pages_requests()
