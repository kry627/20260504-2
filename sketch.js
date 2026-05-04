let faceMesh;
let video;
let faces = [];
let stars = []; // Declared stars array

// 定義點位編號
const mouthOuter = [409, 270, 269, 267, 0, 37, 39, 40, 185, 61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
const mouthInner = [76, 77, 90, 180, 85, 16, 315, 404, 320, 307, 306, 408, 304, 303, 302, 11, 72, 73, 74, 184];
const rightEyeOuter = [130, 247, 30, 29, 27, 28, 56, 190, 243, 112, 26, 22, 23, 24, 110, 25];
const rightEyeInner = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const leftEyeOuter = [359, 467, 260, 259, 257, 258, 286, 414, 463, 341, 256, 252, 253, 254, 339, 255];
const leftEyeInner = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249];
const faceSilhouette = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

// Removed preload function as ml5.faceMesh initialization is moved to setup
let spaceBuffer; // 用來處理星空遮罩的暫存繪圖層

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 設定攝影機
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  
  // 初始化 ml5 faceMesh 並開始辨識
  // 確保 ml5 庫已載入
  if (typeof ml5 !== 'undefined' && ml5.faceMesh) {
    faceMesh = ml5.faceMesh({ maxFaces: 1, refineLandmarks: true, flipHorizontal: false });
    if (faceMesh) {
      faceMesh.detectStart(video, gotFaces);
    } else {
      console.error("ml5.faceMesh did not return a valid object.");
    }
  } else {
    console.error("ml5 library or ml5.faceMesh is not loaded. Please ensure ml5.js is included correctly.");
  }

  // 初始化星星位置
  initStars();
}

function gotFaces(results) {
  faces = results;
}

function initStars() {
  stars = [];
  for (let i = 0; i < 400; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      alpha: random(100, 255)
    });
  }
}

function draw() {
  background('#e7c6ff');

  // 計算顯示影像的寬高 (全螢幕的 50%)
  let displayW = width * 0.5;
  let displayH = height * 0.5;
  // 保持影像比例 (根據寬度計算高度，或視需求固定 50%)
  // 這裡採用嚴格的 50% 視窗大小
  
  // 如果是手機直向，縮放顯示區域以符合比例
  if (windowHeight > windowWidth) {
    displayH = displayW * (video.height / video.width);
  }

  let xOff = (width - displayW) / 2;
  let yOff = (height - displayH) / 2;

  // 1. 繪製鏡像影像
  push();
  translate(xOff + displayW, yOff); // 移動到右邊邊界
  scale(-1, 1); // 水平翻轉
  image(video, 0, 0, displayW, displayH);
  pop();

  if (faces.length > 0) {
    let face = faces[0];

    // 2. 繪製黑色遮罩與星空 (利用 beginContour 挖洞)
    drawSpaceMask(face, xOff, yOff, displayW, displayH);

    // 3. 繪製霓虹線條
    push();
    stroke(255, 0, 0);
    strokeWeight(1);
    // 設定霓虹燈光暈效果 (Canvas API)
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = 'red';
    noFill();

    // 使用 line 指令串接各部位
    drawConnectors(face.keypoints, mouthOuter, true, xOff, yOff, displayW, displayH); // 嘴唇外圈
    drawConnectors(face.keypoints, mouthInner, true, xOff, yOff, displayW, displayH); // 嘴唇內圈
    drawConnectors(face.keypoints, rightEyeOuter, true, xOff, yOff, displayW, displayH); // 右眼外圈
    drawConnectors(face.keypoints, rightEyeInner, true, xOff, yOff, displayW, displayH); // 右眼內圈
    drawConnectors(face.keypoints, leftEyeOuter, true, xOff, yOff, displayW, displayH); // 左眼外圈
    drawConnectors(face.keypoints, leftEyeInner, true, xOff, yOff, displayW, displayH); // 左眼內圈
    drawConnectors(face.keypoints, faceSilhouette, true, xOff, yOff, displayW, displayH); // 臉部最外層輪廓

    pop();
  }
}

// 繪製線條的輔助函式
function drawConnectors(keypoints, indices, closed, xOff, yOff, dW, dH) {
  for (let i = 0; i < indices.length - (closed ? 0 : 1); i++) {
    let p1 = keypoints[indices[i]];
    let p2 = keypoints[indices[(i + 1) % indices.length]];
    if (p1 && p2) {
      // 將點位映射至置中區域，並實作水平鏡像 (x 軸反轉)
      let x1 = map(p1.x, 0, video.width, xOff + dW, xOff);
      let y1 = map(p1.y, 0, video.height, yOff, yOff + dH);
      let x2 = map(p2.x, 0, video.width, xOff + dW, xOff);
      let y2 = map(p2.y, 0, video.height, yOff, yOff + dH);
      line(x1, y1, x2, y2);
    }
  }
}

// 繪製太空遮罩：將臉部以外填黑並加上星星
function drawSpaceMask(face, xOff, yOff, dW, dH) {
  push();
  fill(0); // 黑色背景
  noStroke();
  
  // 繪製遮罩：外框是影像顯示區域，內框是臉部輪廓
  beginShape();
  vertex(xOff, yOff);
  vertex(xOff + dW, yOff);
  vertex(xOff + dW, yOff + dH);
  vertex(xOff, yOff + dH);
  
  // 挖洞 (beginContour)
  beginContour();
  for (let i = 0; i < faceSilhouette.length; i++) {
    let kp = face.keypoints[faceSilhouette[i]];
    let mappedX = map(kp.x, 0, video.width, xOff + dW, xOff);
    let mappedY = map(kp.y, 0, video.height, yOff, yOff + dH);
    vertex(mappedX, mappedY);
  }
  endContour();
  endShape(CLOSE);

  // 繪製星空：只在黑色遮罩區域顯示星星
  // 使用 globalCompositeOperation 確保星星只出現在剛畫好的黑色區域
  drawingContext.globalCompositeOperation = 'source-atop';
  for (let s of stars) {
    if (s.x > xOff && s.x < xOff + dW && s.y > yOff && s.y < yOff + dH) {
      fill(255, s.alpha);
      circle(s.x, s.y, s.size);
    }
  }
  // 還原混合模式
  drawingContext.globalCompositeOperation = 'source-over';
  pop();
}

// 處理視窗大小改變與手機旋轉
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 重新生成星星位置以適應新畫布
  initStars();
  
  // 針對手機端影像方向優化
  // ml5 會自動處理影像來源尺寸，我們主要透過 map() 與 xOff/yOff 動態計算位置
}
