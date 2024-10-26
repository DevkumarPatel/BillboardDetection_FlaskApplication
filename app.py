from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
import os
from flask import Flask, request, jsonify, send_file
from io import BytesIO
from ultralytics import YOLO
import cv2 
from ultralytics.engine.results import Results, OBB
from typing import Optional, List, Tuple

import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS if needed

# Route to serve the main page
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Read image file
    file_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    
    if img is None:
        return jsonify({'error': 'Failed to decode image'}), 400

    # Load model and make predictions
    model = YOLO("models/fusedbillboard.pt")
    initial_results: List[Results] = model.predict(img, save=False, verbose=False)

    # Draw predictions
    color = (255, 0, 0)  # Green color for OBB
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1
    font_thickness = 2
    
    # make line thickness based on image size
    h, w, _ = img.shape 
    line_thickness = max(1, int((h + w) / 600))
    
    # Create a copy of the image for drawing
    output_img = img.copy()
    
    for res in initial_results[0].obb:
        conf = res.conf.item()
        obb_coords = res.xyxyxyxy.cpu().numpy()[0]
        
        # Draw the OBB using the coordinates
        for i in range(4):
            pt1 = tuple(map(int, obb_coords[i]))
            pt2 = tuple(map(int, obb_coords[(i + 1) % 4]))
            cv2.line(output_img, pt1, pt2, color, line_thickness)

        # Add label with confidence
        label = f'billboard {conf:.2f}'
        label_pos = (int(obb_coords[0][0]), int(obb_coords[0][1]) - 10)
    
    # Convert the processed image back to bytes
    is_success, buffer = cv2.imencode('.jpg', output_img)
    if not is_success:
        return jsonify({'error': 'Failed to encode output image'}), 500
    
    # Create BytesIO object from the buffer
    io_buf = BytesIO(buffer)
    
    # Return the processed image
    return send_file(
        io_buf,
        mimetype='image/jpeg',
        as_attachment=True,
        download_name='processed_' + file.filename
    )
# Route to serve the ONNX model
@app.route('/models/<path:filename>')
def serve_model(filename):
    return send_from_directory(os.path.join(app.root_path, 'static', 'models'), filename)

# Route to serve other static files (CSS, JS, etc.)
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(os.path.join(app.root_path, 'static'), filename)

# Add a route specifically for the example image
@app.route('/static/imgs/<path:filename>')
def serve_example_image(filename):
    return send_from_directory(os.path.join(app.root_path, 'static', 'imgs'), filename)


if __name__ == '__main__':
    app.run(debug=True, port=5001)
