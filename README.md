# Todo Backend API

A Node.js/Express backend API for a task management application with user authentication and recurring task support.

## Features

- **User Authentication**: Secure signup and login with JWT tokens
- **Password Security**: Bcrypt hashing for encrypted password storage
- **Task Management**: Create, read, update, and delete tasks
- **Recurring Tasks**: Support for daily, weekly, and monthly recurring tasks that automatically create the next instance when completed
- **User-Specific Tasks**: Each task is associated with a specific user
- **Task Filtering**: Filter tasks by recurrence pattern
- **CORS Enabled**: Cross-origin requests supported for frontend integration

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: Bcryptjs
- **Middleware**: CORS, Express JSON parsing

## Project Structure

```
├── config/
│   └── db.js                   # MongoDB connection configuration
├── controllers/
│   ├── authController.js       # Authentication logic (signup, login, getMe)
│   └── taskController.js       # Task CRUD and recurring logic
├── middleware/
│   └── authMiddleware.js       # JWT authentication middleware
├── models/
│   ├── User.js                 # User schema
│   └── Task.js                 # Task schema
├── routes/
│   ├── authRoutes.js           # Authentication endpoints
│   └── taskRoutes.js           # Task management endpoints
├── server.js                   # Main server entry point
├── package.json                # Dependencies and scripts
└── .env                        # Environment variables (not included in repo)
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB instance (local or cloud e.g., MongoDB Atlas)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd todo-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/todo-db
JWT_SECRET=your_super_secret_jwt_key_here
```

4. Start the server:
```bash
npm start
```

The server will run on `http://localhost:5000` (or your specified PORT).

## API Endpoints

### Authentication Routes (`/api/auth`)

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```
**Response** (201):
```json
{ "message": "User created successfully" }
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```
**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: <jwt_token>
```
**Response** (200):
```json
{
  "_id": "user_id",
  "email": "user@example.com",
  "createdAt": "2026-02-21T10:00:00Z",
  "updatedAt": "2026-02-21T10:00:00Z"
}
```

### Task Routes (`/api/tasks`)

All task endpoints require JWT authentication via `Authorization` header.

#### Get All Tasks
```http
GET /api/tasks
Authorization: <jwt_token>
```
**Query Parameters**:
- `recurring` (optional): Filter by recurrence type (`daily`, `weekly`, `monthly`, `none`, or `all`)

**Response** (200):
```json
[
  {
    "_id": "task_id",
    "title": "Complete project",
    "description": "Finish the backend API",
    "completed": false,
    "dueDate": "2026-02-25",
    "recurring": "daily",
    "user": "user_id",
    "createdAt": "2026-02-21T10:00:00Z",
    "updatedAt": "2026-02-21T10:00:00Z"
  }
]
```

#### Create Task
```http
POST /api/tasks
Authorization: <jwt_token>
Content-Type: application/json

{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "dueDate": "2026-02-22",
  "recurring": "weekly"
}
```
**Response** (201): Created task object

#### Update Task
```http
PUT /api/tasks/:id
Authorization: <jwt_token>
Content-Type: application/json

{
  "title": "Updated title",
  "completed": true
}
```
**Response** (200): Updated task object

**Special Behavior When Completing Tasks**:
- **Non-recurring tasks** (`recurring: "none"` or not set): Task is deleted
- **Recurring tasks**: Original task is deleted and a new instance is created with the next due date:
  - **daily**: Due date + 1 day
  - **weekly**: Due date + 7 days
  - **monthly**: Due date + 1 month

#### Delete Task
```http
DELETE /api/tasks/:id
Authorization: <jwt_token>
```
**Response** (200):
```json
{ "message": "Task deleted" }
```

## Database Models

### User Schema
```javascript
{
  email: String (required, unique),
  password: String (hashed, required),
  createdAt: Date,
  updatedAt: Date
}
```

### Task Schema
```javascript
{
  title: String,
  description: String,
  completed: Boolean (default: false),
  dueDate: String,
  recurring: String (values: "daily", "weekly", "monthly", "none"),
  user: ObjectId (reference to User),
  createdAt: Date,
  updatedAt: Date
}
```

## Middleware

### JWT Authentication Middleware
- **File**: `middleware/authMiddleware.js`
- **Purpose**: Validates JWT tokens from the `Authorization` header
- **Usage**: Applied to all task routes and the `/api/auth/me` endpoint
- **Error Handling**: Returns 401 status if token is missing or invalid

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/todo-db` |
| `JWT_SECRET` | Secret key for JWT signing | `your_secret_key_here` |

## Error Handling

The API returns appropriate HTTP status codes:
- `400`: Bad request (invalid credentials, user exists)
- `401`: Unauthorized (missing or invalid token)
- `404`: Resource not found
- `500`: Server error
- `201`: Created (successful resource creation)
- `200`: OK (successful request)

## Development

### Available Scripts
```bash
npm start     # Start the server
npm test      # Run tests (not yet configured)
```

### Useful Tips
- Use Postman or Insomnia to test API endpoints
- Store the JWT token from login and include it in the `Authorization` header for protected routes
- MongoDB should be running before starting the server
- Check console logs for detailed error messages during development

## Future Enhancements

- Add test suite (Jest or Mocha)
- Task categories and tags
- Task priority levels
- Task reminders/notifications
- Subtasks support
- Task sharing between users
- Rate limiting
- Input validation with Joi or Yup
- Task templates for recurring patterns

## License

ISC

## Author

Created as a todo task management backend API.
