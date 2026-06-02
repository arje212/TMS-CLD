"""
RFID Local Server — para sa HID OmniKey 5022
I-run ito sa terminal: python rfid_server.py
Auto-starts scanning on launch.
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
uid_consumed = False   # ← FIX: track if UID was already read
reader = None
is_scanning = False
scan_thread = None
uid_lock = threading.Lock()

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
            print("❌ No RFID reader found — retrying...")
            return False
    except Exception as e:
        print(f"❌ init_reader error: {e}")
        return False


def scan_loop():
    global current_uid, uid_consumed, is_scanning
    print("🔄 Scan loop started")
    last_raw_uid = None  # ← track previous raw UID to detect new tap

    while is_scanning:
        try:
            if reader is None:
                if not init_reader():
                    time.sleep(2)
                    continue

            connection = reader.createConnection()
            connection.connect()
            data, sw1, sw2 = connection.transmit(GET_UID)

            if sw1 == 0x90 and len(data) > 0:
                # ✅ FIX: Remove spaces so "EB 67 3E F5" → "EB673EF5"
                uid = toHexString(data).replace(" ", "").upper()

                with uid_lock:
                    # Only update current_uid if it's a NEW card tap
                    if uid != last_raw_uid:
                        current_uid = uid
                        uid_consumed = False  # fresh tap, reset consumed flag
                        print(f"✅ New card detected: {uid}")
                    last_raw_uid = uid
            else:
                with uid_lock:
                    # Card removed — reset so next tap is treated as new
                    if last_raw_uid is not None:
                        print("🃏 Card removed")
                    current_uid = None
                    uid_consumed = False
                    last_raw_uid = None

            connection.disconnect()

        except NoCardException:
            with uid_lock:
                if last_raw_uid is not None:
                    print("🃏 Card removed (NoCardException)")
                current_uid = None
                uid_consumed = False
            last_raw_uid = None

        except CardConnectionException:
            with uid_lock:
                current_uid = None
                uid_consumed = False
            last_raw_uid = None

        except Exception as e:
            print(f"❌ Scan error: {e}")
            with uid_lock:
                current_uid = None
                uid_consumed = False
            last_raw_uid = None
            time.sleep(0.5)

        time.sleep(0.3)

    print("🛑 Scan loop stopped")


def auto_start():
    """Auto-start scanning when server launches. Retry until reader is found."""
    global is_scanning, scan_thread, reader
    print("⏳ Auto-starting RFID scan...")
    time.sleep(1)
    while True:
        reader = None
        if init_reader():
            if not is_scanning:
                is_scanning = True
                scan_thread = threading.Thread(target=scan_loop, daemon=True)
                scan_thread.start()
                print("▶️  Auto-scan started!")
            break
        else:
            print("🔁 Reader not found, retrying in 3 seconds...")
            time.sleep(3)


@app.route("/start")
def start_scan():
    global is_scanning, scan_thread, reader
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
    global is_scanning, current_uid, uid_consumed
    is_scanning = False
    with uid_lock:
        current_uid = None
        uid_consumed = False
    print("⏹️  Scanning stopped")
    return jsonify({"success": True})


@app.route("/uid")
def get_uid():
    global uid_consumed
    with uid_lock:
        # Only return the UID once — mark as consumed after first read
        if uid_consumed:
            return jsonify({"uid": None})
        uid = current_uid
        if uid is not None:
            uid_consumed = True  # mark as consumed so next poll gets nothing
    return jsonify({"uid": uid})


@app.route("/status")
def status():
    with uid_lock:
        uid = current_uid
        consumed = uid_consumed
    return jsonify({
        "scanning": is_scanning,
        "reader": str(reader) if reader else None,
        "uid": uid,
        "uid_consumed": consumed,
    })


if __name__ == "__main__":
    print("🚀 RFID Server — http://localhost:5050")
    print("   /start  → simulan ang scanning")
    print("   /stop   → ihinto ang scanning")
    print("   /uid    → current UID (one-shot, consumed after read)")
    print("   /status → status ng reader")

    # Auto-start scanning in background thread
    threading.Thread(target=auto_start, daemon=True).start()

    app.run(host="0.0.0.0", port=5050, debug=False)