
// ===============================
// Speech Recognition and Synthesis
// ===============================

// Initialize Speech Recognition
let recognition;
let isListening = false;

// Check for browser support
if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
  $('#message2').text('Sorry, your browser does not support Speech Recognition.');
} else {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true; // Keep listening until stopped
  recognition.interimResults = true; // Only final results
  recognition.lang = 'en-US'

  // Event handler for speech results
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0])
      .map(result => result.transcript)
      .join('');

    // Display transcription in the input field
    $('#transcription').val(transcript);

    // Optionally, respond based on the transcription
    // For example, if user says "Hello", the app can respond
    /*if (transcript.toLowerCase().includes('hello')) {
      speakText('Hello! How can I assist you today?');
    }*/
  };

  recognition.onerror = (event) => {
    console.error('Speech Recognition Error:', event.error);
    $('#message2').text('Speech Recognition Error: ' + event.error);
  };

  recognition.onend = () => {
    if (isListening) {
      recognition.start(); // Restart recognition if it was stopped unexpectedly
    }
  };
}

// Initialize Speech Synthesis
const synth = window.speechSynthesis;

// Function to speak text
function speakText(text) {
  if (synth.speaking) {
    console.error('SpeechSynthesisUtterance is already speaking.');
    return;
  }

  if (text !== '') {
    const utterThis = new SpeechSynthesisUtterance(text);
    // Optionally set properties like voice, pitch, rate
    utterThis.pitch = 1;
    utterThis.rate = 1;
    synth.speak(utterThis);
  }
}

// Event Listeners for Buttons
$(document).ready(function() {
  $('#start-listening').click(function() {
    if (!isListening) {
      recognition.start();
      isListening = true;
      $('#message2').text('Listening...');
      console.log('Speech recognition started.');
    }
  });

  $('#stop-listening').click(function() {
    if (isListening) {
      recognition.stop();
      isListening = false;
      $('#message2').text('Stopped listening.');
      console.log('Speech recognition stopped.');
    }
  });

  $('#speak-message').click(function() {
    const message = $('#message2').text() || 'Hello! I am here to assist you.';
    //speakText(message);
  });
});