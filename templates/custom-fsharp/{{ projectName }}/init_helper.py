import json

filenames = ['./appsettings.json',
             './appsettings.Development.json']

d = {}
for filename in filenames:
    with open(filename, "r") as f:
        pop_data = json.load(f)
        pop_data["urls"] = "http://*:9000"
        d[filename] = pop_data

for k, v in d.items():
    with open(k, "w") as f:
        json.dump(v, f, indent=4)
