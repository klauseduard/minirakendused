# Save this as convert_koppen_ascii_to_json.py
import json

input_file = "Koeppen-Geiger-ASCII.txt"
output_file = "koppen_grid_0.5deg.json"

result = {}
with open(input_file, "r") as f:
    for line in f:
        parts = line.strip().split()
        if len(parts) == 3:
            lat, lon, code = parts
            key = f"{lat},{lon}"
            result[key] = code

with open(output_file, "w") as f:
    json.dump(result, f, separators=(',', ':'))
