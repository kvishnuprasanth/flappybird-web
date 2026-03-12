(function () {
  var DEFAULT_IMAGES = {
    bird: "./assets/images/flappybird.png",
    topPipe: "./assets/images/toppipe.png",
    bottomPipe: "./assets/images/bottompipe.png",
    background: "./assets/images/bg.png",
    logo: "./assets/images/logo.png",
    start: "./assets/images/start.png",
    message: "./assets/images/message.png",
    gameover: "./assets/images/gameover.png",
    restart: "./assets/images/restart.png",
  };

  var ASSETS = [
    { key: "bird", label: "Bird", aspectRatio: 34 / 24, cropWidth: 34, cropHeight: 24 },
    { key: "topPipe", label: "Top pipe", aspectRatio: 64 / 512, cropWidth: 64, cropHeight: 512 },
    { key: "bottomPipe", label: "Bottom pipe", aspectRatio: 64 / 512, cropWidth: 64, cropHeight: 512 },
    { key: "background", label: "Background", aspectRatio: NaN },
    { key: "logo", label: "Logo", aspectRatio: NaN },
    { key: "start", label: "Start button", aspectRatio: NaN },
    { key: "message", label: "Message", aspectRatio: NaN },
    { key: "gameover", label: "Game over", aspectRatio: NaN },
    { key: "restart", label: "Restart", aspectRatio: NaN },
  ];

  var customObjectUrls = {};
  var cropperInstance = null;
  var cropImageElement = null;

  function getBoard() {
    return document.getElementById("board");
  }

  function getCurrentSrc(key) {
    if (key === "background") {
      return customObjectUrls[key] || DEFAULT_IMAGES.background;
    }
    if (key === "bird" || key === "topPipe" || key === "bottomPipe") {
      var img = window[key === "bird" ? "birdImg" : key === "topPipe" ? "topPipeImg" : "bottomPipeImg"];
      return img && img.src ? img.src : DEFAULT_IMAGES[key];
    }
    var el = document.getElementById(
      key === "logo" ? "logo-image" : key === "start" ? "start-button" : key === "message" ? "message-image" : key === "gameover" ? "gameover-image" : "restart-button"
    );
    return el && el.src ? el.src : DEFAULT_IMAGES[key];
  }

  function setTarget(key, url) {
    if (key === "background") {
      customObjectUrls[key] = url;
      var board = getBoard();
      if (board) board.style.backgroundImage = "url(" + url + ")";
      return;
    }
    if (key === "bird" || key === "topPipe" || key === "bottomPipe") {
      var img = window[key === "bird" ? "birdImg" : key === "topPipe" ? "topPipeImg" : "bottomPipeImg"];
      if (img) img.src = url;
      return;
    }
    var id = key === "logo" ? "logo-image" : key === "start" ? "start-button" : key === "message" ? "message-image" : key === "gameover" ? "gameover-image" : "restart-button";
    var el = document.getElementById(id);
    if (el) el.src = url;
  }

  function revokePreviousUrl(key) {
    var url = customObjectUrls[key];
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
    if (key !== "background") delete customObjectUrls[key];
  }

  function storeObjectUrl(key, url) {
    revokePreviousUrl(key);
    customObjectUrls[key] = url;
  }

  function renderAssetGrid() {
    var grid = document.getElementById("asset-grid");
    if (!grid) return;
    grid.innerHTML = "";
    ASSETS.forEach(function (asset) {
      var card = document.createElement("div");
      card.className = "asset-card";
      card.dataset.key = asset.key;
      var label = document.createElement("span");
      label.className = "asset-label";
      label.textContent = asset.label;
      var thumb = document.createElement("img");
      thumb.className = "asset-thumbnail";
      var src = getCurrentSrc(asset.key);
      thumb.src = src;
      thumb.alt = asset.label;
      thumb.onerror = function () {
        thumb.src = "";
        thumb.style.background = "#ccc";
      };
      card.appendChild(label);
      card.appendChild(thumb);
      card.addEventListener("click", function () {
        openCropFor(asset);
      });
      grid.appendChild(card);
    });
  }

  function openCropFor(asset) {
    var input = document.getElementById("asset-file-input");
    if (!input) return;
    input.dataset.key = asset.key;
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var url = URL.createObjectURL(file);
      openCropModal(url, asset, function (blob) {
        if (!blob) return;
        var newUrl = URL.createObjectURL(blob);
        setTarget(asset.key, newUrl);
        storeObjectUrl(asset.key, newUrl);
        renderAssetGrid();
      });
      input.value = "";
      input.onchange = null;
    };
    input.click();
  }

  function openCropModal(imageUrl, asset, onConfirm) {
    var modal = document.getElementById("crop-modal");
    cropImageElement = document.getElementById("crop-image");
    if (!cropImageElement || !modal) return;
    cropImageElement.src = imageUrl;
    modal.style.display = "flex";

    function destroyCropper() {
      if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
      }
    }

    cropImageElement.onload = function () {
      destroyCropper();
      var options = {
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.8,
      };
      var aspectRatio = asset.aspectRatio;
      if (aspectRatio && !Number.isNaN(aspectRatio)) {
        options.aspectRatio = aspectRatio;
      }
      requestAnimationFrame(function () {
        if (!cropImageElement.parentElement) return;
        cropperInstance = new Cropper(cropImageElement, options);
      });
    };

    document.getElementById("crop-cancel").onclick = function () {
      URL.revokeObjectURL(imageUrl);
      modal.style.display = "none";
      destroyCropper();
    };

    document.getElementById("crop-confirm").onclick = function () {
      if (!cropperInstance) return;
      var cropOptions = {};
      if (asset.cropWidth && asset.cropHeight) {
        cropOptions.width = asset.cropWidth;
        cropOptions.height = asset.cropHeight;
      }
      var canvas = cropperInstance.getCroppedCanvas(cropOptions);
      if (!canvas) return;
      canvas.toBlob(
        function (blob) {
          URL.revokeObjectURL(imageUrl);
          modal.style.display = "none";
          destroyCropper();
          if (onConfirm) onConfirm(blob || null);
        },
        "image/png",
        1
      );
    };
  }

  window.renderAssetGrid = renderAssetGrid;

  if (document.readyState === "complete") {
    renderAssetGrid();
  } else {
    window.addEventListener("load", function () {
      renderAssetGrid();
    });
  }
})();
