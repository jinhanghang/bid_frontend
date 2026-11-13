import { strict as assert } from 'node:assert'
import { visibleHomeCategories } from './bidHomeParse.js'

const status = 'SUCCESS'
assert.equal(visibleHomeCategories({ status, reviewState: 'PARTIAL' })[0].content, '暗标要求待核对')
assert.equal(visibleHomeCategories({ status, blindMode: 'NOT_APPLICABLE' })[0].content, '无暗标要求')
