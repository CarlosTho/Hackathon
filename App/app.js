// Access the live video element
const liveVideo = document.getElementById("liveVideo");

// Access the recording buttons
const startRecordingButton = document.getElementById("startRecordingButton");
const stopRecordingButton = document.getElementById("stopRecordingButton");

// Access the "My Interviews" section
const recordedVideos = document.getElementById("recordedVideos");

// Access the recording timer and indicator
const recordingTimer = document.getElementById("recordingTimer");
const recordingIndicator = document.getElementById("recordingIndicator");

// Access feedback and tips sections
const feedbackContent = document.getElementById("feedbackContent");
const tipsList = document.getElementById("tipsList");

// Access the validation message div
const validationMessage = document.getElementById("validationMessage");

// Access the selected question elements
const selectedQuestionBox = document.getElementById("selectedQuestionBox");
const noQuestionSelected = document.getElementById("noQuestionSelected");
const selectedQuestionText = document.getElementById("selectedQuestionText");

// Variables for MediaRecorder
let mediaRecorder;
let recordedChunks = [];

// Timer variables
let timerInterval;
let seconds = 0;

// Variable to store the selected question
let selectedQuestion = null;

// Initialize Bootstrap tooltips
const tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});

// Function to initialize the live video feed with audio
async function initLiveVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true, // Enable audio capture
    });
    liveVideo.srcObject = stream;
    liveVideo.play();

    // Prevent audio echo by muting the live video playback
    liveVideo.muted = true;

    // Optional: Allow users to hear themselves through an audio element
    /*
        const audioElement = document.createElement('audio');
        audioElement.srcObject = stream;
        audioElement.play();
        audioElement.volume = 0.5; // Adjust volume as needed
        */
  } catch (error) {
    console.error("Error accessing the camera and microphone: ", error);
    if (error.name === "NotAllowedError") {
      alert(
        "Camera and microphone access were denied. Please allow permissions to use this feature."
      );
    } else if (error.name === "NotFoundError") {
      alert(
        "No camera or microphone device found. Please connect them and try again."
      );
    } else {
      alert(
        "An unexpected error occurred while accessing the camera and microphone."
      );
    }
  }
}

// Function to start recording
function startRecording() {
  recordedChunks = [];
  const stream = liveVideo.srcObject;

  if (!stream) {
    alert("No video stream available to record.");
    return;
  }

  // Check for MediaRecorder support and MIME type
  const mimeType = "video/webm; codecs=vp8,opus";
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    alert(`MIME type ${mimeType} is not supported on your browser.`);
    return;
  }

  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
  } catch (e) {
    console.error("Exception while creating MediaRecorder:", e);
    alert(
      "Failed to initialize MediaRecorder. Please try a different MIME type."
    );
    return;
  }

  mediaRecorder.ondataavailable = function (event) {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
      console.log("Data available:", event.data);
    }
  };

  mediaRecorder.onstop = function () {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    console.log("Blob created:", blob);
    const url = URL.createObjectURL(blob);
    appendRecordedVideo(url, blob);
  };

  mediaRecorder.onerror = function (event) {
    console.error("MediaRecorder error:", event.error);
    alert("An error occurred during recording: " + event.error.name);
  };

  mediaRecorder.start();
  console.log("Recording started.");

  // Start the timer and show recording indicator
  startTimer();
  recordingIndicator.style.display = "inline-block";

  // Update button states
  startRecordingButton.disabled = true;
  stopRecordingButton.disabled = false;
}

// Function to stop recording
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    console.log("Recording stopped.");

    // Stop the timer and hide recording indicator
    stopTimer();
    recordingIndicator.style.display = "none";

    // Update button states
    startRecordingButton.disabled = false;
    stopRecordingButton.disabled = true;
  }
}

// Function to append the recorded video to "My Interviews"
function appendRecordedVideo(url, blob) {
  // Remove placeholder text if present
  const placeholder = recordedVideos.querySelector(".no-recordings");
  if (placeholder) {
    recordedVideos.removeChild(placeholder);
  }

  // Clear any existing recordings to allow only one at a time
  recordedVideos.innerHTML = "";

  // Create a new div for the recording
  const recordingDiv = document.createElement("div");
  recordingDiv.classList.add(
    "video-recording",
    "mb-3",
    "p-3",
    "border",
    "rounded"
  );

  // Create the video element
  const videoElement = document.createElement("video");
  videoElement.src = url;
  videoElement.controls = true;
  videoElement.classList.add("w-100", "rounded");
  videoElement.muted = false; // Ensure video playback is not muted
  videoElement.volume = 1.0; // Set volume to maximum

  // Create the download link
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = `interview_recording_${new Date().toISOString()}.webm`;
  downloadLink.classList.add("btn", "btn-success", "mt-2", "download-link");
  downloadLink.innerHTML =
    '<i class="fas fa-download me-1"></i>Download Recording';

  // Create the delete button
  const deleteButton = document.createElement("button");
  deleteButton.classList.add(
    "btn",
    "btn-danger",
    "mt-2",
    "ms-2",
    "delete-button"
  );
  deleteButton.innerHTML =
    '<i class="fas fa-trash-alt me-1"></i>Delete Recording';
  deleteButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this recording?")) {
      recordedVideos.removeChild(recordingDiv);
      // Re-enable the Start Recording button
      startRecordingButton.disabled = false;
      if (recordedVideos.childElementCount === 0) {
        const newPlaceholder = document.createElement("p");
        newPlaceholder.classList.add("text-muted", "no-recordings");
        newPlaceholder.textContent =
          "No recordings yet. Start recording to see your interviews here.";
        recordedVideos.appendChild(newPlaceholder);
      }
    }
  });

  // Append video and control buttons to the div
  recordingDiv.appendChild(videoElement);
  recordingDiv.appendChild(downloadLink);
  recordingDiv.appendChild(deleteButton);

  // Append the div to the "My Interviews" section
  recordedVideos.appendChild(recordingDiv);

  // Disable the Start Recording button since a recording exists
  startRecordingButton.disabled = true;

  // Send the audio blob to the backend for processing
  sendAudioToBackend(blob);
}

// Function to send audio to the backend
function sendAudioToBackend(blob) {
  const formData = new FormData();
  formData.append("file", blob, "interview.webm");

  // Use the selectedQuestion variable
  formData.append("question", selectedQuestion);

  // Display a loading indicator or disable buttons if desired
  fetch("http://localhost:5000/process_audio", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      displayFeedback(data.feedback);
      displayTranscript(data.transcript);
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("An error occurred while processing your recording.");
    });
}

// Function to display feedback
function displayFeedback(feedbackText) {
  feedbackContent.innerHTML = ""; // Clear previous feedback

  const feedbackDiv = document.createElement("div");
  feedbackDiv.classList.add("feedback-message");
  feedbackDiv.textContent = feedbackText;

  feedbackContent.appendChild(feedbackDiv);
}

// Function to display transcript
function displayTranscript(transcriptText) {
  const transcriptDiv = document.getElementById("transcriptContent");
  transcriptDiv.textContent = transcriptText;
}

// Function to display tips
function displayTips() {
  console.log("Displaying tips...");
  // Clear previous tips
  tipsList.innerHTML = "";

  // Check if tipsList exists
  if (!tipsList) {
    console.error("tipsList element not found.");
    return;
  }

  // Mock tips data
  const tips = [
    "Practice common interview questions.",
    "Maintain eye contact with the interviewer.",
    "Keep your answers concise and relevant.",
    "Show enthusiasm and confidence.",
    "Prepare examples that showcase your skills.",
  ];

  // Add each tip
  tips.forEach(function (tip) {
    console.log(`Adding tip: ${tip}`);
    const tipItem = document.createElement("li");
    tipItem.classList.add("list-group-item");
    tipItem.textContent = tip;
    tipsList.appendChild(tipItem);
  });
}

// Timer functions
function startTimer() {
  seconds = 0;
  recordingTimer.textContent = formatTime(seconds);
  timerInterval = setInterval(() => {
    seconds++;
    recordingTimer.textContent = formatTime(seconds);
    if (seconds >= 15 * 60) {
      // 15 minutes limit
      alert(
        "Maximum recording time reached (15 minutes). Recording will stop automatically."
      );
      stopRecording();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  recordingTimer.textContent = "";
}

function formatTime(sec) {
  const minutes = Math.floor(sec / 60);
  const remainingSeconds = sec % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

// Event listeners for buttons
startRecordingButton.addEventListener("click", () => {
  if (!selectedQuestion) {
    // Show validation message
    validationMessage.textContent =
      "Please select a question before starting the recording.";
    validationMessage.style.display = "block";
  } else {
    // Hide validation message
    validationMessage.style.display = "none";
    startRecording();
  }
});

stopRecordingButton.addEventListener("click", () => {
  stopRecording();
});

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed.");
  initLiveVideo();
  displayFeedback(); // Initially display mock feedback
  displayTips();

  // Initialize "My Interviews" section with placeholder text
  if (recordedVideos.childElementCount === 0) {
    const placeholder = document.createElement("p");
    placeholder.classList.add("text-muted", "no-recordings");
    placeholder.textContent =
      "No recordings yet. Start recording to see your interviews here.";
    recordedVideos.appendChild(placeholder);
  }
});

// Update the question selection logic
document.querySelectorAll(".question-option").forEach((option) => {
  option.addEventListener("click", function (event) {
    event.preventDefault(); // Prevent the link from navigating
    selectedQuestion = this.textContent;

    // Update the selected question display
    selectedQuestionText.textContent = selectedQuestion;
    selectedQuestionText.style.display = "block";
    noQuestionSelected.style.display = "none";

    // Update the dropdown button text
    document.getElementById("questionDropdown").textContent = "Change Question";

    // Enable the start recording button
    startRecordingButton.disabled = false;

    // Hide any validation messages
    validationMessage.style.display = "none";
  });
});
