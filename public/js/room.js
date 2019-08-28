const url = window.location.pathname;
const id = url.substring(url.lastIndexOf('/') + 1);
const ROOM = 'chat-' + id;
const SIGNAL_ROOM = 'signal-' + id;
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
  console.log('Signal received: ' + data.type);

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
  console.log('Starting signaling...');

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

  console.log('Completed the ice candidate.');

  rtcPeerConn.onnegotiationneeded = () => {
    console.log('On negotiation called.');
    rtcPeerConn.createOffer(sendLocalDesc, logError);
  };

  rtcPeerConn.onaddstream = (event) => {
    console.log('Going to add their stream.');

    let theirStream = document.querySelector('#theirStream');
    let theirStreamContainer = document.querySelector('#theirStreamContainer');
    let theirStatic = document.querySelector('#theirStatic');

    theirStream.srcObject = event.stream;
    theirStatic.classList.add('d-none');
    theirStreamContainer.classList.remove('d-none');
  };

  navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;


  navigator.getUserMedia({
    video: true,
    audio: true
  }, (stream) => {
    console.log('Displaying my stream.');

    let myVideoArea = document.querySelector('#myStream');
    let myStreamContainer = document.querySelector('#theirStreamContainer');
    let myStatic = document.querySelector('#theirStatic');

    myVideoArea.srcObject = stream;
    myStatic.classList.add('d-none');
    myStreamContainer.classList.remove('d-none');

    rtcPeerConn.addStream(stream);
  }, (error) => {
    console.log(error);
  });
}

function sendLocalDesc(desc) {
  rtcPeerConn.setLocalDescription(desc, () => {
    console.log('Send local description.');

    io.emit('signal', {
      "type": "SDP",
      "message": JSON.stringify({ 'sdp': rtcPeerConn.localDescription }),
      "room": SIGNAL_ROOM
    })
  }, logError);
}

function logError(error) {
  console.log(error.name + ': ' + error.message);
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
