"""
RFID Card Registration
Registers RFID cards to trainee profiles
"""

import smartcard
from smartcard.System import readers
from smartcard.util import toHexString
import requests
import json

POCKETBASE_URL = "http://127.0.0.1:8090"

class RFIDRegistration:
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
    
    def list_trainees(self):
        """List all trainees"""
        try:
            url = f"{self.api_url}/trainees/records"
            params = {"perPage": 100}
            response = requests.get(url, params=params, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('items', [])
            
            return []
        except Exception as e:
            print(f"❌ Error listing trainees: {e}")
            return []
    
    def register_rfid(self, trainee_id, rfid_uid):
        """Register RFID UID to trainee"""
        try:
            url = f"{self.api_url}/trainees/records/{trainee_id}"
            payload = {"rfid_uid": rfid_uid}
            
            response = requests.patch(url, json=payload, timeout=5)
            
            if response.status_code == 200:
                return True
            else:
                print(f"❌ Error: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error registering RFID: {e}")
            return False
    
    def run(self):
        """Main registration loop"""
        if not self.find_reader():
            return
        
        print("\n🟢 RFID Card Registration Started")
        print("=" * 50)
        
        # List trainees
        trainees = self.list_trainees()
        if not trainees:
            print("❌ No trainees found in database")
            return
        
        print(f"\n📋 Found {len(trainees)} trainee(s):\n")
        for i, trainee in enumerate(trainees, 1):
            rfid_status = "✅ Registered" if trainee.get('rfid_uid') else "❌ Not registered"
            print(f"{i}. {trainee['name']} ({trainee['email']}) - {rfid_status}")
        
        # Select trainee
        while True:
            try:
                choice = int(input(f"\nSelect trainee (1-{len(trainees)}): "))
                if 1 <= choice <= len(trainees):
                    selected_trainee = trainees[choice - 1]
                    break
                else:
                    print("❌ Invalid choice")
            except ValueError:
                print("❌ Please enter a number")
        
        print(f"\n✋ Trainee: {selected_trainee['name']}")
        print("👆 I-tap ang iyong RFID card...\n")
        
        # Read RFID - keep trying until card is detected
        import time
        last_uid = None
        while True:
            try:
                # Create fresh connection for each read
                if not self.connection:
                    self.connection = self.reader.createConnection()
                    self.connection.connect()
                
                uid = self.read_uid()
                
                if uid and uid != last_uid:
                    formatted_uid = self.format_uid(uid)
                    print(f"📖 Card detected - UID: {formatted_uid}")
                    
                    if self.register_rfid(selected_trainee['id'], formatted_uid):
                        print(f"✅ RFID registered successfully!")
                        print(f"   Trainee: {selected_trainee['name']}")
                        print(f"   RFID UID: {formatted_uid}")
                    else:
                        print(f"❌ Failed to register RFID")
                    
                    break
                
                last_uid = uid
                
            except Exception as e:
                # Connection lost, reset
                self.connection = None
                last_uid = None
                pass
            
            time.sleep(0.5)
        
        if self.connection:
            self.connection.disconnect()

def main():
    system = RFIDRegistration()
    system.run()

if __name__ == "__main__":
    main()
