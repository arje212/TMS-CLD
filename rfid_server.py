"""
RFID Local Server — para sa HID OmniKey 5022
I-run ito sa terminal: python rfid_server.py
"""

from flask import Flask, jsonify
from flask_cors import CORS
from smartcard.System import readers
from smartcard.util import toHexString
from smartcard.Exceptions import NoCardException, CardConnectionException
import threading
import time

app = Flask(__name__)
CORS(app, origins="*")

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# Global state
current_uid = None
reader = None
is_scanning = False
scan_thread = None
uid_lock = threading.Lock()  # prevent race conditions

GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]


def init_reader():
    global reader
    try:
        reader_list = readers()
        if reader_list:
            reader = reader_list[0]
            print(f"✅ Reader found: {reader}")
            return True
        else:
            print("❌ No RFID reader found")
            return False
    except Exception as e:
        print(f"❌ init_reader error: {e}")
        return False


def scan_loop():
    global current_uid, is_scanning
    print("🔄 Scan loop started")
    while is_scanning:
        try:
            if reader is None:
                if not init_reader():
                    time.sleep(1)
                    continue

            connection = reader.createConnection()
            connection.connect()
            data, sw1, sw2 = connection.transmit(GET_UID)

            if sw1 == 0x90 and len(data) > 0:
                uid = toHexString(data)
                with uid_lock:
                    current_uid = uid
                print(f"✅ Card detected: {uid}")
            else:
                with uid_lock:
                    current_uid = None

            connection.disconnect()

        except NoCardException:
            # Normal — no card on reader
            with uid_lock:
                current_uid = None

        except CardConnectionException as e:
            print(f"⚠️ Card connection error: {e}")
            with uid_lock:
                current_uid = None

        except Exception as e:
            print(f"❌ Unexpected scan error: {e}")
            with uid_lock:
                current_uid = None
            time.sleep(0.5)

        time.sleep(0.3)

    print("🛑 Scan loop stopped")


@app.route("/start")
def start_scan():
    global is_scanning, scan_thread, reader

    # Re-init reader every time we start
    reader = None
    if not init_reader():
        return jsonify({
            "success": False,
            "message": "Walang nakitang RFID reader. I-check ang USB connection."
        }), 404

    if not is_scanning:
        is_scanning = True
        scan_thread = threading.Thread(target=scan_loop, daemon=True)
        scan_thread.start()
        print("▶️  Scanning started")

    return jsonify({"success": True, "reader": str(reader)})


@app.route("/stop")
def stop_scan():
    global is_scanning, current_uid
    is_scanning = False
    with uid_lock:
        current_uid = None
    print("⏹️  Scanning stopped")
    return jsonify({"success": True})


@app.route("/uid")
def get_uid():
    with uid_lock:
        uid = current_uid
    print(f"📡 /uid polled → {uid}")  # remove this log later if too noisy
    return jsonify({"uid": uid})


@app.route("/status")
def status():
    with uid_lock:
        uid = current_uid
    return jsonify({
        "scanning": is_scanning,
        "reader": str(reader) if reader else None,
        "uid": uid,
    })


if __name__ == "__main__":
    print("🚀 RFID Server — http://localhost:5050")
    print("   /start  → simulan ang scanning")
    print("   /stop   → ihinto ang scanning")
    print("   /uid    → current UID")
    print("   /status → status ng reader")
    app.run(host="0.0.0.0", port=5050, debug=False)