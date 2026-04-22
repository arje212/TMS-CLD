"""
RFID Attendance System
Reads RFID cards and marks attendance in PocketBase
"""

import smartcard
from smartcard.System import readers
from smartcard.util import toHexString
import requests
import json
from datetime import datetime
import time

# Configuration
POCKETBASE_URL = "http://127.0.0.1:8090"
TRAINING_ID = None  # Will be set by user

class RFIDAttendanceSystem:
    def __init__(self, pb_url=POCKETBASE_URL):
        self.pb_url = pb_url
        self.api_url = f"{pb_url}/api/collections"
        self.reader = None
        self.connection = None
        
    def find_reader(self):
        """Find and initialize the RFID reader"""
        try:
            reader_list = readers()
            if not reader_list:
                print("❌ No RFID readers found!")
                return False
            
            self.reader = reader_list[0]
            print(f"✅ Found reader: {self.reader}")
            self.connection = self.reader.createConnection()
            self.connection.connect()
            print("✅ Connected to reader")
            return True
        except Exception as e:
            print(f"❌ Error finding reader: {e}")
            return False
    
    def read_uid(self):
        """Read UID from RFID card"""
        try:
            GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]
            data, sw1, sw2 = self.connection.transmit(GET_UID)
            
            if sw1 == 0x90:  # Success
                uid = toHexString(data)
                return uid
            
            return None
        except smartcard.Exceptions.NoCardException:
            return None
        except Exception:
            return None
    
    def format_uid(self, uid):
        """Format UID - already in correct format from toHexString"""
        return uid
    
    def find_trainee_by_rfid(self, rfid_uid):
        """Find trainee by RFID UID in PocketBase"""
        try:
            url = f"{self.api_url}/trainees/records"
            params = {"filter": f'rfid_uid="{rfid_uid}"'}
            response = requests.get(url, params=params, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('items') and len(data['items']) > 0:
                    return data['items'][0]
            
            return None
        except Exception as e:
            print(f"❌ Error finding trainee: {e}")
            return None
    
    def mark_attendance(self, trainee_id, training_id):
        """Mark attendance for trainee"""
        try:
            url = f"{self.api_url}/attendance/records"
            
            # Check if already marked present
            check_url = f"{self.api_url}/attendance/records"
            check_params = {
                "filter": f'training="{training_id}" && trainee="{trainee_id}" && status="present"'
            }
            check_response = requests.get(check_url, params=check_params, timeout=5)
            
            if check_response.status_code == 200:
                existing = check_response.json()
                if existing.get('items') and len(existing['items']) > 0:
                    return {"success": False, "message": "Already checked in"}
            
            # Create new attendance record
            payload = {
                "training": training_id,
                "trainee": trainee_id,
                "status": "present",
                "timestamp": datetime.now().isoformat()
            }
            
            response = requests.post(url, json=payload, timeout=5)
            
            if response.status_code == 201:
                return {"success": True, "message": "Attendance marked"}
            else:
                return {"success": False, "message": f"Error: {response.status_code}"}
        
        except Exception as e:
            print(f"❌ Error marking attendance: {e}")
            return {"success": False, "message": str(e)}
    
    def run(self, training_id):
        """Main loop - continuously read RFID cards"""
        if not self.find_reader():
            return
        
        print("\n🟢 RFID Attendance System Started")
        print(f"📚 Training ID: {training_id}")
        print("👆 I-tap ang iyong RFID card para sa attendance...\n")
        
        last_uid = None
        last_read_time = 0
        
        try:
            while True:
                try:
                    # Create fresh connection for each read
                    if not self.connection:
                        self.connection = self.reader.createConnection()
                        self.connection.connect()
                    
                    uid = self.read_uid()
                    
                    if uid and uid != last_uid:
                        current_time = time.time()
                        
                        # Debounce: ignore same UID within 2 seconds
                        if current_time - last_read_time >= 2:
                            formatted_uid = self.format_uid(uid)
                            print(f"\n📖 Card detected - UID: {formatted_uid}")
                            
                            trainee = self.find_trainee_by_rfid(formatted_uid)
                            
                            if trainee:
                                result = self.mark_attendance(trainee['id'], training_id)
                                if result['success']:
                                    print(f"✅ {trainee['name']} - {result['message']}")
                                else:
                                    print(f"⚠️  {trainee['name']} - {result['message']}")
                            else:
                                print(f"❌ Trainee not found with RFID: {formatted_uid}")
                            
                            last_uid = uid
                            last_read_time = current_time
                    
                    time.sleep(0.2)
                
                except Exception as e:
                    # Connection lost or card removed, reset
                    self.connection = None
                    last_uid = None
                    time.sleep(0.5)
        
        except KeyboardInterrupt:
            print("\n\n👋 Exiting RFID Attendance System")
        except Exception as e:
            print(f"\n❌ Error: {e}")
        finally:
            if self.connection:
                self.connection.disconnect()

def main():
    import sys
    
    if len(sys.argv) > 1:
        training_id = sys.argv[1]
    else:
        training_id = input("Enter Training ID: ").strip()
    
    if not training_id:
        print("❌ Training ID is required")
        return
    
    system = RFIDAttendanceSystem()
    system.run(training_id)

if __name__ == "__main__":
    main()
