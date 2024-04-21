<template>
  <div class="inline-flex gap-4 justify-center items-center flex-wrap">
    <button
      class="btn text-white btn-primary btn-sm"
      :class="isMobile && 'btn-lg text-2xl'"
      id="save"
      @click="save()"
    >
      导出
    </button>
    <button
      class="btn text-white btn-primary btn-sm"
      :class="isMobile && 'btn-lg text-2xl'"
      id="restore"
      @click="restore"
    >
      导入
    </button>
    <button
      class="btn text-white btn-error btn-sm"
      :class="isMobile && 'btn-lg text-2xl'"
      id="clear"
      @click="clear"
    >
      清空
    </button>
    <button
      class="btn text-white btn-primary btn-sm"
      :class="isMobile && 'btn-lg text-2xl'"
      id="download"
      @click="download"
    >
      下载
    </button>
    <button
      class="btn text-white btn-secondary btn-sm"
      :class="isMobile && 'btn-lg text-2xl'"
      @click="showResizeDialog()"
    >
      格子太多了！
    </button>
    <button
      class="btn text-white btn-accent btn-sm"
      :class="isMobile && 'btn-lg text-2xl'"
      @click="showCustomDialog()"
    >
      精确调整
    </button>
    <button
      class="btn text-white btn-success btn-sm"
      :class="isMobile && 'btn-lg text-2xl'"
      @click="showShareDialog()"
    >
      分享
    </button>

    <label class="label cursor-pointer" :class="isMobile && 'text-2xl'">
      <input
        class="toggle"
        type="checkbox"
        v-model="titleLimit"
        :checked="titleLimit"
      />
      <span class="ml-1">解除标题限制</span>
    </label>

    <label class="label cursor-pointer" :class="isMobile && 'text-2xl'">
      <input
        class="toggle"
        type="checkbox"
        v-model="textMode"
        :checked="textMode"
      />
      <span class="ml-1">填字模式</span>
    </label>
  </div>
  <canvas ref="canvas" width="930" height="1060" />
  <!-- 写一个弹窗，内含vue-cropper图片编辑组件 -->
  <dialog ref="cropperDialog">
    <div class="p-8 flex flex-col gap-4 relative overflow-hidden">
      <button
        class="absolute btn btn-ghost top-0 right-0"
        @click="
          cropperDialog!.close();
          cropperSrc = '';
        "
      >
        ✖
      </button>
      <span class="text-3xl mb-4 font-bold">编辑图片</span>
      <vue-cropper
        ref="cropperRef"
        v-if="cropperSrc"
        style="width: 400px; height: 400px"
        :img="cropperSrc"
        :fixedNumber="[rowsWidth[cropCoord!.x], colsWidth[cropCoord!.y]]"
        outputType="png"
        infoTrue
        autoCrop
        fixed
        :enlarge="
          Math.max(
            Math.ceil(cropCoord.width / 400),
            Math.ceil(cropCoord.height / 400)
          )
        "
      />
      <div class="flex gap-4 justify-end mt-4">
        <button
          class="btn text-white btn-sm btn-warning"
          :class="isMobile && 'btn-lg text-2xl'"
          @click="clearCrop(cropCoord!.x, cropCoord!.y)"
        >
          清空
        </button>
        <button
          class="btn text-white btn-sm btn-primary"
          :class="isMobile && 'btn-lg text-2xl'"
          @click="afterCrop"
        >
          确定
        </button>
      </div>
    </div>
  </dialog>
  <!-- 再写一个弹窗，内含横竖两个有间隔的滑条调整格子数量，中间有一个根据当前长宽演示格子形状的示意图 -->
  <dialog ref="resizeDialog">
    <div class="p-8 flex flex-col gap-4 relative overflow-hidden">
      <div
        class="absolute btn btn-ghost top-0 right-0"
        @click="resizeDialog!.close()"
      >
        ✖
      </div>
      <span class="text-3xl mb-4 font-bold">调整格子数量</span>
      <div style="display: flex; align-items: center">
        <div style="width: 50px" />
        <input
          type="range"
          min="1"
          :max="DDMode ? 20 : 10"
          v-model="resizeCols"
          style="width: 400px"
        />
      </div>
      <div style="display: flex; align-items: center">
        <div
          style="
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 50px;
          "
        >
          <input
            type="range"
            min="1"
            :max="DDMode ? 20 : 10"
            v-model="resizeRows"
            style="width: 400px; margin: 16px 0; transform: rotate(90deg)"
          />
        </div>
        <div
          style="
            width: 400px;
            height: 400px;
            display: flex;
            flex-direction: column;
            gap: 2px;
          "
        >
          <div
            v-for="i in Number(resizeRows)"
            :key="i"
            style="display: flex; flex: 1; gap: 2px"
          >
            <div
              v-for="j in Number(resizeCols)"
              :key="j"
              style="flex: 1; background: #999"
            />
          </div>
        </div>
      </div>
      <div class="flex gap-4 justify-end mt-4">
        <button
          v-if="!DDMode"
          class="btn text-white btn-sm btn-warning"
          :class="isMobile && 'btn-lg text-2xl'"
          @click="
            resizeCols = 20;
            resizeRows = 20;
            DDMode = true;
          "
        >
          我的意思是，格子不够用了
        </button>
        <button
          v-if="DDMode"
          class="btn text-white btn-sm btn-success"
          :class="isMobile && 'btn-lg text-2xl'"
          @click="
            DDMode = false;
            resizeRows = resizeRows > 10 ? 10 : resizeRows;
            resizeCols = resizeCols > 10 ? 10 : resizeCols;
          "
        >
          算了算了
        </button>
        <button
          class="btn text-white btn-sm btn-primary"
          :class="isMobile && 'btn-lg text-2xl'"
          @click="submitResize"
        >
          确定
        </button>
      </div>
    </div>
  </dialog>
  <!-- 再再写一个弹窗，可以利用类似excel的方式精细调整格子的宽高与间距 -->
  <dialog ref="customDialog">
    <div class="p-8 flex flex-col gap-4 relative overflow-hidden">
      <div
        class="absolute btn btn-ghost top-0 right-0"
        @click="customDialog!.close()"
      >
        ✖
      </div>
      <span class="text-3xl font-bold">精确调整</span>
      <!-- 数值调整区 -->
      <div class="flex h-16 flex-col gap-4">
        <div
          v-if="
            customFocusType === customMouseOnType &&
            customFocusIndex === customMouseOnIndex &&
            customFocusType
          "
        >
          当前正在调整第{{ toChinese(customFocusIndex + 1)
          }}{{ toChinese(customFocusType) }}
        </div>
        <div v-else-if="customMouseOnType">
          当前选中的目标为第{{ toChinese(customMouseOnIndex + 1)
          }}{{ toChinese(customMouseOnType) }}
        </div>
        <div v-else-if="customFocusType">
          当前正在调整第{{ toChinese(customFocusIndex + 1)
          }}{{ toChinese(customFocusType) }}
        </div>
        <div v-if="customFocusType || customMouseOnType">
          其宽度为
          <input
            v-if="
              (!customMouseOnType && customFocusType === 'row') ||
              customMouseOnType === 'row'
            "
            class="input input-sm input-primary w-24"
            :value="
              customMouseOnType
                ? customRowsWidth[customMouseOnIndex]
                : customRowsWidth[customFocusIndex]
            "
            @input="
              customFocusType &&
                customChange(
                  customFocusType,
                  customFocusIndex,
                  $event as InputEvent
                )
            "
          />
          <input
            v-else-if="
              (!customMouseOnType && customFocusType === 'col') ||
              customMouseOnType === 'col'
            "
            class="input input-sm input-primary w-24"
            :value="
              customMouseOnType
                ? customColsWidth[customMouseOnIndex]
                : customColsWidth[customFocusIndex]
            "
            @input="
              customFocusType &&
                customChange(
                  customFocusType,
                  customFocusIndex,
                  $event as InputEvent
                )
            "
          />
          <input
            v-else-if="
              (!customMouseOnType && customFocusType === 'rowGap') ||
              customMouseOnType === 'rowGap'
            "
            class="input input-sm input-primary w-24"
            :value="
              customMouseOnType === 'rowGap'
                ? customRowsGap[customMouseOnIndex]
                : customRowsGap[customFocusIndex]
            "
            @input="
              customFocusType &&
                customChange(
                  customFocusType,
                  customFocusIndex,
                  $event as InputEvent
                )
            "
          />
          <input
            v-else-if="
              (!customMouseOnType && customFocusType === 'colGap') ||
              customMouseOnType === 'colGap'
            "
            class="input input-sm input-primary w-24"
            :value="
              customMouseOnType === 'colGap'
                ? customColsGap[customMouseOnIndex]
                : customColsGap[customFocusIndex]
            "
            @input="
              customFocusType &&
                customChange(
                  customFocusType,
                  customFocusIndex,
                  $event as InputEvent
                )
            "
          />
          px
        </div>
        <!-- 当没有选中的项时，显示操作说明 -->
        <template v-else>
          <div>点击想要调整的行/列头部或行/列间距，即可在此处调整宽度。</div>
          <div v-if="!isMobile">按住行/列间距后可以拖拽调整位置。</div>
        </template>
      </div>
      <!-- 绘制操作区 -->
      <div
        class="w-[500px] h-[500px] flex flex-col relative"
        @mouseleave="dragEvent = false"
      >
        <!-- 底部背景，代表表格区域 -->
        <div
          class="w-[455px] h-[455px] flex flex-col bg-gray-400 absolute right-0 bottom-0"
        />
        <!-- 绘制行 -->
        <div
          v-for="(item, index) in customRowsWidth"
          :key="index"
          style="height: 100%; position: absolute"
          :style="{
            width: (item + 2) / 2 + 'px',
            left:
              45 +
              customRowsGap.slice(0, index).reduce((a, b) => a + b, 0) / 2 +
              customRowsWidth.slice(0, index).reduce((a, b) => a + b + 2, 0) /
                2 +
              'px',
            zIndex:
              (customFocusType === 'row' &&
                customFocusIndex === index &&
                !customMouseOnType) ||
              (customMouseOnType === 'row' && customMouseOnIndex === index)
                ? 1
                : 'auto',
            background:
              (customFocusType === 'row' &&
                customFocusIndex === index &&
                !customMouseOnType) ||
              (customMouseOnType === 'row' && customMouseOnIndex === index)
                ? '#3f9eff33'
                : 'transparent',
          }"
          @mouseleave="customMouseOnEvent('', -1, $event)"
        >
          <div
            class="h-[45px] w-full bg-transparent absolute top-0 cursor-pointer flex justify-center items-center select-none"
            @click="customFocusEvent('row', index, $event)"
            @mousemove="customMouseOnEvent('row', index, $event)"
          >
            {{ customRowsWidth[index] }}
          </div>
        </div>
        <!-- 绘制列 -->
        <div
          v-for="(item, index) in customColsWidth"
          :key="index"
          style="width: 100%; position: absolute"
          :style="{
            height: (item + 2) / 2 + 'px',
            top:
              45 +
              customColsGap.slice(0, index).reduce((a, b) => a + b, 0) / 2 +
              customColsWidth.slice(0, index).reduce((a, b) => a + b + 2, 0) /
                2 +
              'px',
            zIndex:
              (customFocusType === 'col' &&
                customFocusIndex === index &&
                !customMouseOnType) ||
              (customMouseOnType === 'col' && customMouseOnIndex === index)
                ? 1
                : 'auto',
            background:
              (customFocusType === 'col' &&
                customFocusIndex === index &&
                !customMouseOnType) ||
              (customMouseOnType === 'col' && customMouseOnIndex === index)
                ? '#3f9eff33'
                : 'transparent',
          }"
          @mouseleave="customMouseOnEvent('', -1, $event)"
        >
          <div
            class="w-[45px] h-full bg-transparent absolute left-0 cursor-pointer flex justify-center items-center select-none"
            @click="customFocusEvent('col', index, $event)"
            @mousemove="customMouseOnEvent('col', index, $event)"
          >
            {{ customColsWidth[index] }}
          </div>
        </div>
        <!-- 绘制行间距 -->
        <div
          v-for="(item, index) in customRowsGap"
          :key="index"
          style="
            height: 100%;
            position: absolute;
            cursor: col-resize;
            background-color: #ffffff;
          "
          :style="{
            width: item / 2 + 'px',
            left:
              45 +
              customRowsGap.slice(0, index).reduce((a, b) => a + b, 0) / 2 +
              customRowsWidth
                .slice(0, index + 1)
                .reduce((a, b) => a + b + 2, 0) /
                2 +
              'px',
            zIndex:
              (customFocusType === 'rowGap' &&
                customFocusIndex === index &&
                !customMouseOnType) ||
              (customMouseOnType === 'rowGap' && customMouseOnIndex === index)
                ? 1
                : 'auto',
          }"
          @mousedown="customFocusEvent('rowGap', index, $event)"
          @mouseup="dragEvent = false"
          @mousemove="customMouseOnEvent('rowGap', index, $event)"
          @mouseleave="
            dragEvent
              ? customMouseOnEvent('rowGap', index, $event)
              : customMouseOnEvent('', -1, $event)
          "
        >
          <div
            v-if="
              (customFocusType === 'rowGap' &&
                customFocusIndex === index &&
                !customMouseOnType) ||
              (customMouseOnType === 'rowGap' && customMouseOnIndex === index)
            "
            class="bg-[#3f9eff] w-full h-full absolute top-0 opacity-20"
          />
        </div>
        <!-- 绘制列间距 -->
        <div
          v-for="(item, index) in customColsGap"
          :key="index"
          style="
            width: 100%;
            position: absolute;
            cursor: row-resize;
            background-color: #ffffff;
          "
          :style="{
            height: item / 2 + 'px',
            top:
              45 +
              customColsGap.slice(0, index).reduce((a, b) => a + b, 0) / 2 +
              customColsWidth
                .slice(0, index + 1)
                .reduce((a, b) => a + b + 2, 0) /
                2 +
              'px',
            zIndex:
              (customFocusType === 'colGap' &&
                customFocusIndex === index &&
                !customMouseOnType) ||
              (customMouseOnType === 'colGap' && customMouseOnIndex === index)
                ? 1
                : 'auto',
            background:
              (customFocusType === 'colGap' &&
                customFocusIndex === index &&
                !customMouseOnType) ||
              (customMouseOnType === 'colGap' && customMouseOnIndex === index)
                ? '#3f9eff33'
                : '#FFFFFF',
          }"
          @mousedown="customFocusEvent('colGap', index, $event)"
          @mouseup="dragEvent = false"
          @mousemove="customMouseOnEvent('colGap', index, $event)"
          @mouseleave="
            dragEvent
              ? customMouseOnEvent('colGap', index, $event)
              : customMouseOnEvent('', -1, $event)
          "
        >
          <div
            v-if="
              (customFocusType === 'colGap' &&
                customFocusIndex === index &&
                !customMouseOnType) ||
              (customMouseOnType === 'colGap' && customMouseOnIndex === index)
            "
            class="bg-[#3f9eff] w-full h-full absolute top-0 opacity-20"
          />
        </div>
      </div>
      <!-- 按钮 -->
      <div class="flex gap-4 justify-end mt-4">
        <button
          class="btn text-white btn-sm btn-primary"
          :class="isMobile && 'btn-lg text-2xl'"
          @click="submitCustom"
        >
          确定
        </button>
      </div>
    </div>
  </dialog>
  <!-- 再再再写一个弹窗，用于展示分享的效果和说明 -->
  <dialog ref="shareDialog">
    <div class="p-8 flex flex-col gap-2 relative overflow-hidden">
      <div
        class="absolute btn btn-ghost top-0 right-0"
        @click="shareDialog!.close()"
      >
        ✖
      </div>
      <span class="text-3xl font-bold">分享图表</span>
      <div class="flex flex-col gap-2">
        <div>可以将自己用此工具设计好的图表发给他人来填表！</div>
        <div>
          注意：受容量限制，分享的图表将<span class="font-bold">不会</span
          >包含图片和填表人信息。
        </div>
        <div class="text-start">分享效果浏览：</div>
      </div>
      <div class="p-2 border border-gray-700 m-auto">
        <div class="flex flex-col text-start font-bold ml-4">
          {{ title }}
        </div>
        <div class="flex flex-col">
          <div
            v-for="(row, index) in sharePreview"
            :key="row"
            class="flex"
            :style="{
              height: colsWidth[index] / 2.5 + 'px',
              marginBottom: colsGap[index] / 2.5 + 'px',
            }"
          >
            <div
              v-for="(item, index) in row"
              :key="item"
              class="text-xs"
              :style="{
                width: rowsWidth[index] / 2.5 + 'px',
                marginRight: rowsGap[index] / 2.5 + 'px',
                boxShadow: item ? '' : '0 0 0 1px #999',
              }"
            >
              {{ item }}
            </div>
          </div>
        </div>
      </div>
      <div class="join w-[450px] cursor-pointer">
        <div>
          <input
            :value="shareSite"
            class="join-item input input-sm input-primary rounded-r-none"
            :style="{ width: isMobile ? '400px' : '340px' }"
            readonly
          />
        </div>
        <div class="indicator">
          <button
            v-if="!isMobile"
            class="btn btn-sm btn-primary join-item"
            :class="isMobile && 'btn-lg text-2xl'"
            @click="copyShareSite"
          >
            复制到剪贴板
          </button>
          <button
            v-if="isMobile"
            class="btn btn-sm btn-primary join-item"
            :class="isMobile && 'btn-lg text-2xl'"
            @click="shareSiteMobile"
          >
            分享
          </button>
        </div>
      </div>
    </div>
  </dialog>
  <!-- 再再再再写一个弹窗，用于接受分享 -->
  <dialog ref="sharedDialog">
    <div class="p-8 flex flex-col gap-2 relative overflow-hidden">
      <div
        class="absolute btn btn-ghost top-0 right-0"
        @click="closeSharedDialog()"
      >
        ✖
      </div>
      <span class="text-3xl font-bold">你收到了一张表！</span>
      <div class="flex flex-col gap-2">
        <div>
          注意：如果已经有表填到一半，将会被这张表<span class="font-bold"
            >覆盖</span
          >！
        </div>
        <div class="text-start">图表浏览：</div>
      </div>
      <div class="p-2 border border-gray-700 m-auto">
        <div class="flex flex-col text-start font-bold ml-4">
          {{ sharedPreviewConfig.title }}
        </div>
        <div class="flex flex-col">
          <div
            v-for="(row, index) in sharedPreview"
            :key="row"
            class="flex"
            :style="{
              height: sharedPreviewConfig.colsWidth[index] / 2.5 + 'px',
              marginBottom: sharedPreviewConfig.colsGap[index] / 2.5 + 'px',
            }"
          >
            <div
              v-for="(item, index) in row"
              :key="item"
              class="text-xs"
              :style="{
                width: sharedPreviewConfig.rowsWidth[index] / 2.5 + 'px',
                marginRight: sharedPreviewConfig.rowsGap[index] / 2.5 + 'px',
                boxShadow: item ? '' : '0 0 0 1px #999',
              }"
            >
              {{ item }}
            </div>
          </div>
        </div>
      </div>
      <div class="flex gap-4 justify-end mt-4">
        <button
          class="btn text-white btn-secondary btn-sm"
          :class="isMobile && 'btn-lg text-2xl'"
          id="shareSave"
          @click="save('shareSave')"
        >
          我要先导出已填写的图表
        </button>
        <button
          class="btn text-white btn-sm btn-primary"
          :class="isMobile && 'btn-lg text-2xl'"
          @click="acceptShared"
        >
          确定覆盖
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import Dexie, { type Table } from "dexie";
import pako from "pako";

const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

const canvas = ref<HTMLCanvasElement>();

// 图片编辑相关
const cropperDialog = ref<HTMLDialogElement>();
const cropperRef = ref<any>();
const cropperSrc = ref<string>();
const cropCoord = ref<{ x: number; y: number; width: number; height: number }>({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
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

// 格子每格的宽高与间距
const rowsWidth = ref<Array<number>>([80, 80, 80, 80, 80, 80, 80, 80, 80, 80]);
const rowsGap = ref<Array<number>>([10, 10, 10, 10, 10, 10, 10, 10, 10]);
const colsWidth = ref<Array<number>>([80, 80, 80, 80, 80, 80, 80, 80, 80, 80]);
const colsGap = ref<Array<number>>([10, 10, 10, 10, 10, 10, 10, 10, 10]);

// 调整格子每格的宽高与间距
const customDialog = ref<HTMLDialogElement>();
const customRowsWidth = ref<Array<number>>([
  80, 80, 80, 80, 80, 80, 80, 80, 80, 80,
]);
const customRowsGap = ref<Array<number>>([10, 10, 10, 10, 10, 10, 10, 10, 10]);
const customColsWidth = ref<Array<number>>([
  80, 80, 80, 80, 80, 80, 80, 80, 80, 80,
]);
const customColsGap = ref<Array<number>>([10, 10, 10, 10, 10, 10, 10, 10, 10]);

// 调整间距时的各类杂用参数
const customFocusType = ref<"row" | "col" | "rowGap" | "colGap" | "">("");
const customFocusIndex = ref<number>(-1);
const customMouseOnType = ref<"row" | "col" | "rowGap" | "colGap" | "">("");
const customMouseOnIndex = ref<number>(-1);
const dragEvent = ref<boolean>(false);
const dragStart = ref<number>(0);

// 填字模式
const textMode = ref<boolean>(false);

// 分享功能
const shareDialog = ref<HTMLDialogElement>();
const sharePreview = ref<Array<any>>([]);
const shareSite = ref<string>("");

// 接受分享
const sharedDialog = ref<HTMLDialogElement>();
const sharedKey = ref<string>("");
const sharedPreviewConfig = ref<{
  title: string;
  name: string;
  rows: number;
  cols: number;
  rowsWidth: Array<number>;
  rowsGap: Array<number>;
  colsWidth: Array<number>;
  colsGap: Array<number>;
  titleLimit: boolean;
}>({
  title: "",
  name: "",
  rows: 0,
  cols: 0,
  rowsWidth: [],
  rowsGap: [],
  colsWidth: [],
  colsGap: [],
  titleLimit: false,
});
const sharedPreview = ref<Array<any>>([]);

// 用indexDB来缓存图片
interface Image {
  axis: string;
  type?: "image" | "text";
  src?: string;
  sourceSrc?: string;
  text?: string;
}

class Love100DB extends Dexie {
  images!: Table<Image>;
  constructor() {
    super("love100");
    this.version(2).stores({
      images: "&axis",
    });
  }
}

const db = new Love100DB();

db.version(1).stores({
  images: "&axis",
});

onMounted(() => {
  mountEvent();
  // 如果路由中有shareKey参数，弹出确认接受分享的弹窗
  if (location.search.includes("shareKey")) {
    sharedKey.value = location.search.split("shareKey=")[1].split("&")[0];
    showsharedDialog();
  }
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

  // 封印右键菜单
  canvas.value!.addEventListener("contextmenu", (e) => {
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
        if (i !== -1 || j !== -1) drawOnGrid(img, i, j);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

  // 配置标题栏点击事件
  canvas.value!.addEventListener("click", (e) => {
    const [x, y] = getMousePosition(e);
    if (y < 100) {
      clickTitle(x, y);
    }
  });

  // 配置图块部分的点击与拖拽事件
  canvas.value!.addEventListener("mousedown", async (e) => {
    const [i, j] = getGridIndex(e);
    if (i === -1 || j === -1) return;

    const up = async (e: MouseEvent) => {
      const [_i, _j] = getGridIndex(e);
      if (_i === -1 || _j === -1) return;

      if (_i !== i || _j !== j) {
        // 如果抬起的位置与按下的位置不同，则触发替换类事件
        if ((await db.images.where("axis").equals(`${i},${j}`).count()) === 0)
          return; // 如果原位置没有图片，则替换类事件停止
        if (e.ctrlKey) {
          // 如果按住ctrl，则触发复制事件
          const data = await db.images
            .where("axis")
            .equals(`${i},${j}`)
            .first()!;
          await db.images.put({ ...data, axis: `${_i},${_j}` });
          if (data!.type === "text" && data!.text) {
            drawOnGrid(data!.text, _i, _j);
          } else {
            const img = new Image();
            img.src = data?.src || "";
            img.onload = () => {
              drawOnGrid(img, _i, _j);
            };
          }
        } else if (
          (await db.images.where("axis").equals(`${_i},${_j}`).count()) > 0
        ) {
          // 如果目标位置有图片，则触发交换事件
          db.images
            .where("axis")
            .equals(`${_i},${_j}`)
            .modify({ axis: `temp` });
          db.images
            .where("axis")
            .equals(`${i},${j}`)
            .modify({ axis: `${_i},${_j}` });
          db.images
            .where("axis")
            .equals(`temp`)
            .modify({ axis: `${i},${j}` });

          const data = await db.images
            .where("axis")
            .equals(`${_i},${_j}`)
            .first()!;
          if (data!.type === "text" && data!.text) {
            clearCrop(_i, _j);
            drawOnGrid(data!.text, _i, _j);
          } else {
            const img = new Image();
            img.src = data?.src || "";
            img.onload = () => {
              clearCrop(_i, _j);
              drawOnGrid(img, _i, _j);
            };
          }

          const data2 = await db.images
            .where("axis")
            .equals(`${i},${j}`)
            .first()!;
          if (data2!.type === "text" && data2!.text) {
            clearCrop(i, j);
            drawOnGrid(data2!.text, i, j);
          } else {
            const img2 = new Image();
            img2.src = data2?.src || "";
            img2.onload = () => {
              clearCrop(i, j);
              drawOnGrid(img2, i, j);
            };
          }
        } else {
          // 如果目标位置没有图片，则触发移动事件
          db.images
            .where("axis")
            .equals(`${i},${j}`)
            .modify({ axis: `${_i},${_j}` });
          const data = await db.images
            .where("axis")
            .equals(`${_i},${_j}`)
            .first()!;
          if (data!.type === "text" && data!.text) {
            clearCrop(i, j);
            drawOnGrid(data!.text, _i, _j);
          } else {
            const img = new Image();
            img.src = data?.src || "";
            img.onload = () => {
              clearCrop(i, j);
              drawOnGrid(img, _i, _j);
            };
          }
        }
      } else {
        // 如果抬起的位置与按下的位置相同，则触发点击事件
        if ((await db.images.where("axis").equals(`${_i},${_j}`).count()) > 0) {
          // 如果当前格子有值，则触发编辑事件
          console.log("edit");
          onCrop(_i, _j);
        } else {
          // 如果当前格子没有图片，则触发填表事件
          // 如果填字模式开启或按钮为右键，则触发填字事件
          if (textMode.value || e.button === 2) {
            const text = prompt("请输入文字", "");
            if (text) {
              drawOnGrid(text, _i, _j);
            }
          } else {
            // 否则触发填图事件
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = () => {
              const file = input.files![0];
              const reader = new FileReader();
              reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                  drawOnGrid(img, _i, _j);
                  db.images.put({
                    axis: `${_i},${_j}`,
                    src: img.src,
                    sourceSrc: img.src,
                  });
                };
                img.src = reader.result as string;
              };
              reader.readAsDataURL(file);
            };
            input.click();
          }
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
      ctx.strokeRect(
        10 +
          rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
          rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0),
        110 +
          colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
          colsGap.value.slice(0, j).reduce((a, b) => a + b, 0),
        rowsWidth.value[i] + 2,
        colsWidth.value[j] + 2
      );
      ctx.fillRect(
        11 +
          rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
          rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0),
        111 +
          colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
          colsGap.value.slice(0, j).reduce((a, b) => a + b, 0),
        rowsWidth.value[i],
        colsWidth.value[j]
      );
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
      title.value = (prompt(`请输入新标题`, title.value) || "").trim();
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
        alert(
          `标题长度超出${
            getTextWidth(title.value, "bold 48px tiejili") +
            nameWidth.value -
            930 +
            32 +
            32
          }，请尝试重新输入或缩短填表人名称`
        );
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
      name.value = `${(prompt("请输入填表人的名字", name.value) || "").trim()}`;
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
        alert(
          `填表人名称长度超出${
            getTextWidth(newName, "bold 32px tiejili") +
            titleWidth.value -
            930 +
            32 +
            32
          }，请尝试重新输入或缩短标题`
        );
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
  ctx.font = "12px tiejili";
  ctx.fillText(text1, 10, 1060 - 16);
  ctx.fillText(text2, getTextWidth(text1, "12px tiejili") + 26, 1060 - 16);
  ctx.fillText(
    text3,
    getTextWidth(text1, "12px tiejili") +
      getTextWidth(text2, "12px tiejili") +
      42,
    1060 - 16
  );
}

// 调用图片编辑组件
async function onCrop(x: number, y: number) {
  if ((await db.images.where("axis").equals(`${x},${y}`).count()) === 0) return;
  db.images
    .where("axis")
    .equals(`${x},${y}`)
    .first((e) => {
      // 如果type为text，则触发填写文字事件
      if (e!.type === "text") {
        const text = prompt("请输入文字", "");
        if (text) {
          drawOnGrid(text, x, y);
        } else {
          clearCrop(x, y);
        }
        return;
      }
      // 获取sourceSrc
      cropperSrc.value = e!.sourceSrc;
    })
    .then(() => {
      // 获取cropperSrc的宽高
      const img = new Image();
      img.src = cropperSrc.value || "";
      img.onload = () => {
        cropCoord.value = {
          x,
          y,
          width: img.width,
          height: img.height,
        };
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
      drawOnGrid(img, x, y);
      cropperDialog.value!.close();
      cropperSrc.value = "";
    };
    img.src = data;
  });
}

// 清空指定格子
function clearCrop(i: number, j: number) {
  const ctx = canvas.value!.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.strokeRect(
    10 +
      rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
      rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0),
    110 +
      colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
      colsGap.value.slice(0, j).reduce((a, b) => a + b, 0),
    rowsWidth.value[i] + 2,
    colsWidth.value[j] + 2
  );
  ctx.fillRect(
    11 +
      rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
      rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0),
    111 +
      colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
      colsGap.value.slice(0, j).reduce((a, b) => a + b, 0),
    rowsWidth.value[i],
    colsWidth.value[j]
  );
  db.images.delete(`${i},${j}`);
  cropperDialog.value!.close();
}

// 计算文本的显示长度
function getTextWidth(text: string, font: string) {
  const ctx = canvas.value!.getContext("2d")!;
  ctx.font = font;
  return ctx.measureText(text).width;
}

// 计算文本的显示高度
function getTextHeight(text: string, font: string) {
  const ctx = canvas.value!.getContext("2d")!;
  ctx.font = font;
  return ctx.measureText(text).actualBoundingBoxAscent;
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
  let i = 0,
    j = 0;
  // 鼠标在上下左右边缘时返回[-1, -1]
  if (x < 10 || y < 110 || x > 920 || y > 1020) return [-1, -1];
  // 鼠标在哪个格子就返回哪个格子的坐标
  while (
    x >
    10 +
      rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
      rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0)
  ) {
    i++;
    // 如果鼠标在两个格子之间，则返回[-1, -1]
    if (
      x >
        10 +
          rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
          rowsGap.value.slice(0, i - 1).reduce((a, b) => a + b, 0) &&
      x <
        10 +
          rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
          rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0)
    ) {
      return [-1, -1];
    }
  }
  while (
    y >
    110 +
      colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
      colsGap.value.slice(0, j).reduce((a, b) => a + b, 0)
  ) {
    j++;
    // 如果鼠标在两个格子之间，则返回[-1, -1]
    if (
      y >
        110 +
          colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
          colsGap.value.slice(0, j - 1).reduce((a, b) => a + b, 0) &&
      y <
        110 +
          colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
          colsGap.value.slice(0, j).reduce((a, b) => a + b, 0)
    ) {
      return [-1, -1];
    }
  }
  return [i - 1, j - 1];
}

// 在指定格子上绘制……
function drawOnGrid(data: HTMLImageElement | string, i: number, j: number) {
  switch (typeof data) {
    case "string":
      drawTextOnGrid(data, i, j);
      break;
    case "object":
      drawImageOnGrid(data, i, j);
      break;
  }
}

// 绘制图片
function drawImageOnGrid(img: HTMLImageElement, i: number, j: number) {
  const ctx = canvas.value!.getContext("2d")!;
  const gridWidth = rowsWidth.value[i];
  const gridHeight = colsWidth.value[j];
  ctx.strokeRect(
    10 +
      rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
      rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0),
    110 +
      colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
      colsGap.value.slice(0, j).reduce((a, b) => a + b, 0),
    rowsWidth.value[i] + 2,
    colsWidth.value[j] + 2
  );
  ctx.fillStyle = "#fff";
  ctx.fillRect(
    11 +
      rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
      rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0),
    111 +
      colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
      colsGap.value.slice(0, j).reduce((a, b) => a + b, 0),
    rowsWidth.value[i],
    colsWidth.value[j]
  );
  // 绘制图片时若比例与格子不同则自动裁切
  const imgWidth = img.width;
  const imgHeight = img.height;
  const imgRatio = imgWidth / imgHeight;
  const gridRatio = gridWidth / gridHeight;
  let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
  if (imgRatio > gridRatio) {
    drawWidth = gridWidth;
    drawHeight = drawWidth / imgRatio;
    drawX =
      11 +
      rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
      rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0);
    drawY =
      111 +
      colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
      colsGap.value.slice(0, j).reduce((a, b) => a + b, 0) +
      (gridHeight - drawHeight) / 2;
  } else {
    drawHeight = gridHeight;
    drawWidth = drawHeight * imgRatio;
    drawX =
      11 +
      rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
      rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0) +
      (gridWidth - drawWidth) / 2;
    drawY =
      111 +
      colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
      colsGap.value.slice(0, j).reduce((a, b) => a + b, 0);
  }
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  db.images
    .where("axis")
    .equals(`${i},${j}`)
    .modify({ src: img.src })
    .then((e) => {
      if (e === 0) {
        db.images.put({
          axis: `${i},${j}`,
          src: img.src,
          sourceSrc: img.src,
          type: "image",
        });
      }
    });
}

// 绘制文字
function drawTextOnGrid(text: string, i: number, j: number) {
  // 文字中的英文逗号和#号转换成中文逗号和井号，防止导入导出时解析错误
  text = text.replace(/,/g, "，").replace(/#/g, "＃");
  const ctx = canvas.value!.getContext("2d")!;
  const gridWidth = rowsWidth.value[i];
  const gridHeight = colsWidth.value[j];
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(
    9 +
      rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
      rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0),
    109 +
      colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
      colsGap.value.slice(0, j).reduce((a, b) => a + b, 0),
    gridWidth + 4,
    gridHeight + 6
  );
  ctx.fillStyle = "#000";
  // 先用12px绘制一遍文字，获取文字的长宽，再找出合适的字号绘制一遍
  ctx.font = "12px tiejili";
  const textWidth = getTextWidth(text, "12px tiejili");
  const textHeight = getTextHeight(text, "12px tiejili");
  let fontSize = Math.ceil(
    Math.min((gridWidth / textWidth) * 12, (gridHeight / textHeight) * 12) * 0.9
  );
  ctx.font = `${fontSize}px tiejili`;
  const textTrueWidth = getTextWidth(text, `${fontSize}px tiejili`);
  const textTrueHeight = getTextHeight(text, `${fontSize}px tiejili`);
  // 文字居中绘制
  ctx.fillText(
    text,
    11 +
      rowsWidth.value.slice(0, i).reduce((a, b) => a + b + 2, 0) +
      rowsGap.value.slice(0, i).reduce((a, b) => a + b, 0) +
      (gridWidth - textTrueWidth) / 2,
    111 +
      colsWidth.value.slice(0, j).reduce((a, b) => a + b + 2, 0) +
      colsGap.value.slice(0, j).reduce((a, b) => a + b, 0) +
      (gridHeight - textTrueHeight) / 2 +
      textTrueHeight
  );
  db.images
    .where("axis")
    .equals(`${i},${j}`)
    .modify({ text })
    .then((e) => {
      if (e === 0) {
        db.images.put({ axis: `${i},${j}`, text, type: "text" });
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
    if (localStorage.getItem("rowsWidth")) {
      rowsWidth.value = JSON.parse(localStorage.getItem("rowsWidth")!);
      drawRects();
    }
    if (localStorage.getItem("rowsGap")) {
      rowsGap.value = JSON.parse(localStorage.getItem("rowsGap")!);
      drawRects();
    }
    if (localStorage.getItem("colsWidth")) {
      colsWidth.value = JSON.parse(localStorage.getItem("colsWidth")!);
      drawRects();
    }
    if (localStorage.getItem("colsGap")) {
      colsGap.value = JSON.parse(localStorage.getItem("colsGap")!);
      drawRects();
    }
    await db.images.toArray().then((e) => {
      e.forEach((item) => {
        const [i, j] = item.axis.split(",").map((e) => Number(e));
        if (item.type === "text") {
          drawOnGrid(item.text!, i, j);
          return;
        } else {
          const img = new Image();
          img.src = item.src!;
          img.onload = () => {
            drawOnGrid(img, i, j);
          };
        }
      });
    });
    if (
      localStorage.getItem("title") ||
      localStorage.getItem("titleLimit") === "true"
    ) {
      title.value = localStorage.getItem("title")!;
      drawTitle();
    }
    if (
      localStorage.getItem("name") ||
      localStorage.getItem("titleLimit") === "true"
    ) {
      name.value = localStorage.getItem("name")!;
      drawTitle();
    }
    resolve();
  });
}

// 存储数据副本
async function save(event?: string) {
  const saveButton = event
    ? document.getElementById(event)!
    : document.getElementById("save")!;
  saveButton.innerText = "导出中...";
  /** 改为组成json并下载 */
  const json = {
    images: "",
    title: localStorage.getItem("title")! || "",
    name: localStorage.getItem("name")! || "",
    titleLimit: localStorage.getItem("titleLimit")! || false,
    rows: localStorage.getItem("rows")! || 10,
    cols: localStorage.getItem("cols")! || 10,
    rowsWidth:
      localStorage.getItem("rowsWidth")! || JSON.stringify(Array(10).fill(80)),
    rowsGap:
      localStorage.getItem("rowsGap")! || JSON.stringify(Array(9).fill(10)),
    colsWidth:
      localStorage.getItem("colsWidth")! || JSON.stringify(Array(10).fill(80)),
    colsGap:
      localStorage.getItem("colsGap")! || JSON.stringify(Array(9).fill(10)),
    time: new Date().toLocaleString(),
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
        images.map((item: any) => {
          db.images.put(item);
        });
      }
      if (json.title) localStorage.setItem("title", json.title);
      else localStorage.removeItem("title");
      if (json.name) localStorage.setItem("name", json.name);
      else localStorage.removeItem("name");
      if (json.rows) localStorage.setItem("rows", json.rows);
      else localStorage.removeItem("rows");
      if (json.cols) localStorage.setItem("cols", json.cols);
      else localStorage.removeItem("cols");
      if (json.rowsWidth) localStorage.setItem("rowsWidth", json.rowsWidth);
      else localStorage.removeItem("rowsWidth");
      if (json.rowsGap) localStorage.setItem("rowsGap", json.rowsGap);
      else localStorage.removeItem("rowsGap");
      if (json.colsWidth) localStorage.setItem("colsWidth", json.colsWidth);
      else localStorage.removeItem("colsWidth");
      if (json.colsGap) localStorage.setItem("colsGap", json.colsGap);
      else localStorage.removeItem("colsGap");
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
async function clear() {
  // 弹窗告警
  if (!confirm("确定要清空当前数据吗？")) return;
  localStorage.clear();
  await db.images.clear();
  drawRects();
  localStorage.setItem("rows", "10");
  localStorage.setItem("cols", "10");
  localStorage.setItem("rowsWidth", JSON.stringify(Array(10).fill(80)));
  localStorage.setItem("rowsGap", JSON.stringify(Array(9).fill(10)));
  localStorage.setItem("colsWidth", JSON.stringify(Array(10).fill(80)));
  localStorage.setItem("colsGap", JSON.stringify(Array(9).fill(10)));
  localStorage.setItem("title", "2023推TOP100");
  loadLocalData();

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
async function submitResize() {
  // 如果格子宽高已精确调整，则弹窗提醒用户调整会被重置
  if (
    !rowsWidth.value.every((e) => e === rowsWidth.value[0]) ||
    !rowsGap.value.every((e) => e === rowsGap.value[0]) ||
    !colsWidth.value.every((e) => e === colsWidth.value[0]) ||
    !colsGap.value.every((e) => e === colsGap.value[0])
  ) {
    if (!confirm("调整后的格子宽高会被重置，是否继续？")) return;
  }
  // 如果比例发生了变化且有已经填好的图片，则弹窗提醒用户图片会变形
  else if (
    resizeRows.value / resizeCols.value !== rows.value / cols.value &&
    (await db.images.count()) > 0
  ) {
    if (
      !confirm("调整后的纵横比不同，会导致已填入的图片无法占满格子，是否继续？")
    )
      return;
  }
  // 计算原格子数，如果原标题含有"TOP + 总格子数，则也修改标题"
  const oldGrids = rows.value * cols.value;
  if (title.value.includes(`TOP${oldGrids}`)) {
    title.value = title.value.replace(
      `TOP${oldGrids}`,
      `TOP${resizeRows.value * resizeCols.value}`
    );
    localStorage.setItem("title", title.value);
    drawTitle();
  }
  rows.value = resizeRows.value;
  cols.value = resizeCols.value;
  rowsWidth.value = Array(Number(resizeCols.value)).fill(
    Math.round(920 / resizeCols.value - 12)
  );
  rowsGap.value = Array(resizeCols.value - 1).fill(10);
  colsWidth.value = Array(Number(resizeRows.value)).fill(
    Math.round(920 / resizeRows.value - 12)
  );
  colsGap.value = Array(resizeRows.value - 1).fill(10);
  localStorage.setItem("rows", rows.value.toString());
  localStorage.setItem("cols", cols.value.toString());
  localStorage.setItem("rowsWidth", JSON.stringify(rowsWidth.value));
  localStorage.setItem("rowsGap", JSON.stringify(rowsGap.value));
  localStorage.setItem("colsWidth", JSON.stringify(colsWidth.value));
  localStorage.setItem("colsGap", JSON.stringify(colsGap.value));
  resizeDialog.value!.close();
  drawRects();
  loadLocalData();
}

// 打开精确调整格子宽高的弹窗
function showCustomDialog() {
  customRowsWidth.value = rowsWidth.value;
  customRowsGap.value = rowsGap.value;
  customColsWidth.value = colsWidth.value;
  customColsGap.value = colsGap.value;
  customMouseOnType.value = "";
  customMouseOnIndex.value = -1;
  customFocusType.value = "";
  customFocusIndex.value = -1;
  dragEvent.value = false;
  dragStart.value = 0;
  customDialog.value!.showModal();
}

// 鼠标选中某一行或列
function customFocusEvent(
  type: "row" | "col" | "rowGap" | "colGap" | "",
  index: number,
  event: MouseEvent
) {
  if (customFocusType.value === type && customFocusIndex.value === index) {
    customFocusType.value = "";
    customFocusIndex.value = -1;
  } else {
    customFocusType.value = type;
    customFocusIndex.value = index;
    // 如果是行列间距，启动拖拽事件
    if (type === "rowGap" || type === "colGap") {
      dragEvent.value = true;
      if (type === "rowGap") {
        dragStart.value = event.clientX;
      } else {
        dragStart.value = event.clientY;
      }
    }
  }
}

// 鼠标划到某一行或列
function customMouseOnEvent(
  type: "row" | "col" | "rowGap" | "colGap" | "",
  index: number,
  event: MouseEvent
) {
  // 如果dragEvent已启动，则屏蔽非当前选中类型的鼠标划过事件
  if (
    dragEvent.value &&
    (type !== customFocusType.value || index !== customFocusIndex.value)
  )
    return;
  customMouseOnType.value = type;
  customMouseOnIndex.value = index;
  // 如果dragEvent已启动，则计算鼠标移动距离并调整行列宽高
  if (dragEvent.value) {
    if (type === "rowGap") {
      const distance = event.clientX - dragStart.value;
      if (
        customRowsWidth.value[index] + distance < 2 ||
        customRowsWidth.value[index + 1] - distance < 2
      )
        return;
      customRowsWidth.value[index] += distance * 2;
      customRowsWidth.value[index + 1] -= distance * 2;
      dragStart.value = event.clientX;
      nextTick(() => {
        // 再检测一次，防止拖拽过快导致的错误
        if (customRowsWidth.value[index] < 2) {
          const fixDistance = 2 - customRowsWidth.value[index];
          customRowsWidth.value[index] += fixDistance;
          customRowsWidth.value[index + 1] -= fixDistance;
        }
        if (customRowsWidth.value[index + 1] < 2) {
          const fixDistance = 2 - customRowsWidth.value[index + 1];
          customRowsWidth.value[index] -= fixDistance;
          customRowsWidth.value[index + 1] += fixDistance;
        }
      });
    } else if (type === "colGap") {
      const distance = event.clientY - dragStart.value;
      if (
        customColsWidth.value[index] + distance < 2 ||
        customColsWidth.value[index + 1] - distance < 2
      )
        return;
      customColsWidth.value[index] += distance * 2;
      customColsWidth.value[index + 1] -= distance * 2;
      dragStart.value = event.clientY;
      nextTick(() => {
        // 再检测一次，防止拖拽过快导致的错误
        if (customColsWidth.value[index] < 2) {
          const fixDistance = 2 - customColsWidth.value[index];
          customColsWidth.value[index] += fixDistance;
          customColsWidth.value[index + 1] -= fixDistance;
        }
        if (customColsWidth.value[index + 1] < 2) {
          const fixDistance = 2 - customColsWidth.value[index + 1];
          customColsWidth.value[index] -= fixDistance;
          customColsWidth.value[index + 1] += fixDistance;
        }
      });
    }
  }
}

// 调整行列宽高的值
function customChange(
  type: "row" | "col" | "rowGap" | "colGap",
  index: number,
  event: InputEvent
) {
  let value = Number((event.target as HTMLInputElement).value);
  // 如果value不是纯数字，则阻止本次输入
  if (isNaN(value)) {
    switch (type) {
      case "row":
        (event.target as HTMLInputElement).value =
          customRowsWidth.value[index].toString();
        return;
      case "col":
        (event.target as HTMLInputElement).value =
          customColsWidth.value[index].toString();
        return;
      case "rowGap":
        (event.target as HTMLInputElement).value =
          customRowsGap.value[index].toString();
        return;
      case "colGap":
        (event.target as HTMLInputElement).value =
          customColsGap.value[index].toString();
        return;
    }
  }
  switch (type) {
    case "row":
      const maxWidth =
        rowsWidth.value[index] +
        rowsWidth.value[
          index === rowsWidth.value.length - 1 ? index - 1 : index + 1
        ] -
        2;
      if (value > maxWidth) value = maxWidth;
      if (value < 2) value = 2;
      customRowsWidth.value[index] = value;
      customRowsWidth.value[
        index === rowsWidth.value.length - 1 ? index - 1 : index + 1
      ] = maxWidth - value + 2;
      break;
    case "col":
      const maxHeight =
        colsWidth.value[index] +
        colsWidth.value[
          index === colsWidth.value.length - 1 ? index - 1 : index + 1
        ] -
        2;
      if (value > maxHeight) value = maxHeight;
      if (value < 2) value = 2;
      customColsWidth.value[index] = value;
      customColsWidth.value[
        index === colsWidth.value.length - 1 ? index - 1 : index + 1
      ] = maxHeight - value + 2;
      break;
    case "rowGap":
      const maxRowGap = rowsWidth.value[index + 1] + rowsGap.value[index] - 2;
      if (value > maxRowGap) value = maxRowGap;
      if (value < 2) value = 2;
      customRowsGap.value[index] = value;
      customRowsWidth.value[index + 1] = maxRowGap - value + 2;
      break;
    case "colGap":
      const maxColGap = colsWidth.value[index + 1] + colsGap.value[index] - 2;
      if (value > maxColGap) value = maxColGap;
      if (value < 2) value = 2;
      customColsGap.value[index] = value;
      customColsWidth.value[index + 1] = maxColGap - value + 2;
      break;
  }
}

// 行列名英转中
function toChinese(str: number | string) {
  const chineseNum = [
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十",
    "十一",
    "十二",
    "十三",
    "十四",
    "十五",
    "十六",
    "十七",
    "十八",
    "十九",
    "二十",
  ];
  const chineseType = {
    row: "列",
    col: "行",
    rowGap: "列间距",
    colGap: "行间距",
  };
  switch (typeof str) {
    case "number":
      return chineseNum[str - 1];
    case "string":
      return chineseType[str];
    default:
      return "";
  }
}

// 提交精确调整格子宽高的弹窗
function submitCustom() {
  rowsWidth.value = customRowsWidth.value;
  rowsGap.value = customRowsGap.value;
  colsWidth.value = customColsWidth.value;
  colsGap.value = customColsGap.value;
  localStorage.setItem("rowsWidth", JSON.stringify(rowsWidth.value));
  localStorage.setItem("rowsGap", JSON.stringify(rowsGap.value));
  localStorage.setItem("colsWidth", JSON.stringify(colsWidth.value));
  localStorage.setItem("colsGap", JSON.stringify(colsGap.value));
  customDialog.value!.close();
  drawRects();
  loadLocalData();
}

// 读取默认的表格模板
async function changeTable(e: string) {
  if (e === "动画生涯个人喜好表") {
    localStorage.setItem("title", "动画生涯个人喜好表");
    localStorage.removeItem("name");
    localStorage.setItem("rows", "6");
    localStorage.setItem("cols", "5");
    localStorage.setItem(
      "rowsWidth",
      JSON.stringify([172, 172, 172, 172, 172])
    );
    localStorage.setItem("rowsGap", JSON.stringify([10, 10, 10, 10, 10]));
    localStorage.setItem(
      "colsWidth",
      JSON.stringify([250, 32, 250, 32, 250, 32])
    );
    localStorage.setItem("colsGap", JSON.stringify([10, 10, 10, 10, 10]));
    await db.images.clear();
    await db.images.put({ axis: `${0},${1}`, text: "入坑作", type: "text" });
    await db.images.put({ axis: `${1},${1}`, text: "最喜欢", type: "text" });
    await db.images.put({ axis: `${2},${1}`, text: "看最多次", type: "text" });
    await db.images.put({ axis: `${3},${1}`, text: "最想安利", type: "text" });
    await db.images.put({ axis: `${4},${1}`, text: "最佳剧情", type: "text" });
    await db.images.put({ axis: `${0},${3}`, text: "最佳画面", type: "text" });
    await db.images.put({ axis: `${1},${3}`, text: "最佳配乐", type: "text" });
    await db.images.put({ axis: `${2},${3}`, text: "最佳配音", type: "text" });
    await db.images.put({ axis: `${3},${3}`, text: "最治愈", type: "text" });
    await db.images.put({ axis: `${4},${3}`, text: "最感动", type: "text" });
    await db.images.put({ axis: `${0},${5}`, text: "最虐心", type: "text" });
    await db.images.put({ axis: `${1},${5}`, text: "最被低估", type: "text" });
    await db.images.put({ axis: `${2},${5}`, text: "最过誉", type: "text" });
    await db.images.put({ axis: `${3},${5}`, text: "最离谱", type: "text" });
    await db.images.put({ axis: `${4},${5}`, text: "最讨厌", type: "text" });
    loadLocalData();
  }
}

defineExpose({
  changeTable,
});

// 打开分享弹窗
async function showShareDialog() {
  // 构建浏览数据
  sharePreview.value = JSON.parse(
    JSON.stringify(new Array(rows.value).fill(new Array(cols.value).fill("")))
  );
  console.log(sharePreview.value);
  for (let i = 0; i < cols.value; i++) {
    for (let j = 0; j < rows.value; j++) {
      await db.images
        .where("axis")
        .equals(`${i},${j}`)
        .first()
        .then((e) => {
          if (e && e.type === "text") {
            sharePreview.value[j][i] = e.text;
          }
        });
    }
  }
  shareSite.value = window.location.origin + "?shareKey=" + (await share());
  shareDialog.value!.showModal();
}

// 生成分享链接
async function share() {
  const json = {
    images: [] as any[],
    title: localStorage.getItem("title")! || "",
    rows: localStorage.getItem("rows")! || 10,
    cols: localStorage.getItem("cols")! || 10,
    rowsWidth:
      localStorage.getItem("rowsWidth")! || JSON.stringify(Array(10).fill(80)),
    rowsGap:
      localStorage.getItem("rowsGap")! || JSON.stringify(Array(9).fill(10)),
    colsWidth:
      localStorage.getItem("colsWidth")! || JSON.stringify(Array(10).fill(80)),
    colsGap:
      localStorage.getItem("colsGap")! || JSON.stringify(Array(9).fill(10)),
    titleLimit: localStorage.getItem("titleLimit") === "true" ? true : false,
    // 如果name包含“填表人”，则不存储
    name:
      localStorage.getItem("name")! &&
      !localStorage.getItem("name")!.includes("填表人")
        ? localStorage.getItem("name")
        : "",
  };
  // 存储所有类型为text的数据项
  await db.images.toArray().then((e) => {
    e.forEach((item) => {
      if (item.type === "text") {
        // json.images.push(item);
        // 只提取关键数据，尽可能压缩表长
        json.images.push(`${item.axis}#${item.text}`);
      }
    });
  });
  const zipJson = zip(json);
  return zipJson;
}

// 复制分享链接
async function copyShareSite() {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(shareSite.value);
    alert("已复制到剪贴板!");
  } else {
    const input = document.createElement("input");
    input.value = shareSite.value;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    alert("已复制到剪贴板!");
  }
}

// 移动端分享链接
async function shareSiteMobile() {
  if (navigator.share) {
    await navigator.share({
      title: title.value,
      url: shareSite.value,
    });
  } else {
    alert("当前浏览器不支持分享功能，可以尝试选中链接并复制");
  }
}

// 打开被分享弹窗
async function showsharedDialog() {
  // 解压分享码
  const data = unzip(sharedKey.value);
  console.log(data);
  if (data.images) {
    // 解析images，组成sharedPreview与sharedPreviewConfig
    sharedPreviewConfig.value = {
      rows: Number(data.rows),
      cols: Number(data.cols),
      rowsWidth: JSON.parse(data.rowsWidth),
      rowsGap: JSON.parse(data.rowsGap),
      colsWidth: JSON.parse(data.colsWidth),
      colsGap: JSON.parse(data.colsGap),
      title: data.title,
      name: data.name,
      titleLimit: data.titleLimit,
    };
    sharedPreview.value = JSON.parse(
      JSON.stringify(
        new Array(sharedPreviewConfig.value.rows).fill(
          new Array(sharedPreviewConfig.value.cols).fill("")
        )
      )
    );
    data.images.forEach((item: string) => {
      const [axis, text] = item.split("#");
      const [i, j] = axis.split(",").map((e: string) => Number(e));
      sharedPreview.value[j][i] = text;
    });
    console.log(sharedPreview.value);
    // 如果localstorage一片空白，则直接接收分享
    if (JSON.stringify(localStorage) === "{}") {
      acceptShared();
    } else {
      // 否则弹窗提醒用户接收分享会覆盖当前数据
      sharedDialog.value!.showModal();
    }
  } else {
    // 抹去无效的key
    location.href = location.origin;
  }
}

// 确认接收分享
async function acceptShared() {
  // 清空数据库
  db.images.clear();
  // 存储表格配置
  localStorage.setItem("title", sharedPreviewConfig.value.title);
  localStorage.setItem("name", sharedPreviewConfig.value.name);
  localStorage.setItem(
    "titleLimit",
    sharedPreviewConfig.value.titleLimit ? "true" : "false"
  );
  localStorage.setItem("rows", sharedPreviewConfig.value.rows.toString());
  localStorage.setItem("cols", sharedPreviewConfig.value.cols.toString());
  localStorage.setItem(
    "rowsWidth",
    JSON.stringify(sharedPreviewConfig.value.rowsWidth)
  );
  localStorage.setItem(
    "rowsGap",
    JSON.stringify(sharedPreviewConfig.value.rowsGap)
  );
  localStorage.setItem(
    "colsWidth",
    JSON.stringify(sharedPreviewConfig.value.colsWidth)
  );
  localStorage.setItem(
    "colsGap",
    JSON.stringify(sharedPreviewConfig.value.colsGap)
  );

  // 存储数据
  await Promise.all(
    sharedPreview.value.map(async (row: string[], i: number) => {
      await Promise.all(
        row.map(async (text: string, j: number) => {
          if (text) {
            await db.images.put({ axis: `${j},${i}`, text, type: "text" });
          }
        })
      );
    })
  );

  // 刷新页面并移除分享码
  location.href = location.origin;
}

// 不接收分享
function closeSharedDialog() {
  location.href = location.origin;
}

// 压缩json
function zip(json: any) {
  const str = encodeURIComponent(JSON.stringify(json));
  const binaryString = pako.deflate(str, { to: "string" });
  let encodeStr = "";
  for (let i = 0; i < binaryString.length; i++) {
    encodeStr += String.fromCharCode(binaryString[i]);
  }
  return btoa(encodeStr);
}

// 解压json
function unzip(encodeStr: string) {
  const decodeStr = atob(encodeStr);
  let binaryString = new Uint8Array(decodeStr.length);
  for (let i = 0; i < decodeStr.length; i++) {
    binaryString[i] = decodeStr.charCodeAt(i);
  }
  const json = pako.inflate(binaryString, { to: "string" });
  return JSON.parse(decodeURIComponent(json));
}
</script>
