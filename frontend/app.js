const inputForm = document.getElementById('inputForm');
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');

const summarizeButton = document.getElementById('summarizeButton');
const summarizedText = document.getElementById('summarizedText');
const extractionPage = document.getElementById('extractionPage');

const copyClipboard = document.getElementById('copyClipboard');
const downloadPdf = document.getElementById('downloadPDF');

const loginSection = document.getElementById('loginSection');
const loginForm = document.getElementById('loginForm');
const userNameInput = document.getElementById('userName');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');

const signupSection = document.getElementById('signupSection');
const signupForm = document.getElementById('signupForm');
const signupUsernameInput = document.getElementById('signupUsername');
const signupPasswordInput = document.getElementById('signupPassword');
const signupButton = document.getElementById('signupButton');

const URL = "http://localhost:5000"

const autoResize = () => {
    textInput.style.height = 'auto';
    textInput.style.height = `${textInput.scrollHeight}px`;
};

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = userNameInput.value;
    const password = passwordInput.value;
    const jsonData = {
        "username": `${username}`,
        "password": `${password}`
    };

    const response = await fetch(`${URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    });

    const data = await response.json();

    if (response.ok) {
        console.log(`user: ${username} logged in`);
        loginSection.classList.add("hidden");
        signupSection.classList.add("hidden");
    } else {
        console.log(`user: ${username} failed to log in`);
    }

});

signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = signupUsernameInput.value;
    const password = signupPasswordInput.value;
    const jsonData = {
        "username": `${username}`,
        "password": `${password}`
    };

    const response = await fetch(`${URL}/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    });

    const data = await response.json();
    console.log(data)

    if (data["isSuccesful"]) {
        console.log(`user: ${username} signed up`);
        signupSection.classList.add("hidden");
    } else {
        console.log(`user: ${username} failed to sign up`);
    }
});

inputForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    const response = await fetch(`${URL}/ocr`, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();

    textInput.value = data.text;
    autoResize();
});

textInput.addEventListener('input', autoResize);

summarizeButton.addEventListener('click', async () => {
    const extractedText = textInput.value;
    const jsonData = {
        "text" : `${extractedText}`
    };

    const response = await fetch(`${URL}/summarize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    });

    const data = await response.json();
    summarizedText.innerText = data.summary;
    extractionPage.classList.remove("hidden");
    downloadPdf.classList.remove("hidden");
});

copyClipboard.addEventListener('click', async () => {
    const summary = summarizedText.innerHTML;
    await navigator.clipboard.writeText(summary);
    alert("Summary copied to clipboard!");
});

downloadPdf.addEventListener('click', async () => {
    const extractedText = textInput.value;
    const summary = summarizedText.innerHTML;

    const jsonData = {
        "text": `${extractedText}`,
        "summary": `${summary}`
    }

    fetch(`${URL}/exportpdf`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    })
        .then( res => res.blob() )
        .then( blob => {
            var file = window.URL.createObjectURL(blob);
            window.location.assign(file);
    });
});