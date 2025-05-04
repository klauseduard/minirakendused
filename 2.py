# Save as update_koppen_json_keys.py
import json

input_file = "gardening_calendar/data/koppen_grid_0.5deg.json"
output_file = "gardening_calendar/data/koppen_grid_0.5deg.json"

# Read the existing JSON
with open(input_file, 'r') as f:
    data = json.load(f)

# Create new dict with space-separated keys
new_data = {}
for key, value in data.items():
    new_key = key.replace(',', ' ')
    new_data[new_key] = value

# Write back to file
with open(output_file, 'w') as f:
    json.dump(new_data, f, separators=(',', ':'))
