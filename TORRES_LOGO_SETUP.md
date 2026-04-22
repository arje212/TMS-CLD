# Torres Logo Setup for Attendance Sheet PDF

## Instructions

The attendance sheet PDF export has been updated to support the Torres Technology Center Corporation logo.

### To add the logo to your attendance sheet PDFs:

1. **Save the Torres logo image** you provided to the public folder:
   - Path: `apps/web/public/torres-logo.png`
   - File format: PNG
   - The logo will be automatically included in all future PDF exports

2. **The PDF export function will:**
   - Check if `torres-logo.png` exists in the public folder
   - If found: Include the logo in the header of the attendance sheet
   - If not found: Display only the text header "TORRES TECHNOLOGY CENTER CORPORATION"

3. **Features of the new PDF export:**
   - ✅ Professional header with optional Torres logo
   - ✅ Company name display
   - ✅ Training details (Date, Time, Subject, Venue, Lecturer/Champion)
   - ✅ Activity type checkboxes
   - ✅ 50-row attendance table with:
     - No., Employee ID, Name, Company, Department, Signature fields
   - ✅ Remarks section for additional notes
   - ✅ Footer with establishment date and form ID
   - ✅ Optimized for A4 printing

### How to use:

1. Go to Reports page
2. Click on "Export Attendance Sheet" button
3. Select the training to export
4. The PDF will be downloaded automatically and ready to print

### File location:
```
c:\Users\cldto\OneDrive\Desktop\Training_record\apps\web\public\torres-logo.png
```

The PDF export will automatically detect and include the logo if this file exists.
