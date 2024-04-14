from flask import Flask, request, jsonify, make_response, send_file
from flask_cors import CORS
from fpdf import FPDF
from PIL import Image
import datetime
import hashlib
import heapq
import json
import numpy as np
import nltk
import os
import pytesseract
import textwrap

app = Flask(__name__)
CORS(app)

def check_user(username, json_data, jsondb):
    with open(jsondb, "r") as file:
        user_data = json.load(file)

    user_list = user_data.get("users", [])
    for user in user_list:
        if user['username'] == username:
            return True
    return False

def salty_pass(password):
    salt = 'scriptscribeftw'
    salted_pass = password + salt

    hashed_pass = hashlib.md5(salted_pass.encode())
    return hashed_pass.hexdigest()

@app.route('/login', methods=['POST'])
def auth():
    data = request.get_json()

    if 'username' not in data or 'password' not in data:
        return jsonify({
            'message': 'either username or password missing',
            'isSuccesful': False
            }), 200
    
    username = data['username']
    password = data['password']

    if not check_user(username, data, "users.json"):
        return jsonify({
            'error': 'user does not exist',
            'isSuccesful': False
            }), 200
    
    def user_auth(username, password):
        with open("users.json", "r") as file:
            user_data = json.load(file)

        user_list = user_data.get("users", [])
        for user in user_list:
            if user['username'] == username:
                if (salty_pass(password) == user['password']):
                    return True
        return False

    if user_auth(username, password):
        return jsonify({
            'message': 'logged in',
            'isSuccesful': True
            }), 200
    else:
        return jsonify({
            'message': 'incorrect password',
            'isSuccesful': False
            }), 200
    
@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()

    if 'username' not in data or 'password' not in data:
        return jsonify({
            'message': 'either username or password missing',
            'isSuccesful': False
        }), 200

    username = data['username']
    password = data['password']

    if check_user(username, data, "users.json"):
        return jsonify({
            'error': 'username already taken',
            'isSuccesful': False
            }), 200

    hashed_pass = salty_pass(password)

    new_user = {
        "username": username,
        "password": hashed_pass
    }

    with open("users.json", "r") as file:
        user_data = json.load(file)
        user_data["users"].append(new_user)

    with open("users.json", "w") as file:
        json.dump(user_data, file, indent=4)

    return jsonify({
        'message': 'signed up',
        'isSuccesful': True
        }), 200

@app.route('/ocr', methods=['POST'])
def ocr():
    if 'image' not in request.files:
        return jsonify({
            'error': 'No file uploaded'}), 400

    file = request.files['image']
    img = Image.open(file.stream)
    
    custom_config = r"--psm 1 --oem 3"
    recognized_text = pytesseract.image_to_string(img, config=custom_config)
    recognized_text = recognized_text.replace('\n', ' ')

    return jsonify({'text': recognized_text}), 200

@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json()

    if 'text' not in data:
        return jsonify({'error': 'Text field is required'}), 400

    text = data['text']
    sentences = nltk.sent_tokenize(text)
    num_sentences = len(sentences)
    if num_sentences//3 > 0:
        sum_sentences = num_sentences//3
    else:
        sum_sentences = 1

    word_frequencies = {}
    for word in nltk.word_tokenize(text):
        if word.lower() not in nltk.corpus.stopwords.words('english'):
            if word.lower() not in word_frequencies:
                word_frequencies[word.lower()] = 1
            else:
                word_frequencies[word.lower()] += 1

    maximum_frequency = max(word_frequencies.values())
    for word in word_frequencies:
        word_frequencies[word] = word_frequencies[word] / maximum_frequency

    sentence_scores = {}
    for sentence in sentences:
        for word in nltk.word_tokenize(sentence.lower()):
            if word in word_frequencies:
                if sentence not in sentence_scores:
                    sentence_scores[sentence] = word_frequencies[word]
                else:
                    sentence_scores[sentence] += word_frequencies[word]

    num_sentences = min(sum_sentences, len(sentences))
    summary_sentences = heapq.nlargest(num_sentences, sentence_scores, key=sentence_scores.get)
    summary = ' '.join(summary_sentences)

    return jsonify({'summary': summary}), 200

@app.route('/exportpdf', methods=['POST'])
def exportPdf():
    data = request.get_json()

    if 'text' not in data or 'summary' not in data:
        return jsonify({'error': 'Text and summary fields are required'}), 400

    for file in os.listdir():
        if file.endswith('.pdf'):
            os.remove(file)

    text = data['text']
    summary = data['summary']

    a4_width_mm = 210
    pt_to_mm = 0.35
    fontsize_pt = 10
    fontsize_mm = fontsize_pt * pt_to_mm
    margin_bottom_mm = 10
    character_width_mm = 7 * pt_to_mm
    width_text = a4_width_mm / character_width_mm

    pdf = FPDF(orientation='P', unit='mm', format='A4')
    pdf.set_auto_page_break(True, margin=margin_bottom_mm)
    pdf.add_page()
    pdf.set_font(family='Courier', size=fontsize_pt)

    pdf.set_font('Courier', 'B', 16)
    pdf.cell(200, 10, txt="ScriptScribe", ln=1, align='C')

    pdf.set_line_width(0.5)
    pdf.line(10, pdf.get_y(), 200 - 10, pdf.get_y())

    pdf.ln(10)

    pdf.set_font('Courier', 'B', fontsize_pt)
    process_text(pdf, "Input:", width_text, fontsize_mm)
    pdf.set_font('Courier', '', fontsize_pt)
    process_text(pdf, text, width_text, fontsize_mm)

    pdf.ln(10)

    pdf.set_font('Courier', 'B', fontsize_pt)
    process_text(pdf, "Summary:", width_text, fontsize_mm)
    pdf.set_font('Courier', '', fontsize_pt)
    process_text(pdf, summary, width_text, fontsize_mm)

    current_time = datetime.datetime.now()
    timestamp = current_time.strftime("%y%m%d_%H%M%S")
    pdf_path = f"scriptscribe_exported-{timestamp}.pdf" 

    pdf.output(pdf_path, 'F')

    if not os.path.exists(pdf_path):
        return jsonify({'error': 'PDF file not found'}), 404

    return send_file(pdf_path, as_attachment=True), 200

def process_text(pdf, text, width_text, fontsize_mm):
    lines = text.split('\n')
    for line in lines:
        wrapped_lines = textwrap.wrap(line, width_text)
        for wrapped_line in wrapped_lines:
            pdf.cell(0, fontsize_mm, wrapped_line, ln=1)

        if len(wrapped_lines) > 1:
            pdf.ln()

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)