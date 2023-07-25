const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const alertSection = document.getElementById('alert');
const portraitMode = document.getElementById('portraitMode');

// Check device orientation and suggest best mode
function showOrientationInfoText(portrait) {
    if (portrait) {
        portraitMode.innerText = 'Portrait mode detected. Landscape mode is better.'
    } else {
        portraitMode.innerText = '';
    }
}

// Setup event listener for orientation check
const deviceOrientation = window.matchMedia('(orientation: portrait)');
deviceOrientation.addEventListener('change', e => {
    const portrait = e.matches;
    showOrientationInfoText(portrait);
});

// Initial orientation check
const portrait = deviceOrientation.matches;
showOrientationInfoText(portrait)

// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it to call enableCam function which we will 
// define in the next step.
if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
} else {
    console.warn('getUserMedia() is not supported by your browser');
}

// Enable the live webcam view and start classification.
function enableCam(event) {
    // Only continue if the COCO-SSD has finished loading.
    if (!model) {
        return;
    }

    // Hide the button once clicked.
    event.target.classList.add('removed');

    // getUsermedia parameters to force video but not audio.
    const constraints = {
        video: {
            facingMode: 'environment'
        }
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;
        video.addEventListener('loadeddata', predictWebcam);
    });
}

// Set up global sound properties
const warningSound = new Audio('assets/beep-warning.mp3');
const speechAlert = new SpeechSynthesisUtterance();

// This function will alert the user through should and return 
function alertUser(objectName) {
    warningSound.play();
    const p = document.createElement('p');
    const alertText = `A ${objectName} is spotted in the garden`;
    p.innerText = alertText;
    if ('speechSynthesis' in window) {
        speechAlert.text = alertText;
        window.speechSynthesis.speak(speechAlert);
    } else {
        console.warn('Your browser does not support text to speech!');
    }
    alertSection.appendChild(p);
    alerts.push(p);
}


// Store the resulting model in the global scope of our app.
let model = undefined;

// Before we can use COCO-SSD class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment 
// to get everything needed to run.
cocoSsd.load().then(function (loadedModel) {
    model = loadedModel;
    // Show demo section now model is ready to use.
    demosSection.classList.remove('invisible');
});

let objects = [];
let alerts = [];

function predictWebcam() {
    // Now let's start classifying a frame in the stream.
    model.detect(video).then(function (predictions) {
        // Clear text so speech can stop
        speechAlert.text = '';

        // Remove any highlighting we did previous frame.
        for (let i = 0; i < objects.length; i++) {
            liveView.removeChild(objects[i]);
        }
        objects.splice(0);

        // Remove any previous alerts we did previous frame.
        for (let i = 0; i < alerts.length; i++) {
            alertSection.removeChild(alerts[i]);
        }
        alerts.splice(0);

        // Now lets loop through predictions and draw them to the live view if
        // they have a high confidence score.
        for (let n = 0; n < predictions.length; n++) {
            // If we are over 60% sure we are sure we classified it right, draw it!
            if (predictions[n].score > 0.6) {
                const objectName = predictions[n].class;
                const p = document.createElement('p');
                p.innerText = objectName + ' - with '
                    + Math.round(parseFloat(predictions[n].score) * 100)
                    + '% confidence.';
                p.style = 'margin-left: ' + predictions[n].bbox[0] + 'px; margin-top: '
                    + (predictions[n].bbox[1] - 10) + 'px; width: '
                    + (predictions[n].bbox[2] - 10) + 'px; top: 0; left: 0;';

                const highlighter = document.createElement('div');
                highlighter.setAttribute('class', 'highlighter');
                highlighter.style = 'left: ' + predictions[n].bbox[0] + 'px; top: '
                    + predictions[n].bbox[1] + 'px; width: '
                    + predictions[n].bbox[2] + 'px; height: '
                    + predictions[n].bbox[3] + 'px;';

                // Check if cat or bird spotted
                if (objectName === 'cat' || objectName === 'bird') {
                    // If so alert the user
                    alertUser(objectName);
                }

                liveView.appendChild(highlighter);
                liveView.appendChild(p);
                objects.push(highlighter);
                objects.push(p);
            }
        }

        // Call this function again to keep predicting when the browser is ready.
        window.requestAnimationFrame(predictWebcam);
    });
}


