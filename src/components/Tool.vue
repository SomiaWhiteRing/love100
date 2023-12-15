<template>
  <div class="inline-flex gap-9 justify-center items-center">
    <!-- 写四个按钮，分别是存储，还原，清空，下载 -->
    <button class="btn btn-primary btn-sm" id="save" @click="save">导出</button>
    <button class="btn btn-primary btn-sm" id="restore" @click="restore">导入</button>
    <button class="btn btn-primary btn-sm" id="clear" @click="clear">清空</button>
    <button class="btn btn-primary btn-sm" id="download" @click="download">下载</button>
    <button class="btn btn-secondary btn-sm" @click="showResizeDialog()">格子太多了！</button>

    <label class="label cursor-pointer">
      <input class="toggle" type="checkbox" v-model="titleLimit" :checked="titleLimit" />
      <span class="ml-1">解除标题限制</span>
    </label>
  </div>
  <canvas ref="canvas" width="930" height="1060" />
  <!-- 写一个弹窗，内含vue-cropper图片编辑组件 -->
  <dialog ref="cropperDialog">
    <div class="p-8 flex flex-col gap-4 relative overflow-hidden">
      <button class="absolute btn btn-ghost top-0 right-0" @click="cropperDialog!.close()">
        ✖
      </button>
      <span class="text-3xl mb-4 font-bold">编辑图片</span>
      <vue-cropper ref="cropperRef" style="width: 400px; height: 400px" :img="cropperSrc" autoCrop fixed
        :fixedNumber="[920 / cols - 12, 920 / rows - 12]" outputType="png" infoTrue
        :enlarge="Math.max(Math.ceil(cropCoord.width / 400), Math.ceil(cropCoord.height / 400))" />
      <div class="flex gap-4 justify-end mt-4">
        <button class="btn btn-sm btn-warning" @click="clearCrop(cropCoord!.x, cropCoord!.y)">清空</button>
        <button class="btn btn-sm btn-primary" @click="afterCrop">确定</button>
      </div>
    </div>
  </dialog>
  <!-- 再写一个弹窗，内含横竖两个有间隔的滑条调整格子数量，中间有一个根据当前长宽演示格子形状的示意图 -->
  <dialog ref="resizeDialog">
    <div class="p-8 flex flex-col gap-4 relative overflow-hidden">
      <div class="absolute btn btn-ghost top-0 right-0" @click="resizeDialog!.close()">✖</div>
      <span class="text-3xl mb-4 font-bold">调整格子数量</span>
      <div style="display: flex; align-items: center">
        <div style="width: 50px;" />
        <input type="range" min="1" :max="DDMode ? 20 : 10
          " v-model="resizeCols" style="width: 400px;">
      </div>
      <div style="display: flex; align-items: center">
        <div style="display: flex; flex-direction: column; align-items: center;width: 50px;">
          <input type="range" min="1" :max="DDMode ? 20 : 10
            " v-model="resizeRows" style="width: 400px; margin: 16px 0; transform: rotate(90deg)">
        </div>
        <div style="width: 400px; height: 400px; display: flex; flex-direction: column; gap: 2px;">
          <div v-for="i in Number(resizeRows)" :key="i" style="display: flex; flex: 1; gap: 2px;">
            <div v-for="j in Number(resizeCols)" :key="j" style="flex: 1; background: #999;" />
          </div>
        </div>
      </div>
      <div class="flex gap-4 justify-end mt-4">
        <button v-if="!DDMode" class="btn btn-sm btn-warning" @click="resizeCols = 20; resizeRows = 20; DDMode = true;">
          我的意思是，格子不够用了
        </button>
        <button v-if="DDMode" class="btn btn-sm btn-success"
          @click="DDMode = false; resizeRows = (resizeRows > 10 ? 10 : resizeRows); resizeCols = (resizeCols > 10 ? 10 : resizeCols)">
          算了算了
        </button>
        <button class="btn btn-sm btn-primary" @click="submitResize">确定</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import Dexie, { type Table } from "dexie";

const canvas = ref<HTMLCanvasElement>();

// 用一个20*20的数组暂存图片
let images = new Array(20).fill(0).map(() => new Array(20).fill(""));

// 图片编辑相关
const cropperDialog = ref<HTMLDialogElement>();
const cropperRef = ref<any>();
const cropperSrc = ref<string>();
const cropCoord = ref<{ x: number; y: number, width: number; height: number }>({
  x: 0,
  y: 0,
  width: 0,
  height: 0
});

// 标题和填表人
const title = ref<string>("2023推TOP100");
const titleWidth = ref<number>(0);
const name = ref<string>("填表人：__________");
const nameWidth = ref<number>(0);

// 标题限制开关
const titleLimit = ref<boolean>(false);
watch(titleLimit, (newVal) => {
  localStorage.setItem("titleLimit", newVal.toString());
  // 如果禁用了解除标题限制时，标题或填表人为空，则自动补充缺省值
  if (!newVal) {
    if (!title.value) {
      title.value = "2023推TOP100";
      localStorage.setItem("title", title.value);
      drawTitle();
    }
    if (!name.value) {
      name.value = "填表人：__________";
      localStorage.setItem("name", name.value);
      drawTitle();
    }
  }
});

// 格子的行数和列数
const rows = ref<number>(10);
const cols = ref<number>(10);

// 调整格子数量的变量
const resizeDialog = ref<HTMLDialogElement>();
const resizeRows = ref<number>(10);
const resizeCols = ref<number>(10);

// DDPower!
const DDMode = ref<boolean>(false);

// 用indexDB来缓存图片
interface Image {
  axis: string;
  src?: string;
  sourceSrc?: string;
}

class Love100DB extends Dexie {
  images!: Table<Image>;
  constructor() {
    super("love100");
    this.version(1).stores({
      images: '&axis'
    });
  }
}

const db = new Love100DB();

db.version(1).stores({
  images: '&axis'
});

onMounted(() => {
  mountEvent()
});

function mountEvent() {
  drawRects();
  drawTitle();
  drawCopyRight();

  loadLocalData();

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
    }
  });

  // 在图像内拖拽可移动图片
  canvas.value!.addEventListener("mousedown", (e) => {
    const [i, j] = getGridIndex(e);
    if (i === -1 || j === -1) return;
    const img = new Image();
    if (images[i] && images[i][j]) {
      img.onload = () => {
        const ctx = canvas.value!.getContext("2d")!;
        const gridWidth = Math.floor(920 / cols.value) - 12;
        const gridHeight = Math.floor(920 / rows.value) - 12;
        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgRatio = imgWidth / imgHeight;
        const gridRatio = gridWidth / gridHeight;
        let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
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
        ctx.clearRect(drawX, drawY, drawWidth, drawHeight);
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        images[i][j] = img.src;
        db.images.where("axis").equals(`${i},${j}`).modify({ src: img.src }).then((e) => {
          if (e === 0) {
            db.images.put({ axis: `${i},${j}`, src: img.src, sourceSrc: img.src });
          }
        });
      };
      img.src = images[i][j];
    }
    const up = (e: MouseEvent) => {
      const [_i, _j] = getGridIndex(e);
      if (_i === -1 || _j === -1) return;
      if (_i !== i || _j !== j) {
        if (images[i] && images[i][j]) {
          if (images[_i] && images[_i][_j]) {
            const temp = JSON.parse(JSON.stringify(images[_i][_j]));
            images[_i][_j] = JSON.parse(JSON.stringify(images[i][j]));
            images[i][j] = temp;
            db.images.where("axis").equals(`${_i},${_j}`).modify({ src: images[_i][_j] });
            db.images.where("axis").equals(`${i},${j}`).modify({ src: images[i][j] });
            // 清空并重绘这两个格子
            const img = new Image();
            img.onload = () => {
              clearCrop(_i, _j);
              drawImageOnGrid(img, _i, _j);
            };
            img.src = images[_i][_j];
            const img2 = new Image();
            img2.onload = () => {
              clearCrop(i, j);
              drawImageOnGrid(img2, i, j);
            };
            img2.src = images[i][j];
          } else {
            images[_i][_j] = images[i][j];
            images[i][j] = "";
            // 修改数据库里对应的主键
            db.images.where("axis").equals(`${i},${j}`).modify({ axis: `${_i},${_j}` });
            const img = new Image();
            img.onload = () => {
              drawImageOnGrid(img, _i, _j);
              clearCrop(i, j);
            };
            img.src = images[_i][_j];
          }
        }
      } else {
        // 判断格子内是否有图片，若有则调用图片编辑
        if (images[_i] && images[_i][_j]) {
          onCrop(_i, _j);
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
                drawImageOnGrid(img, _i, _j);
                // 图片上传时存入数据库
                db.images.put({ axis: `${_i},${_j}`, src: img.src, sourceSrc: img.src });
              };
              img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
          };
          input.click();
        }
      }
      canvas.value!.removeEventListener("mouseup", up);
    };
    canvas.value!.addEventListener("mouseup", up);
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
    if (titleLimit.value) {
      title.value = (
        prompt(`请输入新标题`, title.value) || ""
      ).trim();
      localStorage.setItem("title", title.value);
      drawTitle();
    } else {
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
  }
  // 判断当前点击是否在填表人部分
  if (x > 930 - 32 - nameWidth.value && x < 930 - 32 && y > 48 && y < 80) {
    if (titleLimit.value) {
      name.value = `${(
        prompt("请输入填表人的名字", name.value) || ""
      ).trim()}`;
      localStorage.setItem("name", name.value);
      drawTitle();
    } else {
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
}

// 绘制版权信息
function drawCopyRight() {
  const ctx = canvas.value!.getContext("2d")!;
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 1030, 930, 30);
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
  // 获取sourceSrc
  db.images.where("axis").equals(`${x},${y}`).first((e) => {
    if (e) {
      cropperSrc.value = e.sourceSrc;
    } else {
      cropperSrc.value = images[x][y];
    }
  }).then(() => {
    // 获取cropperSrc的宽高
    const img = new Image();
    img.src = cropperSrc.value || '';
    img.onload = () => {
      cropCoord.value = {
        x,
        y,
        width: img.width,
        height: img.height
      };
      console.log(cropCoord.value);
      cropperDialog.value!.showModal();
    };
  });
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
function clearCrop(i, j) {
  const ctx = canvas.value!.getContext("2d")!;
  ctx.clearRect(11 + Math.floor(920 / cols.value) * i, 111 + Math.floor(920 / rows.value) * j, Math.floor(920 / cols.value) - 12, Math.floor(920 / rows.value) - 12);
  images[i][j] = "";
  db.images.delete(`${i},${j}`);
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
  db.images.where("axis").equals(`${i},${j}`).modify({ src: img.src }).then((e) => {
    if (e === 0) {
      db.images.put({ axis: `${i},${j}`, src: img.src, sourceSrc: img.src });
    }
  });
}

// 读取本地存储的数据
async function loadLocalData() {
  return new Promise<void>(async (resolve) => {
    if (localStorage.getItem("titleLimit")) {
      titleLimit.value = localStorage.getItem("titleLimit") === "true";
    }
    if (localStorage.getItem("rows")) {
      rows.value = Number(localStorage.getItem("rows")!);
      drawRects();
    }
    if (localStorage.getItem("cols")) {
      cols.value = Number(localStorage.getItem("cols")!);
      drawRects();
    }
    await db.images.toArray().then((e) => {
      e.forEach((item) => {
        const [i, j] = item.axis.split(",").map((e) => Number(e));
        const img = new Image();
        img.src = item.src!;
        img.onload = () => {
          drawImageOnGrid(img, i, j);
        };
      });
    });
    if (localStorage.getItem("title")) {
      title.value = localStorage.getItem("title")!;
      drawTitle();
    }
    if (localStorage.getItem("name")) {
      name.value = localStorage.getItem("name")!;
      drawTitle();
    }
    resolve();
  });
}

// 存储数据副本
async function save() {
  const saveButton = document.getElementById("save")!;
  saveButton.innerText = "导出中...";
  /** 改为组成json并下载 */
  const json = {
    images: '',
    title: localStorage.getItem("title")! || '',
    name: localStorage.getItem("name")! || '',
    rows: localStorage.getItem("rows")! || 10,
    cols: localStorage.getItem("cols")! || 10,
    time: new Date().toLocaleString()
  };
  await db.images.toArray().then((e) => {
    json.images = JSON.stringify(e);
  });
  const link = document.createElement("a");
  link.download = `${title.value}.json`;
  link.href = URL.createObjectURL(new Blob([JSON.stringify(json)]));
  link.click();
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
    images = new Array(20).fill(0).map(() => new Array(20).fill(""));
    const restoreButton = document.getElementById("restore")!;
    const file = input.files![0];
    const reader = new FileReader();
    restoreButton.innerText = "导入中...";
    reader.onload = async () => {
      const json = JSON.parse(reader.result as string);
      if (json.images) {
        const images = JSON.parse(json.images);
        // 清空数据库
        db.images.clear();
        if (!json.images.includes("sourceSrc")) {
          // 旧版本导出兼容
          for (let i = 0; i < cols.value; i++) {
            for (let j = 0; j < rows.value; j++) {
              // console.log(i, j);
              if (images[i] && images[i][j]) {
                console.log('active', i, j);
                db.images.put({ axis: `${i},${j}`, src: images[i][j], sourceSrc: images[i][j] });
              }
            }
          }
        } else {
          images.map((item: any) => {
            db.images.put(item);
          });
        }
      }
      if (json.title) localStorage.setItem("title", json.title); else localStorage.removeItem("title");
      if (json.name) localStorage.setItem("name", json.name); else localStorage.removeItem("name");
      if (json.rows) localStorage.setItem("rows", json.rows); else localStorage.removeItem("rows");
      if (json.cols) localStorage.setItem("cols", json.cols); else localStorage.removeItem("cols");
      await loadLocalData();
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
  db.images.clear();
  images = new Array(20).fill(0).map(() => new Array(20).fill(""));
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
  link.download = `${title.value}.png`;
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
    JSON.stringify(images).includes("data:image")) {
    if (!confirm("调整后的纵横比不同，会导致已填入的图片无法占满格子，是否继续？")) return;
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
  loadLocalData();
}

</script>
