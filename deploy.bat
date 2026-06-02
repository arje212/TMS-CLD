@echo off
echo Building...
cd apps\web
call npx vite build --outDir ..\..\dist\apps\web --emptyOutDir
cd ..\..

echo Uploading React app to Pi...
ssh cld@10.44.7.253 "sudo chown -R cld:cld /var/www/training-app"
scp -r dist\apps\web\* cld@10.44.7.253:/var/www/training-app/

echo Uploading RFID server to Pi...
scp rfid_server.py cld@10.44.7.253:/home/cld/rfid_server.py

echo Restarting RFID server via systemd...
ssh cld@10.44.7.253 "sudo systemctl restart rfid"

echo Restarting nginx...
ssh cld@10.44.7.253 "sudo chown -R www-data:www-data /var/www/training-app && sudo systemctl restart nginx"

echo Done! http://10.44.7.253
pause