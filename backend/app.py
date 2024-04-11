from flask import Flask, request, jsonify, make_response, send_file, redirect, url_for
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required
from fpdf import FPDF
from PIL import Image
from werkzeug.security import generate_password_hash, check_password_hash
import cv2
import datetime
import heapq
import numpy as np
import nltk
import os
import pytesseract
import textwrap

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://root:testpass@mysql-container:3306/db_name'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = '9a5d47755a8f2e7498ad96ae12cad0ab'
db = SQLAlchemy(app)

login_manager = LoginManager(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return f"User('{self.username}')"

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()

    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Username and password are required'}), 400

    username = data['username']
    password = data['password']

    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 409

    new_user = User(username=username, password=password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        login_user(user)
        return jsonify({'message': 'Login successful'}), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/ocr', methods=['POST'])
@login_required
def ocr():
    if 'image' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['image']
    img = Image.open(file.stream)
    
    custom_config = r"--psm 1 --oem 3"
    recognized_text = pytesseract.image_to_string(img, config=custom_config)
    recognized_text = recognized_text.replace('\n', ' ')

    return jsonify({'text': recognized_text}), 200

@app.route('/summarize', methods=['POST'])
@login_required
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
@login_required
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
    db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)