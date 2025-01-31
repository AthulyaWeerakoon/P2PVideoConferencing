# Peer-to-Peer Video Conferencing

## Project Overview
This project implements a real-time **Peer-to-Peer (P2P) Video Conferencing** application using **WebRTC**. It enables users to communicate via video, audio, and text chat, making it an ideal solution for remote collaboration. The system is designed with a **Node.js backend** for signaling and a **JavaScript frontend**, hosted on **Vercel** and **AWS**.

## Features

### 🔹 Real-Time Communication
- **Video & Audio Streaming:** Direct P2P connections for low-latency communication.
- **Text Chat:** Built-in messaging system with usernames.
- **Media Controls:** Mute/unmute audio and toggle video during calls.

### 🔹 User Controls
- **Create & Join Rooms:** Generate unique room IDs and invite participants.
- **Error Handling:** Clear error messages for missing inputs or invalid rooms.
- **Pause & Resume:** Manage media streams dynamically.

### 🔹 Network & Security
- **STUN Servers:** Uses `stun.l.google.com:19302` for NAT traversal.
- **Secure HTTPS Deployment:** Enables camera and microphone permissions.

## How to Use

### 1️⃣ Creating a Room
1. Enter a **username**.
2. Click **Create Room** to generate a unique **Room ID**.
3. Share the **Room ID** with others to join.

### 2️⃣ Joining a Room
1. Enter a **username**.
2. Input the **Room ID**.
3. Click **Join Room** to connect.

### 3️⃣ Managing Audio & Video
- **Mute/Unmute Audio:** Toggle microphone status.
- **Enable/Disable Video:** Control camera streaming.

### 4️⃣ Using the Chat
- Open chat using the **Chat** button.
- Send and receive messages in real-time.

## System Architecture

### 🔹 Backend (Signaling Server)
- **Built with:** Node.js, Express, Socket.IO.
- **Hosted on:** AWS with HTTPS support.
- **Handles:** Room creation, WebRTC signaling, user events, and chat messaging.

### 🔹 Frontend (Client)
- **Built with:** HTML, CSS, JavaScript.
- **Hosted on:** Vercel.
- **Handles:** UI interactions, WebRTC connections, and messaging.

### 🔹 WebRTC P2P Communication
- **Direct audio/video streaming** between users.
- **STUN/TURN servers** handle network traversal.
- **ICE Candidates** manage connectivity between peers.

## Deployment
- **Frontend:** [Vercel Deployment](https://p2-p-video-conferencing.vercel.app/)
- **Backend:** Hosted on **AWS** with **Docker & GitHub Actions** for CI/CD.

---

🚀 **Experience seamless peer-to-peer video communication!**
