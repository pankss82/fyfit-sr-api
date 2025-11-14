FyFit Smart Ring Backend API

💡 Overview

This project is the production-ready Node.js and TypeScript microservice powering the FyFit Smart Ring mobile application. It is designed for security, scalability, and offline-first synchronization, making it an ideal backend for a health and fitness ecosystem.

Key Features

Authentication: Secure user registration & login using JWT and bcrypt hashing.

Data Ingestion: Endpoints for single and batch ingestion of ring data, optimized for secure, offline-first sync from the Flutter mobile app.

Data Persistence: MongoDB backend with robust indexing.

DevOps Ready: Fully Dockerized with internal authentication and health checks.

🚀 Getting Started with Docker

The easiest way to run the entire FyFit stack (API + MongoDB) is using Docker Compose.

Prerequisites

Docker

1. Start the Stack

Run the following command in the root directory where docker-compose.yml is located:

docker compose up -d



2. Access the API

The application will be accessible at:

http://localhost:8080



⚙️ Project Structure

The codebase follows a standard MVC-like structure within src/:

fyfit-smart-ring-backend/
├── src/
│   ├── config/              # Database connection
│   ├── controllers/         # Core business logic (Auth, Ring Data, Health)
│   ├── middleware/          # JWT validation, rate limiting
│   ├── models/              # Mongoose Schemas (User, RingDataPoint)
│   ├── routes/              # API endpoint definitions
│   ├── utils/               # JWT helper functions
│   └── server.js            # Entry point
├── .env                     # Environment variables
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json



Environment Variables (.env)



Variable

Default Value

Description



PORT

8080

Service port



MONGO_URI

mongodb://adminuser:adminpassword@localhost:27017/fyfit_db?authSource=admin

MongoDB connection string



JWT_SECRET

your-super1234567890secret

Secret key for signing JWTs



JWT_EXPIRES_IN

24h

Token expiration time

🔒 Authentication

All critical data endpoints require a valid JWT Bearer Token. Tokens expire after 24 hours.

Authentication Flow

Use the /login or /register endpoint to get a token.

Pass the token in the Authorization header for protected routes:

Authorization: Bearer <token>



📋 API Endpoints

1. Health Check

Checks the service status and MongoDB connection health.

Method

Path

Description

GET

/health

Check service status

Request Example:

curl http://localhost:8080/health



Successful Response:

{
  "status": "UP",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "checks": {
    "mongo": { "healthy": true }
  }
}



2. User Management

Method

Path

Description

POST

/register

Create a new user

POST

/login

Authenticate an existing user

/register Request Example:

curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@fyfit.com",
    "password": "Pass123!",
    "name": "John Doe",
    "deviceId": "RING123"
  }'



/register Successful Response:

{
  "status": "SUCCESS",
  "user": {
    "email": "john@fyfit.com",
    "name": "John Doe",
    "deviceId": "RING123"
  },
  "token": "eyJhbGciOi..."
}



3. Ring Data Ingestion (Authenticated)

Single Data Point

Method

Path

Description

POST

/ring/data

Submit a single data point

/ring/data Request Example:

curl -X POST http://localhost:8080/ring/data \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-12T10:30:00Z",
    "deviceId": "RING123",
    "heartRate": 78,
    "steps": 1234,
    "calories": 89,
    "sleepMinutes": 420,
    "spo2": 98
  }'



Batch Data Sync (Offline-First)

Ideal for syncing a large buffer of data points (up to 1000 records per request). Uses upsert logic: if userId + timestamp combination already exists, the record is updated; otherwise, a new record is inserted.

Method

Path

Description

POST

/ring/data/batch

Submit multiple data points (up to 1000)

/ring/data/batch Response Example:

{
  "status": "SUCCESS",
  "total": 2,
  "inserted": 2,
  "modified": 0,
  "failed": 0
}



💾 MongoDB Models

1. users Collection

Field

Type

Notes

email

String

Unique, lowercase

password

String

Hashed via bcrypt

name

String

User's full name

deviceId

String

Associated Ring device ID

uid

String

Firestore UID for migration/sync (optional)

fcmToken, age, etc.

Mixed

Optional profile fields

createdAt, updatedAt

Date

Timestamps

2. ringdatapoints Collection

This collection is indexed on timestamp for efficient querying.

Field

Type

Notes

userId

ObjectId

Reference to the users collection

deviceId

String

Source device ID

timestamp

Date

Indexed. Used for upsert logic.

heartRate, steps, calories

Number

Core health metrics

sleepMinutes, spo2

Number?

Optional metrics

synced

Boolean

Default: true

createdAt, updatedAt

Date

Timestamps

🛠️ Development Scripts

Command

Description

npm run dev

Starts the service with hot reload for development.

npm run build

Compiles the TypeScript code to JavaScript.

npm start

Runs the compiled service in a production environment.

docker compose up -d

Starts the entire Dockerized stack (API + Mongo).

📊 Performance Metrics

Operation

Average Time

Notes

/health

~8ms

Fast check

/login

~45ms

Includes bcrypt hash comparison

/ring/data

~60ms

Single document insertion

/ring/data/batch (100)

~280ms

Efficient bulkWrite

/ring/data/batch (1000)

~550ms

High-throughput offline sync

🤝 Contributing

We welcome contributions! Please follow these steps:

Fork the repository.

Create your feature branch (git checkout -b feat/feature-name).

Commit your changes (git commit -m "feat: Describe your change").

Push to the branch (git push origin feat/feature-name).

Open a Pull Request.
