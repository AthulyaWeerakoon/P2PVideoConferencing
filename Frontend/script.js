const socket = io('http://hivesphere.software:20169');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomIdInput = document.getElementById('roomIdInput');
const usernameInput = document.getElementById('usernameInput');
const controlsDiv = document.getElementById('controls');
const infoDiv = document.getElementById('info');
const errorDiv = document.getElementById('error');
const remoteVideos = document.getElementById('remoteVideos');
const muteAudio = document.getElementById('muteAudio');
const turnOffVideo = document.getElementById('turnOffVideo');
const chat = document.getElementById('chat');
const messageContainer = document.getElementById('messageContainer');
const chatSend = document.getElementById('chatSend');
const chatInput = document.getElementById('chatInput');

let localStream;
const peerConnections = {}; // Map of socketId -> RTCPeerConnection
const userNames = {}; // Map of socketId -> username
let currentRoomId;

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

// UI response handling
document.getElementById('openChat').addEventListener('click', () => {
  document.getElementById('chat').style.display = 'flex';
});

document.getElementById('chatClose').addEventListener('click', () => {
  document.getElementById('chat').style.display = 'none';
});

document.getElementById('errorClose').addEventListener('click', () => {
  document.getElementById('errorPopup').style.display = 'none';
});

document.getElementById('errorPopup').addEventListener('click', (e) => {
  if (e.target.id === 'errorPopup') {
    document.getElementById('errorPopup').style.display = 'none';
  }
});

function showError(message) {
  document.getElementById('error').innerText = message;
  document.getElementById('errorPopup').style.display = 'flex';
}

// Get user media (camera and microphone)
async function getLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch (error) {
    console.error('Error accessing media devices.', error);
    showError('Error accessing media devices.');
  }
}

getLocalStream();

// Event listeners for creating and joining rooms
createRoomBtn.addEventListener('click', () => {
  const username = usernameInput.value;
  if (!username) {
    showError('Please enter a username');
    return;
  }
  socket.emit('create-room', { username });
  document.getElementById('videos').style.display = 'flex';
});

joinRoomBtn.addEventListener('click', () => {
  const username = usernameInput.value;
  const roomId = roomIdInput.value;
  if (!username || !roomId) {
    showError('Please enter a username and room ID');
    return;
  }
  socket.emit('join-room', { roomId, username });
  document.getElementById('videos').style.display = 'flex';
});

// Server event handlers
socket.on('room-created', ({ roomId }) => {
  infoDiv.innerText = `Room created with ID: ${roomId}`;
  controlsDiv.style.display = 'none';
  currentRoomId = roomId;
  console.log(`Joined Room: ${roomId}`);
});

socket.on('room-joined', ({ roomId, users }) => {
  infoDiv.innerText = `Joined Room: ${roomId}`;
  controlsDiv.style.display = 'none';
  currentRoomId = roomId;
  console.log(`Joined Room: ${roomId}`);
  // Update usernames of existing users
  users.forEach(({ socketId, username }) => {
    userNames[socketId] = username;
  });
});

socket.on('room-full', () => {
  showError("Room is full or doesn't exist. Failed to join");
});

socket.on('user-joined', ({ socketId, username }) => {
  console.log(`User joined: ${socketId}`);
  userNames[socketId] = username;

  const peerConnection = getOrCreatePeerConnection(socketId);

  // Create an offer for the new peer
  peerConnection.createOffer().then((offer) => {
    return peerConnection.setLocalDescription(offer);
  }).then(() => {
    socket.emit('signal', {
      roomId: currentRoomId,
      data: { sdp: peerConnection.localDescription },
      to: socketId,
    });
  });
});

socket.on('user-left', ({ socketId }) => {
  console.log(`User left: ${socketId}`);
  const videoContainer = document.getElementById(socketId);
  if (videoContainer) {
    videoContainer.remove();
  }
  delete userNames[socketId];
  if (peerConnections[socketId]) {
    peerConnections[socketId].close();
    delete peerConnections[socketId];
  }
});

socket.on('signal', async ({ sender, data }) => {
  const peerConnection = getOrCreatePeerConnection(sender);

  if (data.sdp) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    if (data.sdp.type === 'offer') {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('signal', {
        roomId: currentRoomId,
        data: { sdp: peerConnection.localDescription },
        to: sender,
      });
    }
  } else if (data.candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});

// Disable and enable local audio and video tracks
muteAudio.addEventListener('change', () => {
  const isMuted = muteAudio.checked;
  localStream.getAudioTracks()[0].enabled = !isMuted;
  socket.emit('update-status', { roomId: currentRoomId, isMuted, isVideoOff: turnOffVideo.checked });
});

turnOffVideo.addEventListener('change', () => {
  const isVideoOff = turnOffVideo.checked;
  localStream.getVideoTracks()[0].enabled = !isVideoOff;
  socket.emit('update-status', { roomId: currentRoomId, isMuted: muteAudio.checked, isVideoOff });
});

// Update status of peers locally
socket.on('update-status', ({ socketId, isMuted, isVideoOff }) => {
  const userDiv = document.getElementById(socketId);
  const userElement = userDiv.querySelector('div');
  const username = userNames[socketId] || 'Unknown';
  if (userElement) {
    const status = [];
    if (isMuted) status.push('muted');
    if (isVideoOff) status.push('video off');
    userElement.innerText = `${username} ${status.length ? ': ' + status.join(', ') : ''}`;
  }
});

// Function to escape HTML special characters for chat
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Function to send the message
function sendMessage() {
  const messageText = chatInput.value.trim(); // Trim whitespace
  if (!messageText) {
    return;
  }

  const chatMessage = document.createElement('p');
  chatMessage.className = 'message';
  const safeMessage = escapeHTML(messageText);
  chatMessage.innerText = safeMessage;

  const localContainer = document.createElement('div');
  localContainer.className = 'local';
  localContainer.appendChild(chatMessage);

  messageContainer.appendChild(localContainer);

  // Emit the message to the server (for broadcasting to peers)
  socket.emit('send-chat', { roomId: currentRoomId, message: safeMessage });

  chatInput.value = '';
}

// Event listener for sending on button click
chatSend.addEventListener('click', () => {
  sendMessage();
});

// Event listener for sending on "Enter" key press (only if text input is focused)
chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && document.activeElement === chatInput) {
    event.preventDefault();
    sendMessage();
  }
});

// Recieve chat message
socket.on('send-chat', ({ socketId, message }) => {
  const username = userNames[socketId] || 'Unknown';

  const usernameStrong = document.createElement('strong');
  usernameStrong.innerText = username;

  const usernameP = document.createElement('p');
  usernameP.className = 'username';
  usernameP.appendChild(usernameStrong);

  const chatMessage = document.createElement('p');
  chatMessage.className = 'message';
  chatMessage.innerText = message;

  const remoteContainer = document.createElement('div');
  remoteContainer.className = 'remote';
  remoteContainer.appendChild(usernameP);
  remoteContainer.appendChild(chatMessage);

  messageContainer.appendChild(remoteContainer);
});

// Create or get a peer connection for a specific user
function getOrCreatePeerConnection(socketId) {
  if (peerConnections[socketId]) {
    return peerConnections[socketId];
  }

  const peerConnection = new RTCPeerConnection(config);
  peerConnections[socketId] = peerConnection;

  // Add local media tracks to the peer connection
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Handle incoming media tracks from remote peer
  peerConnection.ontrack = (event) => {
    let videoContainer = document.getElementById(socketId);
    if (!videoContainer) {
      videoContainer = document.createElement('div');
      videoContainer.id = socketId;
      videoContainer.className = 'videoContainer';

      const videoElement = document.createElement('video');
      videoElement.autoplay = true;
      videoContainer.appendChild(videoElement);

      const usernameLabel = document.createElement('div');
      usernameLabel.innerText = userNames[socketId] || 'Unknown';
      videoContainer.appendChild(usernameLabel);

      remoteVideos.appendChild(videoContainer);
    }
    videoContainer.querySelector('video').srcObject = event.streams[0];
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', {
        roomId: currentRoomId,
        data: { candidate: event.candidate },
        to: socketId,
      });
    }
  };

  return peerConnection;
}
