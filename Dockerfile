# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]

# requirements.txt
# ---
# fastapi
# uvicorn[standard]

# ipam.json (voorbeeldbestand in ./ipam_data)
# ---
# {
#   "subnet": "192.168.100.0/24",
#   "allocated": {},
#   "pool": [
#     "192.168.100.10",
#     "192.168.100.11",
#     "192.168.100.12",
#     "192.168.100.13",
#     "192.168.100.14"
#   ]
# }
