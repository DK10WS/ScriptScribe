const inputForm = document.getElementById('inputForm');
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');

const summarizeButton = document.getElementById('summarizeButton');
const summarizedText = document.getElementById('summarizedText');
const extractionPage = document.getElementById('extractionPage');

const copyClipboard = document.getElementById('copyClipboard');
const downloadPdf = document.getElementById('downloadPDF');

const entirePage = document.getElementById('entirePage');
const authContainer = document.querySelector('.auth-container');
const usernameInput = document.getElementById('authUsername');
const passwordInput = document.getElementById('authPassword');
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');

const errorMessage = document.getElementById('errorMessage');
const clipboardToast = document.getElementById('clipboardToast');

const URL = "http://localhost:5000"

const autoResize = () => {
    textInput.style.height = 'auto';
    textInput.style.height = `${textInput.scrollHeight}px`;
};

loginButton.addEventListener('click', async (event) => {
    event.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;
    const jsonData = {
        "username": `${username}`,
        "password": `${password}`
    };

    if (username == '' || password == '') {
        errorMessage.innerText = 'username or password empty';
        errorMessage.style.color = 'red';
        return;
    }

    const response = await fetch(`${URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    });

    const data = await response.json();

    if (data["isSuccessful"]) {
        authContainer.remove();
        entirePage.classList.remove('hidden');
    } else {
        errorMessage.innerText = `${data['message']}`;
        errorMessage.style.color = 'red';
    }
});

signupButton.addEventListener('click', async (event) => {
    event.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;
    const jsonData = {
        "username": `${username}`,
        "password": `${password}`
    };

    if (username == '' || password == '') {
        errorMessage.innerText = 'username or password empty';
        errorMessage.style.color = 'red';
        return;
    }

    const response = await fetch(`${URL}/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    });

    const data = await response.json();
    console.log(data)

    if (!data["isSuccessful"]) {
        errorMessage.innerText = `${data['message']}`;
        errorMessage.style.color = 'red';
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
    clipboardToast.innerText = 'Copied to clipboard!';
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
