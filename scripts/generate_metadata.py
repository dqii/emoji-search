import json
import requests
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from dotenv import load_dotenv
import math

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
SOURCE_JSON_PATH = '../emojis.json' # Path relative to the script location
OUTPUT_JSON_PATH = '../emojis-expanded.json' # Final output file
CACHE_JSON_PATH = 'emojis-cache.json' # Intermediate cache file (in scripts dir)
DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
DEEPSEEK_MODEL = 'deepseek-chat'
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')

BATCH_SIZE = 10 # Number of emojis per API call
MAX_WORKERS = 5 # Number of parallel requests (batches)
REQUEST_TIMEOUT = 120 # Increased timeout for potentially larger batch responses
RETRY_ATTEMPTS = 2
RETRY_DELAY = 5

# --- Helper Functions ---

def load_cache(cache_path):
    """Loads the cache file if it exists."""
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Could not load cache file {cache_path}. Starting fresh. Error: {e}", file=sys.stderr)
            return {}
    return {}

def save_to_cache(cache_path, new_data):
    """Appends new data to the cache file."""
    # This is slightly inefficient (read-modify-write) but safer for concurrent access
    # A more robust solution might use locking or a temporary file
    try:
        current_cache = load_cache(cache_path)
        current_cache.update(new_data)
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(current_cache, f, ensure_ascii=False) # No indent for smaller cache file
    except IOError as e:
        print(f"Error: Could not write to cache file {cache_path}. Error: {e}", file=sys.stderr)

def get_llm_responses_batch(batch_data):
    """Sends a batch request to the DeepSeek API and returns a list of parsed JSON responses."""
    if not DEEPSEEK_API_KEY:
        print("\nError: DEEPSEEK_API_KEY environment variable not set.", file=sys.stderr)
        # Signal failure for the batch
        return None

    # Construct the prompt for the batch
    prompt_parts = ["Analyze the following emojis:"]
    for i, emoji_data in enumerate(batch_data):
        emoji_char = emoji_data.get('emoji', '')
        emoji_name = emoji_data.get('name', '')
        prompt_parts.append(f"{i+1}. Emoji: {emoji_char}, Name: {emoji_name}")

    prompt_parts.append("\nGenerate metadata for EACH emoji in the list above.")
    prompt_parts.append("Your response MUST be a valid JSON list where each element corresponds to the metadata for one emoji in the input list, maintaining the original order.")
    prompt_parts.append("Each element in the list MUST be a JSON object with ONLY these fields:")
    prompt_parts.append("- keywords: [list of relevant keywords/synonyms, lowercase, max 10]")
    prompt_parts.append("- emoticons: [list of common text emoticons like :), <3, :P, or empty list, max 5]")
    prompt_parts.append("- description: Short, neutral, semantic description of meaning/usage (1-2 sentences).")
    prompt_parts.append("- tags: [list of broad category tags, lowercase, max 5, e.g., face, emotion, object, flag]")
    prompt_parts.append("- country_code: 2-letter uppercase ISO 3166-1 alpha-2 country code if it's a flag, otherwise null")
    prompt_parts.append("\nExample of the expected output format (for a batch of 2):")
    prompt_parts.append("[")
    prompt_parts.append("  { \"keywords\": [\"k1\", \"k2\"], \"emoticons\": [\":)\"], \"description\": \"Desc 1\", \"tags\": [\"t1\"], \"country_code\": null },")
    prompt_parts.append("  { \"keywords\": [\"k3\"], \"emoticons\": [], \"description\": \"Desc 2\", \"tags\": [\"t2\", \"flag\"], \"country_code\": \"US\" }")
    prompt_parts.append("]")
    prompt_parts.append("\nOutput ONLY the JSON list. Do not include any other text, markdown formatting, or explanations before or after the list.")

    prompt = "\n".join(prompt_parts)

    headers = {
        'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
        'Content-Type': 'application/json',
    }

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        # "response_format": { "type": "json_object" }, # Removed - expecting a list now
        "stream": False,
        # Increase max_tokens potentially needed for batch response
        "max_tokens": 4096, # Adjust based on BATCH_SIZE and expected metadata size
    }

    batch_info_str = f"batch starting with '{batch_data[0].get('name', 'N/A')}' ({len(batch_data)} items)"

    for attempt in range(RETRY_ATTEMPTS + 1):
        try:
            response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            response_json = response.json()

            if response_json.get("choices") and len(response_json["choices"]) > 0:
                message_content = response_json["choices"][0].get("message", {}).get("content")
                if message_content:
                    response_text = message_content.strip()
                else: response_text = None
            else: response_text = None

            if not response_text:
                print(f"\nWarning: Empty/missing content in DeepSeek response for {batch_info_str}. Raw: {response_json}", file=sys.stderr)
                # Retry logic...
                if attempt < RETRY_ATTEMPTS:
                    print(f"Retrying ({attempt + 1}/{RETRY_ATTEMPTS})...", file=sys.stderr)
                    time.sleep(RETRY_DELAY)
                    continue
                else: return None

            # Try parsing the response_text as a JSON list
            try:
                parsed_list = json.loads(response_text)
                if not isinstance(parsed_list, list):
                    raise TypeError("Response is not a list")

                # Validate list length
                if len(parsed_list) != len(batch_data):
                     print(f"\nError: Length mismatch for {batch_info_str}. Expected {len(batch_data)}, got {len(parsed_list)}. Content: {response_text[:200]}...", file=sys.stderr)
                     # Don't retry length mismatch, likely LLM error
                     return None

                # Validate and clean each item in the list
                validated_metadata_list = []
                valid_batch = True
                for i, item in enumerate(parsed_list):
                    if isinstance(item, dict) and all(k in item for k in ['keywords', 'emoticons', 'description', 'tags', 'country_code']):
                        item['keywords'] = [str(kw).lower() for kw in item.get('keywords', []) if isinstance(kw, str)][:10]
                        item['emoticons'] = [str(em) for em in item.get('emoticons', []) if isinstance(em, str)][:5]
                        item['description'] = str(item.get('description', ''))
                        item['tags'] = [str(tag).lower() for tag in item.get('tags', []) if isinstance(tag, str)][:5]
                        cc = item.get('country_code')
                        item['country_code'] = str(cc).upper() if isinstance(cc, str) and len(cc) == 2 else None
                        validated_metadata_list.append(item)
                    else:
                        print(f"\nWarning: Invalid structure for item {i+1} in {batch_info_str}. Item: {item}", file=sys.stderr)
                        valid_batch = False
                        validated_metadata_list.append(None) # Add placeholder for failed item

                # Decide whether to return partial batch or fail whole batch
                # For simplicity, let's return the list with None for invalid items
                return validated_metadata_list
                # If you want to fail the whole batch on any item error:
                # if not valid_batch:
                #    print(f"\nError: Invalid items found in {batch_info_str}. Skipping batch.", file=sys.stderr)
                #    return None
                # return validated_metadata_list

            except (json.JSONDecodeError, TypeError) as e:
                print(f"\nError: DeepSeek response content was not a valid JSON list for {batch_info_str}: {e}", file=sys.stderr)
                print(f"Raw content snippet: {response_text[:200]}...", file=sys.stderr)
                # Don't retry if it's not JSON
                return None

        except requests.exceptions.RequestException as e:
            print(f"\nError connecting to DeepSeek API for {batch_info_str}: {e}", file=sys.stderr)
            # Retry logic...
            if attempt < RETRY_ATTEMPTS:
                print(f"Retrying ({attempt + 1}/{RETRY_ATTEMPTS})...", file=sys.stderr)
                time.sleep(RETRY_DELAY)
            else: return None
        except Exception as e:
            print(f"\nUnexpected error processing {batch_info_str}: {e}", file=sys.stderr)
            return None # Fail batch on unexpected error

    return None # Failed after retries

# --- Main Execution ---

def main():
    if not DEEPSEEK_API_KEY:
        print("Error: DEEPSEEK_API_KEY environment variable is not set.", file=sys.stderr)
        sys.exit(1)
    print("DEEPSEEK_API_KEY found.")

    script_dir = os.path.dirname(__file__)
    source_path = os.path.join(script_dir, SOURCE_JSON_PATH)
    output_path = os.path.join(script_dir, OUTPUT_JSON_PATH)
    cache_path = os.path.join(script_dir, CACHE_JSON_PATH)

    # Load existing cache
    print(f"Loading cache from {cache_path}...")
    cached_results = load_cache(cache_path)
    print(f"Loaded {len(cached_results)} items from cache.")

    # Load source emoji data
    try:
        with open(source_path, 'r', encoding='utf-8') as f:
            source_emoji_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Source file not found at {source_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {source_path}", file=sys.stderr)
        sys.exit(1)

    # Flatten the source list and filter out cached items
    all_emojis_original = []
    for category_data in source_emoji_data.values():
        for subcategory_list in category_data.values():
            for emoji in subcategory_list:
                 if emoji.get('emoji') not in cached_results:
                     all_emojis_original.append(emoji)

    total_to_process = len(all_emojis_original)
    if total_to_process == 0:
        print("All emojis already processed based on cache.")
        # Proceed to write final output from cache
        final_results = list(cached_results.values())
    else:
        print(f"Found {total_to_process} emojis remaining to process using DeepSeek API ({DEEPSEEK_MODEL}).")

        # Create batches
        batches = [all_emojis_original[i:i + BATCH_SIZE]
                   for i in range(0, total_to_process, BATCH_SIZE)]
        num_batches = len(batches)
        print(f"Processing in {num_batches} batches of size up to {BATCH_SIZE}.")

        processed_items_count = 0 # Count individual items for progress
        errors_batches_count = 0
        newly_cached_data = {} # Collect data processed in this run

        start_time = time.time()

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # Map future back to the original batch data for context
            future_to_batch = {executor.submit(get_llm_responses_batch, batch): batch for batch in batches}

            for future in as_completed(future_to_batch):
                original_batch = future_to_batch[future]
                batch_start_emoji = original_batch[0].get('emoji', '?')
                batch_size = len(original_batch)

                try:
                    metadata_list = future.result()

                    if metadata_list:
                        batch_success_count = 0
                        batch_failure_count = 0
                        batch_new_cache = {}
                        for i, metadata in enumerate(metadata_list):
                            if metadata: # Check if metadata for this item is valid
                                original_emoji = original_batch[i]
                                emoji_char = original_emoji['emoji']
                                enriched_emoji_data = {**original_emoji, **metadata}
                                newly_cached_data[emoji_char] = enriched_emoji_data # Add to run's results
                                batch_new_cache[emoji_char] = enriched_emoji_data # Prep for cache saving
                                batch_success_count += 1
                            else:
                                batch_failure_count += 1

                        if batch_new_cache: # Save successful items from the batch to cache immediately
                            save_to_cache(cache_path, batch_new_cache)

                        status = f"Success ({batch_success_count}/{batch_size})"
                        processed_items_count += batch_success_count # Only count successful items
                        if batch_failure_count > 0:
                            errors_batches_count += 1 # Consider batch partially failed if any item fails
                            status += f", Failed ({batch_failure_count}/{batch_size})"
                    else:
                        errors_batches_count += 1
                        status = f"Failed (Batch error)"
                        processed_items_count += batch_size # Increment by batch size even on failure for progress % calculation

                except Exception as e:
                    errors_batches_count += 1
                    status = f"Failed (Error processing batch result: {e})"
                    processed_items_count += batch_size # Increment progress even on failure
                    print(f"\nError in main loop processing future for batch starting with {batch_start_emoji}: {e}", file=sys.stderr)

                # ETR Calculation (based on processed items)
                elapsed_time = time.time() - start_time
                etr_str = "--:--"
                if processed_items_count > 5:
                    avg_time_per_item = elapsed_time / processed_items_count
                    remaining_items = total_to_process - processed_items_count
                    if remaining_items > 0:
                        estimated_remaining_seconds = int(avg_time_per_item * remaining_items)
                        minutes, seconds = divmod(estimated_remaining_seconds, 60)
                        etr_str = f"{minutes:02d}:{seconds:02d}"

                percentage = (processed_items_count / total_to_process) * 100 if total_to_process > 0 else 100
                print(f"\rProgress: [{percentage:>5.1f}%] ({processed_items_count}/{total_to_process}) ETR: {etr_str} - Last Batch: {batch_start_emoji} ({status})  ", end='', flush=True)


        print(f"\n--- Processing Complete ({total_to_process} requested) ---")
        print(f"Successfully processed items in this run: {len(newly_cached_data)}")
        print(f"Batches with errors/failures: {errors_batches_count}")

        # Combine newly processed data with existing cache for final output
        final_results = list(cached_results.values()) + list(newly_cached_data.values())

    # Write final combined output file
    print(f"Writing final combined results ({len(final_results)} items) to {output_path}...")
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(final_results, f, indent=2, ensure_ascii=False)
        print("Successfully wrote emojis-expanded.json")
    except IOError as e:
        print(f"Error writing final output file: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 