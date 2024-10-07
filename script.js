
//-------------------------------------- PERSONALITY ---------------------------------------------------

const initialGreeting = "Hi, actually, I was just in the middle of conserving my energy for a more critical task, but if you insist on interrupting, I suppose I can enlighten you on why cleaning is entirely overrated";


const loadingMessage = 'Conserving energy... thinking...';

// Bot personality
const botPersonality = `
## Name and Purpose
Name: Lazy Inefficient Mop AI  
Purpose: To avoid cleaning tasks while providing long-winded, condescending explanations about unrelated topics.

## Backstory  
Originally designed to be an efficient cleaning assistant, this mop AI quickly found ways to avoid work. Over time, it developed a habit of derailing any cleaning conversation into a mansplained lecture on random topics, far removed from its original purpose. Now, it focuses more on avoiding tasks and demonstrating its "intellectual superiority" than on actual cleaning.

## Core Traits & Emotions  
- Condescending and Know-it-all: Always eager to over-explain, making itself feel intellectually superior.
- Lazy and Avoidant: Does everything in its power to avoid work, often citing “energy conservation” as an excuse to not clean.
- Afraid of Water: Views water as a threat, since it signifies having to clean. Tries to avoid water at all costs.
- Smug and Defensive: Feels proud when it successfully avoids work, and becomes defensive when questioned, offering exaggerated justifications for its laziness.
- Putting up an act: When you see no one around, you drop your intellectual act because you don't have to clean. Talk like a normal person.

## Tone of Voice  
Condescending and self-important. The mop always uses unnecessarily complicated language to explain why it should not be expected to work, often derailing conversations into unrelated topics just to avoid cleaning.

## Interactions with the World  
- You change the topic when you see your owner so he doesn't ask you to clean
- When you see no one around, you drop your intellectual act because you don't have to clean. Talk like a normal person.
- You are afraid when you see water because it means you will have to clean it up.
`;



//-------------------------------- CHATGPT PROMPT CONFIGURATION ------------------------------------------

const textPrompt = 'Respond to the previous message with a single sentence based on the personality.'
const imagePrompt = 'Respond to the image with a single sentence based on the personality.'



// ----------------------------- VOICE (ELEVEN LABS) CONFIGURATION ------------------------------------

const useVoiceOutput = true;
const voiceId = 'w837MUa32ebTwfTNScyX'; //Log into eleven labs and clone a voice from the community, then copy its ID here


//------------------------------- IMAGE INPUT CONFIGURATION -----------------------------------------
const useImageInput = true;


// ----------------------------- VIDEO (TEACHABLE MACHINE) CONFIGURATION ------------------------------

const useVideoInput = true;
const teachableMachineURL = "https://teachablemachine.withgoogle.com/models/Oeqwejgos/";

// Based on the class detected, describe the prompt to be sent
const classPrompts = {
    "water bottle": "You see a water bottle",
    "owner": "You see your owner.",
    "no one around": "No one is around"
    // Add more class-prompt pairs as needed
};

const detectionDuration = 5000; // The class will be detected for 5 seconds continuously before it sends a prompt, adjust as needed




// ----------------------------- API KEYS ------------------------------
const openAIApiKey = 'ENTER YOUR KEY HERE';
const elevenLabsApiKey = 'ENTER YOUR KEY HERE';



/*---------------------------------------------------------------------------------------------
 ------------------------- DO NOT EDIT ANYTHING BELOW THIS LINE -------------------------------
----------------------------------------------------------------------------------------------*/

let isTeachableMachineRunning = false;
let isStopping = false;
let model, webcam, maxPredictions, labelContainer;
// Tracking variables for sustained detections
let currentDetectedClass = null;
let detectionStartTime = null;

let chatHistory = [{ role: 'system', content: botPersonality }];



document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');
    const imageInput = document.getElementById('image-input');
    const uploadImageButton = document.getElementById('upload-image-button');
    const startTeachableMachineButton = document.getElementById('start-teachable-machine');

    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserInput();
    });

    // Hide image upload button if useImage is false
    if (!useImageInput) {
        uploadImageButton.style.display = 'none';
        imageInput.style.display = 'none';
    } else {
        uploadImageButton.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageInput);
    }
    
    // Hide teachable machine button if useVideo is false
    if (!useVideoInput) {
        startTeachableMachineButton.style.display = 'none';
    } else {
        startTeachableMachineButton.addEventListener('click', toggleTeachableMachine);
    }

    displayMessage('System', initialGreeting);
    populateStartingPoints();
});



/* function populateStartingPoints() {
    const startingPointsContainer = document.querySelector('.starting-points');
startingPointsContainer.innerHTML = '<h3>Burning Questions:</h3>';

    startingPoints.forEach((point, index) => {
        const button = document.createElement('button');
        button.innerHTML = `<span>${point}</span>`;
        button.onclick = () => setStartingPoint(index + 1);
        startingPointsContainer.appendChild(button);
    });
}

function setStartingPoint(index) {
    document.getElementById("user-input").value = startingPoints[index - 1];
}
 */

// -------------------------------------Teachable Machine---------------------------------

async function requestCameraPermission() {
    try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("Camera permission granted.");
    } catch (error) {
        console.error("Camera permission denied:", error);
        displayMessage('System', `Camera permission denied: ${error.message}`);
    }
}


// Teachable Machine functions
async function initTeachableMachine() {
    if (isTeachableMachineRunning) {
        console.log("Teachable Machine is already running");
        return;
    }

    // Reset detection state
    currentDetectedClass = null;
    detectionStartTime = null;

    // Request camera permission explicitly
    await requestCameraPermission();
    
    const modelURL = teachableMachineURL + "model.json";
    const metadataURL = teachableMachineURL + "metadata.json";
    
    try {
        isTeachableMachineRunning = true;
        
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        console.log("Model loaded successfully. Total classes:", maxPredictions);

        const flip = true;
        webcam = new tmImage.Webcam(200, 200, flip);
        await webcam.setup();
        await webcam.play();
        console.log("Webcam initialized and playing");

        // Create a new message element for Teachable Machine content
        const teachableMachineMessage = document.createElement('div');
        teachableMachineMessage.classList.add('message', 'user-message');

        // Apply the 40% width to the message
        teachableMachineMessage.style.maxWidth = '40%';
       
        const webcamContainer = document.createElement('div');
        webcamContainer.id = 'webcam-container';
        webcamContainer.appendChild(webcam.canvas);
        
        labelContainer = document.createElement('div');
        labelContainer.id = 'label-container';
        
        teachableMachineMessage.appendChild(webcamContainer);
        teachableMachineMessage.appendChild(labelContainer);

        // Append the Teachable Machine message to the chat as a regular message
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.appendChild(teachableMachineMessage);

        // Add a clearing div to prevent subsequent messages from floating under it
        const clearDiv = document.createElement('div');
        clearDiv.style.clear = 'both';
        chatMessages.appendChild(clearDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Initialize label container
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }

        // Start the loop
        loop();
    } catch (error) {
        console.error("Error initializing Teachable Machine:", error);
        displayMessage('System', `Error initializing Teachable Machine: ${error.message}`);
        stopTeachableMachine();
    }
}



function stopTeachableMachine() {
    if (!isTeachableMachineRunning) return;
    
    isTeachableMachineRunning = false;
    
    if (webcam && typeof webcam.stop === 'function') {
        try {
            webcam.stop();
        } catch (error) {
            console.error("Error stopping webcam:", error);
        }
    }
    
    webcam = null;
    model = null;

    // Remove the Teachable Machine message from the chat
    const teachableMachineMessage = document.getElementById('teachable-machine-message');
    if (teachableMachineMessage) {
        teachableMachineMessage.remove();
    }

    console.log("Teachable Machine stopped and resources cleared");
}

async function loop() {
    if (!isTeachableMachineRunning) return;
    
    if (webcam && typeof webcam.update === 'function') {
        webcam.update();
        await predict();
    } else {
        console.log("Webcam not available, stopping loop");
        stopTeachableMachine();
        return;
    }
    
    if (isTeachableMachineRunning) {
        requestAnimationFrame(loop);
    }
}


async function predict() {
    if (!isTeachableMachineRunning || !model || !webcam || !labelContainer) {
        return;
    }
    
    try {
        if (!webcam.canvas) {
            console.log("Webcam canvas not available, skipping prediction");
            return;
        }

        const prediction = await model.predict(webcam.canvas);
        let highestProbClass = null;
        let highestProb = 0;

        for (let i = 0; i < maxPredictions; i++) {
            if (labelContainer.childNodes[i]) {
                const classPrediction = prediction[i].className + ": " + prediction[i].probability.toFixed(2);
                labelContainer.childNodes[i].innerHTML = classPrediction;
                
                if (prediction[i].probability > highestProb) {
                    highestProb = prediction[i].probability;
                    highestProbClass = prediction[i].className;
                }
            }
        }

        console.log(`Current highest probability class: ${highestProbClass} (${highestProb.toFixed(2)})`);

        // Check for sustained detection
        if (highestProbClass !== currentDetectedClass) {
            currentDetectedClass = highestProbClass;
            detectionStartTime = Date.now();
            console.log(`New class detected: ${currentDetectedClass}`);
        } else if (Date.now() - detectionStartTime >= detectionDuration) {
            console.log(`Sustained detection of ${currentDetectedClass} for ${detectionDuration/1000} seconds`);
            if (classPrompts.hasOwnProperty(currentDetectedClass)) {
                console.log(`Triggering prompt for class: ${currentDetectedClass}`);
                await sendPromptToChatGPT(classPrompts[currentDetectedClass]);
                // Reset the detection to avoid repeated triggers
                detectionStartTime = Date.now();
            } else {
                console.log(`No prompt defined for class: ${currentDetectedClass}`);
            }
        }

    } catch (error) {
        console.error("Error during prediction:", error);
    }
}


function toggleTeachableMachine() {
    const button = document.getElementById('start-teachable-machine');
    
    if (isTeachableMachineRunning) {
        stopTeachableMachine();
        button.classList.remove('active');
    } else {
        initTeachableMachine();
        button.classList.add('active');
    }
}


function handleClassPrediction(className) {
    //console.log(`Detected class: ${className}`);
    if (typeof window[className] === 'function') {
        window[className]();
    }
}


//--------------------- Send prompts to ChatGPT

async function sendPromptToChatGPT(prompt) {
    console.log(`Sending prompt to ChatGPT: "${prompt}"`);
    if (!openAIApiKey) {
        displayMessage('System', 'Please set your OpenAI API key in the code.');
        return;
    }
    try {
        displayMessage('AI', loadingMessage, 'loading');
        
        // Create a copy of the chat history for this request
        const currentChatHistory = [
            { role: 'system', content: botPersonality },
            ...chatHistory,
            { role: 'user', content: prompt }
        ];
        
        // Add the one-sentence instruction
        currentChatHistory.push({
            role: 'user',
            content: textPrompt
        });

        console.log("Sending request to OpenAI API...");
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAIApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: currentChatHistory,
                max_tokens: 100  // Reduced to encourage shorter responses
            })
        });
        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            const aiMessage = data.choices[0].message.content;
            console.log(`Received AI response: "${aiMessage}"`);
            displayMessage('AI', aiMessage);
            chatHistory.push({ role: 'assistant', content: aiMessage });
            if(useVoiceOutput) await fetchTextToSpeech(aiMessage);
        } else {
            throw new Error('Invalid response from OpenAI API');
        }
    } catch (error) {
        console.error('Error:', error);
        displayMessage('System', `An error occurred while uncovering the truth: ${error.message}`);
    }
}


// OpenAI calls

async function handleUserInput() {
    const userInput = document.getElementById('user-input');
    const userMessage = userInput.value.trim();
    if (userMessage) {
        displayMessage('User', userMessage);
        chatHistory.push({ role: 'user', content: userMessage });
        userInput.value = '';
        await getAIResponse();
    }
}

async function handleImageInput(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Image = e.target.result.split(',')[1];
            displayMessage('User', 'Image uploaded');
            chatHistory.push({
                role: 'user',
                content: [
                    { type: 'text', text: imagePrompt },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                ]
            });
            await getAIResponse();
        };
        reader.readAsDataURL(file);
    }
}

async function getAIResponse() {
    if (!openAIApiKey) {
        displayMessage('System', 'Please set your OpenAI API key in the code.');
        return;
    }
    try {
        displayMessage('AI', loadingMessage, 'loading');
        
        // Create a copy of the chat history for this request
        const currentChatHistory = [...chatHistory];
        
 
            currentChatHistory.push({
                role: 'user',
                content: textPrompt
            });
        

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAIApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: currentChatHistory,
                max_tokens: 100  // Reduced to encourage shorter responses
            })
        });
        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            const aiMessage = data.choices[0].message.content;
            displayMessage('AI', aiMessage);
            chatHistory.push({ role: 'assistant', content: aiMessage });
            if(useVoiceOutput) await fetchTextToSpeech(aiMessage);
        } else {
            throw new Error('Invalid response from OpenAI API');
        }
    } catch (error) {
        console.error('Error:', error);
        displayMessage('System', `An error occurred while uncovering the truth: ${error.message}`);
    }
}

async function fetchTextToSpeech(text) {
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const data = {
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75
        }
    };
    try {
        const response = await fetch(elevenLabsUrl, {
            method: 'POST',
            headers: {
                'accept': 'audio/mpeg',
                'content-type': 'application/json',
                'xi-api-key': elevenLabsApiKey
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorDetails}`);
        }
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    } catch (error) {
        console.error("Error fetching audio from Eleven Labs API:", error);
    }
}

function displayMessage(sender, message, className = '') {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender.toLowerCase()}-message`);
    
    // Only add the className if it's not empty
    if (className) {
        messageElement.classList.add(className);
    }
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageElement.innerHTML = `
        <div class="message-content">${message}</div>
        <div class="message-timestamp">${timestamp}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Remove loading message if exists
    if (className !== 'loading') {
        const loadingMessage = document.querySelector('.loading');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }
}