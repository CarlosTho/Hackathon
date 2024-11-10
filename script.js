
const video = document.getElementById("video");

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error(error);
    });
}



video.addEventListener("play", async () => {
 

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  let guidanceMessage = '';

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  const calculateEyeCenter = (eyePoints) => {
    const x = eyePoints.reduce((sum, point) => sum + point.x, 0) / eyePoints.length;
    const y = eyePoints.reduce((sum, point) => sum + point.y, 0) / eyePoints.length;
    return { x, y };
  }
  
  const  drawEyeCenter = (canvas, point) => {
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'green';
    ctx.fill();
  }  


  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

   
/*
    resizedDetections.forEach(detection => {
      const landmarks = detection.landmarks;
    
      // Get the positions of the left and right eyes
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
    
      // Calculate the center of each eye
      const leftEyeCenter = calculateEyeCenter(leftEye);
      const rightEyeCenter = calculateEyeCenter(rightEye);
    
      // Log or use the eye centers as needed
      console.log('Left Eye Center:', leftEyeCenter);
      console.log('Right Eye Center:', rightEyeCenter);
    
      // Optionally, draw circles at the eye centers on the canvas
      drawEyeCenter(canvas, leftEyeCenter);
      drawEyeCenter(canvas, rightEyeCenter);
    });
*/
if (resizedDetections) {
 // Aggregate guidance messages
 let finalMessage = '';
   
  let guidanceMessages = resizedDetections.map(detection => {
    // Access the bounding box
    const box = detection.detection.box;

    if (!box) {
      console.error('Box is undefined for detection:', detection);
      return 'Box undefined.';
    }

    function checkEyeFocus(landmarks) {
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
    
      const leftIrisCenter = getEyeIrisCenter(leftEye);
      const rightIrisCenter = getEyeIrisCenter(rightEye);
    
      const isLeftEyeCentered = isIrisCentered(leftEye, leftIrisCenter);
      const isRightEyeCentered = isIrisCentered(rightEye, rightIrisCenter);
    
      return isLeftEyeCentered && isRightEyeCentered;
    }

    function getEyeIrisCenter(eyePoints) {
      // Calculate the average position of the eye landmarks to estimate the iris center
      const sum = eyePoints.reduce((acc, point) => {
        return { x: acc.x + point.x, y: acc.y + point.y };
      }, { x: 0, y: 0 });
    
      const centerX = sum.x / eyePoints.length;
      const centerY = sum.y / eyePoints.length;
    
      return { x: centerX, y: centerY };
    }

    function isIrisCentered(eyePoints, irisCenter) {
      // Calculate the bounding box of the eye
      const eyeLeft = eyePoints[0].x;
      const eyeRight = eyePoints[3].x;
      const eyeTop = Math.min(eyePoints[1].y, eyePoints[2].y);
      const eyeBottom = Math.max(eyePoints[4].y, eyePoints[5].y);
    
      const eyeWidth = eyeRight - eyeLeft;
      const eyeHeight = eyeBottom - eyeTop;
    
      // Define tolerance as a percentage of eye width and height
      const toleranceX = eyeWidth * 0.15; // 15% of eye width
      const toleranceY = eyeHeight * 0.15; // 15% of eye height
    
      // Expected center positions
      const expectedCenterX = (eyeLeft + eyeRight) / 2;
      const expectedCenterY = (eyeTop + eyeBottom) / 2;
    
      // Check if iris center is within tolerance of expected center
      const isCenteredX = Math.abs(irisCenter.x - expectedCenterX) <= toleranceX;
      const isCenteredY = Math.abs(irisCenter.y - expectedCenterY) <= toleranceY;
    
      return isCenteredX && isCenteredY;
    }


    // Calculate the center of the face bounding box
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;

    // Calculate the center of the image
    const imageCenterX = displaySize.width / 2;
    const imageCenterY = displaySize.height / 2;

    // Define tolerance (10% of image dimensions)
    const toleranceX = displaySize.width * 0.3;
    const toleranceY = displaySize.height * 0.3;

    // Check if face is centered within tolerance
    const isCenteredX = Math.abs(faceCenterX - imageCenterX) <= toleranceX;
    const isCenteredY = Math.abs(faceCenterY - imageCenterY) <= toleranceY;
    const isHeadCentered = isCenteredX && isCenteredY;

    // Check if eyes are focused on the camera
    const landmarks = detection.landmarks;
    
     const isLookingAtCamera = checkEyeFocus(landmarks);


    // End of Eye Tracking Functionality

    // Determine the guidance message based on checks
    if (!isHeadCentered && !isLookingAtCamera) {
      return 'Please center your head and look at the camera.';
    } else if (!isHeadCentered) {
      return 'Please center your head.';
    } else if (!isLookingAtCamera) {
      return 'Please look at the camera.';
    } else {
      return 'Great! Stay still.';
    }
  });

  
  if (guidanceMessages.length > 0) {
    // Prioritize messages
    if (guidanceMessages.includes('Please center your head and look at the camera.')) {
      finalMessage = 'Please center your head and look at the camera.';
    } else if (guidanceMessages.includes('Please center your head.')) {
      finalMessage = 'Please center your head.';
    } else if (guidanceMessages.includes('Please look at the camera.')) {
      finalMessage = 'Please look at the camera.';
    } else if (guidanceMessages.includes('Great! Stay still.')) {
      finalMessage = 'Great! Stay still.';
    } else if (guidanceMessages.includes('Box undefined.')) {
      finalMessage = 'Error in detection.';
    }
  } else {
    finalMessage = 'No face detected. Please position yourself in front of the camera.';
    $('#message').text(finalMessage); 
  }
  $('#message').text(finalMessage); 



    } else {
      finalMessage = 'No face detected. Please position yourself in front of the camera.';
      $('#message').text(finalMessage); 
    }

    
   

 //console.log('the results are', resizedDetections)
  // draw detections into the canvas
  faceapi.draw.drawDetections(canvas, resizedDetections)
  // draw the landmarks into the canvas
  faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
   
  // Draw detections and landmarks on the canvas
  //faceapi.draw.drawDetections(canvas, resizedDetections);
  //faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
  /*
  // Optionally, draw eye contours and iris centers for visual feedback
  resizedDetections.forEach(detection => {
    const landmarks = detection.landmarks;
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Draw eye contours
    drawEyeContours(canvas, leftEye);
    drawEyeContours(canvas, rightEye);

    // Draw iris centers
    const leftIrisCenter = getEyeIrisCenter(leftEye);
    const rightIrisCenter = getEyeIrisCenter(rightEye);
    drawIrisCenter(canvas, leftIrisCenter);
    drawIrisCenter(canvas, rightIrisCenter);
  });
   */
  }, 100);
});
