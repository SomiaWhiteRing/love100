<template>
  <div style="display: inline-flex; gap: 36px">
    <!-- 写四个按钮，分别是存储，还原，清空，下载 -->
    <button id="save" @click="save">存储</button>
    <button id="restore" @click="restore">还原</button>
    <button id="clear" @click="clear">清空</button>
    <button id="download" @click="download">下载</button>
  </div>
  <canvas ref="canvas" width="930" height="1060" />
  <!-- 写一个弹窗，内含vue-cropper图片编辑组件 -->
  <dialog ref="cropperDialog">
    <div style="
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: relative;
      ">
      <div style="position: absolute; top: 0; right: 0; cursor: pointer" @click="cropperDialog!.close()">
        ✖
      </div>
      <span style="font-size: 24px; font-weight: bold; margin-bottom: 16px">编辑图片</span>
      <vue-cropper ref="cropperRef" style="width: 400px; height: 400px" :img="cropperSrc" fixed autoCrop fixedBox
        centerBox autoCropWidth="200" autoCropHeight="200" />
      <div style="display: flex; gap: 16px; justify-content: flex-end">
        <button style="background: #f56c6c" @click="clearCrop()">清空</button>
        <button @click="afterCrop">确定</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import tiejiliFont from "../assets/tiejili.ttf";

const canvas = ref<HTMLCanvasElement>();

// 用一个10*10的数组暂存图片
let images = new Array(10).fill(0).map(() => new Array(10).fill(""));

// 图片编辑相关
const cropperDialog = ref<HTMLDialogElement>();
const cropperRef = ref<any>();
const cropperSrc = ref<string>();
const cropCoord = ref<{ x: number; y: number }>();

// 标题和填表人
const title = ref<string>("2023推TOP100");
const titleWidth = ref<number>(0);
const name = ref<string>("填表人：__________");
const nameWidth = ref<number>(0);

onMounted(async () => {
  const tiejili = new FontFace("tiejili", `url(${tiejiliFont})`);
  await tiejili.load();
  drawRects();
  drawTitle();
  drawCopyRight();

  loadLocalStorage();

  // 激发拖拽能力
  canvas.value!.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  // 配置拖拽事件，拖入图片可填表
  canvas.value!.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer!.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const [i, j] = getGridIndex(e);
        if (i !== -1 || j !== -1) drawImageOnGrid(img, i, j);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

  // 配置点击事件，点击可选择图片上传
  canvas.value!.addEventListener("click", (e) => {
    const [x, y] = getMousePosition(e);
    if (y < 100) {
      clickTitle(x, y);
    } else if (y < 1030) {
      // 格子部分
      const [i, j] = getGridIndex(e);
      if (i === -1 || j === -1) return;
      // 判断格子内是否有图片，若有则调用图片编辑
      if (images[i][j]) {
        onCrop(i, j);
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = () => {
          const file = input.files![0];
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              drawImageOnGrid(img, i, j);
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        };
        input.click();
      }
    }
  });

  // 右键点击编辑图片
  canvas.value!.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const [x, y] = getGridIndex(e);
    if (x === -1 || y === -1) return;
    onCrop(x, y);
  });

  // 长按事件同右键点击事件
  canvas.value!.addEventListener("mousedown", (e) => {
    const [x, y] = getGridIndex(e);
    if (x === -1 || y === -1) return;
    const timer = setTimeout(() => {
      onCrop(x, y);
    }, 500);
    canvas.value!.addEventListener("mouseup", () => {
      clearTimeout(timer);
    });
  });
});

// 绘制网格
function drawRects() {
  const ctx = canvas.value!.getContext("2d")!;
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, 930, 1060);
  ctx.fillStyle = "#FFF";
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      ctx.strokeRect(10 + 92 * i, 110 + 92 * j, 80, 80);
      ctx.fillRect(11 + 92 * i, 111 + 92 * j, 78, 78);
    }
  }
}

// 绘制标题部分
function drawTitle() {
  const ctx = canvas.value!.getContext("2d")!;
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, 930, 100);
  ctx.fillStyle = "#000";
  titleWidth.value = getTextWidth(title.value, "bold 48px tiejili");
  ctx.fillText(title.value, 32, 64);

  nameWidth.value = Math.max(
    getTextWidth(name.value, "bold 32px tiejili"),
    getTextWidth(`填表人：__________`, "bold 32px tiejili")
  );
  ctx.fillText(
    name.value,
    930 - getTextWidth(name.value, "bold 32px tiejili") - 32,
    80
  );
}

// 点击标题部分
function clickTitle(x: number, y: number) {
  // 判断当前点击是否在标题部分
  if (x > 32 && x < 32 + titleWidth.value && y > 16 && y < 64) {
    title.value = (
      prompt(`请输入新标题`, title.value) || "2023推TOP100"
    ).trim();
    // 计算标题可用字数
    while (
      getTextWidth(title.value, "bold 48px tiejili") + nameWidth.value >
      930 - 32 - 32
    ) {
      alert(`标题长度超出${getTextWidth(title.value, "bold 48px tiejili") + nameWidth.value - 930 + 32 + 32}，请尝试重新输入或缩短填表人名称`);
      title.value = (
        prompt(`请输入新标题`, title.value) || "2023推TOP100"
      ).trim();
    }
    localStorage.setItem("title", title.value);
    drawTitle();
  }
  // 判断当前点击是否在填表人部分
  if (x > 930 - 32 - nameWidth.value && x < 930 - 32 && y > 48 && y < 80) {
    // 移除标题中的“填表人：__________”和“填表人：”
    let newName = `填表人：${(
      prompt(
        "请输入填表人的名字",
        name.value.replace("填表人：__________", "").replace("填表人：", "")
      ) || "__________"
    ).trim()}`;
    // 计算填表人可用字数
    while (
      getTextWidth(newName, "bold 32px tiejili") + titleWidth.value >
      930 - 32 - 32 ||
      getTextWidth(`填表人：__________`, "bold 32px tiejili") +
      titleWidth.value >
      930 - 32 - 32
    ) {
      alert(`填表人名称长度超出${getTextWidth(newName, "bold 32px tiejili") + titleWidth.value - 930 + 32 + 32}，请尝试重新输入或缩短标题`);
      newName = `填表人：${(
        prompt(
          "请输入填表人的名字",
          name.value.replace("填表人：__________", "").replace("填表人：", "")
        ) || "__________"
      ).trim()}`;
    }
    name.value = newName;
    localStorage.setItem("name", name.value);
    drawTitle();
  }
}

// 绘制版权信息
function drawCopyRight() {
  const ctx = canvas.value!.getContext("2d")!;
  const text1 = "推TOP100生成器";
  const text3 = "love100.shatranj.space";
  ctx.fillStyle = "#999";
  ctx.fillText(
    text1,
    930 -
    getTextWidth(text1, "12px tiejili") -
    16 -
    getTextWidth(text3, "12px tiejili") -
    16,
    1060 - 16
  );
  ctx.fillText(
    text3,
    930 - getTextWidth(text3, "12px tiejili") - 16,
    1060 - 16
  );
}

// 调用图片编辑组件
function onCrop(x: number, y: number) {
  if (!images[x][y]) return;
  cropperSrc.value = images[x][y];
  cropCoord.value = { x, y };
  cropperDialog.value!.showModal();
}

// 图片编辑完成后的回调
async function afterCrop() {
  cropperRef.value.getCropData(async (data: any) => {
    console.log(data);
    const img = new Image();
    img.onload = () => {
      const [x, y] = [cropCoord.value!.x, cropCoord.value!.y];
      drawImageOnGrid(img, x, y);
      cropperDialog.value!.close();
    };
    img.src = data;
  });
}

// 清空指定格子
function clearCrop() {
  const [i, j] = [cropCoord.value!.x, cropCoord.value!.y];
  const ctx = canvas.value!.getContext("2d")!;
  ctx.clearRect(11 + 92 * i, 111 + 92 * j, 78, 78);
  images[i][j] = "";
  localStorage.setItem("images", JSON.stringify(images));
  cropperDialog.value!.close();
}

// 计算文本的显示长度
function getTextWidth(text: string, font: string) {
  const ctx = canvas.value!.getContext("2d")!;
  ctx.font = font;
  return ctx.measureText(text).width;
}

// 获取鼠标在canvas中的坐标
function getMousePosition(e: MouseEvent) {
  const rect = canvas.value!.getBoundingClientRect();
  const x = Math.floor((e as any).clientX - rect.left);
  const y = Math.floor((e as any).clientY - rect.top);
  return [x, y];
}

// 获取鼠标在哪个格子
function getGridIndex(e: MouseEvent) {
  const [x, y] = getMousePosition(e);
  console.log(x, y);
  // 如果鼠标不在格子部分，返回[-1, -1]
  if (x % 92 < 9 || (y - 100) % 92 < 9 || y < 100 || y > 1030) return [-1, -1];
  const i = Math.floor((x - 11) / 92);
  const j = Math.floor((y - 100) / 92);
  return [i, j];
}

// 在指定格子上绘制图片
function drawImageOnGrid(img: HTMLImageElement, i: number, j: number) {
  const ctx = canvas.value!.getContext("2d")!;
  ctx.clearRect(11 + 92 * i, 111 + 92 * j, 78, 78);
  ctx.drawImage(img, 11 + 92 * i, 111 + 92 * j, 78, 78);
  // 将图片暂存在数组中
  images[i][j] = img.src;
  localStorage.setItem("images", JSON.stringify(images));
}

// 从localStorage中读取数据
function loadLocalStorage() {
  if (localStorage.getItem("images")) {
    images = JSON.parse(localStorage.getItem("images")!);
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (images[i][j]) {
          // 根据images[i][j]创建一个Image对象
          const img = new Image();
          img.src = images[i][j];
          img.onload = () => {
            drawImageOnGrid(img, i, j);
          };
        }
      }
    }
  }
  if (localStorage.getItem("title")) {
    title.value = localStorage.getItem("title")!;
    drawTitle();
  }
  if (localStorage.getItem("name")) {
    name.value = localStorage.getItem("name")!;
    drawTitle();
  }
}

// 存储数据副本
function save() {
  localStorage.setItem("imagesSaved", localStorage.getItem("images")!);
  localStorage.setItem("titleSaved", localStorage.getItem("title")!);
  localStorage.setItem("nameSaved", localStorage.getItem("name")!);
  const saveButton = document.getElementById("save")!;
  saveButton.innerText = "存储✅";
  setTimeout(() => {
    saveButton.innerText = "存储";
  }, 2000);
}

// 还原数据副本
function restore() {
  if (!localStorage.getItem("imagesSaved")) {
    alert("没有存储的数据");
    return;
  }
  localStorage.setItem("images", localStorage.getItem("imagesSaved")!);
  localStorage.setItem("title", localStorage.getItem("titleSaved")!);
  localStorage.setItem("name", localStorage.getItem("nameSaved")!);
  loadLocalStorage();
  const restoreButton = document.getElementById("restore")!;
  restoreButton.innerText = "还原✅";
  setTimeout(() => {
    restoreButton.innerText = "还原";
  }, 2000);
}

// 清空当前数据
function clear() {
  localStorage.removeItem("images");
  localStorage.removeItem("title");
  localStorage.removeItem("name");
  images = new Array(10).fill(0).map(() => new Array(10).fill(""));
  title.value = "2023推TOP100";
  name.value = "填表人：__________";
  drawRects();
  drawTitle();
  drawCopyRight();
  const clearButton = document.getElementById("clear")!;
  clearButton.innerText = "清空✅";
  setTimeout(() => {
    clearButton.innerText = "清空";
  }, 2000);
}

// 下载图片
function download() {
  const downloadButton = document.getElementById("download")!;
  downloadButton.innerText = "下载✅";
  setTimeout(() => {
    downloadButton.innerText = "下载";
  }, 2000);
  const link = document.createElement("a");
  link.download = "2023推TOP100.png";
  link.href = canvas.value!.toDataURL();
  link.click();
}
</script>

<style>
button {
  background-color: #409eff;
  border: none;
  color: white;
  padding: 0 16px;
  height: 32px;
  line-height: 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 10px;
}

button:hover {
  background-color: #66b1ff;
}

button:focus {
  outline: 0 !important;
}
</style>

