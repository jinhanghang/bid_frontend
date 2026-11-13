<template>
  <div v-if="blocks.length" class="structured-result">
    <template v-for="(block, index) in blocks" :key="index">
      <h3 v-if="block.kind === 'heading'" class="score-group-title">{{ block.title }}</h3>
      <div v-else-if="block.kind === 'scoreDetails'" class="score-details">
        <section v-for="(item, itemIndex) in block.items" :key="itemIndex" class="score-detail">
          <h4>{{ item.title }} <span>满分 {{ item.points }} 分</span></h4>
          <ul><li v-for="(rule, ruleIndex) in item.rules" :key="ruleIndex">{{ rule }}</li></ul>
        </section>
      </div>
      <div v-else-if="block.columns" class="result-table-wrap" role="region" tabindex="0" aria-label="原文表格">
        <table class="result-table">
          <caption>原文表格</caption>
          <thead><tr><th v-for="column in block.columns" :key="column" scope="col">{{ column }}</th></tr></thead>
          <tbody>
            <tr v-for="(row, rowIndex) in block.items" :key="rowIndex">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <MarkdownContent v-else :content="block.items.join('\n\n')" />
    </template>
  </div>
  <MarkdownContent v-else :content="category.content" />
</template>

<script setup>
import { computed } from 'vue'
import MarkdownContent from '@/components/ai/MarkdownContent.vue'
import { buildHomeResultBlocks } from './bidHomeResultBlocks.js'

const props = defineProps({ category: { type: Object, required: true } })
const blocks = computed(() => buildHomeResultBlocks(props.category))
</script>

<style scoped>
.structured-result { display: grid; gap: 16px; min-width: 0; }
.score-group-title { margin: 0; font-size: 15px; }
.score-detail { padding: 12px 0; border-bottom: 1px solid #eeeaf5; }
.score-detail:first-child { padding-top: 0; }
.score-detail h4 { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: baseline; margin: 0 0 6px; font-size: 14px; }
.score-detail h4 span { color: #5e43a7; white-space: nowrap; }
.score-detail ul { margin: 0; padding-inline-start: 1.4em; line-height: 1.7; }
.result-table-wrap { overflow-x: auto; border: 1px solid #e6e0ef; border-radius: 8px; }
.result-table-wrap:focus-visible { outline: 2px solid #8060ff; outline-offset: 2px; }
.result-table { width: 100%; min-width: 380px; border-collapse: collapse; font-size: 13px; line-height: 1.65; }
.result-table caption { padding: 9px 12px; text-align: left; background: #fff; color: #514071; font-weight: 600; }
.result-table th, .result-table td { padding: 8px 11px; vertical-align: top; text-align: left; border-top: 1px solid #eeeaf5; }
.result-table th { background: #f4f0fd; color: #514071; white-space: nowrap; }
.result-table td { white-space: pre-wrap; overflow-wrap: anywhere; }
.result-table tbody tr:nth-child(even) { background: #faf8fe; }
</style>
