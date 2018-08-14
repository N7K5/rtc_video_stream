var localVideo;
var localStream;

var peerConnection;
var uuid;
var serverConnection;

const PORT= 3000;


var peerConnectionConfig = {
    'iceServers': [
      {'urls': 'stun:stun.stunprotocol.org:3478'},
      {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

  
function pageReady() {
    uuid = createUUID();
  
    localVideo = document.getElementById('localVideo');
  
    serverConnection = new WebSocket('wss://' + window.location.hostname + ':'+PORT);
    serverConnection.onmessage = gotMessageFromServer;
  
    var constraints = {
      video: {
        advanced: [{
            facingMode: "environment"
        }],
        width: 720,
        height: 1280,
        frameRate: {ideal: 30, min:10},
    },
      audio: false,
    };
  
    if(navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
    } else {
      alert('Your browser does not support getUserMedia API');
    }
}
  
  

function gotMessageFromServer(message) {
    if(!peerConnection) start(false);
  
    var signal = JSON.parse(message.data);
  
    // Ignore messages from ourself
    if(signal.uuid == uuid) return;
  
    if(signal.sdp) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
        // Only create answers in response to offers
        if(signal.sdp.type == 'offer') {
          peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
        }
      }).catch(errorHandler);
    } else if(signal.ice) {
      peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    }
}
  
function getUserMediaSuccess(stream) {
    localStream = stream;
    if(navigator.mozGetUserMedia) {
        localVideo.mozSrcObject = stream;
    } else { 
        localVideo.srcObject = stream;
    }
}
  
function start(isCaller) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.addStream(localStream);
  
    if(isCaller) {
      peerConnection.createOffer().then(createdDescription).catch(errorHandler);
    }
}
  


function gotIceCandidate(event) {
    if(event.candidate != null) {
      serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
    }
}
  


function createdDescription(description) {
    console.log('got description');
  
    peerConnection.setLocalDescription(description).then(function() {
      serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
}
  

function errorHandler(error) {
    console.log(error);
}
  
function createUUID() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
  
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
  