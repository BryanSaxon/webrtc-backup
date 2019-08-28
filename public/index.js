const ROOM = 'chat';
const SIGNAL_ROOM = 'signal';
let rtcPeerConn;

io = io.connect();

io.emit('ready', {
  "chatRoom": ROOM,
  "signalRoom": SIGNAL_ROOM
});

io.on('announce', (data) => {
  displayMessage(data.message);
});

function displayMessage(message) {
  let messageArea = document.querySelector('#messageArea');
  messageArea.innerHTML = messageArea.innerHTML + message + '<br/>';
}

io.on('message', (data) => {
  displayMessage(data.author + ": " + data.message);
});

io.emit('signal', {
  'type': 'UserHere',
  'message': 'Are you ready for a call?',
  'room': SIGNAL_ROOM
});

io.on('signalingMessage', (data) => {
  console.log(data);
  displayMessage('Signal received: ' + data.type);

  if (!rtcPeerConn)
    startSignaling();

  if (data.type !== 'UserHere') {
    let message = JSON.parse(data.message);

    if (message.sdp) {
      rtcPeerConn.setRemoteDescription(
        new RTCSessionDescription(message.sdp),
        () => {
          if (rtcPeerConn.remoteDescription.type == 'offer') {
            rtcPeerConn.createAnswer(sendLocalDesc, logError);
          }
        },
      logError)
    } else {
      rtcPeerConn.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
  }
});

function startSignaling() {
  displayMessage('Starting signaling...');

  rtcPeerConn = new RTCPeerConnection({
    'iceServers': [{
      'url': 'stun:stun.l.google.com:19302'
    }]
  });

  rtcPeerConn.onicecandidate = (event) => {
    if (event.candidate)
      io.emit('signal', {
        "type": "ice candidate",
        "message": JSON.stringify({ 'candidate': event.candidate }),
        "room": SIGNAL_ROOM
      });
  };

  displayMessage('Completed the ice candidate.');

  rtcPeerConn.onnegotiationneeded = () => {
    displayMessage('On negotiation called.');
    rtcPeerConn.createOffer(sendLocalDesc, logError);
  };

  rtcPeerConn.onaddstream = (event) => {
    displayMessage('Going to add their stream.');

    let theirVideoArea = document.querySelector('#theirStream');
    theirVideoArea.srcObject = event.stream;
  };

  navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;


  navigator.getUserMedia({
    video: true,
    audio: false
  }, (stream) => {
    displayMessage('Displaying my stream.')

    let myVideoArea = document.querySelector('#myStream');
    myVideoArea.srcObject = stream;
    rtcPeerConn.addStream(stream);
  }, (error) => {
    console.log(error);
  });
}

function sendLocalDesc(desc) {
  console.log(desc);
  rtcPeerConn.setLocalDescription(desc, () => {
    displayMessage('Send local description.');
    io.emit('signal', {
      "type": "SDP",
      "message": JSON.stringify({ 'sdp': rtcPeerConn.localDescription }),
      "room": SIGNAL_ROOM
    })
  }, logError);
}

function logError(error) {
  displayMessage(error.name + ': ' + error.message);
}

let sendMessage = document.querySelector('#sendMessage');

sendMessage.addEventListener('click', (event) => {
  event.preventDefault();

  let myName = document.querySelector('#myName');
  let myMessage = document.querySelector('#myMessage');

  io.emit('send', {
    room: ROOM,
    message: myMessage.value,
    author: myName.value
  });

  myMessage.value = '';
  myMessage.focus();
});
