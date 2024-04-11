document.addEventListener('DOMContentLoaded', () => {
const inputForm = document.getElementById('inputForm');
    const textInput = document.getElementById('textInput');
    const fileInput = document.getElementById('fileInput');

    const summarizeButton = document.getElementById('summarizeButton');
    const summarizedText = document.getElementById('summarizedText');
    const extractionPage = document.getElementById('extractionPage');

    const copyClipboard = document.getElementById('copyClipboard');
    const downloadPdf = document.getElementById('downloadPDF');

    const loginForm = document.getElementById('loginForm');
    const logoutButton = document.getElementById('logoutButton');
    const loginSection = document.getElementById('loginSection');

    const signupForm = document.getElementById('signupForm');
    const signupLink = document.getElementById('signupLink');

    const homepageSection = document.getElementById('homepage');
    const footer = document.querySelector('footer');

    const URL = "http://localhost:5000"

    const showLoggedInContent = () => {
        loginSection.style.display = 'none';
        homepageSection.classList.remove('hidden');
        extractionPage.classList.remove('hidden');
        footer.classList.remove('hidden');
    };

    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
        
            const username = document.getElementById('signupUsername').value;
            const password = document.getElementById('signupPassword').value;
        
            const response = await fetch(`${URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
        
            if (response.ok) {
                alert('Signup successful. Please login.');
            } else {
                const data = await response.json();
                alert(data.error || 'Signup failed. Please try again.');
            }
        });
    } else {
        console.error('Signup form not found in DOM.');
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const response = await fetch(`${URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            alert('Login successful');
            showLoggedInContent();
        } else {
            alert('Invalid username or password');
        }
    });

    signupLink.addEventListener('click', (event) => {
        event.preventDefault();

        alert('Sign Up clicked!');
    });

    logoutButton.addEventListener('click', async () => {
        const response = await fetch(`${URL}/logout`);
        if (response.ok) {
            alert('Logged out successfully');
            location.reload();
        }
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
});