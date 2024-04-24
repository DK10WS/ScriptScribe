const inputForm = document.getElementById('inputForm');
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');

const summarizeButton = document.getElementById('summarizeButton');
const summarizedText = document.getElementById('summarizedText');
const extractionPage = document.getElementById('extractionPage');

const copyClipboard = document.getElementById('copyClipboard');
const downloadPdf = document.getElementById('downloadPDF');

const isLoggedIn = localStorage.getItem('isLoggedIn');
const logoutButton = document.getElementById('logout');
const showUsername = document.getElementById('showUsername');

const URL = "http://localhost:5000"

if (isLoggedIn == 'false') {
    window.location.href = 'index.html';
} else {
    const username = localStorage.getItem('username');
    console.log(`User ${username} is authenticated!`);
    showUsername.innerText = username;
}

logoutButton.addEventListener('click', () => {
    localStorage.setItem('isLoggedIn', 'false');
    localStorage.setItem('username', '');
    showUsername.innerText = '';
    window.location.href = 'index.html';
});

const autoResize = () => {
    textInput.style.height = 'auto';
    textInput.style.height = `${textInput.scrollHeight}px`;
};

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
