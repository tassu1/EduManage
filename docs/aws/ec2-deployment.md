# AWS EC2 Backend Deployment

## Overview

The EduManage backend was deployed and tested on an AWS EC2 instance running Amazon Linux 2023.

The existing frontend is deployed on Vercel and was configured to communicate with the backend running on the EC2 instance.

## Architecture

```text
Vercel Frontend
      |
      | HTTP API Requests
      v
AWS EC2 Instance
      |
      v
Node.js / Express Backend
      |
      v
MongoDB
```

## AWS Configuration

* **Cloud Provider:** AWS
* **Service:** Amazon EC2
* **Operating System:** Amazon Linux 2023
* **Runtime:** Node.js 22
* **Backend:** Node.js / Express
* **Backend Port:** 5000
* **Database:** MongoDB
* **Server Access:** SSH
* **Source Code:** GitHub

## Deployment Process

### 1. Launch EC2 Instance

Created an AWS EC2 instance using Amazon Linux 2023.

The instance was configured with an appropriate security group and an SSH key pair for secure server access.

### 2. Connect to EC2 Using SSH

Connected to the EC2 instance from Windows Command Prompt using the SSH private key.

```bash
ssh -i "edu.pem" ec2-user@<EC2_PUBLIC_IP>
```

Successfully connected to the Amazon Linux 2023 server.

### 3. Install Git

Installed Git on the EC2 instance to retrieve the application source code from GitHub.

```bash
sudo dnf install git -y
```

### 4. Install Node.js

Installed Node.js 22 on the EC2 instance to match the application's runtime environment.

Verified the installation using:

```bash
node -v
npm -v
```

### 5. Clone EduManage

Cloned the EduManage repository from GitHub onto the EC2 instance.

```bash
git clone https://github.com/tassu1/EduManage.git
```

Navigated to the backend directory:

```bash
cd EduManage/backend
```

### 6. Install Backend Dependencies

Installed the required Node.js dependencies:

```bash
npm install
```

### 7. Configure Environment Variables

Configured the backend environment variables directly on the EC2 instance.

The `.env` file contains application configuration such as:

```env
PORT=5000
MONGO_URI=
JWT_SECRET=
OPENROUTER_API_KEY=
```

Sensitive values were kept on the server and were not committed to GitHub.

### 8. Start the Backend

Started the Node.js backend using:

```bash
node server.js
```

The server successfully started on port `5000`.

```text
🚀 Server running on port 5000
```

### 9. Configure EC2 Security Group

Configured the EC2 Security Group to allow inbound traffic to port `5000` so that the backend could be accessed externally for testing.

### 10. Verify Backend Deployment

Accessed the backend through the EC2 public IP:

```text
http://<EC2_PUBLIC_IP>:5000
```

The deployed backend successfully returned:

```text
School Management Backend is running!
```

This confirmed that the Node.js backend was running successfully on AWS EC2 and was accessible externally.

### 11. Connect Vercel Frontend

Updated the frontend environment configuration to use the EC2-hosted backend instead of the previous Render deployment.

The resulting architecture was:

```text
Vercel
  |
  | API Requests
  v
AWS EC2
  |
  v
EduManage Node.js Backend
```

The Vercel frontend successfully communicated with the backend deployed on EC2.

## Result

The EduManage backend was successfully deployed and tested on AWS EC2.

This deployment provided hands-on experience with:

* AWS EC2
* Amazon Linux 2023
* SSH
* Linux server administration
* Git
* Node.js deployment
* Environment configuration
* EC2 Security Groups
* Public API access
* Vercel → EC2 integration

## Security Notes

* SSH private keys are not stored in the repository.
* `.env` files are not committed to GitHub.
* Database credentials and API keys remain private.
* Only required network ports are exposed.
