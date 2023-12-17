<script setup lang="ts">
import Tool from "./Tool.vue";
import { VGithubIcon } from 'v-github-icon';
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent); 
</script>

<template>
  <details class="collapse collapse-arrow bg-yellow-300 cursor-pointer mb-2">
    <summary class="collapse-title text-xl font-medium">2023/12/17 更新说明</summary>
    <div class="collapse-content">
      <div>本次更新追加“精细调整”功能。（仅限PC）</div>
      <div>为了适应新功能进行了大规模重构，无法保证没有BUG。</div>
      <div>若发现问题请务必
        <a href="https://github.com/SomiaWhiteRing/love100/issues" target="_blank">
          在github提交issue
        </a>
        或微博私信
        <a href="https://weibo.com/6571509464" target="_blank">
          @苍旻白轮p
        </a>
        。
      </div>
    </div>
  </details>
  <details class="collapse collapse-arrow bg-gray-200 cursor-pointer mb-2">
    <summary class="collapse-title text-xl font-medium">点击查看使用说明</summary>
    <div class="collapse-content">
      <div>推荐在PC端使用。</div>
      <div>鼠标左键点击空格子或将图片拖入格子填表，再次点击编辑格子内图片。</div>
      <div>标题和填表人可点击修改。</div>
      <div v-if="!isMobile">在表内进行拖拽，可以自由交换已填入格子的位置（仅限PC）</div>
      <div>解除标题限制开关启用后标题和填表人字样可以更自由地填写。</div>
      <div>（若清空无法修改，关闭解除限制开关即可还原初始值）</div>
      <div>建议善用导出，防止出现谜之BUG/杀毒软件清理垃圾等原因丢失记录。</div>
    </div>
  </details>
  <Tool />
  <span class="text-sm text-gray-500 mt-2 inline-flex gap-4">
    <span>推TOP100生成器</span>
    <a href="https://weibo.com/6571509464" target="_blank">@苍旻白轮</a>
    <span>love100.shatranj.space</span>
    <a href="https://github.com/SomiaWhiteRing/love100" target="_blank">GitHub</a>
    <span>都看到这里了点个star呗求你了</span>
    <iframe src="https://ghbtns.com/github-btn.html?user=SomiaWhiteRing&repo=love100&type=star&count=true" frameborder="0"
      scrolling="0" width="50" height="20" title="GitHub">
    </iframe>
  </span>
  <VGithubIcon position="top-left" url="https://github.com/SomiaWhiteRing/love100" />
</template>

