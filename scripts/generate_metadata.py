import json
import requests
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# --- Configuration ---
SOURCE_JSON_PATH = '../emojis.json' # Path relative to the script location
OUTPUT_JSON_PATH = '../emojis-expanded.json' # Output file
OLLAMA_API_URL = 'http://localhost:11434/api/generate' # Default Ollama endpoint
OLLAMA_MODEL = 'llama3' # Change if you downloaded a different model (e.g., 'phi3', 'mistral')
MAX_WORKERS = 4 # Number of parallel requests to Ollama (adjust based on your system)
REQUEST_TIMEOUT = 60 # Seconds to wait for Ollama response
RETRY_ATTEMPTS = 2 # Number of retries on failure
RETRY_DELAY = 5 # Seconds to wait before retry

# --- Helper Functions ---

def get_llm_response(emoji_data):
    """Sends a request to the Ollama API for a single emoji and returns the parsed JSON response."""
    emoji_char = emoji_data.get('emoji', '')
    emoji_name = emoji_data.get('name', '')

    if not emoji_char or not emoji_name:
        return None # Skip if essential data is missing

    prompt = f"""
Analyze the following emoji:
Emoji: {emoji_char}
Name: {emoji_name}

Generate metadata in JSON format including these fields ONLY:
- keywords: ["list", "of", "relevant", "keywords", "or", "synonyms", "lowercase"] (max 10)
- emoticons: ["list", "of", "common", "text", "emoticons", "like", ":)", "<3", ":P", "or", "empty_list"] (max 5)
- description: "Short, neutral, semantic description of meaning or typical usage." (1-2 sentences)
- tags: ["list", "of", "broad", "category", "tags", "lowercase"] (max 5, e.g., "face", "emotion", "object", "animal", "food", "flag", "symbol")
- country_code: "2-letter uppercase ISO 3166-1 alpha-2 country code if it's a flag, otherwise null"

Your output MUST be ONLY a valid JSON object enclosed in ```json ... ```, like this:
```json
{{
  "keywords": ["keyword1", "keyword2"],
  "emoticons": [":)", ":-)"],
  "description": "A description.",
  "tags": ["tag1", "tag2"],
  "country_code": "US"
}}
```
Or if not a flag:
```json
{{
  "keywords": ["keyword1", "keyword2"],
  "emoticons": [],
  "description": "A description.",
  "tags": ["tag1", "tag2"],
  "country_code": null
}}
```

Output ONLY the JSON object. Do not include any other text before or after the JSON block.
"""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "format": "json", # Request JSON output directly if model supports it
        "stream": False # We want the full response at once
    }

    for attempt in range(RETRY_ATTEMPTS + 1):
        try:
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=REQUEST_TIMEOUT)
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

            response_text = response.text.strip()

            # Extract JSON from potential markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            # Handle potential escape sequences if necessary (though Ollama with format=json should be clean)
            # response_text = response_text.replace('\\', '\').replace('\"', '"')

            parsed_json = json.loads(response_text.strip())

            # Basic validation of structure
            if all(k in parsed_json for k in ['keywords', 'emoticons', 'description', 'tags', 'country_code']):
                 # Clean up potential LLM errors - ensure lists are lists, country_code is string or null
                parsed_json['keywords'] = [str(kw).lower() for kw in parsed_json.get('keywords', []) if isinstance(kw, str)][:10]
                parsed_json['emoticons'] = [str(em) for em in parsed_json.get('emoticons', []) if isinstance(em, str)][:5]
                parsed_json['description'] = str(parsed_json.get('description', ''))
                parsed_json['tags'] = [str(tag).lower() for tag in parsed_json.get('tags', []) if isinstance(tag, str)][:5]
                cc = parsed_json.get('country_code')
                parsed_json['country_code'] = str(cc).upper() if isinstance(cc, str) and len(cc) == 2 else None
                return parsed_json
            else:
                print(f"\nWarning: Unexpected JSON structure for '{emoji_name}': {response_text}", file=sys.stderr)
                if attempt < RETRY_ATTEMPTS:
                    print(f"Retrying ({attempt + 1}/{RETRY_ATTEMPTS})...", file=sys.stderr)
                    time.sleep(RETRY_DELAY)
                else:
                    return None # Failed after retries

        except requests.exceptions.RequestException as e:
            print(f"\nError connecting to Ollama for '{emoji_name}': {e}", file=sys.stderr)
            if attempt < RETRY_ATTEMPTS:
                print(f"Retrying ({attempt + 1}/{RETRY_ATTEMPTS})...", file=sys.stderr)
                time.sleep(RETRY_DELAY)
            else:
                return None # Failed after retries
        except json.JSONDecodeError as e:
            print(f"\nError decoding JSON response for '{emoji_name}': {e}", file=sys.stderr)
            print(f"Raw response was: {response.text.strip()}", file=sys.stderr)
            # Don't retry on JSON decode error, likely a model issue
            return None
        except Exception as e:
            print(f"\nUnexpected error processing '{emoji_name}': {e}", file=sys.stderr)
            if attempt < RETRY_ATTEMPTS:
                print(f"Retrying ({attempt + 1}/{RETRY_ATTEMPTS})...", file=sys.stderr)
                time.sleep(RETRY_DELAY)
            else:
                return None # Failed after retries

    return None # Should not be reached normally

# --- Main Execution ---

def main():
    # Check if Ollama is running
    try:
        requests.get(OLLAMA_API_URL.replace('/api/generate', ''), timeout=5)
        print(f"Successfully connected to Ollama at {OLLAMA_API_URL.replace('/api/generate', '')}")
    except requests.exceptions.ConnectionError:
        print(f"Error: Could not connect to Ollama at {OLLAMA_API_URL.replace('/api/generate', '')}", file=sys.stderr)
        print("Please ensure Ollama is installed, running, and the model is downloaded.", file=sys.stderr)
        print(f"(e.g., run 'ollama run {OLLAMA_MODEL}' in another terminal)", file=sys.stderr)
        sys.exit(1)

    # Load source emoji data
    script_dir = os.path.dirname(__file__)
    source_path = os.path.join(script_dir, SOURCE_JSON_PATH)
    output_path = os.path.join(script_dir, OUTPUT_JSON_PATH)

    try:
        with open(source_path, 'r', encoding='utf-8') as f:
            emoji_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Source file not found at {source_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {source_path}", file=sys.stderr)
        sys.exit(1)

    # Flatten the emoji list
    all_emojis_original = []
    for category_data in emoji_data.values():
        for subcategory_list in category_data.values():
            all_emojis_original.extend(subcategory_list)

    total_emojis = len(all_emojis_original)
    print(f"Found {total_emojis} emojis to process.")

    enriched_emojis = []
    processed_count = 0
    errors_count = 0

    # Process emojis in parallel
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit all tasks
        futures = {executor.submit(get_llm_response, emoji): emoji for emoji in all_emojis_original}

        # Process completed tasks
        for future in as_completed(futures):
            original_emoji = futures[future]
            emoji_name = original_emoji.get('name', 'Unknown')
            processed_count += 1

            try:
                metadata = future.result()
                if metadata:
                    enriched_emoji_data = {**original_emoji, **metadata} # Merge original and new data
                    enriched_emojis.append(enriched_emoji_data)
                    # Print progress without newline
                    print(f"\rProcessed: {processed_count}/{total_emojis} ({emoji_name}) - Success", end='', flush=True)
                else:
                    errors_count += 1
                    print(f"\rProcessed: {processed_count}/{total_emojis} ({emoji_name}) - Failed to get metadata", end='', flush=True)
                    # Optionally add original emoji even if metadata failed:
                    # enriched_emojis.append(original_emoji)

            except Exception as e:
                errors_count += 1
                print(f"\nError processing future result for '{emoji_name}': {e}", file=sys.stderr)


    print(f"\n--- Processing Complete ---")
    print(f"Successfully enriched: {len(enriched_emojis)}")
    print(f"Failed/Skipped: {errors_count}")

    # Write output file
    print(f"Writing results to {output_path}...")
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(enriched_emojis, f, indent=2, ensure_ascii=False)
        print("Successfully wrote emojis-expanded.json")
    except IOError as e:
        print(f"Error writing output file: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 