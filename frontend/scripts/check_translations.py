import os
import json
import glob

def sync_keys(source, target):
    """
    Recursively sync keys from source dict to target dict.
    If a key in source is missing in target, add it with value from source.
    If both values are dicts, recurse into them.
    Returns (updated_target, missing_count).
    """
    missing_count = 0
    if not isinstance(source, dict):
        return target, 0
    
    if not isinstance(target, dict):
        target = {}
    
    new_target = {}
    for key, source_val in source.items():
        if key not in target:
            new_target[key] = source_val
            missing_count += count_keys(source_val)
        else:
            target_val = target[key]
            if isinstance(source_val, dict):
                new_target[key], sub_count = sync_keys(source_val, target_val if isinstance(target_val, dict) else {})
                missing_count += sub_count
            else:
                new_target[key] = target_val
                
    for key, target_val in target.items():
        if key not in new_target:
            new_target[key] = target_val
            
    return new_target, missing_count

def count_keys(val):
    if isinstance(val, dict):
        return sum(count_keys(v) for v in val.values())
    return 1

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.abspath(os.path.join(current_dir, ".."))
    
    base_dirs = [
        os.path.join(frontend_dir, "src", "i18n", "locales"),
        os.path.join(frontend_dir, "src", "i18n", "locales", "superadmin")
    ]
    
    total_added_across_all = 0
    
    for locale_dir in base_dirs:
        en_path = os.path.join(locale_dir, "en.json")
        if not os.path.exists(en_path):
            print(f"Skipping {locale_dir}: en.json not found")
            continue
            
        with open(en_path, "r", encoding="utf-8") as f:
            en_data = json.load(f)
            
        print(f"\n--- Checking directory: {locale_dir} ---")
        
        json_files = glob.glob(os.path.join(locale_dir, "*.json"))
        for filepath in sorted(json_files):
            filename = os.path.basename(filepath)
            if filename == "en.json":
                continue
                
            with open(filepath, "r", encoding="utf-8") as f:
                target_data = json.load(f)
                
            updated_data, added_count = sync_keys(en_data, target_data)
            
            if added_count > 0:
                print(f"  [{filename}] Found and added {added_count} missing translation key(s).")
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(updated_data, f, ensure_ascii=False, indent=4)
                    f.write("\n")
                total_added_across_all += added_count
            else:
                print(f"  [{filename}] All translations complete! (0 missing keys)")
                
    print(f"\nTotal missing translation keys added across all files: {total_added_across_all}")

if __name__ == "__main__":
    main()
