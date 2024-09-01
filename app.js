document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const fileInput = document.getElementById("fileInput");
  const output = document.getElementById("output");
  const startButton = document.getElementById("startButton");
  const saveButton = document.getElementById("saveButton");
  const openLink = document.getElementById("openLink");

  let scanning = false;
  let canvas = document.createElement("canvas");
  let context = canvas.getContext("2d");
  let decodedText = "";

  startButton.addEventListener("click", () => {
    if (scanning) {
      stopScanning();
    } else {
      startScanning();
    }
  });

  function startScanning() {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        video.srcObject = stream;
        video.setAttribute("playsinline", true); // Required for iOS
        video.play();
        scanning = true;
        startButton.textContent = "Stop Scanning";
        requestAnimationFrame(scanQRCode); // Use requestAnimationFrame for smooth scanning
      })
      .catch((err) => {
        console.error("Error accessing camera: ", err);
      });
  }

  function stopScanning() {
    scanning = false;
    startButton.textContent = "Start Scanning";
    video.srcObject.getTracks().forEach((track) => track.stop());
  }

  function scanQRCode() {
    if (!scanning) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Ensure the canvas dimensions match the video feed
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        stopScanning();
        decodedText = code.data;
        output.textContent = decodedText;
        checkIfURL(decodedText);
      } else {
        requestAnimationFrame(scanQRCode); // Continue scanning
      }
    } else {
      requestAnimationFrame(scanQRCode); // Retry until ready
    }
  }

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          decodedText = code.data;
          output.textContent = decodedText;
          checkIfURL(decodedText);
        } else {
          output.textContent = "No QR code detected.";
          openLink.style.display = "none";
        }
      };
    };
    reader.readAsDataURL(file);
  });

  saveButton.addEventListener("click", () => {
    if (decodedText) {
      const blob = new Blob([decodedText], { type: "text/plain" });
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = "decodedContent.txt";
      anchor.click();
    } else {
      alert("No decoded content to save.");
    }
  });

  function checkIfURL(text) {
    const urlPattern = new RegExp(
      "^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$",
      "i"
    ); // fragment locator
    if (urlPattern.test(text)) {
      openLink.href = text.startsWith("http") ? text : `http://${text}`;
      openLink.style.display = "inline-block";
    } else {
      openLink.style.display = "none";
    }
  }
});
