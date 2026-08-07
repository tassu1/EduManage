# EduManage

> A full-stack, multi-school management platform that brings school administration, academics, communication, analytics, and AI-assisted learning into one unified ecosystem.

EduManage is a role-based school management platform designed to connect **Super Admins, School Admins, Teachers, Students, and Parents** through a centralized system.

The platform supports multiple schools while maintaining **school-level data isolation**, secure role-based access, academic management, real-time communication, file uploads, performance analytics, and an AI-powered tutor.

---

# ✨ Features

### 🏢 Multi-School Management

Super Admins can manage multiple schools from a centralized platform.

* Create and manage schools
* Create and assign School Admins
* Monitor individual school statistics
* View platform-wide analytics
* Maintain school-level data isolation

### 🔐 Role-Based Access Control

EduManage provides dedicated permissions for five roles:

| Role             | Responsibilities                                                                        |
| ---------------- | --------------------------------------------------------------------------------------- |
| **Super Admin**  | Manage schools, assign administrators, and monitor platform-wide analytics              |
| **School Admin** | Manage school users, classrooms, timetables, examinations, and school operations        |
| **Teacher**      | Manage attendance, homework, assignments, grades, and communication                     |
| **Student**      | View academic information, submit assignments, track performance, and use the AI Tutor  |
| **Parent**       | Monitor children's attendance, grades, academic progress, and communicate with teachers |

Authentication is handled using **JWT**, password security uses **bcrypt**, and protected resources are controlled through authentication and role-based authorization middleware.

---

# 🏗️ System Architecture

EduManage follows a layered client-server architecture where the React frontend communicates with the Node.js/Express backend through REST APIs and Socket.io.

```text
                                ┌──────────────────────┐
                                │        USERS         │
                                │──────────────────────│
                                │ Super Admin          │
                                │ School Admin         │
                                │ Teacher              │
                                │ Student              │
                                │ Parent               │
                                └──────────┬───────────┘
                                           │
                                           ▼
                          ┌────────────────────────────┐
                          │       React Frontend       │
                          │       + Tailwind CSS       │
                          │────────────────────────────│
                          │ Role-based Dashboards      │
                          │ Academic Management        │
                          │ Analytics                  │
                          │ Communication              │
                          │ AI Tutor                   │
                          └─────────────┬──────────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       │                                 │
                       ▼                                 ▼
              ┌─────────────────┐              ┌─────────────────┐
              │    REST API     │              │    Socket.io    │
              │                 │              │                 │
              │ Express.js      │              │ Real-time Chat  │
              │ JWT Auth        │              │ AI Tutor        │
              │ RBAC Middleware │              │ Typing Status   │
              └────────┬────────┘              └────────┬────────┘
                       │                                │
                       └───────────────┬────────────────┘
                                       │
                                       ▼
                         ┌─────────────────────────┐
                         │        Backend          │
                         │─────────────────────────│
                         │ Controllers             │
                         │ Routes                  │
                         │ Middleware              │
                         │ Business Logic          │
                         │ Socket Handlers         │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────┼──────────────────┐
                    │                 │                  │
                    ▼                 ▼                  ▼
             ┌────────────┐   ┌──────────────┐   ┌──────────────┐
             │  MongoDB   │   │  Cloudinary  │   │ OpenRouter   │
             │ + Mongoose │   │    + Multer  │   │     API      │
             └────────────┘   └──────────────┘   └──────────────┘
```

---

# 🔄 Request & Authorization Flow

Protected requests pass through authentication, authorization, and school/resource validation before reaching the controller.

```text
Client Request
      │
      ▼
┌──────────────────┐
│   JWT Token      │
│   Verification   │
└────────┬─────────┘
         │
         ▼
┌───────────────────┐
│ Authentication    │
│ Middleware        │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Role Authorization│
│ Middleware        │
└─────────┬─────────┘
          │
          ▼
┌──────────────────────┐
│ School / Resource    │
│ Validation            │
└─────────┬────────────┘
          │
          ▼
┌───────────────────┐
│ Controller        │
│ Business Logic    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ MongoDB / Service │
└─────────┬─────────┘
          │
          ▼
       Response
```

This ensures that authenticated users can only access resources permitted by their role and school context.

---

# 🏫 Multi-School Architecture

EduManage is designed around a multi-school structure.

```text
                         ┌──────────────────┐
                         │    SUPER ADMIN   │
                         └────────┬─────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 ▼                ▼                ▼
           ┌──────────┐     ┌──────────┐     ┌──────────┐
           │ School A │     │ School B │     │ School C │
           │ schoolId │     │ schoolId │     │ schoolId │
           └────┬─────┘     └────┬─────┘     └────┬─────┘
                │                │                │
          ┌─────┼─────┐    ┌─────┼─────┐    ┌─────┼─────┐
          ▼     ▼     ▼    ▼     ▼     ▼    ▼     ▼     ▼
        Admin Teacher Student  Admin Teacher Student  ...
```

School-specific resources are associated with their corresponding school.

This provides logical isolation so that users and resources belonging to one school are separated from those belonging to another school.

---

# 👥 Role Architecture

Each role operates within a defined permission boundary.

```text
                         SUPER ADMIN
                              │
                    Platform-wide Control
                              │
             ┌────────────────┴────────────────┐
             │                                 │
      School Management                 Global Analytics
             │
             ▼
        SCHOOL ADMIN
             │
      School-level Control
             │
     ┌───────┼────────┐
     ▼       ▼        ▼
 TEACHERS  STUDENTS  PARENTS
     │       │        │
     ▼       ▼        ▼
 Academic  Learning  Monitoring
Management & AI     & Communication
```

### Super Admin

* Create and manage schools
* Create and assign School Admins
* Monitor platform-wide analytics
* Monitor individual school performance

### School Admin

* Manage teachers, students, and parents
* Create classrooms
* Assign teachers and subjects
* Manage timetables
* Manage examination schedules
* Monitor school analytics
* Publish school notifications

### Teacher

* Manage attendance
* Create homework and assignments
* Review student submissions
* Manage grades
* Communicate with students and parents

### Student

* View timetable and examination schedules
* View and submit assignments
* Track attendance and grades
* Monitor academic performance
* Communicate with teachers
* Interact with the AI Tutor

### Parent

* Monitor children's attendance
* Track academic performance
* View grades
* Communicate with teachers
* Monitor their child's progress

---

# 📚 Academic Workflow

EduManage connects the major academic workflows together.

```text
                    SCHOOL ADMIN
                         │
             ┌───────────┼────────────┐
             ▼           ▼            ▼
         Classroom    Timetable   Exam Schedule
             │
             ▼
          Teacher
             │
       ┌─────┼──────────┐
       ▼     ▼          ▼
 Attendance Homework    Grades
              │
              ▼
       Student Submission
              │
              ▼
           Teacher
              │
              ▼
        Grade / Feedback
              │
              ▼
       Student Performance
              │
              ▼
            Parent
```

This workflow connects classroom management, attendance, assignments, grading, student performance, and parent monitoring.

---

# 📊 Analytics Architecture

EduManage provides analytics at multiple levels of the platform.

```text
Attendance ───────┐
                  │
Grades ───────────┤
                  │
Classrooms ───────┤
                  │
Students ─────────┤
                  ▼
          MongoDB Queries /
             Aggregations
                  │
                  ▼
            Analytics
                  │
       ┌──────────┼───────────┐
       ▼          ▼           ▼
 Super Admin   School       Student
  Analytics   Analytics    Analytics
                              │
                              ▼
                           Parent
                           Monitoring
```

### Super Admin Analytics

* Total students
* Teacher and staff statistics
* Classroom statistics
* Attendance performance
* Academic performance
* School-level comparisons

### School Analytics

* Student enrollment
* Classroom statistics
* Attendance performance
* Academic performance
* Top-performing students
* School activity

### Student Analytics

Students can monitor:

* Attendance
* Grades
* Academic performance
* Strengths and areas requiring improvement

---

# 💬 Real-Time Communication

EduManage uses **Socket.io** for real-time communication.

```text
              ┌──────────────┐
              │    Teacher   │
              └──────┬───────┘
                     │
                     │
                 Socket.io
                     │
              ┌──────┴───────┐
              │              │
              ▼              ▼
        ┌──────────┐   ┌──────────┐
        │ Student  │   │  Parent  │
        └──────────┘   └──────────┘
```

Real-time functionality includes:

* Teacher ↔ Student communication
* Teacher ↔ Parent communication
* Messaging
* Typing indicators
* AI Tutor interaction
* AI response/loading states

---

# 🤖 AI Tutor Architecture

EduManage includes an AI-powered conversational tutor for students using the **OpenRouter API**.

The backend is designed around configurable AI models, allowing the application to switch between models and define fallback models when required.

```text
Student
   │
   │ Question
   ▼
┌──────────────────┐
│   React Chat UI  │
└────────┬─────────┘
         │
         │ Socket.io
         ▼
┌────────────────────────┐
│    AI Socket Handler   │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│   Conversation Context │
│   + Recent Messages    │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│       AI Service       │
│────────────────────────│
│ Configurable Models    │
│ Fallback Models        │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│      OpenRouter API    │
└───────────┬────────────┘
            │
       ┌────┴─────┐
       ▼          ▼
   Primary     Fallback
    Model       Model(s)
       │          │
       └────┬─────┘
            ▼
        AI Response
            │
            ▼
         Socket.io
            │
            ▼
          Student
```

### Model Flexibility

Using OpenRouter allows the backend to work with different AI models without tightly coupling the application to a single model.

The architecture supports:

* Configurable AI models
* Model switching
* Fallback models
* Centralized AI integration
* Handling model availability and performance differences

### Conversation Context

Recent messages from a student's AI conversation are retrieved and provided as context to maintain conversational continuity.

```text
Student Question
      +
Recent Conversation History
      ↓
   AI Service
      ↓
Selected Model
      ↓
 OpenRouter
      ↓
 AI Response
      ↓
Conversation History
```

AI conversations are persisted so that relevant learning history can be accessed later.

---

# ☁️ File Upload Architecture

EduManage uses **Multer** for handling multipart uploads and **Cloudinary** for cloud-based file storage.

```text
Student / Teacher
       │
       ▼
   File Upload
       │
       ▼
     Multer
       │
       ▼
   Express API
       │
       ▼
   Cloudinary
       │
       ▼
   File URL
       │
       ▼
    MongoDB
```

This approach keeps uploaded files in cloud storage while storing their references in MongoDB.

---

# 🗄️ Data Model

EduManage uses MongoDB with Mongoose to model the core entities of the platform.

```text
User
 │
 ├── Super Admin
 ├── School Admin
 ├── Teacher
 ├── Student
 └── Parent
       │
       ▼
     School
       │
       ├── Classroom
       │     ├── Teacher
       │     └── Students
       │
       ├── Timetable
       ├── Exam Schedule
       ├── Attendance
       ├── Grade
       ├── Homework
       ├── Homework Submission
       └── Messages
```

### Core Models

* User
* School
* Classroom
* Attendance
* Grade
* Homework
* Homework Submission
* Exam Schedule
* Timetable
* Message

---

# 📁 Project Structure

```text
EduManage/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── socketHandlers/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   └── package.json
│
└── README.md
```

---

# 🛡️ Security & Access Control

EduManage uses multiple layers of access control.

```text
Authentication
      │
      ▼
JWT Verification
      │
      ▼
Role Authorization
      │
      ▼
School Context
      │
      ▼
Resource Access
```

### Security mechanisms

* JWT-based authentication
* bcrypt password hashing
* Role-based authorization middleware
* Protected API routes
* School-level resource validation
* School-aware real-time communication

---

# 🛠️ Tech Stack

| Layer             | Technologies                          |
| ----------------- | ------------------------------------- |
| Frontend          | React, Vite, Tailwind CSS             |
| Backend           | Node.js, Express.js                   |
| API               | REST API                              |
| Real-Time         | Socket.io                             |
| Database          | MongoDB, Mongoose                     |
| Authentication    | JWT                                   |
| Password Security | bcrypt                                |
| File Uploads      | Multer, Cloudinary                    |
| AI Integration    | OpenRouter API                        |
| AI Architecture   | Configurable Models + Fallback Models |

---

# ⚙️ Environment Variables

Create the required environment variables for the backend.

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

OPENROUTER_API_KEY=your_openrouter_api_key

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

> Never commit real credentials, API keys, or secrets to the repository.

---

# 🚀 Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/tassu1/EduManage.git
cd EduManage
```

## 2. Install Backend Dependencies

```bash
cd backend
npm install
```

Configure the backend environment variables and start the development server:

```bash
npm run dev
```

## 3. Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

---

# 🔄 Complete Platform Flow

The following simplified flow represents how the major parts of EduManage work together:

```text
                         ┌─────────────────┐
                         │   SUPER ADMIN   │
                         └────────┬────────┘
                                  │
                         Creates Schools
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  SCHOOL ADMIN   │
                         └────────┬────────┘
                                  │
                    Manages School Resources
                                  │
               ┌──────────────────┼──────────────────┐
               ▼                  ▼                  ▼
          ┌─────────┐        ┌─────────┐        ┌─────────┐
          │ Teacher │        │ Student │        │ Parent  │
          └────┬────┘        └────┬────┘        └────┬────┘
               │                  │                  │
               │                  │                  │
       ┌───────┼────────┐         │          ┌───────┘
       ▼       ▼        ▼         ▼          ▼
 Attendance Homework  Grades   AI Tutor   Monitoring
       │       │        │         │          │
       └───────┴────────┼─────────┴──────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   MongoDB    │
                 └──────────────┘

          Real-Time Communication
                    │
                    ▼
                Socket.io

          File Storage
                    │
                    ▼
                Cloudinary

          AI Processing
                    │
                    ▼
              OpenRouter API
```

---

# 🎯 Project Goals

EduManage was built to bring the major academic and administrative workflows of a school into one connected platform.

The platform focuses on:

* Centralized school management
* Multi-school data isolation
* Secure role-based access
* Academic workflow automation
* Real-time communication
* Student performance tracking
* Cloud-based file management
* AI-assisted learning
* Flexible AI model integration

---

# 🧠 Engineering Highlights

EduManage demonstrates practical implementation of:

* Multi-school architecture
* Role-Based Access Control (RBAC)
* JWT authentication
* RESTful API design
* MongoDB data modeling
* MongoDB aggregation
* Middleware-based authorization
* School-level data isolation
* Real-time communication with Socket.io
* Cloudinary file storage
* Multer-based file handling
* OpenRouter API integration
* Configurable AI models
* AI fallback model architecture
* Role-specific dashboards
* Academic workflow management

---

# 📌 Project Status

EduManage is a full-stack project focused on building a scalable school-management ecosystem using modern web technologies, real-time communication, cloud storage, and flexible AI integration.

---

# 👨‍💻 Author

**Tahseen**

* GitHub: [@tassu1](https://github.com/tassu1)
* Portfolio: [tassu1.vercel.app](https://tassu1.vercel.app/)

---

# 📄 License

This project is intended for educational and portfolio purposes.
