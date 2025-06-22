# eli-idscanner

#### `Cordova Add Plugin`
```
cordova plugin add /full/path/to/eli-idscanner
```
#### `JS Init.` 
```
document.addEventListener("deviceready", function () {
  document.getElementById("scanButton").addEventListener("click", function () {
    navigator.camera.getPicture(
      function (imageData) {
        const base64Image = "data:image/jpeg;base64," + imageData;

        // Call the plugin
        eli.idscan({
          image: base64Image,
          mode: "auto", // or "offline" / "online"
          apiKey: "YOUR_GOOGLE_VISION_API_KEY", // required if using online/auto
          success: function (data) {
            console.log("Extracted:", data);
            alert(JSON.stringify(data, null, 2));
          },
          error: function (err) {
            alert("Scan failed: " + err.message);
          }
        });
      },
      function (error) {
        alert("Camera failed: " + error);
      },
      {
        quality: 80,
        destinationType: Camera.DestinationType.DATA_URL,
        correctOrientation: true,
        targetWidth: 1024
      }
    );
  });
});
```
