<script setup lang="ts">
import Tool from "./components/Tool.vue";
import { VGithubIcon } from 'v-github-icon';
</script>

<template>
  <div>
    推荐在PC端使用。鼠标左键点击空格子或将图片拖入格子填表，再次点击编辑格子内图片。
  </div>
  <div>标题和填表人可点击修改。</div>
  <Tool />
  <span style="
        font-size: 12px;
        color: #999;
        margin-top: 10px;
        display: inline-flex;
        gap: 16px;
      ">
    <span>推TOP100生成器</span>
    <a href="https://weibo.com/6571509464" target="_blank" style="color: #000">@苍旻白轮</a>
    <span>love100.shatranj.space</span>
    <a href="https://github.com/SomiaWhiteRing/love100" target="_blank" style="color: #000">GitHub</a>
  </span>
  <VGithubIcon position="top-left" url="https://github.com/SomiaWhiteRing/love100" />
</template>

