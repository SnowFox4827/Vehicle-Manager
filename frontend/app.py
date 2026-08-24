from flask import Flask, request, send_from_directory, jsonify, Response
import requests
import os

# Paths
HERE = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(HERE, 'app')          # holds index.html
STATIC_DIR = os.path.join(APP_DIR, 'static')

# Backend container hostname (docker-compose service name)
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:5000')

app = Flask(__name__)
session = requests.Session()


@app.route('/')
def index():
    return send_from_directory(APP_DIR, 'index.html')


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(STATIC_DIR, filename)


@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(STATIC_DIR, 'js'), filename)


@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(STATIC_DIR, 'css'), filename)


@app.route('/api/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy_api(path):
    url = f"{BACKEND_URL}/api/{path}"
    headers = {k: v for k, v in request.headers if k.lower() not in ('host', 'content-length')}

    try:
        if request.method == 'GET':
            resp = session.get(url, params=request.args, headers=headers, timeout=60)
        elif request.method == 'POST':
            resp = session.post(url, json=request.get_json(silent=True), data=request.get_data() if not request.is_json else None, headers=headers, timeout=60)
        elif request.method == 'PUT':
            resp = session.put(url, json=request.get_json(silent=True), headers=headers, timeout=60)
        elif request.method == 'DELETE':
            resp = session.delete(url, headers=headers, timeout=60)
        else:
            return jsonify({'error': 'Method not allowed'}), 405

        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        resp_headers = [(name, value) for (name, value) in resp.raw.headers.items()
                        if name.lower() not in excluded_headers]

        return Response(resp.content, resp.status_code, resp_headers)

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Backend unavailable: {str(e)}'}), 502


@app.route('/api/health')
def health():
    return jsonify({'status': 'ok-frontend'})


@app.route('/favicon.ico')
def favicon():
    return ('', 204)


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 80)),
        debug=True
    )
