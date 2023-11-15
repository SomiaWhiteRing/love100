<template>
  <div style="display: inline-flex; gap: 36px;">
    <!-- 写四个按钮，分别是存储，还原，清空，下载 -->
    <button id="save" @click="save">存储</button>
    <button id="restore" @click="restore">还原</button>
    <button id="clear" @click="clear">清空</button>
    <button id="download" @click="download">下载</button>
  </div>
  <canvas ref="canvas" width="930" height="1030"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import tiejiliFont from '../assets/tiejili.ttf'

const canvas = ref<HTMLCanvasElement>()

// 用一个10*10的数组暂存图片
let images = new Array(10).fill(0).map(() => new Array(10).fill(''))

function drawRects() {
  const ctx = canvas.value!.getContext('2d')!
  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, 930, 1030)
  ctx.fillStyle = '#FFF'
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      ctx.strokeRect(10 + 92 * i, 110 + 92 * j, 80, 80)
      ctx.fillRect(11 + 92 * i, 111 + 92 * j, 78, 78)
    }
  }
}

onMounted(async () => {
  drawRects()
  const tiejili = new FontFace('tiejili', `url(${tiejiliFont})`)
  await tiejili.load()

  if (localStorage.getItem('title')) {
    drawTitle(localStorage.getItem('title')!)
  } else {
    drawTitle()
  }

  loadLocalStorage()

  canvas.value!.addEventListener('dragover', (e) => {
    e.preventDefault()
  })

  canvas.value!.addEventListener('drop', (e) => {
    e.preventDefault()
    const file = e.dataTransfer!.files[0]
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const [i, j] = getGridIndex(e)
        drawImageOnGrid(img, i, j)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })

  // 配置点击事件，点击可选择图片上传
  canvas.value!.addEventListener('click', (e) => {
    const [, y] = getMousePosition(e)
    if (y < 100) {
      const name = prompt('请输入填表人的名字', '')
      drawTitle(name || '__________')
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = () => {
        const file = input.files![0]
        const reader = new FileReader()
        reader.onload = () => {
          const img = new Image()
          img.onload = () => {
            const [i, j] = getGridIndex(e)
            drawImageOnGrid(img, i, j)
          }
          img.src = reader.result as string
        }
        reader.readAsDataURL(file)
      }
      input.click()
    }
  })

  // 右键点击清除对应各自图片
  canvas.value!.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    const [, y] = getMousePosition(e)
    if (y > 100) {
      const [i, j] = getGridIndex(e)
      const ctx = canvas.value!.getContext('2d')!
      ctx.clearRect(11 + 92 * i, 111 + 92 * j, 78, 78)
      images[i][j] = ''
      localStorage.setItem('images', JSON.stringify(images))
    }
  })

})

// 计算文本的显示长度
function getTextWidth(text: string, font: string) {
  const ctx = canvas.value!.getContext('2d')!
  ctx.font = font
  return ctx.measureText(text).width
}

// 重绘标题部分
function drawTitle(name?: string) {
  const ctx = canvas.value!.getContext('2d')!
  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, 930, 100)
  ctx.fillStyle = '#000'
  ctx.font = 'bold 48px tiejili'
  ctx.fillText('2023推TOP100', 32, 64)
  ctx.font = 'bold 32px tiejili'
  ctx.fillText(`填表人：${name || '__________'}`, 930 - getTextWidth(`填表人：${name || '__________'}`, 'bold 32px tiejili') - 32, 80)
  // 将标题存储进localStorage
  if (name) {
    localStorage.setItem('title', name)
  } else {
    localStorage.removeItem('title')
  }
}

// 获取鼠标在canvas中的坐标
function getMousePosition(e: MouseEvent) {
  const rect = canvas.value!.getBoundingClientRect()
  const x = Math.floor((e as any).clientX - rect.left)
  const y = Math.floor((e as any).clientY - rect.top)
  return [x, y]
}

// 获取鼠标在哪个格子
function getGridIndex(e: MouseEvent) {
  const [x, y] = getMousePosition(e)
  const i = Math.floor((x - 11) / 92)
  const j = Math.floor((y - 111) / 92)
  return [i, j]
}

// 在指定格子上绘制图片
function drawImageOnGrid(img: HTMLImageElement, i: number, j: number) {
  const ctx = canvas.value!.getContext('2d')!
  ctx.clearRect(11 + 92 * i, 111 + 92 * j, 78, 78)
  ctx.drawImage(img, 11 + 92 * i, 111 + 92 * j, 78, 78)
  // 将图片暂存在数组中
  images[i][j] = img.src
  localStorage.setItem('images', JSON.stringify(images))
}

// 从localStorage中读取数据
function loadLocalStorage() {
  if (localStorage.getItem('images')) {
    images = JSON.parse(localStorage.getItem('images')!)
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (images[i][j]) {
          // 根据images[i][j]创建一个Image对象
          const img = new Image()
          img.src = images[i][j]
          img.onload = () => {
            drawImageOnGrid(img, i, j)
          }
        }
      }
    }
  }
}

function save() {
  localStorage.setItem('imagesSaved', localStorage.getItem('images')!)
  const saveButton = document.getElementById('save')!
  saveButton.innerText = '存储✅'
  setTimeout(() => {
    saveButton.innerText = '存储'
  }, 2000)
}

function restore() {
  if (!localStorage.getItem('imagesSaved')) {
    alert('没有存储的数据')
    return
  }
  if (localStorage.getItem('imagesSaved')) {
    localStorage.setItem('images', localStorage.getItem('imagesSaved')!)
    loadLocalStorage()
  }
  const restoreButton = document.getElementById('restore')!
  restoreButton.innerText = '还原✅'
  setTimeout(() => {
    restoreButton.innerText = '还原'
  }, 2000)
}

function clear() {
  localStorage.removeItem('images')
  drawRects()
  drawTitle()
  const clearButton = document.getElementById('clear')!
  clearButton.innerText = '清空✅'
  setTimeout(() => {
    clearButton.innerText = '清空'
  }, 2000)
}

function download() {
  const downloadButton = document.getElementById('download')!
  downloadButton.innerText = '下载✅'
  setTimeout(() => {
    downloadButton.innerText = '下载'
  }, 2000)
  const link = document.createElement('a')
  link.download = '2023推TOP100.png'
  link.href = canvas.value!.toDataURL()
  link.click()
}
</script>

<style>
button {
  background-color: #409EFF;
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
