# Go MCP Backend

A RESTful API backend built with Go, demonstrating the integration of Gin web framework, JWT authentication, and GORM ORM.

## 🚀 Technologies Used

- **Go 1.25.1** - Latest Go version
- **Gin v1.11.0** - High-performance HTTP web framework
- **JWT-Go v3.2.0** - JSON Web Token implementation
- **GORM v1.31.0** - ORM library for Go

## 📁 Project Structure

```
backend/
├── main.go          # Main application file
├── go.mod          # Go modules file
├── go.sum          # Go modules checksums
├── test_api.sh     # API testing script
└── README.md       # This file
```

## 🔧 Installation

1. Make sure Go 1.25.1+ is installed
2. Clone/navigate to this directory
3. Install dependencies:
```bash
go mod download
```

## 🏃‍♂️ Running the Application

```bash
go run main.go
```

The server will start on `http://localhost:8080`

## 📝 API Endpoints

### Health Check
- **GET** `/health` - Check if the server is running
- Response includes server status and library versions

### Authentication
- **POST** `/login` - Authenticate user and receive JWT token
  - Request body: `{"username": "admin", "password": "password"}`
  - Returns JWT token with 24-hour expiration

### Protected Route
- **GET** `/protected` - Requires valid JWT token
  - Header: `Authorization: Bearer <token>`

### User Management
- **GET** `/users` - Get list of users (mock data)
- **POST** `/users` - Create new user (mock implementation)
  - Request body: `{"username": "user", "email": "user@example.com", "password": "secret"}`

## 🧪 Testing

Run the test script to test all endpoints:

```bash
./test_api.sh
```

Or test individual endpoints with curl:

```bash
# Health check
curl http://localhost:8080/health

# Login
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Protected endpoint (replace TOKEN with actual token)
curl http://localhost:8080/protected \
  -H "Authorization: Bearer TOKEN"
```

## 🔒 Authentication

The application uses JWT tokens for authentication:
- Default credentials: `admin` / `password`
- Tokens expire after 24 hours
- Include token in Authorization header: `Bearer <token>`

## 💾 Database

Currently uses mock data. To add database functionality:

1. Install a database driver (e.g., for PostgreSQL):
```bash
go get gorm.io/driver/postgres
```

2. Initialize database connection in main.go:
```go
import "gorm.io/driver/postgres"

dsn := "host=localhost user=gorm password=gorm dbname=gorm port=9920 sslmode=disable"
db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
```

3. Uncomment the database operations in the handlers

## 🛠️ Development

### Adding New Dependencies
```bash
go get package-name
go mod tidy
```

### Building the Application
```bash
go build -o server main.go
./server
```

### Code Structure

- **Models**: User struct with GORM tags
- **Middleware**: JWT authentication middleware
- **Handlers**: HTTP request handlers for each endpoint
- **Routes**: RESTful API routes using Gin router

## 📚 Next Steps

- [ ] Add database integration
- [ ] Implement user registration
- [ ] Add password hashing
- [ ] Create proper error handling
- [ ] Add request validation
- [ ] Implement refresh tokens
- [ ] Add API documentation (Swagger)
- [ ] Add unit tests
- [ ] Add environment configuration
- [ ] Add logging middleware

## 🐛 Known Issues

- Uses hardcoded JWT secret (should be environment variable)
- No password hashing (uses plain text comparison)
- Mock data instead of real database
- No request rate limiting
- No CORS configuration

## 📄 License

This project is for educational/development purposes.