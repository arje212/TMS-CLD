# RFID Integration Setup Guide

## Overview
This setup integrates RFID card scanning with your Training Record attendance system. You can now mark attendance by tapping your RFID card.

## Prerequisites
- Python 3.7+
- RFID Reader (HID Global OMNIKEY 5022 Smart Card Reader or compatible)
- PocketBase running (see CHANGELOG.md)

## Step 1: Install Python Dependencies

```bash
pip install -r requirements_rfid.txt
```

Or install manually:
```bash
pip install pyscard requests
```

## Step 2: Register Your RFID Card

Before using RFID for attendance, you need to register your card with your trainee profile.

```bash
python rfid_register.py
```

This script will:
1. Display all trainees in the system
2. Ask you to select your profile
3. Ask you to tap your RFID card
4. Save the RFID UID to your trainee profile

**Example:**
```
🟢 RFID Card Registration Started
==================================================

📋 Found 5 trainee(s):

1. John Doe (john@example.com) - ❌ Not registered
2. Jane Smith (jane@example.com) - ❌ Not registered
3. Bob Wilson (bob@example.com) - ✅ Registered
4. Alice Brown (alice@example.com) - ❌ Not registered
5. Charlie Davis (charlie@example.com) - ❌ Not registered

Select trainee (1-5): 1

✋ Trainee: John Doe
👆 Tap your RFID card to register...

📖 Card detected - UID: 4B CA 26 04
✅ RFID registered successfully!
   Trainee: John Doe
   RFID UID: 4B CA 26 04
```

## Step 3: Use RFID for Attendance

### Option A: Python RFID Reader (Standalone)

Run the RFID attendance system with a specific training ID:

```bash
python rfid_attendance.py <TRAINING_ID>
```

Or enter the training ID when prompted:
```bash
python rfid_attendance.py
# Then enter your training ID when asked
```

**Example:**
```
🟢 RFID Attendance System Started
📚 Training ID: 8e45qy8sv0s1z20
👆 Tap your RFID card to mark attendance...

📖 Card detected - UID: 4B CA 26 04
✅ John Doe - Attendance marked
```

### Option B: Web Interface Attendance

Use the web app at `http://127.0.0.1:5173` (or your configured port):
1. Navigate to the Attendance page
2. In the scanner field, tap your RFID card
3. Your attendance will be recorded automatically

## How It Works

1. **RFID Card Registration:**
   - Your RFID card's unique ID (UID) is stored in your trainee profile
   - The UID format is typically: `4B CA 26 04` (hex format)

2. **Attendance Marking:**
   - When you tap your RFID card, the system reads the UID
   - The system looks up your trainee profile by RFID UID
   - Your attendance is automatically marked as "present"
   - If already checked in, you'll get a notification

3. **Database Storage:**
   - RFID UIDs are stored in the `trainees` collection
   - Attendance records link your trainee ID to training sessions
   - Each attendance record includes timestamp and status

## Troubleshooting

### "No RFID readers found!"
- Check that your RFID reader is connected to your computer
- Make sure the reader is recognized by Windows
- Try restarting the reader

### "Trainee not found with RFID: ..."
- Ensure you've registered your RFID card first using `rfid_register.py`
- Check that your trainee profile exists in the database
- Verify the RFID UID was saved correctly in your profile

### "Error reading UID"
- Make sure the RFID card is not damaged
- Try tapping the card on the reader multiple times
- Check that the reader driver is installed

### "Connection refused" errors
- Ensure PocketBase is running (`.\pocketbase.exe serve`)
- Check that the API URL is correct (default: http://127.0.0.1:8090)

## File Structure

```
Training_record/
├── rfid_register.py          # Register RFID cards to trainees
├── rfid_attendance.py        # Mark attendance using RFID
├── requirements_rfid.txt     # Python dependencies
└── RFID_SETUP.md            # This file
```

## Next Steps

1. ✅ Make sure PocketBase is running
2. ✅ Install Python dependencies
3. ✅ Register your RFID card
4. ✅ Start marking attendance with RFID
5. ✅ View attendance records in the web app

## API Integration

If you want to integrate RFID with custom code:

```python
from rfid_attendance import RFIDAttendanceSystem

system = RFIDAttendanceSystem()
system.run(training_id="your_training_id")
```

## Support

For issues or questions:
- Check the error message in the terminal
- Ensure all prerequisites are installed
- Verify PocketBase is running and accessible
- Check the trainee profile in the web app to see if RFID UID is saved

---
Last Updated: April 17, 2026
