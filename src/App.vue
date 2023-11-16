<script setup lang="ts">
import Tool from "./components/Tool.vue";
import { VGithubIcon } from 'v-github-icon';
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent); 
</script>

<template>
  <div>
    推荐在PC端使用。鼠标左键点击空格子或将图片拖入格子填表，再次点击编辑格子内图片。
  </div>
  <div>标题和填表人可点击修改。</div>
  <div><span style="color: red;">New!</span> 追加表内拖拽功能，可以自由交换已填入格子的位置！</div>
  <div><span style="color: red;">New!</span> 追加解除标题限制开关，启用后标题和填表人字样可以更自由地填写。</div>
  <div>（若清空无法修改，关闭解除限制开关即可还原初始值）</div>
  <div v-if="isMobile" style="color: red;">
    手机端建议右上角浏览器打开/善用导出，防止误触退出页面丢失缓存
  </div>
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
    <span>都看到这里了点个star呗求你了</span>
    <iframe src="https://ghbtns.com/github-btn.html?user=SomiaWhiteRing&repo=love100&type=star&count=true" frameborder="0"
      scrolling="0" width="50" height="20" title="GitHub">
    </iframe>
  </span>
  <VGithubIcon position="top-left" url="https://github.com/SomiaWhiteRing/love100" />
</template>

