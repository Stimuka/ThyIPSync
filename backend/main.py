import os
import json
import ipaddress
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Initialisatie van de FastAPI applicatie
app = FastAPI()

# Stel het pad in voor het JSON bestand
FILE_PATH = "/data/ipam.json"  # Dit pad is voor de container

# Stel CORS in voor de applicatie
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Functie om de gegevens te laden
def load_data():
    if not os.path.exists(FILE_PATH):
        # Maak bestand aan als het nog niet bestaat
        with open(FILE_PATH, "w") as f:
            json.dump({"subnets": {}}, f, indent=2)
        return {"subnets": {}}
    with open(FILE_PATH, "r") as f:
        return json.load(f)

# Functie om de data op te slaan
def save_data(data):
    with open(FILE_PATH, "w") as f:
        json.dump(data, f, indent=2)

# Model voor het toevoegen van een IP-range
class RangeRequest(BaseModel):
    subnet: str
    start_ip: str
    end_ip: str

# Functie om het IP-adres vrij te geven
@app.delete("/ip")
def release_ip(subnet: str, name: str):
    data = load_data()  # Laad de gegevens uit je bestand

    # Controleer of het subnet bestaat
    if subnet not in data["subnets"]:
        raise HTTPException(status_code=404, detail="Subnet not found")

    subnet_data = data["subnets"][subnet]

    # Controleer of het naam/IP-koppel bestaat in de toegewezen lijst
    if name not in subnet_data["allocated"]:
        raise HTTPException(status_code=404, detail="IP not found for this name")

    # Haal het toegewezen IP op en verwijder het uit de toegewezen lijst
    ip_to_remove = subnet_data["allocated"].pop(name)
    
    # Voeg het IP terug in de pool
    subnet_data["pool"].append(ip_to_remove["ip"])

    # Sorteer de pool op IP-adres
    subnet_data["pool"] = sorted(subnet_data["pool"], key=lambda ip: ipaddress.IPv4Address(ip))

    save_data(data)
    return {"detail": f"Released IP {ip_to_remove['ip']} and returned it to the pool"}

# Functie om de volgende IP uit een subnet te halen
@app.get("/next-ip")
def get_next_ip(name: str, subnet: str):
    data = load_data()
    if subnet not in data["subnets"]:
        raise HTTPException(status_code=404, detail="Subnet not found")
    subnet_data = data["subnets"][subnet]
    if name in subnet_data["allocated"]:
        return subnet_data["allocated"][name]
    if not subnet_data["pool"]:
        raise HTTPException(status_code=400, detail="IP pool exhausted")
    ip = subnet_data["pool"].pop(0)
    mac = generate_mac(ip)
    subnet_data["allocated"][name] = {"ip": ip, "mac": mac}
    save_data(data)
    return {"ip": ip, "mac": mac}

# Route om een IP-range toe te voegen aan een subnet
@app.post("/add-range")
def add_ip_range(request: RangeRequest):
    subnet = request.subnet
    start_ip = request.start_ip
    end_ip = request.end_ip

    # Valideer het subnet
    data = load_data()
    if subnet not in data["subnets"]:
        raise HTTPException(status_code=404, detail="Subnet not found")

    # Zet de IP-range om naar ipaddress objecten
    try:
        start_ip_obj = ipaddress.IPv4Address(start_ip)
        end_ip_obj = ipaddress.IPv4Address(end_ip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid IP address: {e}")

    # Controleer of het eind-IP groter is dan het start-IP
    if start_ip_obj > end_ip_obj:
        raise HTTPException(status_code=400, detail="Start IP cannot be greater than End IP")

    # Voeg IP's toe aan de pool zonder dubbele waarden
    subnet_data = data["subnets"][subnet]
    current_ip = start_ip_obj

    while current_ip <= end_ip_obj:
        ip_str = str(current_ip)
        if ip_str not in subnet_data["pool"]:  # Voeg alleen toe als het nog niet in de pool staat
            subnet_data["pool"].append(ip_str)
        current_ip += 1

    # Sorteer de pool op IP-adres
    subnet_data["pool"] = sorted(subnet_data["pool"], key=lambda ip: ipaddress.IPv4Address(ip))

    save_data(data)
    return {"detail": f"Added IP range {start_ip} - {end_ip} to subnet {subnet}"}

# Route om een subnet aan te maken
class SubnetRequest(BaseModel):
    subnet: str

@app.post("/create-subnet")
def create_subnet(request: SubnetRequest):
    data = load_data()
    subnet = request.subnet
    if subnet in data["subnets"]:
        raise HTTPException(status_code=400, detail="Subnet already exists")
    data["subnets"][subnet] = {"allocated": {}, "pool": []}
    save_data(data)
    return {"detail": f"Subnet {subnet} created"}

# Hulpfunctie om een MAC-adres te genereren
def generate_mac(ip: str) -> str:
    parts = ip.split(".")
    return f"02:42:{int(parts[0]):02x}:{int(parts[1]):02x}:{int(parts[2]):02x}:{int(parts[3]):02x}"

@app.get("/subnets")
def get_subnets():
    data = load_data()
    return list(data["subnets"].keys())

@app.get("/subnet/{subnet:path}")
def get_subnet_details(subnet: str):
    data = load_data()
    if subnet not in data["subnets"]:
        raise HTTPException(status_code=404, detail="Subnet not found")

    subnet_data = data["subnets"][subnet]
    allocated = subnet_data["allocated"]
    pool = subnet_data["pool"]

    used = [{"name": name, "ip": details["ip"], "mac": details["mac"]} for name, details in allocated.items()]
    return {
        "subnet": subnet,
        "used": used,
        "free": pool
    }
