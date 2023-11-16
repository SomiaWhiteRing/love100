<template>
  <div style="display: inline-flex; gap: 36px">
    <!-- 写四个按钮，分别是存储，还原，清空，下载 -->
    <button id="save" @click="save">导出</button>
    <button id="restore" @click="restore">导入</button>
    <button id="clear" @click="clear">清空</button>
    <button id="download" @click="download">下载</button>
    <button style="background: #67c23a" @click="showResizeDialog()">格子太多了！</button>
  </div>
  <div v-if="loading > 10" style="color: #999; font-size: 12px; margin-top: 10px">
    字体加载中，若因国内访问不畅长时间未加载成功，
    <button style="background: #f56c6c" @click="mountEvent">
      请点此
    </button>
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
      <vue-cropper ref="cropperRef" style="width: 400px; height: 400px" :img="cropperSrc" autoCrop fixed centerBox
        :fixedNumber="[920 / cols - 12, 920 / rows - 12]" />
      <div style="display: flex; gap: 16px; justify-content: flex-end">
        <button style="background: #f56c6c" @click="clearCrop()">清空</button>
        <button @click="afterCrop">确定</button>
      </div>
    </div>
  </dialog>
  <!-- 再写一个弹窗，内含横竖两个有间隔的滑条调整格子数量，中间有一个根据当前长宽演示格子形状的示意图 -->
  <dialog ref="resizeDialog">
    <div style="
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
    ">
      <div style="position: absolute; top: 0; right: 0; cursor: pointer" @click="resizeDialog!.close()">
        ✖
      </div>
      <span style="font-size: 24px; font-weight: bold; margin-bottom: 16px">调整格子数量</span>
      <div style="display: flex; align-items: center">
        <div style="width: 50px;" />
        <input type="range" min="1" max="10" v-model="resizeCols" style="width: 400px;">
      </div>
      <div style="display: flex; align-items: center">
        <div style="display: flex; flex-direction: column; align-items: center;width: 50px;">
          <input type="range" min="1" max="10" v-model="resizeRows"
            style="width: 400px; margin: 16px 0; transform: rotate(90deg)">
        </div>
        <div style="width: 400px; height: 400px; display: flex; flex-direction: column; gap: 2px;">
          <div v-for="i in Number(resizeRows)" :key="i" style="display: flex; flex: 1; gap: 2px;">
            <div v-for="j in Number(resizeCols)" :key="j" style="flex: 1; background: #999;" />
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 16px; justify-content: flex-end">
        <button @click="submitResize">确定</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import tiejiliFont from "../assets/tiejili.ttf";

const canvas = ref<HTMLCanvasElement>();

const loading = ref<number>(0);
const loadingInterval = ref<any>();

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

// 格子的行数和列数
const rows = ref<number>(10);
const cols = ref<number>(10);

// 调整格子数量的变量
const resizeDialog = ref<HTMLDialogElement>();
const resizeRows = ref<number>(10);
const resizeCols = ref<number>(10);

onMounted(async () => {
  loadingInterval.value = setInterval(() => {
    loading.value += 1;
  }, 1000);
  const tiejili = new FontFace("tiejili", `url(${tiejiliFont})`);
  await tiejili.load();
  mountEvent()
});

// 网络环境不畅时，跳过字体加载强制绘制页面
function mountEvent() {
  clearInterval(loadingInterval.value);
  loading.value = 0;
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
    } else if (y < (100 + Math.floor(920 / rows.value) * rows.value)) {
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

}

// 绘制网格
function drawRects() {
  const ctx = canvas.value!.getContext("2d")!;
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 100, 930, 930);
  ctx.fillStyle = "#FFF";
  for (let i = 0; i < cols.value; i++) {
    for (let j = 0; j < rows.value; j++) {
      ctx.strokeRect(10 + Math.floor(920 / cols.value) * i, 110 + Math.floor(920 / rows.value) * j, Math.floor(920 / cols.value) - 10, Math.floor(920 / rows.value) - 10);
      ctx.fillRect(11 + Math.floor(920 / cols.value) * i, 111 + Math.floor(920 / rows.value) * j, Math.floor(920 / cols.value) - 12, Math.floor(920 / rows.value) - 12);
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
  const text2 = "@苍旻白轮";
  const text3 = "love100.shatranj.space";
  ctx.fillStyle = "#999";
  ctx.fillText(
    text1,
    930 -
    getTextWidth(text1, "12px tiejili") - 16 -
    getTextWidth(text2, "12px tiejili") - 16 -
    getTextWidth(text3, "12px tiejili") - 16,
    1060 - 16
  );
  ctx.fillText(
    text2,
    930 -
    getTextWidth(text2, "12px tiejili") - 16 -
    getTextWidth(text3, "12px tiejili") - 16,
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
  ctx.clearRect(11 + Math.floor(920 / cols.value) * i, 111 + Math.floor(920 / rows.value) * j, Math.floor(920 / cols.value) - 12, Math.floor(920 / rows.value) - 12);
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
  // 如果鼠标不在格子部分，返回[-1, -1]
  if (x % Math.floor(920 / cols.value) < 9 || (y - 100) % Math.floor(920 / rows.value) < 9 || y < 100 || y > (100 + Math.floor(920 / rows.value) * rows.value)) return [-1, -1];
  const i = Math.floor((x - 11) / Math.floor(920 / cols.value));
  const j = Math.floor((y - 100) / Math.floor(920 / rows.value));
  return [i, j];
}

// 在指定格子上绘制图片
function drawImageOnGrid(img: HTMLImageElement, i: number, j: number) {
  const ctx = canvas.value!.getContext("2d")!;
  const gridWidth = Math.floor(920 / cols.value) - 12;
  const gridHeight = Math.floor(920 / rows.value) - 12;
  ctx.clearRect(11 + Math.floor(920 / cols.value) * i, 111 + Math.floor(920 / rows.value) * j, gridWidth, gridHeight);
  // 绘制图片时若比例与格子不同则自动裁切
  const imgWidth = img.width;
  const imgHeight = img.height;
  const imgRatio = imgWidth / imgHeight;
  const gridRatio = gridWidth / gridHeight;
  console.log(imgHeight, imgWidth, imgRatio)
  console.log(gridHeight, gridWidth, gridRatio)
  let drawWidth, drawHeight, drawX, drawY;
  if (imgRatio > gridRatio) {
    drawWidth = gridWidth;
    drawHeight = drawWidth / imgRatio;
    drawX = 11 + Math.floor(920 / cols.value) * i;
    drawY = 111 + Math.floor(920 / rows.value) * j + (gridHeight - drawHeight) / 2;
  } else {
    drawHeight = gridHeight;
    drawWidth = drawHeight * imgRatio;
    drawX = 11 + Math.floor(920 / cols.value) * i + (gridWidth - drawWidth) / 2;
    drawY = 111 + Math.floor(920 / rows.value) * j;
  }
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  // 将图片暂存在数组中
  images[i][j] = img.src;
  localStorage.setItem("images", JSON.stringify(images));
}

// 从localStorage中读取数据
function loadLocalStorage() {
  if (localStorage.getItem("rows")) {
    rows.value = Number(localStorage.getItem("rows")!);
    drawRects();
  }
  if (localStorage.getItem("cols")) {
    cols.value = Number(localStorage.getItem("cols")!);
    drawRects();
  }
  if (localStorage.getItem("images")) {
    images = JSON.parse(localStorage.getItem("images")!);
    for (let i = 0; i < rows.value; i++) {
      for (let j = 0; j < cols.value; j++) {
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
  /** 改为组成json并下载 */
  const json = {
    images: localStorage.getItem("images")! || '',
    title: localStorage.getItem("title")! || '',
    name: localStorage.getItem("name")! || '',
    rows: localStorage.getItem("rows")! || 10,
    cols: localStorage.getItem("cols")! || 10,
  };
  const link = document.createElement("a");
  link.download = `2023推TOP100${new Date().toLocaleString()}.json`;
  link.href = URL.createObjectURL(new Blob([JSON.stringify(json)]));
  link.click();
  const saveButton = document.getElementById("save")!;
  saveButton.innerText = "导出✅";
  setTimeout(() => {
    saveButton.innerText = "导出";
  }, 2000);
}

// 还原数据副本
function restore() {
  // 上传json文件
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = () => {
    const file = input.files![0];
    const reader = new FileReader();
    reader.onload = () => {
      const json = JSON.parse(reader.result as string);
      if (json.images) localStorage.setItem("images", json.images); else localStorage.removeItem("images");
      if (json.title) localStorage.setItem("title", json.title); else localStorage.removeItem("title");
      if (json.name) localStorage.setItem("name", json.name); else localStorage.removeItem("name");
      if (json.rows) localStorage.setItem("rows", json.rows); else localStorage.removeItem("rows");
      if (json.cols) localStorage.setItem("cols", json.cols); else localStorage.removeItem("cols");
      loadLocalStorage();
      const restoreButton = document.getElementById("restore")!;
      restoreButton.innerText = "导入✅";
      setTimeout(() => {
        restoreButton.innerText = "导入";
      }, 2000);
    };
    reader.readAsText(file);
  };
  input.click();
}

// 清空当前数据
function clear() {
  localStorage.removeItem("images");
  images = new Array(10).fill(0).map(() => new Array(10).fill(""));
  drawRects();
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

// 打开调整格子数量的弹窗
function showResizeDialog() {
  resizeRows.value = rows.value;
  resizeCols.value = cols.value;
  resizeDialog.value!.showModal();
}

// 提交调整格子数量的弹窗
function submitResize() {
  // 如果比例发生了变化且有已经填好的图片，则弹窗提醒用户图片会变形
  if (resizeRows.value / resizeCols.value !== rows.value / cols.value &&
    localStorage.getItem("images")?.includes("data:image")) {
    if (!confirm("调整后的格子比例不同，会导致已填入的图片无法占满格子，是否继续？")) return;
  }
  // 计算原格子数，如果原标题含有"TOP + 总格子数，则也修改标题"
  const oldGrids = rows.value * cols.value;
  if (title.value.includes(`TOP${oldGrids}`)) {
    title.value = title.value.replace(`TOP${oldGrids}`, `TOP${resizeRows.value * resizeCols.value}`);
    localStorage.setItem("title", title.value);
    drawTitle();
  }
  rows.value = resizeRows.value;
  cols.value = resizeCols.value;
  localStorage.setItem("rows", rows.value.toString());
  localStorage.setItem("cols", cols.value.toString());
  resizeDialog.value!.close();
  drawRects();
  drawTitle();
  drawCopyRight();
  loadLocalStorage();
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

