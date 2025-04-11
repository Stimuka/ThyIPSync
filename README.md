This service will reserve ip addresses for your container and add them to a .env file.

You can build the image will the following command.

```
docker compose build
```

And you can deploy the container with the following command.

```
docker compose up -d
```


API call for creating a subnet:
```
curl -X 'POST' \
  'http://localhost:8000/create-subnet' \
  -H 'Content-Type: application/json' \
  -d '{"subnet": "192.168.1.0/24"}'
```

API call for adding a range of ip adresses to the subnet:
```
curl -X 'POST' \
  'http://localhost:5000/add-range' \
  -H 'Content-Type: application/json' \
  -d '{
    "subnet": "192.168.1.0/24",
    "start_ip": "192.168.1.49",
    "end_ip": "192.168.1.52"
}'
```

API call to make an ip reservation:
```
curl -X 'GET' \
  'http://localhost:5000/next-ip?name=<service>&subnet=192.168.1.0/24'
```

API call to release an ip address:
```
curl -X 'DELETE' \
  'http://localhost:5000/ip?name=<service>&subnet=192.168.1.0/24'
```
