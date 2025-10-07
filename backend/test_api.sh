#!/bin/bash

# Test script for the Go MCP API
# Usage: ./test_api.sh
# Make sure the server is running on port 8080

BASE_URL="http://localhost:8080"

echo "🧪 Testing Go MCP API Endpoints"
echo "=================================="

# Test health endpoint
echo "1. Testing Health Check:"
curl -s "$BASE_URL/health" | jq '.' || curl -s "$BASE_URL/health"
echo -e "\n"

# Test login endpoint
echo "2. Testing Login:"
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}')

echo "$TOKEN_RESPONSE" | jq '.' 2>/dev/null || echo "$TOKEN_RESPONSE"

# Extract token for next request
TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.token' 2>/dev/null)
echo -e "\n"

# Test protected endpoint
if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    echo "3. Testing Protected Endpoint (with token):"
    curl -s "$BASE_URL/protected" \
      -H "Authorization: Bearer $TOKEN" | jq '.' || curl -s "$BASE_URL/protected" -H "Authorization: Bearer $TOKEN"
    echo -e "\n"
else
    echo "3. Testing Protected Endpoint (without token):"
    curl -s "$BASE_URL/protected" | jq '.' || curl -s "$BASE_URL/protected"
    echo -e "\n"
fi

# Test users endpoint
echo "4. Testing Get Users:"
curl -s "$BASE_URL/users" | jq '.' || curl -s "$BASE_URL/users"
echo -e "\n"

# Test create user endpoint
echo "5. Testing Create User:"
curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"secret123"}' | jq '.' || \
curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"secret123"}'
echo -e "\n"

echo "✅ API Testing Complete!"
echo "To start the server, run: go run main.go"