
"use strict";

/* =========================================
   SCAMGUARD AI - FRONTEND JAVASCRIPT
   Manual Analysis + OCR + Auto Prediction + Chatbot
========================================= */
window.addEventListener("beforeunload", () => {
    console.log("⚠️ PAGE IS RELOADING OR NAVIGATING!");
});

// 1. CONFIGURATION

const API_BASE_URL = "http://127.0.0.1:8000";

let selectedImageFile = null;
let previewImageUrl = null;
let chatHistory = [];
let isScanning = false;


// 2. HTML ELEMENTS

const manualJobForm = document.getElementById("manualJobForm");
const manualStatus = document.getElementById("manualStatus");

const jobImage = document.getElementById("jobImage");
const browseButton = document.getElementById("browseButton");
const uploadArea = document.getElementById("uploadArea");
const fileName = document.getElementById("fileName");
const scanButton = document.getElementById("scanButton");
const scanStatus = document.getElementById("scanStatus");

// Image preview elements
const imagePreviewContainer =
    document.getElementById("imagePreviewContainer");

const imagePreview =
    document.getElementById("imagePreview");

const ocrResult = document.getElementById("ocrResult");
const jobDetailsForm = document.getElementById("jobDetailsForm");
const ocrAnalysisStatus = document.getElementById("ocrAnalysisStatus");

const predictionResult = document.getElementById("predictionResult");
const predictionOutput = document.getElementById("predictionOutput");

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const sendChatButton = document.getElementById("sendChatButton");
const clearChatButton = document.getElementById("clearChatButton");
const typingIndicator = document.getElementById("typingIndicator");
const chatStatus = document.getElementById("chatStatus");
const suggestedQuestions = document.getElementById("suggestedQuestions");


// 3. JOB FIELDS

const JOB_FIELDS = [
    "title",
    "location",
    "department",
    "salary_range",
    "company_profile",
    "description",
    "requirements",
    "benefits",
    "telecommuting",
    "has_company_logo",
    "has_questions",
    "employment_type",
    "required_experience",
    "required_education",
    "industry",
    "function"
];


// 4. STATUS HELPER

function showStatus(element, message, type = "") {

    if (!element) return;

    element.textContent = message;
    element.className = "status-message";

    if (type) {
        element.classList.add(type);
    }
}


// 5. API RESPONSE HANDLER

async function readApiResponse(response) {

    const responseText = await response.text();

    let result;

    try {

        result = responseText
            ? JSON.parse(responseText)
            : {};

    } catch (error) {

        throw new Error(
            `Invalid server response. HTTP ${response.status}`
        );

    }

    if (!response.ok) {

        let message =
            result.detail ||
            result.message ||
            `Request failed. HTTP ${response.status}`;

        if (Array.isArray(message)) {

            message = message
                .map(item => item.msg || JSON.stringify(item))
                .join("; ");

        } else if (typeof message === "object") {

            message = JSON.stringify(message);

        }

        throw new Error(String(message));

    }

    return result;
}


// 6. FORM DATA

function getJobData(form) {

    const formData = new FormData(form);

    const jobData = {};

    JOB_FIELDS.forEach(field => {

        const value = formData.get(field);

        jobData[field] =
            typeof value === "string"
                ? value.trim()
                : "";

    });

    return jobData;
}


function hasJobInformation(jobData) {

    const importantFields = [
        "title",
        "location",
        "company_profile",
        "description",
        "requirements",
        "benefits"
    ];

    return importantFields.some(
        field => Boolean(jobData[field])
    );

}


// 7. PREDICTION API

async function analyzeJob(jobData, statusElement, submitButton) {

    if (!hasJobInformation(jobData)) {

        showStatus(
            statusElement,
            "Please enter at least one job detail.",
            "error"
        );

        return null;
    }

    const originalText = submitButton?.textContent || "";

    try {

        if (submitButton) {

            submitButton.disabled = true;
            submitButton.textContent = "Analyzing...";

        }

        showStatus(
            statusElement,
            "Analyzing job details using ScamGuard AI..."
        );

        const response = await fetch(
            `${API_BASE_URL}/predict`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(jobData)
            }
        );

        const result = await readApiResponse(response);

        console.log("Prediction API Response:", result);

        displayPrediction(result);

        showStatus(
            statusElement,
            "Job prediction completed successfully!",
            "success"
        );

        return result;

    } catch (error) {

        console.error("Prediction Error:", error);

        showStatus(
            statusElement,
            error.message.includes("Failed to fetch")
                ? "Cannot connect to backend. Check FastAPI."
                : `Prediction failed: ${error.message}`,
            "error"
        );

        return null;

    } finally {

        if (submitButton) {

            submitButton.disabled = false;
            submitButton.textContent = originalText;

        }

    }
}


// 8. MANUAL ANALYSIS

if (manualJobForm) {

    manualJobForm.addEventListener("submit", async event => {

        event.preventDefault();

        const jobData = getJobData(manualJobForm);

        const submitButton =
            manualJobForm.querySelector('button[type="submit"]');

        await analyzeJob(
            jobData,
            manualStatus,
            submitButton
        );

    });

}


// 9. IMAGE VALIDATION

function isValidImage(file) {

    if (!file) return false;

    const allowedTypes = [
        "image/jpeg",
        "image/png"
    ];

    const allowedExtensions = /\.(jpg|jpeg|png)$/i;

    return (
        allowedTypes.includes(file.type) ||
        allowedExtensions.test(file.name)
    );

}


// 10. IMAGE PREVIEW HELPERS

function clearImagePreview() {

    if (previewImageUrl) {

        URL.revokeObjectURL(previewImageUrl);

        previewImageUrl = null;

    }

    if (imagePreview) {
        imagePreview.removeAttribute("src");
    }

    if (imagePreviewContainer) {
        imagePreviewContainer.classList.add("hidden");
    }

}


function displayImagePreview(file) {

    if (!file || !imagePreview || !imagePreviewContainer) {
        return;
    }

    // Remove previous preview URL.
    if (previewImageUrl) {

        URL.revokeObjectURL(previewImageUrl);

        previewImageUrl = null;

    }

    // Create preview URL for selected image.
    previewImageUrl = URL.createObjectURL(file);

    imagePreview.src = previewImageUrl;

    imagePreviewContainer.classList.remove("hidden");

}


// 11. CLEAR OLD PREDICTION ONLY

// IMPORTANT:
// Do not hide ocrResult here.
// Do not hide imagePreviewContainer here.
// Keep scanner UI and image preview visible.

function resetScannerResults() {

    predictionResult?.classList.add("hidden");

    if (predictionOutput) {
        predictionOutput.replaceChildren();
    }

    showStatus(ocrAnalysisStatus, "");

}


// 12. SELECT IMAGE

function handleSelectedImage(file) {

    if (!file) {

        selectedImageFile = null;

        clearImagePreview();

        if (fileName) {
            fileName.textContent = "";
        }

        showStatus(
            scanStatus,
            "Please select an image.",
            "error"
        );

        return;
    }

    if (!isValidImage(file)) {

        selectedImageFile = null;

        if (jobImage) {
            jobImage.value = "";
        }

        if (fileName) {
            fileName.textContent = "";
        }

        clearImagePreview();

        showStatus(
            scanStatus,
            "Only JPG, JPEG and PNG images are supported.",
            "error"
        );

        return;
    }

    selectedImageFile = file;

    if (fileName) {
        fileName.textContent = `Selected file: ${file.name}`;
    }

    // Show selected image preview.
    displayImagePreview(file);

    // Clear previous prediction without hiding scanner UI.
    resetScannerResults();

    showStatus(
        scanStatus,
        "Image selected successfully. Click Scan Advertisement.",
        "success"
    );

    console.log("Image selected successfully:", {
        name: file.name,
        size: file.size,
        type: file.type
    });

}


// 13. BROWSE IMAGE

if (browseButton && jobImage) {

    browseButton.addEventListener("keydown", event => {

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {

            event.preventDefault();

            jobImage.click();

        }

    });

}


// 14. FILE INPUT CHANGE EVENT

if (jobImage) {

    jobImage.addEventListener("change", event => {

        const file = event.target.files?.[0] || null;

        handleSelectedImage(file);

    });

}


// 15. DRAG AND DROP

if (uploadArea && jobImage) {

    uploadArea.addEventListener("dragover", event => {

        event.preventDefault();

        uploadArea.classList.add("drag-over");

    });


    uploadArea.addEventListener("dragleave", () => {

        uploadArea.classList.remove("drag-over");

    });


    uploadArea.addEventListener("drop", event => {

        event.preventDefault();

        uploadArea.classList.remove("drag-over");

        const file = event.dataTransfer?.files?.[0];

        if (!file) return;

        if (!isValidImage(file)) {

            showStatus(
                scanStatus,
                "Only JPG, JPEG and PNG images are supported.",
                "error"
            );

            return;
        }

        try {

            const transfer = new DataTransfer();

            transfer.items.add(file);

            jobImage.files = transfer.files;

        } catch (error) {

            console.warn(
                "Could not assign dropped file to input:",
                error
            );

        }

        handleSelectedImage(file);

    });

}


// 16. FILL EXTRACTED JOB DETAILS

function fillExtractedJobDetails(jobDetails) {

    if (!jobDetails || typeof jobDetails !== "object") {

        throw new Error(
            "No job details were returned by OCR."
        );

    }

    if (!jobDetailsForm) {

        throw new Error(
            "Job details form was not found."
        );

    }

    let filledFields = 0;

    JOB_FIELDS.forEach(field => {

        const input =
            jobDetailsForm.elements.namedItem(field);

        if (!input) {

            console.warn(`Missing form field: ${field}`);

            return;
        }

        const value = jobDetails[field];

        input.value =
            value !== undefined && value !== null
                ? String(value)
                : "";

        if (String(input.value).trim()) {
            filledFields++;
        }

    });

    console.log(`OCR populated ${filledFields} job fields.`);

    return filledFields;

}


// 17. SCAN IMAGE + AUTOMATIC PREDICTION

async function scanImage() {

    if (isScanning) {

        console.warn("A scan is already in progress.");

        return;
    }

    const file =
        jobImage?.files?.[0] || selectedImageFile;

    console.log("Scan button clicked.");

    console.log("Selected image:", file);


    if (!file) {

        showStatus(
            scanStatus,
            "Please select an image before scanning.",
            "error"
        );

        return;
    }


    if (!isValidImage(file)) {

        showStatus(
            scanStatus,
            "Please select a valid JPG, JPEG or PNG image.",
            "error"
        );

        return;
    }


    isScanning = true;

    const originalText = scanButton?.textContent || "";


    try {

        // Disable button while scanning.

        if (scanButton) {

            scanButton.disabled = true;

            scanButton.textContent = "Scanning Image...";

        }


        // IMPORTANT:
        // Do not hide the image preview.
        // Do not hide the OCR section.
        // Do not clear the selected image.


        predictionResult?.classList.add("hidden");

        if (predictionOutput) {
            predictionOutput.replaceChildren();
        }


        showStatus(
            scanStatus,
            "Uploading image and extracting job details..."
        );


        // STEP 1: Upload image for OCR

        const formData = new FormData();

        formData.append("file", file, file.name);


        console.log("Sending image to OCR API...");


        const response = await fetch(
            `${API_BASE_URL}/scan-image`,
            {
                method: "POST",
                body: formData
            }
        );


        console.log("OCR response status:", response.status);


        const result = await readApiResponse(response);


        console.log("Complete OCR API response:", result);

        console.log("Extracted job details:", result.job_details);


        if (!result.job_details) {

            throw new Error(
                result.message || "No job details were extracted."
            );

        }


        // STEP 2: Fill extracted details in form

        const filledFields =
            fillExtractedJobDetails(result.job_details);


        // STEP 3: Display OCR result section

        if (!ocrResult) {

            throw new Error(
                "OCR result section was not found in HTML."
            );

        }

        ocrResult.classList.remove("hidden");

        ocrResult.style.display = "";


        console.log(`OCR completed. ${filledFields} fields populated.`);


        if (filledFields === 0) {

            showStatus(
                scanStatus,
                "Image scanned, but no useful job details were extracted.",
                "error"
            );

            return;

        }


        // STEP 4: Automatic ML prediction

        showStatus(
            scanStatus,
            "Job details extracted successfully! Starting prediction..."
        );

        showStatus(
            ocrAnalysisStatus,
            "Running automatic ML prediction..."
        );

        console.log("Starting automatic ML prediction...");


        const prediction = await analyzeJob(
            result.job_details,
            ocrAnalysisStatus,
            null
        );


        // STEP 5: Final status

        if (prediction) {

            showStatus(
                scanStatus,
                "Image scanned and prediction generated successfully!",
                "success"
            );

            console.log(
                "Automatic prediction completed:",
                prediction
            );

        } else {

            showStatus(
                scanStatus,
                "Job details extracted, but prediction failed. Check the prediction status below.",
                "error"
            );

        }


        // STEP 6: Scroll to the result

        if (
            predictionResult &&
            !predictionResult.classList.contains("hidden")
        ) {

            predictionResult.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } else if (ocrResult) {

            ocrResult.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }

    } catch (error) {

        console.error("OCR Scanning Error:", error);

        showStatus(
            scanStatus,
            error.message.includes("Failed to fetch")
                ? "Cannot connect to backend. Check FastAPI on port 8000."
                : `Scanning failed: ${error.message}`,
            "error"
        );

    } finally {

        isScanning = false;

        if (scanButton) {

            scanButton.disabled = false;

            scanButton.textContent = originalText;

        }

        console.log("Scanner process finished.");

    }

}


// 18. SCAN BUTTON EVENT

if (scanButton) {

    scanButton.type = "button";

    scanButton.addEventListener("click", event => {

        event.preventDefault();

        event.stopPropagation();

        scanImage();

    });

} else {

    console.error("Scan button was not found.");

}


// 19. OCR FORM MANUAL PREDICTION

if (jobDetailsForm) {

    jobDetailsForm.addEventListener("submit", async event => {

        event.preventDefault();

        const jobData = getJobData(jobDetailsForm);

        const submitButton =
            jobDetailsForm.querySelector('button[type="submit"]');

        await analyzeJob(
            jobData,
            ocrAnalysisStatus,
            submitButton
        );

    });

}


// 20. DISPLAY PREDICTION

function displayPrediction(result) {

    if (!predictionOutput || !predictionResult) {

        console.error(
            "Prediction result elements are missing."
        );

        return;
    }


    predictionOutput.replaceChildren();


    const probability = Number(result.scam_probability);

    const safeProbability =
        Number.isFinite(probability)
            ? Math.min(100, Math.max(0, probability))
            : 0;


    const riskLevel = String(result.risk_level || "Unknown");


    const riskClasses = {
        Low: "risk-low",
        Medium: "risk-medium",
        High: "risk-high"
    };


    // Prediction summary

    const summary = document.createElement("div");

    summary.className = "prediction-summary";


    function createCard(title, value) {

        const card = document.createElement("div");

        card.className = "prediction-card";


        const heading = document.createElement("h4");

        heading.textContent = title;


        const strong = document.createElement("strong");

        strong.textContent = value;


        card.append(heading, strong);


        return {
            card,
            strong
        };

    }


    // ML Prediction

    const predictionCard = createCard(
        "ML Prediction",
        result.prediction || "Unknown"
    );


    // Scam Probability

    const probabilityCard = createCard(
        "Scam Probability",
        `${safeProbability.toFixed(2)}%`
    );


    const track = document.createElement("div");

    track.className = "probability-track";


    const fill = document.createElement("div");

    fill.className = "probability-fill";

    fill.style.width = `${safeProbability}%`;


    track.appendChild(fill);

    probabilityCard.card.appendChild(track);


    // Risk Level

    const riskCard = createCard(
        "Risk Level",
        riskLevel
    );


    if (riskClasses[riskLevel]) {

        riskCard.strong.classList.add(
            riskClasses[riskLevel]
        );

    }


    summary.append(
        predictionCard.card,
        probabilityCard.card,
        riskCard.card
    );


    // AI Explanation

    const explanationCard = document.createElement("div");

    explanationCard.className = "ai-explanation";


    const heading = document.createElement("h3");

    heading.textContent = "🤖 AI Explanation";


    const explanation = document.createElement("p");

    explanation.textContent =
        result.ai_explanation ||
        "AI explanation is unavailable.";


    explanationCard.append(heading, explanation);


    // Disclaimer

    const disclaimer = document.createElement("p");

    disclaimer.className = "prediction-disclaimer";

    disclaimer.textContent =
        "This prediction is an estimate based on historical job posting patterns, not proof of fraud or legitimacy. Always verify employers independently.";


    predictionOutput.append(
        summary,
        explanationCard,
        disclaimer
    );


    // Show prediction section

    predictionResult.classList.remove("hidden");

    predictionResult.style.display = "";


    predictionResult.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// 21. CHAT MESSAGE DISPLAY

function addChatMessage(message, sender) {

    if (!chatMessages) return;


    const wrapper = document.createElement("div");

    wrapper.className =
        sender === "user"
            ? "chat-message user-message"
            : "chat-message bot-message";


    const avatar = document.createElement("div");

    avatar.className = "message-avatar";

    avatar.textContent =
        sender === "user" ? "👤" : "🤖";


    const content = document.createElement("div");

    content.className = "message-content";


    const senderName = document.createElement("span");

    senderName.className = "message-sender";

    senderName.textContent =
        sender === "user" ? "You" : "ScamGuard Assistant";


    const bubble = document.createElement("div");

    bubble.className = "message-bubble";

    bubble.textContent = String(message);


    content.append(senderName, bubble);

    wrapper.append(avatar, content);


    chatMessages.appendChild(wrapper);

    chatMessages.scrollTop = chatMessages.scrollHeight;

}


// 22. CHAT API

async function sendChatMessage(message) {

    const userMessage = String(message || "").trim();

    if (!userMessage) return;

    if (!chatInput || !sendChatButton) return;


    if (userMessage.length > 2000) {

        showStatus(
            chatStatus,
            "Message cannot exceed 2000 characters.",
            "error"
        );

        return;

    }


    addChatMessage(userMessage, "user");

    chatInput.value = "";

    chatInput.disabled = true;

    sendChatButton.disabled = true;

    sendChatButton.textContent = "Sending...";


    if (typingIndicator) {
        typingIndicator.classList.remove("hidden");
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/chat`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: userMessage,
                    history: chatHistory.slice(-10)
                })

            }
        );


        const result = await readApiResponse(response);


        const aiMessage =
            result.response ||
            result.reply ||
            result.answer;


        if (
            typeof aiMessage !== "string" ||
            !aiMessage.trim()
        ) {

            throw new Error(
                "The AI returned an empty response."
            );

        }


        addChatMessage(aiMessage, "bot");


        chatHistory.push(
            {
                role: "user",
                content: userMessage
            },
            {
                role: "assistant",
                content: aiMessage
            }
        );


        chatHistory = chatHistory.slice(-10);


    } catch (error) {

        console.error("Chatbot Error:", error);

        addChatMessage(error.message, "bot");

        showStatus(
            chatStatus,
            "Unable to generate a response. Please try again.",
            "error"
        );

    } finally {

        if (typingIndicator) {
            typingIndicator.classList.add("hidden");
        }

        chatInput.disabled = false;

        sendChatButton.disabled = false;

        sendChatButton.textContent = "Send ➤";

        chatInput.focus();

    }

}


// 23. CHAT FORM

if (chatForm && chatInput) {

    chatForm.addEventListener("submit", async event => {

        event.preventDefault();

        await sendChatMessage(chatInput.value);

    });

}


// 24. SUGGESTED QUESTIONS

if (suggestedQuestions) {

    suggestedQuestions
        .querySelectorAll(".suggestion-button")
        .forEach(button => {

            button.addEventListener("click", async () => {

                if (sendChatButton?.disabled) return;

                await sendChatMessage(
                    button.textContent.trim()
                );

            });

        });

}


// 25. CLEAR CHAT

if (clearChatButton) {

    clearChatButton.addEventListener("click", () => {

        chatHistory = [];


        if (chatMessages) {

            chatMessages.replaceChildren();

            addChatMessage(
                "Hello! 👋 Welcome to ScamGuard Assistant. I can help you identify fake job offers, understand recruitment scams, verify recruiters and learn safe job-search practices. How can I help you?",
                "bot"
            );

        }


        if (chatInput) {

            chatInput.value = "";

            chatInput.focus();

        }


        showStatus(chatStatus, "");

        typingIndicator?.classList.add("hidden");

    });

}


// 26. SIDEBAR NAVIGATION

const navigationLinks =
    document.querySelectorAll(".nav-link");


navigationLinks.forEach(link => {

    link.addEventListener("click", () => {

        navigationLinks.forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");

    });

});


// 27. INITIALIZATION

console.log(
    "ScamGuard AI frontend initialized successfully."
);

console.log("Backend URL:", API_BASE_URL);


console.log("Scanner elements:", {
    jobImage,
    browseButton,
    scanButton,
    uploadArea,
    fileName,
    imagePreviewContainer,
    imagePreview,
    ocrResult,
    jobDetailsForm,
    predictionResult,
    predictionOutput
});


if (
    jobImage &&
    scanButton &&
    ocrResult &&
    jobDetailsForm
) {

    console.log(
        "Screenshot Scanner initialized successfully."
    );

} else {

    console.error(
        "Scanner HTML elements are missing."
    );

}


if (
    chatForm &&
    chatInput &&
    chatMessages
) {

    console.log(
        "ScamGuard Assistant initialized successfully."
    );

}
